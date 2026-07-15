// Shared, locale-agnostic error codes for API mutation failures.
//
// The server (api/) knows *which* business rule was violated and *what*
// numbers were involved, but not how to word it for a human — that wording
// lives in exactly one place: `frontend/src/strings.ts` (STRINGS.serviceReason).
// So the wire format carries a `code` (+ optional numeric/string `params`)
// instead of a message, and the frontend maps code -> STRINGS text. This
// keeps the single source of truth for user-facing wording in the frontend
// while letting api/ and frontend/ share the same code union (compile-time
// checked) via this domain package.

export type ServiceReasonCode =
  | 'NODE_NOT_FOUND'
  | 'COMMON_NODE_READONLY'
  | 'PARENT_NOT_FOUND'
  | 'ADD_CHILD_LEVEL_RANGE'
  | 'ADD_CHILD_PROGRESS_LOCKED'
  | 'WEIGHT_RANGE'
  | 'ADD_CHILD_WEIGHT_SUM'
  | 'DETACH_HAS_CHILDREN'
  | 'DETACH_NOT_IN_TREE'
  | 'WEIGHT_SUM_INVALID'
  | 'WEIGHT_CHILDREN_CHANGED'
  | 'WEIGHT_CHILD_NOT_FOUND'
  | 'PROGRESS_LEAF_ONLY'
  | 'PROGRESS_RANGE'
  | 'AREA_FIRST_LEVEL_ONLY'
  | 'AREA_RANGE'
  | 'DEPARTMENT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/** Optional numeric/string parameters a given code's message formatter needs. */
export interface ServiceReasonParams {
  total?: number;
  diff?: number;
  childNodeId?: string;
}

export type ApiFailure = { ok: false; code: ServiceReasonCode; params?: ServiceReasonParams };
export type ApiResult = { ok: true } | ApiFailure;
export type ApiAddChildResult = { ok: true; nodeId: string } | ApiFailure;
