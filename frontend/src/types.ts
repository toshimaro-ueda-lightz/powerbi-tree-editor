// Frontend-facing service types. `TreeNodeView` / `TreeSnapshot` / the input
// shapes are the JSON wire contract shared with the api/ server, defined
// once in packages/domain and re-exported here so components have a single
// stable import path that isn't `mock/`.
//
// `OperationResult` / `AddChildResult` (string `reason`, not a code) stay
// frontend-only: mockService already produces the human-readable string
// directly, and apiService maps the server's `{ ok:false, code }` into this
// same shape via STRINGS.serviceReason — so callers (components, App.tsx)
// never need to know which service implementation is behind them.

export type {
  NewChildInput,
  NodeUpdateInput,
  TreeNodeView,
  TreeSnapshot,
  WeightUpdateItem,
} from '@powerbi-tree-editor/domain';

export type OperationResult = { ok: true } | { ok: false; reason: string };
export type AddChildResult = { ok: true; nodeId: string } | { ok: false; reason: string };

/** Header save-state display, per the screen spec (保存済み/未保存/保存中/保存失敗). */
export type SaveStatus = 'idle' | 'saving' | 'error';
