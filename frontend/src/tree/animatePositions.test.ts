import { describe, expect, it } from 'vitest';
import { easeOutCubic, interpolatePosition, resolveNodePosition } from './animatePositions';

describe('easeOutCubic', () => {
  it('returns 0 at t=0 and 1 at t=1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('clamps out-of-range t instead of overshooting', () => {
    expect(easeOutCubic(-0.5)).toBe(0);
    expect(easeOutCubic(1.5)).toBe(1);
  });

  it('is not a linear ramp (front-loaded: > t before the midpoint)', () => {
    // ease-out cubic reaches most of the distance quickly, then settles —
    // at t=0.5 it should already be well past the linear midpoint of 0.5.
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('interpolatePosition', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 100, y: 200 };

  it('returns the start position at t=0', () => {
    expect(interpolatePosition(from, to, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns the target position at t=1', () => {
    expect(interpolatePosition(from, to, 1)).toEqual({ x: 100, y: 200 });
  });

  it('interpolates independently on each axis for an off-origin start', () => {
    const start = { x: 50, y: -20 };
    const end = { x: 150, y: 80 };
    const mid = interpolatePosition(start, end, 1);
    expect(mid).toEqual(end);
  });
});

describe('resolveNodePosition', () => {
  const target = { x: 300, y: 40 };

  it('places a node with no previous position directly at the target, regardless of t', () => {
    expect(resolveNodePosition(undefined, target, 0)).toEqual(target);
    expect(resolveNodePosition(undefined, target, 0.5)).toEqual(target);
    expect(resolveNodePosition(undefined, target, 1)).toEqual(target);
  });

  it('starts exactly at the previous position when t=0', () => {
    const previous = { x: 0, y: 0 };
    expect(resolveNodePosition(previous, target, 0)).toEqual(previous);
  });

  it('lands exactly on the target when t=1', () => {
    const previous = { x: 0, y: 0 };
    expect(resolveNodePosition(previous, target, 1)).toEqual(target);
  });

  it('lands exactly on the target once t has advanced past 1 (animation overrun)', () => {
    const previous = { x: 0, y: 0 };
    expect(resolveNodePosition(previous, target, 1.2)).toEqual(target);
  });

  it('is strictly between previous and target at an intermediate t', () => {
    const previous = { x: 0, y: 0 };
    const mid = resolveNodePosition(previous, target, 0.5);
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(target.x);
    expect(mid.y).toBeGreaterThan(0);
    expect(mid.y).toBeLessThan(target.y);
  });
});
