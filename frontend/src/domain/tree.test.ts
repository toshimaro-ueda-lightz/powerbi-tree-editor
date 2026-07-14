import { describe, expect, it } from 'vitest';
import type { NodeEdgeRecord, NodeRecord } from './types';
import { ancestorChain, childEdgesOf, isLeafNode, pathToRoot } from './tree';

function node(id: string, level: NodeRecord['level']): NodeRecord {
  return { node_id: id, name: id, subtitle: null, level, scope: level <= 3 ? 'common' : 'dept', department_id: level <= 3 ? null : 'dept-a', assignee: null };
}

function edge(id: string, parent: string, child: string, weight: number, validTo: string | null = null): NodeEdgeRecord {
  return { edge_id: id, department_id: 'dept-a', parent_node_id: parent, child_node_id: child, weight, valid_from: '2025-01-01', valid_to: validTo };
}

describe('isLeafNode', () => {
  it('treats level 1-3 nodes as never-leaf even with no children', () => {
    const n1 = node('n1', 1);
    expect(isLeafNode(n1, [])).toBe(false);
    const n3 = node('n3', 3);
    expect(isLeafNode(n3, [])).toBe(false);
  });

  it('treats a level 4-6 node with no active children as a leaf', () => {
    const n4 = node('n4', 4);
    expect(isLeafNode(n4, [])).toBe(true);
  });

  it('treats a level 4-6 node with active children as non-leaf', () => {
    const n4 = node('n4', 4);
    const edges = [edge('e1', 'n4', 'n5', 1)];
    expect(isLeafNode(n4, edges)).toBe(false);
  });

  it('ignores superseded (valid_to set) edges when determining leaf status', () => {
    const n4 = node('n4', 4);
    const edges = [edge('e1', 'n4', 'n5', 1, '2025-06-01')];
    expect(isLeafNode(n4, edges)).toBe(true);
  });
});

describe('childEdgesOf', () => {
  it('excludes superseded edges', () => {
    const edges = [edge('e1', 'p', 'c1', 0.5), edge('e2', 'p', 'c2', 0.5, '2025-06-01')];
    expect(childEdgesOf('p', edges).map((e) => e.edge_id)).toEqual(['e1']);
  });
});

describe('ancestorChain / pathToRoot', () => {
  const edges = [edge('e1', 'n1', 'n2', 1), edge('e2', 'n2', 'n3', 1), edge('e3', 'n3', 'n4', 1)];

  it('walks from a node up to the level-1 root', () => {
    expect(ancestorChain('n4', edges)).toEqual(['n3', 'n2', 'n1']);
  });

  it('builds the full root-to-node path', () => {
    expect(pathToRoot('n4', edges)).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('returns an empty ancestor chain for a root node', () => {
    expect(ancestorChain('n1', edges)).toEqual([]);
    expect(pathToRoot('n1', edges)).toEqual(['n1']);
  });
});
