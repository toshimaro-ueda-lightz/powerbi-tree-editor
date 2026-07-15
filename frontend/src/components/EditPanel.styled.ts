import styled from 'styled-components';
import { Button } from './ui';

export const EditPanelAside = styled.aside`
  width: 300px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surface};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  padding: 14px 14px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const EditPanelEmpty = styled(EditPanelAside)`
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  padding: 24px;
`;

export const Title = styled.h2`
  font-size: 14px;
  font-weight: 700;
  margin: 0;
`;

export const Meta = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  font-size: 12px;
  margin: 0;

  dt {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    word-break: break-all;
  }
`;

export const SaveButton = styled(Button)`
  align-self: flex-start;
`;

export const ReadonlyNote = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
  line-height: 1.5;
`;

export const WeightRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const WeightValue = styled.span`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

export const ProgressEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  input[type='range'] {
    width: 100%;
  }
`;

export const ProgressNumberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  input {
    width: 70px;
  }
`;

export const ComputedValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DetachButton = styled(Button)`
  margin-top: 8px;
`;
