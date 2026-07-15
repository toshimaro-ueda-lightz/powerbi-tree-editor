// Kept as a re-export shim for backward compatibility — the canonical
// definitions now live in `../types` (frontend-facing) and
// `@powerbi-tree-editor/domain` (shared with api/), so that api-consuming
// code never has to depend on `mock/`. Prefer importing from `../types`
// directly in new code.
export * from '../types';
