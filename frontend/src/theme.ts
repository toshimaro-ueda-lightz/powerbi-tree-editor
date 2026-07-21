// Design tokens for styled-components' ThemeProvider.
//
// These mirror the former `:root { --color-* }` CSS custom properties 1:1
// (same names, same values) so the migration to styled-components is a
// visual no-op. `GlobalStyle` re-publishes these as CSS variables so code
// that still references `var(--color-*)` (React Flow inline styles in
// `src/tree/layout.ts` / `src/tree/TreeCanvas.tsx`) keeps working unchanged.

export const theme = {
  colors: {
    bg: '#f4f5f7',
    surface: '#ffffff',
    surfaceMuted: '#f8f9fb',
    border: '#dfe2e8',
    borderStrong: '#b9bfc9',
    text: '#1c2230',
    textMuted: '#667085',
    textFaint: '#9aa1af',
    accent: '#2f5fd6',
    accentBg: '#e8effd',
    accentStrong: '#1f45a8',
    danger: '#c0362c',
    dangerBg: '#fbeceb',
    dangerBorder: '#f0c4c0',
    dangerHoverBg: '#f6d9d6',
    success: '#1f8a55',
    successBg: '#e7f6ee',
    grid: '#e7e9ee',
    minimapNode: '#b9c3e0',
    dirtyText: '#92400e',
    dirtyBg: '#fef3c7',
  },
  fontFamily: "'Segoe UI', 'Hiragino Sans', 'Yu Gothic', system-ui, sans-serif",
} as const;

export type AppTheme = typeof theme;
