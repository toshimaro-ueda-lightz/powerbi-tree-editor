import styled, { css } from 'styled-components';
import type { Scope } from '../domain/types';

export const NodeCard = styled.div<{ $scope: Scope; $selected: boolean; $onPath: boolean; $dimmed: boolean }>`
  width: 236px;
  min-height: 112px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 7px;
  padding: 8px 10px 10px;
  position: relative;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  transition: box-shadow 0.15s, border-color 0.15s, opacity 0.15s;
  cursor: pointer;

  ${({ $scope, theme }) =>
    $scope === 'common' &&
    css`
      background: ${theme.colors.accentBg};
      border-color: #aec2ef;
    `}

  ${({ $selected, theme }) =>
    $selected &&
    css`
      border-color: ${theme.colors.accent};
      box-shadow: 0 0 0 2px ${theme.colors.accent};
    `}

  ${({ $onPath, $selected, theme }) =>
    $onPath &&
    !$selected &&
    css`
      border-color: ${theme.colors.accent};
      box-shadow: 0 0 0 1px ${theme.colors.accent};
    `}

  ${({ $dimmed }) =>
    $dimmed &&
    css`
      opacity: 0.32;
    `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
`;

export const LevelBadge = styled.span<{ $scope: Scope }>`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.textMuted};

  ${({ $scope, theme }) =>
    $scope === 'common' &&
    css`
      background: ${theme.colors.accent};
      color: #fff;
      border-color: ${theme.colors.accent};
    `}
`;

export const Assignee = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CollapseButton = styled.button`
  margin-left: auto;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 3px;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`;

export const Name = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

export const Subtitle = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
`;

export const ProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.colors.accent};
  border-radius: 999px;
`;

export const ProgressPct = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  min-width: 30px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

export const CalcTag = styled.span`
  display: inline-block;
  margin-top: 4px;
  font-size: 9.5px;
  color: ${({ theme }) => theme.colors.textFaint};
`;

export const Area = styled.div`
  margin-top: 4px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const NodeActions = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
`;

export const NodeIconButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textFaint};
  display: flex;
  align-items: center;
  padding: 3px;
  border-radius: 3px;

  &:hover {
    background: ${({ theme }) => theme.colors.dangerBg};
    color: ${({ theme }) => theme.colors.danger};
  }
`;

export const AddButton = styled.button`
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.colors.accent};
  background: #fff;
  color: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;

  &:hover {
    background: ${({ theme }) => theme.colors.accent};
    color: #fff;
  }
`;
