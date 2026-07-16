// elkjs-based auto layout: hierarchy flows left -> right (level = column),
// siblings stack top -> bottom within a level.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkExtendedEdge } from 'elkjs/lib/main';
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

/**
 * Port ids for the fixed WEST/EAST ports `computeLayout` gives every real
 * node (see the `ports` entry in the ELK graph below for why the ports
 * exist at all).
 *
 * Derived from the real node id by appending a suffix, rather than given an
 * unrelated fresh id, so they stay traceable in ELK debug output. The
 * suffix is a colon so this can never collide with a real node id: real ids
 * are either a stringified DB `node_id` (digits only, see the API-boundary
 * note in CLAUDE.md) or a `packages/domain` temp id in the shape
 * `temp-node-<uuid>` (hyphens and hex digits only, see `makeTempId` in
 * `packages/domain/src/ids.ts`) — neither alphabet includes `:`. Same
 * reasoning as the `__` prefix on `VIRTUAL_ROOT_ID` above, just applied to a
 * suffix instead of a prefix because a port id needs to keep pointing back
 * at "its" node.
 */
function westPortId(nodeId: string): string {
  return `${nodeId}:west`;
}
function eastPortId(nodeId: string): string {
  return `${nodeId}:east`;
}

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
  /**
   * ELK-computed edge route (polyline), keyed by the same edge id the
   * caller passed in via `LayoutInput.edges`. Each point list is ordered
   * `[startPoint, ...bendPoints, endPoint]`:
   * - `startPoint` is the source node's EAST port (right-edge, vertical
   *   center) — the same point React Flow renders the Source Handle at.
   * - `endPoint` is the target node's WEST port (left-edge, vertical
   *   center) — the same point React Flow renders the Target Handle at.
   *
   * That endpoint/Handle match is exactly what fixing the ports (see the
   * ELK graph in `computeLayout`) buys us over ELK's port-less default,
   * where edges attach at ELK-chosen points spread along a node's side
   * instead of at the Handle.
   *
   * Coordinate space: identical to `positions` (root-absolute pixels), NOT
   * relative to either endpoint node. This holds because the ELK graph
   * `computeLayout` builds is flat — every real node is a direct child of
   * the synthetic `root`, no nested containers — so ELK never needs to
   * express a section in a child coordinate system. If nesting is ever
   * introduced this contract must be re-verified (nested ELK graphs can
   * report edge sections relative to their container).
   *
   * Like `positions`, edges that start at the virtual root (see
   * `VIRTUAL_ROOT_ID`) are omitted: the virtual root is not a real edge
   * the caller asked to route, so leaking it here would be the same
   * implementation-detail leak `positions` already guards against. An edge
   * id is also omitted (rather than mapped to `[]`) if ELK reported no
   * section for it, so callers must treat a missing key as "no route
   * available" and fall back accordingly — not as an error.
   */
  routes: Map<string, { x: number; y: number }[]>;
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
  if (nodes.length === 0) return { positions: new Map(), routes: new Map() };

  // Every real edge (both real-edge-to-real-edge and virtual-root-to-level-1)
  // is routed against a fixed port instead of ELK's default port-less
  // routing. Left to itself ELK spreads a node's edge endpoints along the
  // whole height of its side (verified against this app's real data: a
  // 4-child parent got startPoints at 4 different y offsets), which visually
  // detaches the drawn line from React Flow's Handle dot (always rendered at
  // the exact vertical center of the node's left/right edge). Pinning one
  // WEST port and one EAST port per node, both at the vertical center, makes
  // every edge attach exactly where the Handle is drawn, while leaving ELK
  // free to choose *which x lane* an edge's vertical segment runs through —
  // which is what actually separates distinct parents' edges in the same
  // channel (issue #12). `elk.portConstraints: FIXED_POS` is required for
  // ELK to honor the ports' given x/y instead of repositioning them itself.
  const elkEdges: ElkExtendedEdge[] = [
    ...nodes
      .filter((n) => n.level === 1)
      .map((n) => ({
        id: `${VIRTUAL_ROOT_ID}->${n.id}`,
        // The virtual root has no ports (it is zero-sized and never
        // rendered — see VIRTUAL_ROOT_ID), so its outgoing edges attach at
        // the node itself, not a port. Verified this is accepted by ELK
        // even though the target side below does use a port.
        sources: [VIRTUAL_ROOT_ID],
        targets: [westPortId(n.id)],
      })),
    ...edges.map((e) => ({ id: e.id, sources: [eastPortId(e.source)], targets: [westPortId(e.target)] })),
  ];

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
      // never reaches the canvas. Deliberately has no ports/portConstraints:
      // see the sources/targets comment below.
      { id: VIRTUAL_ROOT_ID, width: 0, height: 0 },
      ...nodes.map((n) => ({
        id: n.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
        ports: [
          { id: westPortId(n.id), x: 0, y: NODE_HEIGHT / 2, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'WEST' } },
          { id: eastPortId(n.id), x: NODE_WIDTH, y: NODE_HEIGHT / 2, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'EAST' } },
        ],
      })),
    ],
    edges: elkEdges,
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

  // Real edge ids only — used to filter the virtual-root edges (whose
  // synthetic `${VIRTUAL_ROOT_ID}->...` ids never appear here) out of the
  // returned routes, same reasoning as stripping the virtual root out of
  // `positions` above.
  const realEdgeIds = new Set(edges.map((e) => e.id));
  const routes = new Map<string, { x: number; y: number }[]>();
  for (const elkEdge of layouted.edges ?? []) {
    if (!realEdgeIds.has(elkEdge.id)) continue;
    // A flat (non-nested) ELK graph always produces exactly one section per
    // edge; take it defensively rather than assuming index 0 exists, so a
    // future ELK version that omits sections (e.g. a degenerate zero-length
    // edge) degrades to "no route for this edge" instead of throwing.
    const section = elkEdge.sections?.[0];
    if (!section) continue;
    routes.set(elkEdge.id, [
      { x: section.startPoint.x, y: section.startPoint.y },
      ...(section.bendPoints ?? []).map((p) => ({ x: p.x, y: p.y })),
      { x: section.endPoint.x, y: section.endPoint.y },
    ]);
  }

  return { positions, routes };
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

/**
 * Builds React Flow's `nodes`/`edges` arrays from already-computed layout
 * output.
 *
 * Every edge is emitted as `type: 'elk'` (see `ElkEdge.tsx`) carrying its
 * ELK-computed polyline in `data.points` (the entry from `routes` for that
 * edge's id, or `undefined` if ELK reported no route — `ElkEdge` treats a
 * missing entry as "no route" and falls back to a smoothstep path, per the
 * `LayoutResult.routes` JSDoc above). `data.label`/`data.highlighted` carry
 * the weight label and path-highlight flag through to `ElkEdge`, which draws
 * both itself — React Flow does not render a custom edge type's `label`/
 * `labelStyle`/`labelBgStyle` for you the way it does for built-in edge
 * types, since a custom edge component decides its own rendering.
 */
export function toFlowElements<TData extends Record<string, unknown>>(
  nodeIds: string[],
  positions: Map<string, { x: number; y: number }>,
  buildData: (id: string) => TData,
  edgeDefs: { id: string; source: string; target: string; label: string; highlighted: boolean }[],
  routes: Map<string, { x: number; y: number }[]>,
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
    type: 'elk',
    data: { points: routes.get(e.id), label: e.label, highlighted: e.highlighted },
    zIndex: e.highlighted ? 10 : 0,
  }));

  return { nodes, edges };
}
