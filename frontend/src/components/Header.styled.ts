import styled from 'styled-components';

export const HeaderBar = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  height: 52px;
  min-height: 52px;
  padding: 0 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

export const Brand = styled.div`
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text};
`;

export const Field = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  label {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  select {
    padding: 5px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    min-width: 120px;
  }
`;

export const FiscalYearField = styled(Field)`
  gap: 2px;
`;

export const FiscalYearValue = styled.span`
  min-width: 68px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
`;

export const Spacer = styled.div`
  flex: 1;
`;

export const DirtyIndicator = styled.span<{ $dirty: boolean; $saving?: boolean }>`
  font-size: 12px;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 999px;
  color: ${({ $dirty, $saving, theme }) => ($saving ? theme.colors.textMuted : $dirty ? theme.colors.dirtyText : theme.colors.success)};
  background: ${({ $dirty, $saving, theme }) => ($saving ? theme.colors.surfaceMuted : $dirty ? theme.colors.dirtyBg : theme.colors.successBg)};
`;
