import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { migrate } from '../../db/migrate.js';
import { buildApp } from '../src/app.js';
import { __resetSessionForTests } from '../src/session.js';
import type { FastifyInstance } from 'fastify';

function newTmpDb(): string {
  return path.join(os.tmpdir(), `tree-api-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
}

/**
 * Builds a small, fully isolated 4-level tree for department 'DT':
 *   root(L1, common) -> mid(L2, common) -> parent(L3, common) -> leafA / leafB (L4, dept=DT)
 * leafA starts with outcome_progress 0.4 (>0, so add-child should be locked on it).
 * leafB starts with no progress input (add-child should be allowed on it).
 * first_level_area for 'DT' fiscal_year 2026 on `root` is 500.
 */
function seedTestDept(db: Database.Database) {
  db.prepare("INSERT INTO department (department_id, display_name) VALUES ('DT', 'テスト部')").run();

  const insertNode = db.prepare(
    'INSERT INTO node (name, subtitle, level, scope, department_id, assignee) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const rootId = Number(insertNode.run('root', null, 1, 'common', null, null).lastInsertRowid);
  const midId = Number(insertNode.run('mid', null, 2, 'common', null, null).lastInsertRowid);
  const parentId = Number(insertNode.run('parent', null, 3, 'common', null, null).lastInsertRowid);
  const leafAId = Number(insertNode.run('leaf-a', null, 4, 'dept', 'DT', 'Aさん').lastInsertRowid);
  const leafBId = Number(insertNode.run('leaf-b', null, 4, 'dept', 'DT', 'Bさん').lastInsertRowid);
  const retiredId = Number(insertNode.run('retired-leaf', null, 4, 'dept', 'DT', null).lastInsertRowid);
  db.prepare('UPDATE node SET is_retired = 1 WHERE node_id = ?').run(retiredId);

  const insertEdge = db.prepare(
    'INSERT INTO node_edge (department_id, parent_node_id, child_node_id, weight, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)',
  );
  insertEdge.run('DT', rootId, midId, 1.0, '2025-01-01', null);
  insertEdge.run('DT', midId, parentId, 1.0, '2025-01-01', null);
  const edgeParentToA = Number(insertEdge.run('DT', parentId, leafAId, 0.5, '2025-01-01', null).lastInsertRowid);
  const edgeParentToB = Number(insertEdge.run('DT', parentId, leafBId, 0.5, '2025-01-01', null).lastInsertRowid);

  db.prepare('INSERT INTO progress_input (node_id, as_of_date, outcome_progress) VALUES (?, ?, ?)').run(
    leafAId,
    '2026-01-01',
    0.4,
  );

  db.prepare('INSERT INTO first_level_area (department_id, fiscal_year, node_id, area) VALUES (?, ?, ?, ?)').run(
    'DT',
    2026,
    rootId,
    500,
  );

  return { rootId, midId, parentId, leafAId, leafBId, retiredId, edgeParentToA, edgeParentToB };
}

describe('api', () => {
  let dbPath: string;
  let db: Database.Database;
  let app: FastifyInstance;
  let ids: ReturnType<typeof seedTestDept>;

  beforeEach(() => {
    __resetSessionForTests();
    dbPath = newTmpDb();
    db = migrate(dbPath);
    ids = seedTestDept(db);
    app = buildApp(db);
  });

  afterEach(() => {
    __resetSessionForTests();
    db.close();
    fs.rmSync(dbPath, { force: true });
    fs.rmSync(`${dbPath}-journal`, { force: true });
    fs.rmSync(`${dbPath}-wal`, { force: true });
    fs.rmSync(`${dbPath}-shm`, { force: true });
  });

  it('GET /api/departments maps display_name -> name and includes both seed + test departments', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/departments' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { department_id: string; name: string }[];
    expect(body.find((d) => d.department_id === 'D04')?.name).toBe('設計（ELG）');
    expect(body.find((d) => d.department_id === 'DT')?.name).toBe('テスト部');
  });

  it('GET /api/departments/DT/tree returns computed progress, string ids, weights, and area; excludes is_retired nodes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    expect(res.statusCode).toBe(200);
    const tree = res.json();

    const leafA = tree.nodesById[String(ids.leafAId)];
    const leafB = tree.nodesById[String(ids.leafBId)];
    expect(typeof leafA.node_id).toBe('string');
    expect(leafA.isLeaf).toBe(true);
    expect(leafA.outcomeProgress).toBeCloseTo(0.4, 9);
    expect(leafA.weightFromParent).toBeCloseTo(0.5, 9);
    expect(leafB.outcomeProgress).toBe(0);

    // ancestor progress computed: parent = 0.5*0.4 + 0.5*0 = 0.2, propagated up to root
    expect(tree.nodesById[String(ids.parentId)].outcomeProgress).toBeCloseTo(0.2, 9);
    expect(tree.nodesById[String(ids.rootId)].outcomeProgress).toBeCloseTo(0.2, 9);
    expect(tree.nodesById[String(ids.rootId)].area).toBe(500);

    expect(tree.nodesById[String(ids.retiredId)]).toBeUndefined();
  });

  it('GET /api/departments/:id/tree 404s for an unknown department', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/departments/NOPE/tree?fiscalYear=2026' });
    expect(res.statusCode).toBe(404);
  });

  it('rejects adding a child under a leaf with progress > 0 (ADD_CHILD_PROGRESS_LOCKED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/departments/DT/nodes',
      payload: { parentNodeId: String(ids.leafAId), name: 'x', weight: 1.0 },
    });
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('ADD_CHILD_PROGRESS_LOCKED');
  });

  it('allows adding a child under a leaf with 0 progress, then it appears in the tree', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/departments/DT/nodes',
      payload: { parentNodeId: String(ids.leafBId), name: 'new-leaf', weight: 1.0 },
    });
    const body = res.json();
    expect(body.ok).toBe(true);
    const newNodeId: string = body.nodeId;
    expect(newNodeId).toMatch(/^temp-node-/);

    const treeRes = await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    const tree = treeRes.json();
    expect(tree.nodesById[newNodeId]).toBeTruthy();
    expect(tree.nodesById[newNodeId].isLeaf).toBe(true);
    expect(tree.nodesById[String(ids.leafBId)].isLeaf).toBe(false);

    const stateRes = await app.inject({ method: 'GET', url: '/api/state' });
    expect(stateRes.json().isDirty).toBe(true);
  });

  it('rejects an invalid weight sum with WEIGHT_SUM_INVALID + total/diff params', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/departments/DT/nodes/${ids.parentId}/weights`,
      payload: { items: [{ childNodeId: String(ids.leafAId), weight: 0.3 }, { childNodeId: String(ids.leafBId), weight: 0.3 }] },
    });
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('WEIGHT_SUM_INVALID');
    expect(body.params.total).toBeCloseTo(0.6, 9);
    expect(body.params.diff).toBeCloseTo(-0.4, 9);
  });

  it('accepts a valid weight batch update', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/departments/DT/nodes/${ids.parentId}/weights`,
      payload: { items: [{ childNodeId: String(ids.leafAId), weight: 0.3 }, { childNodeId: String(ids.leafBId), weight: 0.7 }] },
    });
    expect(res.json().ok).toBe(true);

    const treeRes = await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    const tree = treeRes.json();
    expect(tree.nodesById[String(ids.leafAId)].weightFromParent).toBeCloseTo(0.3, 9);
    expect(tree.nodesById[String(ids.leafBId)].weightFromParent).toBeCloseTo(0.7, 9);
  });

  it('updates progress on a leaf and rejects it on a non-leaf', async () => {
    const okRes = await app.inject({
      method: 'PUT',
      url: `/api/departments/DT/nodes/${ids.leafBId}/progress`,
      payload: { outcomeProgress: 0.9 },
    });
    expect(okRes.json().ok).toBe(true);

    const badRes = await app.inject({
      method: 'PUT',
      url: `/api/departments/DT/nodes/${ids.parentId}/progress`,
      payload: { outcomeProgress: 0.5 },
    });
    const badBody = badRes.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.code).toBe('PROGRESS_LEAF_ONLY');
  });

  it('updates the first-level area and rejects it on a non-level-1 node', async () => {
    const okRes = await app.inject({
      method: 'PUT',
      url: `/api/departments/DT/nodes/${ids.rootId}/area?fiscalYear=2026`,
      payload: { area: 999 },
    });
    expect(okRes.json().ok).toBe(true);

    const badRes = await app.inject({
      method: 'PUT',
      url: `/api/departments/DT/nodes/${ids.parentId}/area?fiscalYear=2026`,
      payload: { area: 10 },
    });
    expect(badRes.json().code).toBe('AREA_FIRST_LEVEL_ONLY');
  });

  it('save returns an idMap resolving the session placeholder ids to the real inserted row ids', async () => {
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/departments/DT/nodes',
      payload: { parentNodeId: String(ids.leafBId), name: 'mapped-child', weight: 1.0 },
    });
    const tempNodeId: string = addRes.json().nodeId;

    const treeBefore = await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    const tempEdgeId: string = treeBefore.json().nodesById[tempNodeId].parentEdgeId;
    expect(tempNodeId).toMatch(/^temp-node-/);
    expect(tempEdgeId).toMatch(/^temp-edge-/);

    const saveRes = await app.inject({ method: 'POST', url: '/api/save' });
    const { ok, idMap } = saveRes.json();
    expect(ok).toBe(true);

    // every placeholder the client could still be holding must be resolvable...
    const realNodeId = idMap[tempNodeId];
    const realEdgeId = idMap[tempEdgeId];
    expect(realNodeId).toBeDefined();
    expect(realEdgeId).toBeDefined();
    // ...to a real, numeric DB id
    expect(Number.isInteger(Number(realNodeId))).toBe(true);
    expect(Number.isInteger(Number(realEdgeId))).toBe(true);

    // and the mapped ids must be the rows actually written
    const row = db.prepare('SELECT name FROM node WHERE node_id = ?').get(Number(realNodeId)) as { name: string };
    expect(row.name).toBe('mapped-child');
    const tree = (await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' })).json();
    expect(tree.nodesById[realNodeId]).toBeTruthy();
    expect(tree.nodesById[realNodeId].parentEdgeId).toBe(realEdgeId);
    expect(tree.nodesById[tempNodeId]).toBeUndefined();
  });

  it('add child -> rename that same child -> save writes the renamed value (temp id remap regression)', async () => {
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/departments/DT/nodes',
      payload: { parentNodeId: String(ids.leafBId), name: 'original-name', weight: 1.0 },
    });
    const tempNodeId: string = addRes.json().nodeId;

    // rename it *within the same session*, i.e. while it still only has a temp id
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${encodeURIComponent(tempNodeId)}`,
      payload: { name: 'renamed-before-save', assignee: '担当者X' },
    });
    expect(patchRes.json().ok).toBe(true);

    const saveRes = await app.inject({ method: 'POST', url: '/api/save' });
    const realNodeId = saveRes.json().idMap[tempNodeId];
    expect(realNodeId).toBeDefined();

    const row = db
      .prepare('SELECT name, assignee FROM node WHERE node_id = ?')
      .get(Number(realNodeId)) as { name: string; assignee: string | null };
    expect(row.name).toBe('renamed-before-save');
    expect(row.assignee).toBe('担当者X');
    // exactly one node row was created for this add (no duplicate insert)
    const count = db.prepare("SELECT COUNT(*) AS c FROM node WHERE name = 'renamed-before-save'").get() as { c: number };
    expect(count.c).toBe(1);
  });

  it('add child -> detach that same child -> save (temp edge detach does not break the replay)', async () => {
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/departments/DT/nodes',
      payload: { parentNodeId: String(ids.leafBId), name: 'added-then-detached', weight: 1.0 },
    });
    const tempNodeId: string = addRes.json().nodeId;
    const treeBefore = (await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' })).json();
    const tempEdgeId: string = treeBefore.nodesById[tempNodeId].parentEdgeId;

    const detachRes = await app.inject({
      method: 'DELETE',
      url: `/api/departments/DT/edges/${encodeURIComponent(tempEdgeId)}`,
    });
    expect(detachRes.json().ok).toBe(true);

    const saveRes = await app.inject({ method: 'POST', url: '/api/save' });
    expect(saveRes.json().ok).toBe(true);

    // The node row is still inserted (soft-remove: node + history retained)...
    const realNodeId = saveRes.json().idMap[tempNodeId];
    const row = db.prepare('SELECT name FROM node WHERE node_id = ?').get(Number(realNodeId)) as { name: string };
    expect(row.name).toBe('added-then-detached');
    // ...but its edge is closed off, so it is not in the active tree.
    const realEdgeId = saveRes.json().idMap[tempEdgeId];
    const edge = db.prepare('SELECT valid_to FROM node_edge WHERE edge_id = ?').get(Number(realEdgeId)) as {
      valid_to: string | null;
    };
    expect(edge.valid_to).not.toBeNull();
    const tree = (await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' })).json();
    expect(tree.nodesById[realNodeId]).toBeUndefined();
    expect(tree.nodesById[String(ids.leafBId)].isLeaf).toBe(true);
  });

  it('detach renormalizes sibling weight to 1.0, then rejects detaching a node with children', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/departments/DT/edges/${ids.edgeParentToB}` });
    expect(res.json().ok).toBe(true);

    const treeRes = await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    const tree = treeRes.json();
    expect(tree.nodesById[String(ids.leafBId)]).toBeUndefined();
    expect(tree.nodesById[String(ids.leafAId)].weightFromParent).toBeCloseTo(1.0, 9);

    // parent (L3) still has a child (leafA) -> detaching its own inbound edge should be rejected
    const midToParentEdge = db
      .prepare('SELECT edge_id FROM node_edge WHERE department_id = ? AND child_node_id = ?')
      .get('DT', ids.parentId) as { edge_id: number };
    const rejectRes = await app.inject({ method: 'DELETE', url: `/api/departments/DT/edges/${midToParentEdge.edge_id}` });
    expect(rejectRes.json().code).toBe('DETACH_HAS_CHILDREN');
  });

  it('save() persists the whole session in one go, even across a simulated server restart', async () => {
    await app.inject({
      method: 'PUT',
      url: `/api/departments/DT/nodes/${ids.leafBId}/progress`,
      payload: { outcomeProgress: 0.77 },
    });
    await app.inject({
      method: 'PATCH',
      url: `/api/departments/DT/nodes/${ids.parentId}/weights`,
      payload: { items: [{ childNodeId: String(ids.leafAId), weight: 0.2 }, { childNodeId: String(ids.leafBId), weight: 0.8 }] },
    });

    const saveRes = await app.inject({ method: 'POST', url: '/api/save' });
    expect(saveRes.json().ok).toBe(true);
    expect((await app.inject({ method: 'GET', url: '/api/state' })).json().isDirty).toBe(false);

    // Simulate an API restart: close this connection, reopen fresh, build a brand new app/session.
    db.close();
    __resetSessionForTests();
    const reopened = migrate(dbPath);
    const restartedApp = buildApp(reopened);
    const treeRes = await restartedApp.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    const tree = treeRes.json();
    expect(tree.nodesById[String(ids.leafBId)].outcomeProgress).toBeCloseTo(0.77, 9);
    expect(tree.nodesById[String(ids.leafAId)].weightFromParent).toBeCloseTo(0.2, 9);
    reopened.close();
    db = migrate(dbPath); // hand back an open connection for afterEach to close
  });

  it('discard() drops the session without touching the DB', async () => {
    await app.inject({
      method: 'PUT',
      url: `/api/departments/DT/nodes/${ids.leafAId}/progress`,
      payload: { outcomeProgress: 0 },
    });
    expect((await app.inject({ method: 'GET', url: '/api/state' })).json().isDirty).toBe(true);

    const discardRes = await app.inject({ method: 'POST', url: '/api/discard' });
    expect(discardRes.json().ok).toBe(true);
    expect((await app.inject({ method: 'GET', url: '/api/state' })).json().isDirty).toBe(false);

    const treeRes = await app.inject({ method: 'GET', url: '/api/departments/DT/tree?fiscalYear=2026' });
    // still 0.4 (the original seed value), not the discarded 0 we attempted
    expect(treeRes.json().nodesById[String(ids.leafAId)].outcomeProgress).toBeCloseTo(0.4, 9);

    const raw = db.prepare('SELECT outcome_progress FROM progress_input WHERE node_id = ?').get(ids.leafAId) as {
      outcome_progress: number;
    };
    expect(raw.outcome_progress).toBeCloseTo(0.4, 9);
  });
});
