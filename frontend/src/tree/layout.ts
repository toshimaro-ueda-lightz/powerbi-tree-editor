// elkjs-based auto layout: hierarchy flows left -> right (level = column),
// siblings stack top -> bottom within a level.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from '@xyflow/react';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

const elk = new ELK();

/**
 * Id of the virtual root: a synthetic, layout-only node that `computeLayout`
 * injects as the single parent of every level-1 node.
 *
 * It is NOT a real node. It does not exist in the DB, the API, or
 * `packages/domain`, and it is never rendered — it exists only inside
 * `computeLayout` and is stripped from the returned positions. The DB's
 * `node` table even carries `CHECK (level BETWEEN 1 AND 6)`, so a level-0 row
 * is physically impossible to store; that this concept is view-layer-only is
 * structurally guaranteed, not just a convention.
 *
 * The id is prefixed with `__` (real node ids are stringified INTEGER
 * `node_id`s from the DB, plus temp ids from `packages/domain`) so it cannot
 * collide with a caller-supplied id.
 */
const VIRTUAL_ROOT_ID = '__layout_virtual_root__';

export interface LayoutNodeInput {
  id: string;
  /** Business hierarchy level (第n階層). Determines the column (x) this node
   * ends up in. Still required: `computeLayout` uses it to find the level-1
   * nodes to attach the virtual root to (and callers derive columns from the
   * resulting x — see `computeColumnPositions`). The column alignment itself
   * is a structural consequence of the graph shape, not of a pinning option
   * — see `computeLayout`. */
  level: number;
}

export interface LayoutInput {
  nodes: LayoutNodeInput[];
  edges: { id: string; source: string; target: string }[];
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
}

/**
 * Lays the tree out with ELK, guaranteeing that every node at the same
 * business level shares one x (column).
 *
 * How the alignment is achieved: a single virtual root (see
 * `VIRTUAL_ROOT_ID`) is injected as the parent of every level-1 node. This
 * makes the whole department one connected tree, which matters twice over:
 *
 * 1. ELK's `layered` algorithm otherwise treats each level-1 root as its own
 *    connected component and packs those components side by side, so columns
 *    stop lining up across roots (department D04 has 5 roots — issue #10).
 *    With one root there is nothing to pack; component packing never runs.
 * 2. Every edge goes 第n -> 第n+1, so a node's path length from the virtual
 *    root always equals its level. ELK's layer assignment minimizes edge
 *    length, which makes "layer = business level" the unique optimum.
 *
 * So the alignment falls out of the graph's *shape* rather than being forced
 * by a layout option — no reliance on ELK behaviour beyond its documented
 * core (layering + component-free layout of a connected graph). y (sibling
 * stacking / parent-child closeness within a column) is still left to ELK.
 *
 * INVARIANT THIS DEPENDS ON: the visible node set is ancestor-closed — the
 * parent of any visible node is itself visible. That holds today: the level
 * filter keeps 第1..n (so a parent is never dropped while a child stays), and
 * collapsing only ever hides descendants. If a filter that hides *only a
 * parent* is ever added, the orphaned children become their own connected
 * components again, component packing resumes, and the columns break — and
 * the "layer = business level" guarantee above breaks with them, because an
 * orphan's path length from the virtual root no longer equals its level.
 * Any change that can hide a parent while keeping a child visible must
 * re-establish this invariant (e.g. by re-attaching orphans to the virtual
 * root) or this function's contract no longer holds.
 */
export async function computeLayout({ nodes, edges }: LayoutInput): Promise<LayoutResult> {
  if (nodes.length === 0) return { positions: new Map() };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'elk.spacing.nodeNode': '28',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: [
      // Zero-sized so it occupies no visual space; it is dropped below and
      // never reaches the canvas.
      { id: VIRTUAL_ROOT_ID, width: 0, height: 0 },
      ...nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    ],
    edges: [
      ...nodes
        .filter((n) => n.level === 1)
        .map((n) => ({
          id: `${VIRTUAL_ROOT_ID}->${n.id}`,
          sources: [VIRTUAL_ROOT_ID],
          targets: [n.id],
        })),
      ...edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
    ],
  };

  const layouted = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    // Strip the virtual root: it is an implementation detail of this
    // function and must never escape to callers (TreeCanvas would try to
    // render it as a node).
    if (child.id === VIRTUAL_ROOT_ID) continue;
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return { positions };
}

/**
 * Derives the fixed column x-position for each business hierarchy level from
 * already-computed node positions. Pure/sync so it's cheap to unit test
 * independently of ELK: `computeLayout` guarantees every node at the same
 * level shares one x (via the virtual root — see `computeLayout` above), so
 * the first position seen for a level is that level's column.
 *
 * Only levels that actually have at least one node in `nodes` are returned —
 * there is no x to anchor a column with zero visible nodes to (e.g. a
 * department tree that doesn't reach level 6, or a level hidden by the
 * level filter).
 */
export function computeColumnPositions(
  nodes: { level: number; x: number }[],
): Map<number, number> {
  const byLevel = new Map<number, number>();
  for (const n of nodes) {
    if (!byLevel.has(n.level)) byLevel.set(n.level, n.x);
  }
  return byLevel;
}

export function toFlowElements<TData extends Record<string, unknown>>(
  nodeIds: string[],
  positions: Map<string, { x: number; y: number }>,
  buildData: (id: string) => TData,
  edgeDefs: { id: string; source: string; target: string; label: string; highlighted: boolean }[],
): { nodes: Node<TData>[]; edges: Edge[] } {
  const nodes: Node<TData>[] = nodeIds.map((id) => ({
    id,
    type: 'treeNode',
    position: positions.get(id) ?? { x: 0, y: 0 },
    data: buildData(id),
    draggable: false,
    connectable: false,
  }));

  const edges: Edge[] = edgeDefs.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    animated: false,
    style: { stroke: e.highlighted ? 'var(--color-accent)' : 'var(--color-border-strong)', strokeWidth: e.highlighted ? 2.5 : 1.5 },
    labelStyle: { fill: e.highlighted ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: 'var(--color-surface)', fillOpacity: 0.92 },
    labelBgPadding: [4, 2],
    zIndex: e.highlighted ? 10 : 0,
  }));

  return { nodes, edges };
}
