import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STRINGS } from '../strings';

// apiService keeps module-level state (dirty flag / version / last tree), so
// each test re-imports it fresh via resetModules + dynamic import.
async function freshService() {
  vi.resetModules();
  return import('./apiService');
}

/** Stubs fetch with a per-path handler map: 'METHOD /path' -> response body. */
function stubFetch(routes: Record<string, unknown>, status = 200) {
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url);
    const method = init?.method ?? 'GET';
    const key = `${method} ${path}`;
    const body = routes[key];
    if (body === undefined) throw new Error(`unstubbed request: ${key}`);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // The module self-calls GET /api/state on import; give it a default.
  stubFetch({ 'GET /api/state': { isDirty: false } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('save: temp id -> real id mapping is handed back to the caller', () => {
  it('returns the idMap from the save response', async () => {
    const idMap = { 'temp-node-abc': '10054', 'temp-edge-def': '115' };
    stubFetch({
      'GET /api/state': { isDirty: false },
      'POST /api/save': { ok: true, idMap },
    });
    const service = await freshService();

    await expect(service.save()).resolves.toEqual(idMap);
  });

  it('returns an empty map (not undefined) when the save created no new rows', async () => {
    stubFetch({
      'GET /api/state': { isDirty: false },
      'POST /api/save': { ok: true, idMap: {} },
    });
    const service = await freshService();

    await expect(service.save()).resolves.toEqual({});
  });

  it('tolerates a response with no idMap field at all', async () => {
    stubFetch({
      'GET /api/state': { isDirty: false },
      'POST /api/save': { ok: true },
    });
    const service = await freshService();

    await expect(service.save()).resolves.toEqual({});
  });

  it('clears the dirty flag after a successful save', async () => {
    stubFetch({
      'GET /api/state': { isDirty: false },
      'POST /api/departments/D04/nodes': { ok: true, nodeId: 'temp-node-abc' },
      'POST /api/save': { ok: true, idMap: { 'temp-node-abc': '10054' } },
    });
    const service = await freshService();

    await service.addChildNode('D04', '102', { name: 'x', weight: 1 });
    expect(service.isDirty()).toBe(true);

    await service.save();
    expect(service.isDirty()).toBe(false);
  });

  it('throws (so the caller can show 保存失敗) and stays dirty when the save fails', async () => {
    stubFetch({
      'GET /api/state': { isDirty: false },
      'POST /api/departments/D04/nodes': { ok: true, nodeId: 'temp-node-abc' },
      'POST /api/save': { ok: false, code: 'UNKNOWN_ERROR' },
    });
    const service = await freshService();

    await service.addChildNode('D04', '102', { name: 'x', weight: 1 });
    await expect(service.save()).rejects.toThrow(STRINGS.serviceReason.unknown);
    expect(service.isDirty()).toBe(true);
  });
});

describe('error codes map to the single source of wording in strings.ts', () => {
  it('maps a business-rule failure code to its STRINGS.serviceReason text', async () => {
    stubFetch({
      'GET /api/state': { isDirty: false },
      'POST /api/departments/D04/nodes': { ok: false, code: 'ADD_CHILD_PROGRESS_LOCKED' },
    });
    const service = await freshService();

    const result = await service.addChildNode('D04', '102', { name: 'x', weight: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(STRINGS.serviceReason.addChildProgressLocked);
  });

  it('surfaces a network failure as the network-error wording rather than throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const service = await freshService();

    const result = await service.updateProgress('D04', '1001', 0.5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(STRINGS.serviceReason.networkError);
  });
});
