// Fixed level-1..6 column header row (screen spec §4.3: "第1〜6階層の列見出しを
// 固定表示する"). Renders one label per level that currently has at least one
// visible node — see `computeColumnPositions` in layout.ts for why a level
// with no visible nodes has no x to anchor a header to. Follows horizontal
// pan/zoom (screen-space x recomputed from the ELK world-space column x via
// react-flow's viewport), but stays pinned to the top of the canvas
// regardless of vertical pan.
import { useViewport } from '@xyflow/react';
import { STRINGS } from '../strings';
import { NODE_WIDTH } from './types';
import { ColumnHeaderLabel, ColumnHeadersBar } from './ColumnHeaders.styled';

export interface ColumnHeadersProps {
  columnPositions: Map<number, number>;
}

export function ColumnHeaders({ columnPositions }: ColumnHeadersProps) {
  const viewport = useViewport();
  const levels = [...columnPositions.keys()].sort((a, b) => a - b);
  if (levels.length === 0) return null;

  return (
    <ColumnHeadersBar>
      {levels.map((level) => {
        const worldX = columnPositions.get(level)!;
        const screenX = viewport.x + worldX * viewport.zoom;
        const width = NODE_WIDTH * viewport.zoom;
        return (
          <ColumnHeaderLabel key={level} style={{ left: screenX, width }}>
            {STRINGS.editPanel.levelText[level]}
          </ColumnHeaderLabel>
        );
      })}
    </ColumnHeadersBar>
  );
}
