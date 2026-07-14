// Recursive outcome-progress calculation.
// parent progress = sum(child progress * edge weight), leaf -> root.

import type { NodeEdgeRecord, NodeRecord } from './types';
import { childEdgesOf, isLeafNode } from './tree';

export interface ProgressLookup {
  /** Direct (leaf-only) outcome_progress values, keyed by node_id, 0..1. */
  get(nodeId: string): number | undefined;
}

export function mapProgressLookup(entries: Map<string, number>): ProgressLookup {
  return { get: (nodeId) => entries.get(nodeId) };
}

/**
 * Computes the outcome progress (0..1) for a single node, recursing into
 * children. Leaf nodes (level 4-6, no active children) resolve to their
 * directly-input progress (0 if none has been recorded yet). Non-leaf
 * nodes (levels 1-3 always, plus any 4-6 node that still has children)
 * are the weighted sum of their children's computed progress.
 */
export function computeNodeProgress(
  nodeId: string,
  nodes: Map<string, NodeRecord>,
  edges: NodeEdgeRecord[],
  progress: ProgressLookup,
): number {
  const node = nodes.get(nodeId);
  if (!node) return 0;

  if (isLeafNode(node, edges)) {
    return progress.get(nodeId) ?? 0;
  }

  const children = childEdgesOf(nodeId, edges);
  if (children.length === 0) return 0;

  let total = 0;
  for (const edge of children) {
    total += computeNodeProgress(edge.child_node_id, nodes, edges, progress) * edge.weight;
  }
  return total;
}

/** Computes progress for every node in `nodes`, returned as a node_id -> progress map. */
export function computeAllProgress(
  nodes: NodeRecord[],
  edges: NodeEdgeRecord[],
  progress: ProgressLookup,
): Map<string, number> {
  const nodeMap = new Map(nodes.map((n) => [n.node_id, n]));
  const result = new Map<string, number>();
  for (const node of nodes) {
    result.set(node.node_id, computeNodeProgress(node.node_id, nodeMap, edges, progress));
  }
  return result;
}
