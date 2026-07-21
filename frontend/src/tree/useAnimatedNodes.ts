import { useEffect, useRef, useState } from 'react';
import type { Node } from '@xyflow/react';
import { ANIMATION_DURATION_MS, resolveNodePosition, type Point } from './animatePositions';

/**
 * Takes the layout's `Node[]` (positions freshly computed by ELK/mrtree on
 * every add/remove/collapse) and returns a `Node[]` whose *positions* are
 * tweened toward those layout positions over `ANIMATION_DURATION_MS`,
 * instead of jumping there instantly (Notion 画面設計書 §4.3: "追加・除去で
 * ツリーの形が変わるときは、ノードを新しい位置へ連続的に移動させる").
 *
 * INVARIANT: the returned array always reflects the latest `flowNodes` node
 * *set* and `data`. Only `position` is ever allowed to lag behind. The node
 * set and data are therefore committed synchronously from this effect —
 * never only from inside the rAF callback, which does not run at all while
 * the tab is hidden. (Regression: committing solely inside `tick` meant that
 * adding a node in a background tab left the canvas frozen at the old node
 * set — the add succeeded server-side and the header showed 未保存の変更, but
 * the new node never reached the DOM. See `useAnimatedNodes.test.ts`.)
 *
 * Implemented as a hand-rolled `requestAnimationFrame` loop (no dependency
 * added — see the issue notes: React Flow's own position-tween example is
 * Pro-only and not reusable here).
 */
export function useAnimatedNodes<TData extends Record<string, unknown>>(
  flowNodes: Node<TData>[],
): Node<TData>[] {
  const [displayNodes, setDisplayNodes] = useState<Node<TData>[]>(flowNodes);

  // The actual on-screen position of every node as of the most recently
  // committed frame. This is what a new animation must tween *from* — using
  // the previous layout's target position instead would jump when a second
  // layout arrives mid-animation (e.g. clicking "+" twice in a row).
  const displayPositionsRef = useRef<Map<string, Point>>(new Map());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // A new `flowNodes` arrived: stop whatever loop was still running for
    // the previous one before starting fresh (also covers unmount).
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const previousPositions = displayPositionsRef.current;
    const from = new Map<string, Point>();
    let needsAnimation = false;
    for (const node of flowNodes) {
      const prev = previousPositions.get(node.id);
      if (prev) {
        from.set(node.id, prev);
        if (prev.x !== node.position.x || prev.y !== node.position.y) {
          needsAnimation = true;
        }
      }
      // No `prev`: brand-new node (or the very first layout after mount).
      // Leave it out of `from` so `resolveNodePosition` places it directly
      // at its target position, un-animated.
    }

    /** Commits every node at its final layout position, ending the tween. */
    const commitFinal = () => {
      displayPositionsRef.current = new Map(flowNodes.map((n) => [n.id, n.position]));
      // Pass `flowNodes` through by reference: no per-node object churn, and
      // the nodes keep the identity React Flow has already seen.
      setDisplayNodes(flowNodes);
    };

    /** Commits every node at animation progress `t` (0..1, pre-easing). */
    const commitAt = (t: number) => {
      const nextPositions = new Map<string, Point>();
      const nextNodes = flowNodes.map((node) => {
        const position = resolveNodePosition(from.get(node.id), node.position, t);
        nextPositions.set(node.id, position);
        return { ...node, position };
      });
      displayPositionsRef.current = nextPositions;
      setDisplayNodes(nextNodes);
    };

    // While the tab is hidden the browser does not fire rAF at all, so a
    // loop started here would never advance — and there is nobody watching
    // the tween anyway. Commit the targets and skip the loop entirely, the
    // same treatment as the "nothing moved" case.
    const isHidden = typeof document !== 'undefined' && document.hidden;

    if (!needsAnimation || isHidden) {
      commitFinal();
      return undefined;
    }

    // Commit t=0 synchronously *before* scheduling the loop, so the new node
    // set and data are on screen for this render rather than waiting on the
    // first frame. Existing nodes sit at their previous display position and
    // new nodes at their target — the tween starts from exactly here.
    commitAt(0);

    const startTime = performance.now();

    const tick = (now: number) => {
      const t = (now - startTime) / ANIMATION_DURATION_MS;
      if (t >= 1) {
        // Snap exactly onto the layout positions and stop the loop. If the
        // tab was hidden mid-tween, rAF resumes with a much later `now`, so
        // `t` is already >= 1 here and the frozen tween self-corrects to the
        // target rather than staying stuck where it stopped.
        commitFinal();
        rafIdRef.current = null;
        return;
      }
      commitAt(t);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [flowNodes]);

  return displayNodes;
}
