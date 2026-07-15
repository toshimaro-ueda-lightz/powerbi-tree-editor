// Shared presentational primitives used across multiple components
// (buttons, banners, form fields, etc). Extracted here instead of being
// redefined per-component to avoid duplicating the same CSS in several
// `*.tsx` files (mirrors the former shared `.button` / `.banner` / ...
// classes in `index.css`).
import styled, { css } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const Button = styled.button<{ $variant: ButtonVariant; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ $small }) => ($small ? '4px 8px' : '6px 12px')};
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: ${({ $small }) => ($small ? '11px' : '12px')};
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.2;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.accent};
          color: #fff;

          &:hover:not(:disabled) {
            background: ${theme.colors.accentStrong};
          }
        `;
      case 'secondary':
        return css`
          background: ${theme.colors.surface};
          color: ${theme.colors.text};
          border-color: ${theme.colors.borderStrong};

          &:hover:not(:disabled) {
            background: ${theme.colors.surfaceMuted};
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.colors.textMuted};
          border-color: ${theme.colors.border};
        `;
      case 'danger':
        return css`
          background: ${theme.colors.dangerBg};
          color: ${theme.colors.danger};
          border-color: ${theme.colors.dangerBorder};

          &:hover:not(:disabled) {
            background: ${theme.colors.dangerHoverBg};
          }
        `;
      default:
        return '';
    }
  }}

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.text};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

/** Error banner (the only variant currently used by the app). */
export const Banner = styled.div`
  padding: 8px 12px;
  border-radius: 5px;
  font-size: 12px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  background: ${({ theme }) => theme.colors.dangerBg};
  color: ${({ theme }) => theme.colors.danger};
  border: 1px solid ${({ theme }) => theme.colors.dangerBorder};
`;

/** Small muted pill (the only variant currently used by the app). */
export const Tag = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Hint = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

/** Label + input/select stack used throughout the edit panel and dialogs. */
export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  input,
  select {
    padding: 6px 8px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    width: 100%;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }

  input:disabled {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textFaint};
  }
`;
