// elkjs-based auto layout: hierarchy flows left -> right (level = column),
// siblings stack top -> bottom within a level.
//
// Algorithm: `org.eclipse.elk.mrtree` (a tree-specific placement algorithm),
// not `layered` (a generic Sugiyama-style layered-graph algorithm). This is a
// deliberate choice, not the ELK default: the data this app lays out is
// always a tree, and `layered`'s crossing-minimization heuristics reorder
// siblings independently of input order (issue #14) and center parents over
// their children inconsistently (max 659px off in real data). `mrtree`
// defaults to `weighting: MODEL_ORDER` / `searchOrder: DFS`, which preserves
// input sibling order and centers parents over children as a structural
// property of the algorithm, not an option that has to be requested.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from '@xyflow/react';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

const elk = new ELK();

/**
 * Horizontal gap (px) between columns, i.e. between the right edge of one
 * level's nodes and the left edge of the next level's nodes. Reserves room
 * for the edge weight label drawn on the connecting edge.
 *
 * This can't be handed to ELK as a layout option: `mrtree` (unlike
 * `layered`) has no separate "spacing between layers" option — only
 * `elk.spacing.nodeNode`, which controls both the in-column (vertical) and
 * cross-column (horizontal) gap at once. Widening it to fit the weight label
 * would also blow up the vertical spacing between siblings (canvas height
 * measured 7000px -> 10400px on real data). So `elk.spacing.nodeNode` stays
 * tuned for vertical spacing, and `computeLayout` overwrites ELK's x
 * afterward using this constant instead (see below).
 */
const COLUMN_GAP = 96;

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
   * ends up in: `computeLayout` sets `x = (level - 1) * (NODE_WIDTH +
   * COLUMN_GAP)` directly from this field after ELK runs (see
   * `computeLayout`), rather than letting column position fall out of the
   * graph shape. `level` is also still used to find the level-1 nodes to
   * attach the virtual root to. */
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
 * Lays the tree out with ELK's `mrtree` algorithm, guaranteeing that every
 * node at the same business level shares one x (column) and that siblings
 * keep their input (data) order top -> bottom.
 *
 * x (column) is NOT taken from ELK's output. `mrtree` has no per-layer
 * spacing option — see `COLUMN_GAP` above — so column x is instead computed
 * directly from `level` after layout: `x = (level - 1) * (NODE_WIDTH +
 * COLUMN_GAP)`. This is simpler and stronger than deriving alignment from
 * graph shape: it holds by construction for every node, unconditionally.
 *
 * y is left entirely to ELK/mrtree: sibling stacking order, spacing, and
 * parent-child centering all come from `mrtree`'s own placement, which
 * (unlike the `layered` algorithm previously used here) defaults to
 * `weighting: MODEL_ORDER` / `searchOrder: DFS` — so sibling order in the
 * output matches sibling order in `nodes`/`edges`, and a parent is centered
 * on the midpoint of its children's y-extent as a structural property of the
 * algorithm.
 *
 * A single virtual root (see `VIRTUAL_ROOT_ID`) is injected as the parent of
 * every level-1 node, joining the whole department into one connected tree.
 * This still matters even though x no longer depends on graph shape:
 * `mrtree` supports laying out disconnected components separately
 * (`separateConnectedComponents`), and department D04 has 5 level-1 roots.
 * Without the virtual root those 5 roots would be laid out (and
 * y-positioned) as independent trees instead of as siblings in one shared
 * vertical order — breaking both the "siblings keep input order" and
 * "parent centered on children" guarantees above at the top level.
 *
 * INVARIANT THIS DEPENDS ON: the visible node set is ancestor-closed — the
 * parent of any visible node is itself visible. That still holds today (the
 * level filter keeps 第1..n; collapsing only ever hides descendants), and it
 * still matters for the y guarantees above: if a filter that hides *only a
 * parent* is ever added, the orphaned children become their own connected
 * component, get laid out separately from the rest of the tree, and lose
 * their place in the shared sibling order / centering relative to the nodes
 * that remain connected to the virtual root. (Column x is unaffected either
 * way, since it is now computed from `level` alone, not from graph shape.)
 * Any change that can hide a parent while keeping a child visible must
 * re-establish this invariant (e.g. by re-attaching orphans to the virtual
 * root) or the y guarantees above no longer hold for the orphaned subtree.
 */
export async function computeLayout({ nodes, edges }: LayoutInput): Promise<LayoutResult> {
  if (nodes.length === 0) return { positions: new Map() };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'mrtree',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '28',
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

  const levelById = new Map(nodes.map((n) => [n.id, n.level]));
  const layouted = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    // Strip the virtual root: it is an implementation detail of this
    // function and must never escape to callers (TreeCanvas would try to
    // render it as a node).
    if (child.id === VIRTUAL_ROOT_ID) continue;
    // x comes from `level`, not from ELK — see the COLUMN_GAP comment and
    // the JSDoc above for why mrtree's output x can't be used directly. y is
    // untouched: it is mrtree's own placement.
    const level = levelById.get(child.id) ?? 1;
    positions.set(child.id, { x: (level - 1) * (NODE_WIDTH + COLUMN_GAP), y: child.y ?? 0 });
  }
  return { positions };
}

/**
 * Derives the fixed column x-position for each business hierarchy level from
 * already-computed node positions. Pure/sync so it's cheap to unit test
 * independently of ELK: `computeLayout` guarantees every node at the same
 * level shares one x (it is computed directly from `level` — see
 * `computeLayout` above), so the first position seen for a level is that
 * level's column.
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
