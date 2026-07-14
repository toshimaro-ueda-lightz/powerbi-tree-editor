// elkjs-based auto layout: hierarchy flows left -> right (level = column),
// siblings stack top -> bottom within a level.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from '@xyflow/react';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

const elk = new ELK();

export interface LayoutInput {
  nodeIds: string[];
  edges: { id: string; source: string; target: string }[];
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
}

export async function computeLayout({ nodeIds, edges }: LayoutInput): Promise<LayoutResult> {
  if (nodeIds.length === 0) return { positions: new Map() };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'elk.spacing.nodeNode': '28',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: nodeIds.map((id) => ({ id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const layouted = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return { positions };
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
