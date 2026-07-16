import styled from 'styled-components';
import { COLUMN_HEADER_HEIGHT } from './types';

export const ColumnHeadersBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: ${COLUMN_HEADER_HEIGHT}px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  z-index: 5;
`;

export const ColumnHeaderLabel = styled.div`
  position: absolute;
  top: 0;
  height: ${COLUMN_HEADER_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
`;
