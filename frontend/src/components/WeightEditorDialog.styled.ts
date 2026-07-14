import styled from 'styled-components';

export const WeightTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    text-align: left;
    padding: 6px 4px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  th:last-child,
  td:last-child {
    text-align: right;
    width: 100px;
  }

  input {
    width: 84px;
    padding: 5px 6px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    text-align: right;
  }
`;

export const WeightSum = styled.div<{ $valid: boolean }>`
  font-size: 12.5px;
  font-weight: 700;
  padding: 8px 10px;
  border-radius: 5px;
  background: ${({ $valid, theme }) => (theme.colors[$valid ? 'successBg' : 'dangerBg'])};
  color: ${({ $valid, theme }) => (theme.colors[$valid ? 'success' : 'danger'])};
`;
