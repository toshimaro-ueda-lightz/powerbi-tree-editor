// Pure, UI-independent tree helpers operating on raw node/edge records.
// No React, no storage access — safe to unit test in isolation.

import type { NodeEdgeRecord, NodeRecord } from './types';

/** Edges that are part of the current (non-superseded) version. */
export function activeEdges(edges: NodeEdgeRecord[]): NodeEdgeRecord[] {
  return edges.filter((e) => e.valid_to === null);
}

/** Active outgoing (parent -> child) edges for a given node. */
export function childEdgesOf(nodeId: string, edges: NodeEdgeRecord[]): NodeEdgeRecord[] {
  return activeEdges(edges).filter((e) => e.parent_node_id === nodeId);
}

/** Active incoming edge (there is at most one parent per node in a tree). */
export function parentEdgeOf(nodeId: string, edges: NodeEdgeRecord[]): NodeEdgeRecord | undefined {
  return activeEdges(edges).find((e) => e.child_node_id === nodeId);
}

/**
 * A node is a "leaf" (末端 / タスク実体) when it is at level 4-6 AND has no
 * active children. Level 1-3 nodes are never leaves, even with zero
 * children, and are always treated as computed/read-only for progress.
 */
export function isLeafNode(node: NodeRecord, edges: NodeEdgeRecord[]): boolean {
  if (node.level < 4) return false;
  return childEdgesOf(node.node_id, edges).length === 0;
}

/** Ordered ancestor chain from the node's parent up to (and including) the level-1 root. */
export function ancestorChain(nodeId: string, edges: NodeEdgeRecord[]): string[] {
  const chain: string[] = [];
  let current = nodeId;
  const visited = new Set<string>();
  for (;;) {
    const parentEdge = parentEdgeOf(current, edges);
    if (!parentEdge || visited.has(parentEdge.parent_node_id)) break;
    chain.push(parentEdge.parent_node_id);
    visited.add(parentEdge.parent_node_id);
    current = parentEdge.parent_node_id;
  }
  return chain;
}

/** Full path from level-1 root down to and including the node itself. */
export function pathToRoot(nodeId: string, edges: NodeEdgeRecord[]): string[] {
  return [...ancestorChain(nodeId, edges).reverse(), nodeId];
}

export function rootNodes(nodes: NodeRecord[]): NodeRecord[] {
  return nodes.filter((n) => n.level === 1);
}
