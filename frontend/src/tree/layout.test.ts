import { describe, expect, it } from 'vitest';
import { computeColumnPositions, computeLayout } from './layout';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

// A forest with multiple level-1 roots, mirroring the real-world shape that
// exposed issue #10: department D04 has 5 separate level-1 roots. ELK's
// `layered` algorithm treats each root as its own connected component and
// packs components side-by-side unless partitioning is forced (see
// layout.ts) — so this synthetic shape is the actual regression case, not
// just a simple single-root tree.
const FOREST = {
  nodes: [
    { id: 'r1', level: 1 },
    { id: 'r2', level: 1 },
    { id: 'r3', level: 1 },
    { id: 'r1-a', level: 2 },
    { id: 'r1-b', level: 2 },
    { id: 'r2-a', level: 2 },
    { id: 'r1-a-x', level: 3 },
  ],
  edges: [
    { id: 'e1', source: 'r1', target: 'r1-a' },
    { id: 'e2', source: 'r1', target: 'r1-b' },
    { id: 'e3', source: 'r2', target: 'r2-a' },
    { id: 'e4', source: 'r1-a', target: 'r1-a-x' },
    // r3 is a lone root with no children.
  ],
};

function rectsOverlap(aY: number, bY: number): boolean {
  // Both nodes are NODE_WIDTH x NODE_HEIGHT and (per the level = column
  // invariant) share the same x when at the same level, so overlap reduces
  // to a 1D interval check on y.
  return Math.abs(aY - bY) < NODE_HEIGHT;
}

describe('computeLayout', () => {
  it('returns no positions for an empty input', async () => {
    const { positions } = await computeLayout({ nodes: [], edges: [] });
    expect(positions.size).toBe(0);
  });

  it('aligns every node at the same business level to the same x, even across separate roots', async () => {
    const { positions } = await computeLayout(FOREST);

    const level1X = new Set([positions.get('r1')!.x, positions.get('r2')!.x, positions.get('r3')!.x]);
    expect(level1X.size).toBe(1);

    const level2X = new Set([positions.get('r1-a')!.x, positions.get('r1-b')!.x, positions.get('r2-a')!.x]);
    expect(level2X.size).toBe(1);
  });

  it('spaces adjacent levels by a fixed x gap (NODE_WIDTH + inter-column spacing)', async () => {
    const { positions } = await computeLayout(FOREST);

    const level1X = positions.get('r1')!.x;
    const level2X = positions.get('r1-a')!.x;
    const level3X = positions.get('r1-a-x')!.x;

    const gap1to2 = level2X - level1X;
    const gap2to3 = level3X - level2X;

    expect(gap1to2).toBeGreaterThan(NODE_WIDTH);
    // The gap between level 1->2 and level 2->3 must match: columns are
    // evenly spaced regardless of how many siblings/roots sit in a level.
    expect(gap2to3).toBeCloseTo(gap1to2, 5);
  });

  it('never overlaps sibling nodes vertically (rectangles do not intersect)', async () => {
    const { positions } = await computeLayout(FOREST);

    // r1-a and r1-b are true siblings (children of r1); r1/r2/r3 all share a
    // column even though they are not tree-siblings — both cases must not
    // visually overlap within their shared column.
    expect(rectsOverlap(positions.get('r1-a')!.y, positions.get('r1-b')!.y)).toBe(false);
    expect(rectsOverlap(positions.get('r1')!.y, positions.get('r2')!.y)).toBe(false);
    expect(rectsOverlap(positions.get('r2')!.y, positions.get('r3')!.y)).toBe(false);
    expect(rectsOverlap(positions.get('r1')!.y, positions.get('r3')!.y)).toBe(false);
  });
});

describe('computeColumnPositions', () => {
  it('returns one x per level, keyed by the first position seen for that level', () => {
    const columns = computeColumnPositions([
      { level: 1, x: 0 },
      { level: 2, x: 332 },
      { level: 1, x: 0 },
      { level: 2, x: 332 },
    ]);

    expect(columns.get(1)).toBe(0);
    expect(columns.get(2)).toBe(332);
    expect(columns.size).toBe(2);
  });

  it('omits levels that have no nodes at all', () => {
    const columns = computeColumnPositions([{ level: 1, x: 0 }]);
    expect(columns.has(2)).toBe(false);
    expect(columns.has(6)).toBe(false);
  });

  it('returns an empty map for no nodes', () => {
    expect(computeColumnPositions([]).size).toBe(0);
  });
});
