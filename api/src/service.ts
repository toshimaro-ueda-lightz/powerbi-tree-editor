// Business logic — ported from the original `frontend/src/mock/mockService.ts`
// (same validation rules, same order of checks) but operating on the
// server-side session's working copy instead of a localStorage-backed
// module singleton, and returning `ApiResult`/`ApiAddChildResult` (error
// *codes*, not Japanese text — see packages/domain/src/errors.ts) instead of
// `OperationResult`/`AddChildResult`.

import type Database from 'better-sqlite3';
import {
  activeEdges,
  childEdgesOf,
  computeAllProgress,
  isLeafNode,
  isValidWeightSum,
  makeTempId,
  mapProgressLookup,
  normalizeWeights,
  parentEdgeOf,
  type ApiAddChildResult,
  type ApiResult,
  type DataStore,
  type DepartmentRecord,
  type NewChildInput,
  type NodeEdgeRecord,
  type NodeRecord,
  type NodeUpdateInput,
  type TreeNodeView,
  type TreeSnapshot,
  type WeightUpdateItem,
} from '@powerbi-tree-editor/domain';
import { ensureSession, readData, recordCommand } from './session.js';
import type { Command } from './store.js';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function tempId(kind: 'node' | 'edge'): string {
  return makeTempId(kind, crypto.randomUUID());
}

function findNode(data: DataStore, nodeId: string): NodeRecord | undefined {
  return data.nodes.find((n) => n.node_id === nodeId);
}

// ---- reads -----------------------------------------------------------------

export function listDepartments(db: Database.Database): DepartmentRecord[] {
  return [...readData(db).departments];
}

export function getTree(db: Database.Database, departmentId: string, fiscalYear: number): TreeSnapshot {
  const data = readData(db);
  const candidateNodes = data.nodes.filter((n) => n.scope === 'common' || n.department_id === departmentId);
  const edges = activeEdges(data.edges).filter((e) => e.department_id === departmentId);

  const reachable = new Set<string>();
  const childrenByParent = new Map<string, string[]>();
  for (const e of edges) {
    if (!childrenByParent.has(e.parent_node_id)) childrenByParent.set(e.parent_node_id, []);
    childrenByParent.get(e.parent_node_id)!.push(e.child_node_id);
  }
  const stack = candidateNodes.filter((n) => n.level === 1).map((n) => n.node_id);
  for (const id of stack) reachable.add(id);
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!reachable.has(childId)) {
        reachable.add(childId);
        stack.push(childId);
      }
    }
  }
  const nodes = candidateNodes.filter((n) => reachable.has(n.node_id));

  const latestProgressByNode = new Map<string, number>();
  for (const p of data.progressInputs) {
    if (!latestProgressByNode.has(p.node_id)) {
      const currentLatest = data.progressInputs
        .filter((x) => x.node_id === p.node_id)
        .sort((a, b) => (a.as_of_date < b.as_of_date ? 1 : -1))[0];
      if (currentLatest) latestProgressByNode.set(p.node_id, currentLatest.outcome_progress);
    }
  }
  const hasDirectInput = new Set(data.progressInputs.map((p) => p.node_id));

  const computed = computeAllProgress(nodes, edges, mapProgressLookup(latestProgressByNode));

  const areaByNode = new Map(
    data.firstLevelAreas
      .filter((a) => a.department_id === departmentId && a.fiscal_year === fiscalYear)
      .map((a) => [a.node_id, a.area]),
  );

  const nodesById: Record<string, TreeNodeView> = {};
  for (const node of nodes) {
    const parentEdge = parentEdgeOf(node.node_id, edges);
    const children = childEdgesOf(node.node_id, edges);
    nodesById[node.node_id] = {
      node_id: node.node_id,
      name: node.name,
      subtitle: node.subtitle,
      level: node.level,
      scope: node.scope,
      department_id: node.department_id,
      assignee: node.assignee,
      isLeaf: isLeafNode(node, edges),
      hasDirectProgressInput: hasDirectInput.has(node.node_id),
      outcomeProgress: computed.get(node.node_id) ?? 0,
      area: node.level === 1 ? areaByNode.get(node.node_id) ?? null : null,
      parentNodeId: parentEdge?.parent_node_id ?? null,
      parentEdgeId: parentEdge?.edge_id ?? null,
      weightFromParent: parentEdge?.weight ?? null,
      childNodeIds: children.map((e) => e.child_node_id),
    };
  }

  const rootIds = nodes.filter((n) => n.level === 1).map((n) => n.node_id);
  const kpiTarget =
    data.kpiTargets.find((k) => k.department_id === departmentId && k.fiscal_year === fiscalYear)?.target_value ?? null;

  return { departmentId, fiscalYear, nodesById, rootIds, kpiTarget };
}

// ---- writes ------------------------------------------------------------------

export function updateNode(db: Database.Database, nodeId: string, patch: NodeUpdateInput): ApiResult {
  const session = ensureSession(db);
  const node = findNode(session.data, nodeId);
  if (!node) return { ok: false, code: 'NODE_NOT_FOUND' };
  if (node.level < 4) return { ok: false, code: 'COMMON_NODE_READONLY' };

  if (patch.name !== undefined) node.name = patch.name;
  if (patch.subtitle !== undefined) node.subtitle = patch.subtitle;
  if (patch.assignee !== undefined) node.assignee = patch.assignee;

  const cmd: Command = { type: 'updateNode', nodeId, name: node.name, subtitle: node.subtitle, assignee: node.assignee };
  recordCommand(cmd);
  return { ok: true };
}

export function addChildNode(
  db: Database.Database,
  departmentId: string,
  parentNodeId: string,
  input: NewChildInput,
): ApiAddChildResult {
  const session = ensureSession(db);
  const data = session.data;
  const parent = findNode(data, parentNodeId);
  if (!parent) return { ok: false, code: 'PARENT_NOT_FOUND' };
  if (parent.level < 3 || parent.level > 5) {
    return { ok: false, code: 'ADD_CHILD_LEVEL_RANGE' };
  }

  const deptEdges = activeEdges(data.edges).filter((e) => e.department_id === departmentId);
  const parentIsLeafNow = isLeafNode(parent, deptEdges);
  if (parentIsLeafNow) {
    const latest = data.progressInputs
      .filter((p) => p.node_id === parentNodeId)
      .sort((a, b) => (a.as_of_date < b.as_of_date ? 1 : -1))[0];
    if (latest && latest.outcome_progress > 0) {
      return { ok: false, code: 'ADD_CHILD_PROGRESS_LOCKED' };
    }
  }

  if (input.weight < 0 || input.weight > 1) {
    return { ok: false, code: 'WEIGHT_RANGE' };
  }

  const siblingWeights = childEdgesOf(parentNodeId, deptEdges).map((e) => e.weight);
  if (!isValidWeightSum([...siblingWeights, input.weight])) {
    const total = siblingWeights.reduce((a, b) => a + b, 0) + input.weight;
    return { ok: false, code: 'ADD_CHILD_WEIGHT_SUM', params: { total } };
  }

  const childLevel = (parent.level + 1) as NodeRecord['level'];
  const newNode: NodeRecord = {
    node_id: tempId('node'),
    name: input.name,
    subtitle: input.subtitle ?? null,
    level: childLevel,
    scope: 'dept',
    department_id: departmentId,
    assignee: input.assignee ?? null,
  };
  const newEdge: NodeEdgeRecord = {
    edge_id: tempId('edge'),
    department_id: departmentId,
    parent_node_id: parentNodeId,
    child_node_id: newNode.node_id,
    weight: input.weight,
    valid_from: today(),
    valid_to: null,
  };

  data.nodes.push(newNode);
  data.edges.push(newEdge);
  recordCommand({ type: 'addChild', node: newNode, edge: newEdge });
  return { ok: true, nodeId: newNode.node_id };
}

export function detachNode(db: Database.Database, departmentId: string, nodeId: string): ApiResult {
  const session = ensureSession(db);
  const data = session.data;
  const node = findNode(data, nodeId);
  if (!node) return { ok: false, code: 'NODE_NOT_FOUND' };

  const deptEdges = activeEdges(data.edges).filter((e) => e.department_id === departmentId);
  if (!isLeafNode(node, deptEdges)) {
    return { ok: false, code: 'DETACH_HAS_CHILDREN' };
  }

  const edge = deptEdges.find((e) => e.child_node_id === nodeId);
  if (!edge) return { ok: false, code: 'DETACH_NOT_IN_TREE' };

  const rawEdge = data.edges.find((e) => e.edge_id === edge.edge_id);
  const validTo = today();
  if (rawEdge) rawEdge.valid_to = validTo;

  const siblings = childEdgesOf(edge.parent_node_id, activeEdges(data.edges).filter((e) => e.department_id === departmentId));
  const renormalized: { edgeId: string; weight: number }[] = [];
  if (siblings.length > 0) {
    const normalized = normalizeWeights(siblings.map((s) => ({ id: s.edge_id, weight: s.weight })));
    for (const n of normalized) {
      const raw = data.edges.find((e) => e.edge_id === n.id);
      if (raw) raw.weight = n.weight;
      renormalized.push({ edgeId: n.id, weight: n.weight });
    }
  }

  recordCommand({ type: 'detach', edgeId: edge.edge_id, validTo, renormalized });
  return { ok: true };
}

export function updateWeights(
  db: Database.Database,
  departmentId: string,
  parentNodeId: string,
  items: WeightUpdateItem[],
): ApiResult {
  const session = ensureSession(db);
  const data = session.data;
  const weights = items.map((i) => i.weight);
  if (weights.some((w) => w < 0 || w > 1 || Number.isNaN(w))) {
    return { ok: false, code: 'WEIGHT_RANGE' };
  }
  if (!isValidWeightSum(weights)) {
    const total = weights.reduce((a, b) => a + b, 0);
    return { ok: false, code: 'WEIGHT_SUM_INVALID', params: { total, diff: total - 1 } };
  }

  const deptEdges = activeEdges(data.edges).filter((e) => e.department_id === departmentId);
  const children = childEdgesOf(parentNodeId, deptEdges);
  if (children.length !== items.length) {
    return { ok: false, code: 'WEIGHT_CHILDREN_CHANGED' };
  }

  const resolved: { edgeId: string; weight: number }[] = [];
  for (const item of items) {
    const raw = data.edges.find(
      (e) => e.department_id === departmentId && e.parent_node_id === parentNodeId && e.child_node_id === item.childNodeId && e.valid_to === null,
    );
    if (!raw) return { ok: false, code: 'WEIGHT_CHILD_NOT_FOUND', params: { childNodeId: item.childNodeId } };
    resolved.push({ edgeId: raw.edge_id, weight: item.weight });
  }
  for (const r of resolved) {
    const raw = data.edges.find((e) => e.edge_id === r.edgeId);
    if (raw) raw.weight = r.weight;
  }

  recordCommand({ type: 'updateWeights', items: resolved });
  return { ok: true };
}

export function updateProgress(db: Database.Database, departmentId: string, nodeId: string, outcomeProgress: number): ApiResult {
  const session = ensureSession(db);
  const data = session.data;
  const node = findNode(data, nodeId);
  if (!node) return { ok: false, code: 'NODE_NOT_FOUND' };

  const deptEdges = activeEdges(data.edges).filter((e) => e.department_id === departmentId);
  if (!isLeafNode(node, deptEdges)) {
    return { ok: false, code: 'PROGRESS_LEAF_ONLY' };
  }
  if (outcomeProgress < 0 || outcomeProgress > 1 || Number.isNaN(outcomeProgress)) {
    return { ok: false, code: 'PROGRESS_RANGE' };
  }

  const asOfDate = today();
  const existing = data.progressInputs.find((p) => p.node_id === nodeId && p.as_of_date === asOfDate);
  if (existing) {
    existing.outcome_progress = outcomeProgress;
  } else {
    data.progressInputs.push({ node_id: nodeId, as_of_date: asOfDate, outcome_progress: outcomeProgress });
  }

  recordCommand({ type: 'updateProgress', nodeId, asOfDate, outcomeProgress });
  return { ok: true };
}

export function updateFirstLevelArea(
  db: Database.Database,
  departmentId: string,
  fiscalYear: number,
  nodeId: string,
  area: number,
): ApiResult {
  const session = ensureSession(db);
  const data = session.data;
  const node = findNode(data, nodeId);
  if (!node || node.level !== 1) return { ok: false, code: 'AREA_FIRST_LEVEL_ONLY' };
  if (area < 0 || Number.isNaN(area)) return { ok: false, code: 'AREA_RANGE' };

  const existing = data.firstLevelAreas.find((a) => a.department_id === departmentId && a.fiscal_year === fiscalYear && a.node_id === nodeId);
  if (existing) {
    existing.area = area;
  } else {
    data.firstLevelAreas.push({ department_id: departmentId, fiscal_year: fiscalYear, node_id: nodeId, area });
  }

  recordCommand({ type: 'updateArea', departmentId, fiscalYear, nodeId, area });
  return { ok: true };
}
