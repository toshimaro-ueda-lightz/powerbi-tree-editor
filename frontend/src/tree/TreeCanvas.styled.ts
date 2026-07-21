import styled from 'styled-components';
import { COLUMN_HEADER_HEIGHT } from './types';

export const TreeCanvasRoot = styled.div`
  position: relative;
  height: 100%;
`;

/** Reserves space for the fixed column header bar so it never overlaps node
 * cards, instead of floating the header on top of the ReactFlow canvas. */
export const ReactFlowViewport = styled.div`
  position: absolute;
  top: ${COLUMN_HEADER_HEIGHT}px;
  left: 0;
  right: 0;
  bottom: 0;
`;
