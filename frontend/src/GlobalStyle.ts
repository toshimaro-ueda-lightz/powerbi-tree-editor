import { createGlobalStyle } from 'styled-components';

// Global reset + design-token bridge. Replaces the former `src/index.css`.
//
// The `--color-*` custom properties are re-published from the theme (rather
// than removed) because a few places still consume them directly via CSS
// `var(...)`: React Flow's inline edge/minimap styles in `src/tree/layout.ts`
// and `src/tree/TreeCanvas.tsx`. Keeping the variables means those call
// sites don't need to change and the rendered output stays pixel-identical.
export const GlobalStyle = createGlobalStyle`
  :root {
    --color-bg: ${({ theme }) => theme.colors.bg};
    --color-surface: ${({ theme }) => theme.colors.surface};
    --color-surface-muted: ${({ theme }) => theme.colors.surfaceMuted};
    --color-border: ${({ theme }) => theme.colors.border};
    --color-border-strong: ${({ theme }) => theme.colors.borderStrong};
    --color-text: ${({ theme }) => theme.colors.text};
    --color-text-muted: ${({ theme }) => theme.colors.textMuted};
    --color-text-faint: ${({ theme }) => theme.colors.textFaint};
    --color-accent: ${({ theme }) => theme.colors.accent};
    --color-accent-bg: ${({ theme }) => theme.colors.accentBg};
    --color-accent-strong: ${({ theme }) => theme.colors.accentStrong};
    --color-danger: ${({ theme }) => theme.colors.danger};
    --color-danger-bg: ${({ theme }) => theme.colors.dangerBg};
    --color-success: ${({ theme }) => theme.colors.success};
    --color-grid: ${({ theme }) => theme.colors.grid};
    --color-minimap-node: ${({ theme }) => theme.colors.minimapNode};

    color-scheme: light;
    font-family: ${({ theme }) => theme.fontFamily};
    font-size: 13px;
    color: var(--color-text);
    background: var(--color-bg);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
    margin: 0;
  }

  body {
    background: var(--color-bg);
  }

  button {
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }

  input,
  select {
    font-family: inherit;
    font-size: 13px;
  }
`;
