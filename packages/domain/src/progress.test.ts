import { describe, expect, it } from 'vitest';
import type { NodeEdgeRecord, NodeRecord } from './types';
import { computeAllProgress, computeNodeProgress, mapProgressLookup } from './progress';

function node(id: string, level: NodeRecord['level']): NodeRecord {
  return { node_id: id, name: id, subtitle: null, level, scope: level <= 3 ? 'common' : 'dept', department_id: level <= 3 ? null : 'dept-a', assignee: null };
}

function edge(id: string, parent: string, child: string, weight: number): NodeEdgeRecord {
  return { edge_id: id, department_id: 'dept-a', parent_node_id: parent, child_node_id: child, weight, valid_from: '2025-01-01', valid_to: null };
}

describe('computeNodeProgress: parent = sum(child * weight)', () => {
  it('computes a single level of weighted children', () => {
    const nodes = new Map([
      ['p', node('p', 3)],
      ['c1', node('c1', 4)],
      ['c2', node('c2', 4)],
    ]);
    const edges = [edge('e1', 'p', 'c1', 0.6), edge('e2', 'p', 'c2', 0.4)];
    const progress = mapProgressLookup(new Map([['c1', 0.5], ['c2', 1.0]]));
    // 0.5*0.6 + 1.0*0.4 = 0.3 + 0.4 = 0.7
    expect(computeNodeProgress('p', nodes, edges, progress)).toBeCloseTo(0.7, 9);
  });

  it('returns 0 for a leaf with no recorded progress', () => {
    const nodes = new Map([['leaf', node('leaf', 4)]]);
    const progress = mapProgressLookup(new Map());
    expect(computeNodeProgress('leaf', nodes, [], progress)).toBe(0);
  });

  it('returns the direct progress value for a leaf', () => {
    const nodes = new Map([['leaf', node('leaf', 5)]]);
    const progress = mapProgressLookup(new Map([['leaf', 0.42]]));
    expect(computeNodeProgress('leaf', nodes, [], progress)).toBe(0.42);
  });
});

describe('computeNodeProgress: multi-level recursion (leaf -> level 1)', () => {
  // n1 -> n2 (w0.5) -> n3 (w0.5) -> n4 (w0.5) -> leaf5a (w0.7, progress 0.8)
  //                                            -> leaf5b (w0.3, progress 0.2)
  //                 -> n3b (w0.5) -> leaf4b (progress 1.0, w1.0)
  //       -> n2b (w0.5) -> leaf3b (progress 0.6, w1.0)   [level3 leaf w/ no children -> still non-leaf per spec, but here n2b has only one child so treat n2b's child as leaf level4]
  it('propagates a deep chain all the way to the level-1 root', () => {
    const nodes = new Map<string, NodeRecord>([
      ['n1', node('n1', 1)],
      ['n2', node('n2', 2)],
      ['n3', node('n3', 3)],
      ['n4', node('n4', 4)],
      ['leaf5a', node('leaf5a', 5)],
      ['leaf5b', node('leaf5b', 5)],
    ]);
    const edges = [
      edge('e1', 'n1', 'n2', 1.0),
      edge('e2', 'n2', 'n3', 1.0),
      edge('e3', 'n3', 'n4', 1.0),
      edge('e4', 'n4', 'leaf5a', 0.7),
      edge('e5', 'n4', 'leaf5b', 0.3),
    ];
    const progress = mapProgressLookup(new Map([['leaf5a', 0.8], ['leaf5b', 0.2]]));
    // n4 = 0.8*0.7 + 0.2*0.3 = 0.56 + 0.06 = 0.62; n3 = n4 = 0.62; n2 = 0.62; n1 = 0.62
    const result = computeAllProgress([...nodes.values()], edges, progress);
    expect(result.get('n4')).toBeCloseTo(0.62, 9);
    expect(result.get('n3')).toBeCloseTo(0.62, 9);
    expect(result.get('n2')).toBeCloseTo(0.62, 9);
    expect(result.get('n1')).toBeCloseTo(0.62, 9);
  });

  it('level 1-3 nodes with zero children compute to 0, never read progress_input directly', () => {
    const nodes = [node('empty3', 3)];
    // Even if progress_input somehow existed for this id, level<4 must never read it directly.
    const progress = mapProgressLookup(new Map([['empty3', 0.99]]));
    const result = computeAllProgress(nodes, [], progress);
    expect(result.get('empty3')).toBe(0);
  });
});
