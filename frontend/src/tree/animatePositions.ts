// Pure helpers behind `useAnimatedNodes`'s position-tween animation.
// Split out from the hook itself so the actual math (easing + lerp) is
// trivially unit-testable without touching React/rAF — see
// `animatePositions.test.ts`.

export interface Point {
  x: number;
  y: number;
}

/** Duration (ms) of the position tween when a node moves to a new layout position. */
export const ANIMATION_DURATION_MS = 300;

/**
 * Ease-out cubic: fast start, gentle settle. `t` is clamped to [0, 1] so
 * callers don't need to guard against a slightly-overshooting elapsed-time
 * ratio (e.g. a frame landing a hair past the nominal duration).
 */
export function easeOutCubic(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - clamped) ** 3;
}

/**
 * Interpolates a single point from `from` to `to` at progress `t` (0..1,
 * pre-easing), applying `easeOutCubic`. At `t=0` this returns `from`
 * (identical values, not just equal); at `t=1` it returns `to`.
 */
export function interpolatePosition(from: Point, to: Point, t: number): Point {
  const eased = easeOutCubic(t);
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
  };
}

/**
 * Resolves the display position for one node given its previous displayed
 * position (if any) and its new target position, at progress `t` (0..1).
 *
 * `previous` is `undefined` for a node that didn't exist in the prior frame
 * (brand-new node, or the very first layout after mount): per §4.3, such a
 * node must appear directly at `target`, never tween in from an arbitrary
 * origin (e.g. (0,0)).
 */
export function resolveNodePosition(previous: Point | undefined, target: Point, t: number): Point {
  if (!previous) return target;
  if (t >= 1) return target;
  return interpolatePosition(previous, target, t);
}
