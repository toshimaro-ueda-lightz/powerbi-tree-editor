import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { buildElkEdgePath } from './ElkEdge';

const ENDPOINTS_BASE = {
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

describe('buildElkEdgePath', () => {
  it('keeps ELK bend points but snaps the first/last point to the real Handle coordinates', () => {
    // Simulates a node that rendered taller than NODE_HEIGHT (see the
    // buildElkEdgePath doc comment): ELK's own start/end points (y: 56, 200)
    // differ from the actual Handle position React Flow reports
    // (sourceY: 60, targetY: 210).
    const elkPoints = [
      { x: 0, y: 56 }, // ELK startPoint (source EAST port)
      { x: 50, y: 56 }, // bend
      { x: 50, y: 150 }, // bend
      { x: 236, y: 200 }, // ELK endPoint (target WEST port)
    ];

    const result = buildElkEdgePath(elkPoints, {
      ...ENDPOINTS_BASE,
      sourceX: 0,
      sourceY: 60,
      targetX: 236,
      targetY: 210,
    });

    expect(result.path).toBe('M0,60 L50,56 L50,150 L236,210');
    // Label = midpoint of the final segment, using the snapped target point.
    expect(result.labelX).toBe((50 + 236) / 2);
    expect(result.labelY).toBe((150 + 210) / 2);
  });

  it('is a no-op when the reported points already match the Handle coordinates (the common case)', () => {
    const elkPoints = [
      { x: 0, y: 56 },
      { x: 118, y: 56 },
      { x: 118, y: 56 },
      { x: 236, y: 56 },
    ];

    const result = buildElkEdgePath(elkPoints, {
      ...ENDPOINTS_BASE,
      sourceX: 0,
      sourceY: 56,
      targetX: 236,
      targetY: 56,
    });

    expect(result.path).toBe('M0,56 L118,56 L118,56 L236,56');
  });

  it('handles a straight edge with no bend points', () => {
    const elkPoints = [
      { x: 0, y: 56 },
      { x: 236, y: 56 },
    ];

    const result = buildElkEdgePath(elkPoints, {
      ...ENDPOINTS_BASE,
      sourceX: 0,
      sourceY: 60,
      targetX: 236,
      targetY: 60,
    });

    expect(result.path).toBe('M0,60 L236,60');
    expect(result.labelX).toBe(118);
    expect(result.labelY).toBe(60);
  });

  it('falls back to a smoothstep path when there is no ELK route', () => {
    const endpoints = {
      ...ENDPOINTS_BASE,
      sourceX: 0,
      sourceY: 56,
      targetX: 236,
      targetY: 56,
    };

    const withoutRoute = buildElkEdgePath(undefined, endpoints);
    const withShortRoute = buildElkEdgePath([{ x: 0, y: 56 }], endpoints);

    // A smoothstep path is not a straight M/L polyline (it has curve
    // commands), so it never starts with "M0,56 L" the way the ELK branch
    // above does.
    expect(withoutRoute.path).not.toMatch(/^M0,56 L/);
    expect(withoutRoute.path.length).toBeGreaterThan(0);
    expect(withShortRoute).toEqual(withoutRoute);
  });
});
