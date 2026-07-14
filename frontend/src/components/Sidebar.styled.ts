import styled from 'styled-components';

export const SidebarAside = styled.aside`
  width: 236px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  padding: 14px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  select {
    padding: 6px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    width: 100%;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const SearchBox = styled.div`
  position: relative;

  input {
    padding: 6px 8px;
    padding-left: 26px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    width: 100%;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const SearchIcon = styled.span`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textFaint};
  display: inline-flex;
`;

export const Actions = styled(Section)`
  gap: 8px;
`;

export const Legend = styled.div`
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const LegendTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const LegendSwatch = styled.span<{ $variant: 'common' | 'dept' | 'path' }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
  flex-shrink: 0;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'common':
        return `background: #dbe6fb; border: 1px solid ${theme.colors.accent};`;
      case 'dept':
        return `background: #ffffff; border: 1px solid ${theme.colors.borderStrong};`;
      case 'path':
        return `background: ${theme.colors.accent};`;
      default:
        return '';
    }
  }}
`;
