// Real API-backed data service — same function surface as `mock/mockService.ts`
// (see that module's comment) but every function is async, since it now goes
// over HTTP to the local Fastify API (never touching SQLite directly from
// React). The API returns error *codes* (see packages/domain/src/errors.ts);
// this module maps them to the same Japanese strings the mock service used
// to return directly, so `STRINGS.serviceReason` stays the single source of
// wording truth regardless of which service backs the UI.

import type {
  DepartmentRecord,
  ServiceReasonCode,
  ServiceReasonParams,
} from '@powerbi-tree-editor/domain';
import { STRINGS } from '../strings';
import type {
  AddChildResult,
  NewChildInput,
  NodeUpdateInput,
  OperationResult,
  TreeSnapshot,
  WeightUpdateItem,
} from '../types';

const BASE = '/api';

let dirty = false;
let version = 0;
const listeners = new Set<() => void>();

/** Last tree fetched via getTree(), used to resolve nodeId -> parentEdgeId for detachNode
 *  (the REST endpoint operates on edges per 正本 §15; the service surface stays node-based). */
let lastTree: TreeSnapshot | null = null;

function touch(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVersion(): number {
  return version;
}

export function isDirty(): boolean {
  return dirty;
}

// ---- error code -> STRINGS mapping -----------------------------------------

function reasonMessage(code: ServiceReasonCode, params?: ServiceReasonParams): string {
  const R = STRINGS.serviceReason;
  switch (code) {
    case 'NODE_NOT_FOUND':
      return R.nodeNotFound;
    case 'COMMON_NODE_READONLY':
      return R.commonNodeReadonly;
    case 'PARENT_NOT_FOUND':
      return R.parentNotFound;
    case 'ADD_CHILD_LEVEL_RANGE':
      return R.addChildLevelRange;
    case 'ADD_CHILD_PROGRESS_LOCKED':
      return R.addChildProgressLocked;
    case 'WEIGHT_RANGE':
      return R.weightRange;
    case 'ADD_CHILD_WEIGHT_SUM':
      return R.addChildWeightSum(params?.total ?? 0);
    case 'DETACH_HAS_CHILDREN':
      return R.detachHasChildren;
    case 'DETACH_NOT_IN_TREE':
      return R.detachNotInTree;
    case 'WEIGHT_SUM_INVALID':
      return R.weightSumInvalid(params?.total ?? 0, params?.diff ?? 0);
    case 'WEIGHT_CHILDREN_CHANGED':
      return R.weightChildrenChanged;
    case 'WEIGHT_CHILD_NOT_FOUND':
      return R.weightChildNotFound(params?.childNodeId ?? '');
    case 'PROGRESS_LEAF_ONLY':
      return R.progressLeafOnly;
    case 'PROGRESS_RANGE':
      return R.progressRange;
    case 'AREA_FIRST_LEVEL_ONLY':
      return R.areaFirstLevelOnly;
    case 'AREA_RANGE':
      return R.areaRange;
    case 'DEPARTMENT_NOT_FOUND':
      return R.departmentNotFound;
    case 'NETWORK_ERROR':
      return R.networkError;
    default:
      return R.unknown;
  }
}

interface RawFailure {
  ok: false;
  code: ServiceReasonCode;
  params?: ServiceReasonParams;
}

/** Low-level fetch wrapper: never throws. Network failures and non-2xx
 *  responses are normalized into the same `{ ok:false, code }` shape the
 *  business-rule failures already use, so callers only branch once. */
async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    return { ok: false, code: 'NETWORK_ERROR' } satisfies RawFailure;
  }

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    if (parsed && typeof parsed === 'object' && 'code' in parsed) {
      const p = parsed as RawFailure;
      return { ok: false, code: p.code, ...(p.params !== undefined ? { params: p.params } : {}) } satisfies RawFailure;
    }
    return { ok: false, code: 'UNKNOWN_ERROR' } satisfies RawFailure;
  }
  return parsed;
}

function isRawFailure(body: unknown): body is RawFailure {
  return Boolean(body && typeof body === 'object' && (body as { ok?: unknown }).ok === false);
}

function afterMutation(body: unknown): OperationResult {
  if (isRawFailure(body)) {
    return { ok: false, reason: reasonMessage(body.code, body.params) };
  }
  dirty = true;
  touch();
  return { ok: true };
}

// ---- reads -----------------------------------------------------------------

export async function listDepartments(): Promise<DepartmentRecord[]> {
  const body = await call('GET', '/departments');
  return Array.isArray(body) ? (body as DepartmentRecord[]) : [];
}

export async function getTree(departmentId: string, fiscalYear: number): Promise<TreeSnapshot> {
  const body = await call('GET', `/departments/${encodeURIComponent(departmentId)}/tree?fiscalYear=${fiscalYear}`);
  if (body && typeof body === 'object' && Array.isArray((body as TreeSnapshot).rootIds)) {
    lastTree = body as TreeSnapshot;
    return lastTree;
  }
  const empty: TreeSnapshot = { departmentId, fiscalYear, nodesById: {}, rootIds: [], kpiTarget: null };
  lastTree = empty;
  return empty;
}

// ---- writes ------------------------------------------------------------------

export async function updateNode(_departmentId: string, nodeId: string, patch: NodeUpdateInput): Promise<OperationResult> {
  const body = await call('PATCH', `/nodes/${encodeURIComponent(nodeId)}`, patch);
  return afterMutation(body);
}

export async function addChildNode(departmentId: string, parentNodeId: string, input: NewChildInput): Promise<AddChildResult> {
  const body = await call('POST', `/departments/${encodeURIComponent(departmentId)}/nodes`, { parentNodeId, ...input });
  if (isRawFailure(body)) {
    return { ok: false, reason: reasonMessage(body.code, body.params) };
  }
  dirty = true;
  touch();
  return { ok: true, nodeId: (body as { nodeId: string }).nodeId };
}

export async function detachNode(departmentId: string, nodeId: string): Promise<OperationResult> {
  const edgeId = lastTree?.nodesById[nodeId]?.parentEdgeId;
  if (!edgeId) {
    return { ok: false, reason: STRINGS.serviceReason.detachNotInTree };
  }
  const body = await call('DELETE', `/departments/${encodeURIComponent(departmentId)}/edges/${encodeURIComponent(edgeId)}`);
  return afterMutation(body);
}

export async function updateWeights(departmentId: string, parentNodeId: string, items: WeightUpdateItem[]): Promise<OperationResult> {
  const body = await call(
    'PATCH',
    `/departments/${encodeURIComponent(departmentId)}/nodes/${encodeURIComponent(parentNodeId)}/weights`,
    { items },
  );
  return afterMutation(body);
}

export async function updateProgress(departmentId: string, nodeId: string, outcomeProgress: number): Promise<OperationResult> {
  const body = await call(
    'PUT',
    `/departments/${encodeURIComponent(departmentId)}/nodes/${encodeURIComponent(nodeId)}/progress`,
    { outcomeProgress },
  );
  return afterMutation(body);
}

export async function updateFirstLevelArea(
  departmentId: string,
  fiscalYear: number,
  nodeId: string,
  area: number,
): Promise<OperationResult> {
  const body = await call(
    'PUT',
    `/departments/${encodeURIComponent(departmentId)}/nodes/${encodeURIComponent(nodeId)}/area?fiscalYear=${fiscalYear}`,
    { area },
  );
  return afterMutation(body);
}

// ---- session control -----------------------------------------------------------

export async function save(): Promise<void> {
  const body = await call('POST', '/save');
  if (isRawFailure(body)) {
    touch();
    throw new Error(reasonMessage(body.code, body.params));
  }
  dirty = false;
  touch();
}

export async function discard(): Promise<void> {
  const body = await call('POST', '/discard');
  if (isRawFailure(body)) {
    touch();
    throw new Error(reasonMessage(body.code, body.params));
  }
  dirty = false;
  lastTree = null;
  touch();
}

// Pick up whatever session state the server already has (e.g. the user
// reloaded the page without saving — the session lives on the server, not
// in this browser tab) as soon as this module loads.
async function refreshDirtyState(): Promise<void> {
  const body = await call('GET', '/state');
  if (body && typeof body === 'object' && typeof (body as { isDirty?: unknown }).isDirty === 'boolean') {
    dirty = (body as { isDirty: boolean }).isDirty;
    touch();
  }
}
void refreshDirtyState();
