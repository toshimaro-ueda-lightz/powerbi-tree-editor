import { memo } from 'react';
import {
  BaseEdge,
  EdgeText,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Position,
} from '@xyflow/react';

/**
 * Data payload `toFlowElements` (see `layout.ts`) attaches to every
 * `'elk'`-typed edge.
 *
 * `points` is the corresponding entry from `LayoutResult.routes` (see the
 * JSDoc on that field in `layout.ts` for the coordinate-space contract):
 * `[startPoint, ...bendPoints, endPoint]` in root-absolute coordinates,
 * `startPoint` == the source's Source Handle position, `endPoint` == the
 * target's Target Handle position. It is `undefined` whenever ELK reported
 * no route for this edge — `ElkEdge` falls back to `getSmoothStepPath` in
 * that case (see below) rather than rendering nothing.
 */
export interface ElkEdgeData extends Record<string, unknown> {
  points?: { x: number; y: number }[];
  label: string;
  highlighted: boolean;
}

export type ElkEdgeType = Edge<ElkEdgeData, 'elk'>;

export interface ElkEdgeEndpoints {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
}

/**
 * Builds the SVG path + label position for an `ElkEdge`. Pure (no React,
 * no DOM) so it can be unit tested directly instead of through a render
 * harness — see `ElkEdge.test.ts`.
 *
 * `points` is `[elkStartPoint, ...bendPoints, elkEndPoint]` (see the
 * `LayoutResult.routes` JSDoc in `layout.ts`), or `undefined` if ELK
 * reported no route for this edge.
 *
 * - ELK route available: the bend points are ELK's — they choose which
 *   vertical lane the edge's trunk runs through, which is the actual fix
 *   for issue #12, and are used verbatim. The first/last points, however,
 *   are replaced with `endpoints.sourceX/sourceY`/`targetX/targetY`, the
 *   real Handle coordinates React Flow passes in, instead of ELK's own
 *   startPoint/endPoint.
 *
 *   Why: ELK computes its WEST/EAST ports assuming every node is exactly
 *   NODE_HEIGHT tall (see the FIXED_POS ports in `layout.ts`), but a node
 *   with a long 施策名 wraps to extra lines and renders taller — measured
 *   on real data (department D04): 9 of 119 nodes render taller than
 *   NODE_HEIGHT (112), up to 138px. React Flow always draws the Handle at
 *   the *actual* rendered height's center, so for those 9 nodes ELK's port
 *   y and the real Handle y differ by up to ~13px, and drawing ELK's raw
 *   endpoints left the line not quite touching the Handle dot. Snapping
 *   the endpoints here fixes that while leaving ELK in charge of the lane.
 *   Because `layout.ts` pins both ports to `y: NODE_HEIGHT / 2` (the
 *   vertical center), this snap is a no-op for the other 110/119 nodes,
 *   where ELK's port already equals the real Handle position exactly.
 *
 * - No ELK route (`points` undefined/short): fall back to the same
 *   smoothstep path every edge used to render before routes existed,
 *   rather than drawing nothing.
 */
export function buildElkEdgePath(
  points: { x: number; y: number }[] | undefined,
  endpoints: ElkEdgeEndpoints,
): { path: string; labelX: number; labelY: number } {
  if (points && points.length >= 2) {
    const bendPoints = points.slice(1, -1);
    const { sourceX, sourceY, targetX, targetY } = endpoints;
    const allPoints = [{ x: sourceX, y: sourceY }, ...bendPoints, { x: targetX, y: targetY }];
    const path = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    // Label sits at the midpoint of the final segment (the line entering
    // the target node), not the path's overall center: the label is the
    // target's weightFromParent, so placing it immediately before the
    // target keeps it unambiguous which edge it belongs to, and since
    // distinct edges have distinct target y, their labels never collide.
    const last = allPoints[allPoints.length - 1]!;
    const secondLast = allPoints[allPoints.length - 2]!;
    return {
      path,
      labelX: (secondLast.x + last.x) / 2,
      labelY: (secondLast.y + last.y) / 2,
    };
  }

  const [smoothPath, smoothLabelX, smoothLabelY] = getSmoothStepPath(endpoints);
  return { path: smoothPath, labelX: smoothLabelX, labelY: smoothLabelY };
}

function ElkEdgeComponent({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps<ElkEdgeType>) {
  const points = data?.points;
  const highlighted = data?.highlighted ?? false;
  const label = data?.label ?? '';

  const strokeColor = highlighted ? 'var(--color-accent)' : 'var(--color-border-strong)';
  const strokeWidth = highlighted ? 2.5 : 1.5;

  // issue #12: draw the ELK-computed polyline exactly as routed (bend points
  // verbatim), instead of letting React Flow re-derive a smoothstep path from
  // just the two endpoints (which ignored ELK's chosen lane and collapsed
  // every edge in a column onto one shared vertical segment). Straight
  // polyline, no curve/corner-rounding — issue #12 keeps the org-chart
  // right-angle look. The endpoints themselves are snapped to the real
  // Handle coordinates, and a missing/short route falls back to smoothstep —
  // see `buildElkEdgePath`'s doc comment for both.
  const { path, labelX, labelY } = buildElkEdgePath(points, {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeWidth }} />
      {label ? (
        <EdgeText
          x={labelX}
          y={labelY}
          label={label}
          labelStyle={{
            fill: highlighted ? 'var(--color-accent)' : 'var(--color-text-muted)',
            fontSize: 11,
            fontWeight: 600,
          }}
          labelBgStyle={{ fill: 'var(--color-surface)', fillOpacity: 0.92 }}
          labelBgPadding={[4, 2]}
        />
      ) : null}
    </>
  );
}

export const ElkEdge = memo(ElkEdgeComponent);
