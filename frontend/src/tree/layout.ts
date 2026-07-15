// elkjs-based auto layout: hierarchy flows left -> right (level = column),
// siblings stack top -> bottom within a level.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from '@xyflow/react';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

const elk = new ELK();

export interface LayoutNodeInput {
  id: string;
  /** Business hierarchy level (第n階層). Determines the column (x) this node
   * is pinned to — see `elk.partitioning.partition` below. */
  level: number;
}

export interface LayoutInput {
  nodes: LayoutNodeInput[];
  edges: { id: string; source: string; target: string }[];
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
}

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
      // Pin every node's column to its business hierarchy level instead of
      // letting ELK infer a topological layer, and lay every root's subtree
      // out in one shared coordinate space instead of packing each
      // connected component (root) independently side by side. Without
      // this, a forest with multiple level-1 roots (e.g. department D04 has
      // 5) gets column x-positions that don't line up across roots — see
      // issue #10. y (sibling stacking / parent-child closeness within a
      // column) is still left to ELK.
      'elk.partitioning.activate': 'true',
      'elk.separateConnectedComponents': 'false',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: { 'elk.partitioning.partition': String(n.level) },
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const layouted = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return { positions };
}

/**
 * Derives the fixed column x-position for each business hierarchy level from
 * already-computed node positions. Pure/sync so it's cheap to unit test
 * independently of ELK: `computeLayout` guarantees every node at the same
 * level shares one x (see `elk.partitioning.partition` above), so the first
 * position seen for a level is that level's column.
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
