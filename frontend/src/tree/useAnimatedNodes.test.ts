import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { useAnimatedNodes } from './useAnimatedNodes';

interface TestData extends Record<string, unknown> {
  label: string;
}

function makeNode(id: string, x: number, y: number, label: string): Node<TestData> {
  return { id, type: 'treeNode', position: { x, y }, data: { label } };
}

/**
 * Replaces `requestAnimationFrame` with a stub that records the scheduled
 * callback but NEVER invokes it — exactly what the browser does while the
 * tab is in the background (`document.hidden === true`). Returns the spy so
 * tests can assert whether a loop was even scheduled.
 */
function stubNeverFiringRaf() {
  const raf = vi.fn<(cb: FrameRequestCallback) => number>(() => 1);
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return raf;
}

function stubDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

afterEach(() => {
  vi.unstubAllGlobals();
  stubDocumentHidden(false);
});

describe('useAnimatedNodes', () => {
  it('places nodes at their target positions on the first layout (no animation on mount)', () => {
    const initial = [makeNode('a', 0, 0, 'A'), makeNode('b', 300, 50, 'B')];
    const { result } = renderHook(({ nodes }) => useAnimatedNodes(nodes), {
      initialProps: { nodes: initial },
    });

    expect(result.current.map((n) => n.position)).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 50 },
    ]);
  });

  // Regression: the node set and `data` must NEVER wait on the animation
  // loop. rAF does not fire at all while the tab is hidden, so if the hook
  // only commits inside the rAF callback, adding a node in a background tab
  // leaves the canvas frozen at the old node set entirely — the server-side
  // add succeeds (tree becomes 120 nodes, header shows 未保存の変更), but the
  // new node never reaches the DOM. Only `position` is allowed to lag.
  it('reflects the latest node set and data even when requestAnimationFrame never fires', () => {
    const raf = stubNeverFiringRaf();

    const initial = [makeNode('a', 0, 0, 'A')];
    const { result, rerender } = renderHook(({ nodes }) => useAnimatedNodes(nodes), {
      initialProps: { nodes: initial },
    });

    // 'a' moves (so the hook takes its animating path) and 'b' is added.
    const next = [makeNode('a', 0, 100, 'A updated'), makeNode('b', 300, 0, 'B')];
    rerender({ nodes: next });

    expect(result.current.map((n) => n.id)).toEqual(['a', 'b']);
    expect(result.current.map((n) => n.data.label)).toEqual(['A updated', 'B']);
    // The loop was scheduled, but its callback never ran — proving the
    // commit above came from the synchronous path, not from a frame.
    expect(raf).toHaveBeenCalled();
  });

  it('lets position lag behind while the node set/data are already current (only position animates)', () => {
    stubNeverFiringRaf();

    const { result, rerender } = renderHook(({ nodes }) => useAnimatedNodes(nodes), {
      initialProps: { nodes: [makeNode('a', 0, 0, 'A')] },
    });

    rerender({ nodes: [makeNode('a', 0, 100, 'A'), makeNode('b', 300, 0, 'B')] });

    // Existing node starts the tween from its previously displayed position
    // (t=0), i.e. it has not jumped to the new y yet...
    expect(result.current[0]!.position).toEqual({ x: 0, y: 0 });
    // ...while a brand-new node is placed directly at its target (never
    // tweened in from (0,0) or anywhere else).
    expect(result.current[1]!.position).toEqual({ x: 300, y: 0 });
  });

  it('commits target positions immediately and schedules no animation loop while the tab is hidden', () => {
    const raf = stubNeverFiringRaf();
    stubDocumentHidden(true);

    const { result, rerender } = renderHook(({ nodes }) => useAnimatedNodes(nodes), {
      initialProps: { nodes: [makeNode('a', 0, 0, 'A')] },
    });

    rerender({ nodes: [makeNode('a', 0, 100, 'A updated'), makeNode('b', 300, 0, 'B')] });

    // No interpolation for a user who isn't looking: straight to the target.
    expect(result.current.map((n) => n.position)).toEqual([
      { x: 0, y: 100 },
      { x: 300, y: 0 },
    ]);
    expect(result.current.map((n) => n.data.label)).toEqual(['A updated', 'B']);
    expect(raf).not.toHaveBeenCalled();
  });

  it('does not start an animation loop when no node actually moved', () => {
    const raf = stubNeverFiringRaf();

    const { result, rerender } = renderHook(({ nodes }) => useAnimatedNodes(nodes), {
      initialProps: { nodes: [makeNode('a', 0, 0, 'A')] },
    });

    // Same position, new data (e.g. a selection/progress update).
    rerender({ nodes: [makeNode('a', 0, 0, 'A updated')] });

    expect(result.current[0]!.data.label).toBe('A updated');
    expect(raf).not.toHaveBeenCalled();
  });
});
