import { describe, expect, it } from 'vitest';
import type { ElkEdgeData } from './ElkEdge';
import { computeColumnPositions, computeLayout, toFlowElements } from './layout';
import { NODE_HEIGHT, NODE_WIDTH } from './types';

// A forest with multiple level-1 roots, mirroring the real-world shape that
// exposed issue #10: department D04 has 5 separate level-1 roots. ELK's
// `layered` algorithm treats each root as its own connected component and
// packs components side-by-side, which is what broke the columns; layout.ts
// avoids that by joining every level-1 root under one virtual root, making
// the graph a single connected tree. This synthetic shape is the actual
// regression case, not just a simple single-root tree.
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

// A messier, deeper tree modeling issue #12's real-world trigger: department
// D04's level4->5 channel had several parents with very uneven child counts
// (A: 4 children, B: 1, C: 2) sitting in the same channel, and — because ELK
// used to route every edge's bend through the exact same "half of the
// channel" x — all of their vertical trunk segments landed on one shared x,
// so distinct branches visually fused into a single vertical line.
//
// R3's branch below (R3-a/b/c/d, 2/1/2/1 children) is the one under direct
// test: with the WEST/EAST port fix, ELK's NETWORK_SIMPLEX placement
// compresses R3-c's and R3-d's level2->3 edges until their vertical spans
// actually touch (see the lane-separation test below) — this was found and
// pinned down empirically by inspecting computeLayout's real output, not
// hand-calculated, because ELK's node placement has no simple closed form.
//
// R1's 5-way fan and R2's 5-level single chain are NOT under direct test,
// but they are load-bearing: NETWORK_SIMPLEX balances node positions using
// the *whole* graph, and removing either branch was confirmed (empirically)
// to change the global balancing enough that R3-c/R3-d stop touching,
// silently turning the lane-separation assertion below vacuous. Keep all
// three branches together.
const CHANNEL_CONGESTION = {
  nodes: [
    { id: 'R1', level: 1 },
    { id: 'R2', level: 1 },
    { id: 'R3', level: 1 },
    { id: 'R1-a', level: 2 },
    { id: 'R1-b', level: 2 },
    { id: 'R1-c', level: 2 },
    { id: 'R1-d', level: 2 },
    { id: 'R1-e', level: 2 },
    { id: 'R1-a-1', level: 3 },
    { id: 'R1-a-2', level: 3 },
    { id: 'R1-a-3', level: 3 },
    { id: 'R1-c-1', level: 3 },
    { id: 'R1-e-1', level: 3 },
    { id: 'R1-e-2', level: 3 },
    { id: 'R2-a', level: 2 },
    { id: 'R2-b', level: 2 },
    { id: 'R2-a-1', level: 3 },
    { id: 'R2-a-1-1', level: 4 },
    { id: 'R2-a-1-1-1', level: 5 },
    { id: 'R3-a', level: 2 },
    { id: 'R3-b', level: 2 },
    { id: 'R3-c', level: 2 },
    { id: 'R3-d', level: 2 },
    { id: 'R3-a-1', level: 3 },
    { id: 'R3-a-2', level: 3 },
    { id: 'R3-b-1', level: 3 },
    { id: 'R3-c-1', level: 3 },
    { id: 'R3-c-2', level: 3 },
    { id: 'R3-d-1', level: 3 },
  ],
  edges: [
    { id: 'e0', source: 'R1', target: 'R1-a' },
    { id: 'e1', source: 'R1', target: 'R1-b' },
    { id: 'e2', source: 'R1', target: 'R1-c' },
    { id: 'e3', source: 'R1', target: 'R1-d' },
    { id: 'e4', source: 'R1', target: 'R1-e' },
    { id: 'e5', source: 'R1-a', target: 'R1-a-1' },
    { id: 'e6', source: 'R1-a', target: 'R1-a-2' },
    { id: 'e7', source: 'R1-a', target: 'R1-a-3' },
    { id: 'e8', source: 'R1-c', target: 'R1-c-1' },
    { id: 'e9', source: 'R1-e', target: 'R1-e-1' },
    { id: 'e10', source: 'R1-e', target: 'R1-e-2' },
    { id: 'e11', source: 'R2', target: 'R2-a' },
    { id: 'e12', source: 'R2', target: 'R2-b' },
    { id: 'e13', source: 'R2-a', target: 'R2-a-1' },
    { id: 'e14', source: 'R2-a-1', target: 'R2-a-1-1' },
    { id: 'e15', source: 'R2-a-1-1', target: 'R2-a-1-1-1' },
    { id: 'e16', source: 'R3', target: 'R3-a' },
    { id: 'e17', source: 'R3', target: 'R3-b' },
    { id: 'e18', source: 'R3', target: 'R3-c' },
    { id: 'e19', source: 'R3', target: 'R3-d' },
    { id: 'e20', source: 'R3-a', target: 'R3-a-1' },
    { id: 'e21', source: 'R3-a', target: 'R3-a-2' },
    { id: 'e22', source: 'R3-b', target: 'R3-b-1' },
    { id: 'e23', source: 'R3-c', target: 'R3-c-1' },
    { id: 'e24', source: 'R3-c', target: 'R3-c-2' },
    { id: 'e25', source: 'R3-d', target: 'R3-d-1' },
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
});

describe('computeLayout edge routes (issue #12)', () => {
  it("every route starts at the source node's east-port position and ends at the target node's west-port position", async () => {
    const { positions, routes } = await computeLayout(FOREST);

    // These are the exact points React Flow draws the Source/Target Handle
    // at (vertical center of the node's right/left edge respectively). This
    // is the whole point of pinning FIXED_POS ports in computeLayout: before
    // the fix, ELK spread edge endpoints along a node's side instead of
    // anchoring them to the Handle, so the drawn line visibly detached from
    // the dot.
    for (const edge of FOREST.edges) {
      const route = routes.get(edge.id);
      expect(route).toBeDefined();
      const sourcePos = positions.get(edge.source)!;
      const targetPos = positions.get(edge.target)!;
      expect(route![0]).toEqual({ x: sourcePos.x + NODE_WIDTH, y: sourcePos.y + NODE_HEIGHT / 2 });
      expect(route![route!.length - 1]).toEqual({ x: targetPos.x, y: targetPos.y + NODE_HEIGHT / 2 });
    }
  });

  it('returns exactly one route per caller-supplied edge and never leaks a virtual-root-originated route', async () => {
    const { routes } = await computeLayout(FOREST);

    // Mirrors the "does not leak the internal virtual root into the
    // returned positions" test above: the virtual root's synthetic edges
    // (`${VIRTUAL_ROOT_ID}->...`) are as much an implementation detail as
    // the virtual root node itself and must not reach callers.
    expect(routes.size).toBe(FOREST.edges.length);
    expect([...routes.keys()].sort()).toEqual(FOREST.edges.map((e) => e.id).sort());
  });

  it("gives every child of one parent the same vertical lane, but a different lane from another parent's edges whenever the two parents' vertical spans touch or overlap in the same channel", async () => {
    const { routes } = await computeLayout(CHANNEL_CONGESTION);
    const levelBySourceId = new Map(CHANNEL_CONGESTION.nodes.map((n) => [n.id, n.level]));

    // A "trunk" is the vertical segment of a bent route — the part that, pre
    // -fix, always sat on the exact same x for every edge in a channel and
    // is what issue #12 is about. A route with only 2 points (source ->
    // target, no bend) has no vertical segment at all — ELK only bends a
    // route when the source and target y differ — so those are excluded:
    // there is no "lane" for a straight line to collide with.
    type Trunk = { source: string; channel: number; yMin: number; yMax: number; laneX: number };
    const trunks: Trunk[] = [];
    for (const edge of CHANNEL_CONGESTION.edges) {
      const route = routes.get(edge.id)!;
      if (route.length <= 2) continue;
      const laneX = route[1].x;
      const ys = route.map((p) => p.y);
      trunks.push({
        source: edge.source,
        channel: levelBySourceId.get(edge.source)!,
        yMin: Math.min(...ys),
        yMax: Math.max(...ys),
        laneX,
      });
    }

    // Same parent -> same lane. This is the "organizational trunk" behavior
    // computeLayout deliberately keeps (see the ELK graph comment in
    // layout.ts): a parent's own children sharing one lane is what makes a
    // multi-child branch read as one trunk, not a bug.
    const trunksBySource = new Map<string, Trunk[]>();
    for (const t of trunks) {
      if (!trunksBySource.has(t.source)) trunksBySource.set(t.source, []);
      trunksBySource.get(t.source)!.push(t);
    }
    for (const group of trunksBySource.values()) {
      expect(new Set(group.map((t) => t.laneX)).size).toBe(1);
    }

    // Different parents, same channel (i.e. same pair of adjacent business
    // levels — the same visual "column gap"), vertical spans touching or
    // overlapping -> must NOT share a lane. This is issue #12 itself: before
    // the port fix, every edge in a channel bent through the same x
    // regardless of whose subtree it belonged to, so overlapping branches
    // visually fused into one line.
    let overlappingCrossParentPairs = 0;
    for (let i = 0; i < trunks.length; i++) {
      for (let j = i + 1; j < trunks.length; j++) {
        const a = trunks[i];
        const b = trunks[j];
        if (a.source === b.source || a.channel !== b.channel) continue;
        const touchesOrOverlaps = a.yMin <= b.yMax && b.yMin <= a.yMax;
        if (!touchesOrOverlaps) continue;
        overlappingCrossParentPairs++;
        expect(a.laneX).not.toBe(b.laneX);
      }
    }
    // Guard against a vacuous pass: CHANNEL_CONGESTION must actually
    // exercise the touching/overlapping case at least once, or the loop
    // above never runs a single assertion. (Verified empirically: R3-c's
    // and R3-d's level2->3 spans touch at y=1468.)
    expect(overlappingCrossParentPairs).toBeGreaterThan(0);
  });
});

describe('toFlowElements (issue #12: ELK-routed edges)', () => {
  // Pure/sync fixtures — toFlowElements itself doesn't call ELK, so routes
  // here are hand-built rather than sourced from computeLayout, same
  // reasoning as the computeColumnPositions tests below.
  const positions = new Map([
    ['p1', { x: 0, y: 0 }],
    ['c1', { x: 332, y: 0 }],
    ['c2', { x: 332, y: 150 }],
  ]);

  it("emits type 'elk' with data.points equal to the route, for an edge that has one", () => {
    const routePoints = [
      { x: NODE_WIDTH, y: NODE_HEIGHT / 2 },
      { x: NODE_WIDTH + 40, y: NODE_HEIGHT / 2 },
      { x: NODE_WIDTH + 40, y: 150 + NODE_HEIGHT / 2 },
      { x: 332, y: 150 + NODE_HEIGHT / 2 },
    ];
    const routes = new Map([['e1', routePoints]]);
    const edgeDefs = [{ id: 'e1', source: 'p1', target: 'c2', label: '0.50', highlighted: false }];

    const { edges } = toFlowElements(['p1', 'c1', 'c2'], positions, () => ({}), edgeDefs, routes);

    expect(edges).toHaveLength(1);
    expect(edges[0]!.type).toBe('elk');
    expect((edges[0]!.data as ElkEdgeData).points).toEqual(routePoints);
  });

  it('does not throw for an edge missing from routes, and leaves data.points undefined so ElkEdge can fall back', () => {
    // Mirrors the "no section for this edge" case documented on
    // `LayoutResult.routes` in layout.ts: the id is simply absent from the
    // map, not mapped to an empty array or an error.
    const routes = new Map<string, { x: number; y: number }[]>();
    const edgeDefs = [{ id: 'e1', source: 'p1', target: 'c1', label: '', highlighted: false }];

    expect(() => toFlowElements(['p1', 'c1'], positions, () => ({}), edgeDefs, routes)).not.toThrow();

    const { edges } = toFlowElements(['p1', 'c1'], positions, () => ({}), edgeDefs, routes);
    expect((edges[0]!.data as ElkEdgeData).points).toBeUndefined();
  });

  it('carries highlighted/label/zIndex through unchanged (§4.3 selected-path highlight regression guard)', () => {
    const routes = new Map<string, { x: number; y: number }[]>();
    const edgeDefs = [
      { id: 'e1', source: 'p1', target: 'c1', label: '0.75', highlighted: true },
      { id: 'e2', source: 'p1', target: 'c2', label: '0.25', highlighted: false },
    ];

    const { edges } = toFlowElements(['p1', 'c1', 'c2'], positions, () => ({}), edgeDefs, routes);
    const byId = new Map(edges.map((e) => [e.id, e]));

    const highlighted = byId.get('e1')!;
    expect((highlighted.data as ElkEdgeData).highlighted).toBe(true);
    expect((highlighted.data as ElkEdgeData).label).toBe('0.75');
    expect(highlighted.zIndex).toBe(10);

    const notHighlighted = byId.get('e2')!;
    expect((notHighlighted.data as ElkEdgeData).highlighted).toBe(false);
    expect((notHighlighted.data as ElkEdgeData).label).toBe('0.25');
    expect(notHighlighted.zIndex).toBe(0);
  });

  it('keeps source/target on the emitted edge (React Flow needs them regardless of custom rendering)', () => {
    const routes = new Map<string, { x: number; y: number }[]>();
    const edgeDefs = [{ id: 'e1', source: 'p1', target: 'c1', label: '', highlighted: false }];

    const { edges } = toFlowElements(['p1', 'c1'], positions, () => ({}), edgeDefs, routes);
    expect(edges[0]!.source).toBe('p1');
    expect(edges[0]!.target).toBe('c1');
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
