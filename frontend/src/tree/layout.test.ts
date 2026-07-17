import { describe, expect, it } from 'vitest';
import { computeColumnPositions, computeLayout } from './layout';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

// A forest with multiple level-1 roots, mirroring the real-world shape that
// exposed issue #10: department D04 has 5 separate level-1 roots. `mrtree`
// (like `layered` before it) treats each disconnected root as its own
// component and can lay components out separately
// (`separateConnectedComponents`), which is what would break the columns;
// layout.ts avoids that by joining every level-1 root under one virtual
// root, making the graph a single connected tree. This synthetic shape is
// the actual regression case, not just a simple single-root tree.
//
// r1 and r2 each have 3 children (…-a/-b/-c, in that data order) rather than
// 2: issue #14's sibling-order guarantee is only meaningfully tested with 3+
// siblings, where "preserves order" and "coincidentally already sorted"
// stop being the same thing.
const FOREST = {
  nodes: [
    { id: 'r1', level: 1 },
    { id: 'r2', level: 1 },
    { id: 'r3', level: 1 },
    { id: 'r1-a', level: 2 },
    { id: 'r1-b', level: 2 },
    { id: 'r1-c', level: 2 },
    { id: 'r2-a', level: 2 },
    { id: 'r2-b', level: 2 },
    { id: 'r2-c', level: 2 },
    { id: 'r1-a-x', level: 3 },
  ],
  edges: [
    { id: 'e1', source: 'r1', target: 'r1-a' },
    { id: 'e2', source: 'r1', target: 'r1-b' },
    { id: 'e2c', source: 'r1', target: 'r1-c' },
    { id: 'e3', source: 'r2', target: 'r2-a' },
    { id: 'e3b', source: 'r2', target: 'r2-b' },
    { id: 'e3c', source: 'r2', target: 'r2-c' },
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

  it('does not leak the internal virtual root into the returned positions', async () => {
    const { positions } = await computeLayout(FOREST);

    // The virtual root is an implementation detail of computeLayout: it is
    // added to the ELK graph to join the level-1 roots, but callers
    // (TreeCanvas) must only ever see real nodes, or they would try to
    // render a node that exists in neither the DB nor the API.
    expect(positions.size).toBe(FOREST.nodes.length);
    expect([...positions.keys()].sort()).toEqual(FOREST.nodes.map((n) => n.id).sort());
    for (const key of positions.keys()) {
      expect(key.startsWith('__')).toBe(false);
    }
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

  // Issue #14 criterion 1: sibling vertical order must follow input (data)
  // order, not an arbitrary crossing-minimization order. Business data
  // encodes its intended order in names (①②③…), so the y-order of siblings
  // in the rendered tree must match the order they appear in `nodes`/`edges`.
  it('stacks siblings top -> bottom in the same order they appear in the input data', async () => {
    const { positions } = await computeLayout(FOREST);

    expect(positions.get('r1-a')!.y).toBeLessThan(positions.get('r1-b')!.y);
    expect(positions.get('r1-b')!.y).toBeLessThan(positions.get('r1-c')!.y);

    expect(positions.get('r2-a')!.y).toBeLessThan(positions.get('r2-b')!.y);
    expect(positions.get('r2-b')!.y).toBeLessThan(positions.get('r2-c')!.y);
  });

  // The test above alone does not prove data order is preserved: FOREST's
  // input order happens to be alphabetical, so an algorithm that ignored
  // input order entirely could still pass it by coincidence. Feeding the
  // same tree in a deliberately non-alphabetical order pins the actual
  // guarantee — y-order tracks *input* order, whatever it is. This is what
  // regresses if `mrtree`'s `weighting: MODEL_ORDER` default is ever lost
  // (ELK's `layered` used to reorder these freely — issue #14).
  it('follows input order even when it contradicts any natural sort of the ids', async () => {
    const reversed = {
      nodes: FOREST.nodes,
      edges: [
        { id: 'e2c', source: 'r1', target: 'r1-c' },
        { id: 'e2', source: 'r1', target: 'r1-b' },
        { id: 'e1', source: 'r1', target: 'r1-a' },
        ...FOREST.edges.filter((e) => e.source !== 'r1'),
      ],
    };
    const { positions } = await computeLayout(reversed);

    expect(positions.get('r1-c')!.y).toBeLessThan(positions.get('r1-b')!.y);
    expect(positions.get('r1-b')!.y).toBeLessThan(positions.get('r1-a')!.y);
  });

  // Issue #14 criterion 2: removing an unrelated branch from the input (what
  // collapsing a branch elsewhere effectively does, since collapsed
  // descendants are simply excluded from `nodes`/`edges`) must not reorder
  // the siblings of an unrelated parent. Absolute y is allowed to shift
  // (removing r2's subtree frees vertical space), but r1's children must
  // keep their relative order.
  it('keeps an unrelated parent\'s sibling order unchanged when another branch is removed (collapse-equivalent)', async () => {
    const { positions: withR2 } = await computeLayout(FOREST);
    expect(withR2.get('r1-a')!.y).toBeLessThan(withR2.get('r1-b')!.y);
    expect(withR2.get('r1-b')!.y).toBeLessThan(withR2.get('r1-c')!.y);

    const withoutR2Subtree = {
      nodes: FOREST.nodes.filter((n) => !n.id.startsWith('r2')),
      edges: FOREST.edges.filter((e) => !e.source.startsWith('r2') && !e.target.startsWith('r2')),
    };
    const { positions: withoutR2 } = await computeLayout(withoutR2Subtree);

    expect(withoutR2.get('r1-a')!.y).toBeLessThan(withoutR2.get('r1-b')!.y);
    expect(withoutR2.get('r1-b')!.y).toBeLessThan(withoutR2.get('r1-c')!.y);
  });

  // Issue #14 criterion 3: a parent must be centered on its children, i.e.
  // its own center-y must equal the midpoint of its children's center-y
  // extent (min and max). This is the Reingold-Tilford-style guarantee that
  // `mrtree` provides structurally; `layered` only satisfied it for 43/67
  // parents on real data (max 659px off). 10px tolerance per the issue
  // (measured max deviation on real data was 1px).
  it('centers each parent on the midpoint of its children\'s y-extent', async () => {
    const { positions } = await computeLayout(FOREST);
    const centerY = (id: string) => positions.get(id)!.y + NODE_HEIGHT / 2;

    const r1Children = ['r1-a', 'r1-b', 'r1-c'].map(centerY);
    const r1Midpoint = (Math.min(...r1Children) + Math.max(...r1Children)) / 2;
    expect(Math.abs(centerY('r1') - r1Midpoint)).toBeLessThanOrEqual(10);

    const r2Children = ['r2-a', 'r2-b', 'r2-c'].map(centerY);
    const r2Midpoint = (Math.min(...r2Children) + Math.max(...r2Children)) / 2;
    expect(Math.abs(centerY('r2') - r2Midpoint)).toBeLessThanOrEqual(10);
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
