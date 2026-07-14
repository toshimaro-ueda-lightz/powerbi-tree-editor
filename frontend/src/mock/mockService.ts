// Mock data service. Components must go through this module only — never
// touch `DataStore` fields directly. This is the seam that a future
// SQLite/REST backend would replace; keep the function surface stable.

import {
  activeEdges,
  childEdgesOf,
  computeAllProgress,
  isLeafNode,
  isValidWeightSum,
  mapProgressLookup,
  normalizeWeights,
  parentEdgeOf,
} from '../domain';
import type { DataStore, DepartmentRecord, NodeEdgeRecord, NodeRecord } from '../domain/types';
import { buildSeed } from './seedData';
import type {
  AddChildResult,
  NewChildInput,
  NodeUpdateInput,
  OperationResult,
  TreeNodeView,
  TreeSnapshot,
  WeightUpdateItem,
} from './types';

const STORAGE_KEY = 'tree-editor-mock-data-v1';

let store: DataStore = loadInitialStore();
let dirty = false;
let version = 0;
const listeners = new Set<() => void>();

function loadInitialStore(): DataStore {
  if (typeof localStorage === 'undefined') return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DataStore;
  } catch {
    // fall through to seed on any parse/storage error
  }
  return buildSeed();
}

function touch(markDirty: boolean) {
  if (markDirty) dirty = true;
  version += 1;
  listeners.forEach((l) => l());
}

function genId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${rand}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- subscription (for useSyncExternalStore) -----------------------------

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

// ---- reads -----------------------------------------------------------------

export function listDepartments(): DepartmentRecord[] {
  return [...store.departments];
}

export function getTree(departmentId: string, fiscalYear: number): TreeSnapshot {
  const candidateNodes = store.nodes.filter((n) => n.scope === 'common' || n.department_id === departmentId);
  const edges = activeEdges(store.edges).filter((e) => e.department_id === departmentId);

  // Only nodes reachable from a level-1 root via *active* edges belong to the
  // current tree. A detached node stays in `store.nodes` (soft-remove, per
  // spec) but must disappear from this view once its edge is invalidated.
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
  for (const p of store.progressInputs) {
    const existing = latestProgressByNode.has(p.node_id);
    if (!existing) {
      latestProgressByNode.set(p.node_id, p.outcome_progress);
    } else {
      // keep the entry with the latest as_of_date
      const currentLatest = store.progressInputs
        .filter((x) => x.node_id === p.node_id)
        .sort((a, b) => (a.as_of_date < b.as_of_date ? 1 : -1))[0];
      if (currentLatest) latestProgressByNode.set(p.node_id, currentLatest.outcome_progress);
    }
  }
  const hasDirectInput = new Set(store.progressInputs.map((p) => p.node_id));

  const computed = computeAllProgress(nodes, edges, mapProgressLookup(latestProgressByNode));

  const areaByNode = new Map(
    store.firstLevelAreas
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
  const kpiTarget = store.kpiTargets.find((k) => k.department_id === departmentId && k.fiscal_year === fiscalYear)?.target_value ?? null;

  return { departmentId, fiscalYear, nodesById, rootIds, kpiTarget };
}

// ---- writes ------------------------------------------------------------------

function findNode(nodeId: string): NodeRecord | undefined {
  return store.nodes.find((n) => n.node_id === nodeId);
}

export function updateNode(_departmentId: string, nodeId: string, patch: NodeUpdateInput): OperationResult {
  const node = findNode(nodeId);
  if (!node) return { ok: false, reason: '対象の施策が見つかりません。' };
  if (node.level < 4) return { ok: false, reason: '第1〜3階層の施策名・詳細は編集できません（共通ノードのため）。' };

  if (patch.name !== undefined) node.name = patch.name;
  if (patch.subtitle !== undefined) node.subtitle = patch.subtitle;
  if (patch.assignee !== undefined) node.assignee = patch.assignee;
  touch(true);
  return { ok: true };
}

export function addChildNode(departmentId: string, parentNodeId: string, input: NewChildInput): AddChildResult {
  const parent = findNode(parentNodeId);
  if (!parent) return { ok: false, reason: '親施策が見つかりません。' };
  if (parent.level < 3 || parent.level > 5) {
    return { ok: false, reason: '子の追加は第3→4／4→5／5→6階層でのみ可能です。' };
  }

  const deptEdges = activeEdges(store.edges).filter((e) => e.department_id === departmentId);
  const parentIsLeafNow = isLeafNode(parent, deptEdges);
  if (parentIsLeafNow) {
    const hasProgress = store.progressInputs.some((p) => p.node_id === parentNodeId);
    if (hasProgress) {
      return { ok: false, reason: 'この施策には既に成果進捗が入力済みのため、子施策を追加できません。先に進捗入力を取り消すか、別の施策として管理してください。' };
    }
  }

  if (input.weight < 0 || input.weight > 1) {
    return { ok: false, reason: '重みは0〜1の範囲で入力してください。' };
  }

  const siblingWeights = childEdgesOf(parentNodeId, deptEdges).map((e) => e.weight);
  if (!isValidWeightSum([...siblingWeights, input.weight])) {
    return {
      ok: false,
      reason: `兄弟施策の重み合計が1.0になりません（現在の合計 ${(siblingWeights.reduce((a, b) => a + b, 0) + input.weight).toFixed(4)}）。追加前に重み一括編集で調整してください。`,
    };
  }

  const childLevel = (parent.level + 1) as NodeRecord['level'];
  const newNode: NodeRecord = {
    node_id: genId('node'),
    name: input.name,
    subtitle: input.subtitle ?? null,
    level: childLevel,
    scope: 'dept',
    department_id: departmentId,
    assignee: input.assignee ?? null,
  };
  const newEdge: NodeEdgeRecord = {
    edge_id: genId('edge'),
    department_id: departmentId,
    parent_node_id: parentNodeId,
    child_node_id: newNode.node_id,
    weight: input.weight,
    valid_from: today(),
    valid_to: null,
  };

  store.nodes.push(newNode);
  store.edges.push(newEdge);
  touch(true);
  return { ok: true, nodeId: newNode.node_id };
}

export function detachNode(departmentId: string, nodeId: string): OperationResult {
  const node = findNode(nodeId);
  if (!node) return { ok: false, reason: '対象の施策が見つかりません。' };

  const deptEdges = activeEdges(store.edges).filter((e) => e.department_id === departmentId);
  if (!isLeafNode(node, deptEdges)) {
    return { ok: false, reason: '子を持つ施策はツリーから外せません。末端の施策のみ解除できます。' };
  }

  const edge = deptEdges.find((e) => e.child_node_id === nodeId);
  if (!edge) return { ok: false, reason: 'このツリーに属していないため解除できません。' };

  // Invalidate the edge (node + history retained, not physically deleted).
  const rawEdge = store.edges.find((e) => e.edge_id === edge.edge_id);
  if (rawEdge) rawEdge.valid_to = today();

  // Re-normalize remaining siblings to sum to 1.0.
  const siblings = childEdgesOf(edge.parent_node_id, activeEdges(store.edges).filter((e) => e.department_id === departmentId));
  if (siblings.length > 0) {
    const normalized = normalizeWeights(siblings.map((s) => ({ id: s.edge_id, weight: s.weight })));
    for (const n of normalized) {
      const raw = store.edges.find((e) => e.edge_id === n.id);
      if (raw) raw.weight = n.weight;
    }
  }

  touch(true);
  return { ok: true };
}

export function updateWeights(departmentId: string, parentNodeId: string, items: WeightUpdateItem[]): OperationResult {
  const weights = items.map((i) => i.weight);
  if (weights.some((w) => w < 0 || w > 1 || Number.isNaN(w))) {
    return { ok: false, reason: '重みは0〜1の範囲で入力してください。' };
  }
  if (!isValidWeightSum(weights)) {
    const total = weights.reduce((a, b) => a + b, 0);
    const diff = total - 1;
    const diffLabel = diff > 0 ? `${diff.toFixed(4)} 超過` : `${Math.abs(diff).toFixed(4)} 不足`;
    return { ok: false, reason: `重みの合計が1.0になっていません（現在 ${total.toFixed(4)} / ${diffLabel}）。` };
  }

  const deptEdges = activeEdges(store.edges).filter((e) => e.department_id === departmentId);
  const children = childEdgesOf(parentNodeId, deptEdges);
  if (children.length !== items.length) {
    return { ok: false, reason: '子施策の構成が変更されています。画面を更新してやり直してください。' };
  }

  for (const item of items) {
    const raw = store.edges.find((e) => e.department_id === departmentId && e.parent_node_id === parentNodeId && e.child_node_id === item.childNodeId && e.valid_to === null);
    if (!raw) return { ok: false, reason: `対象の子施策(${item.childNodeId})が見つかりません。` };
    raw.weight = item.weight;
  }
  touch(true);
  return { ok: true };
}

export function updateProgress(departmentId: string, nodeId: string, outcomeProgress: number): OperationResult {
  const node = findNode(nodeId);
  if (!node) return { ok: false, reason: '対象の施策が見つかりません。' };

  const deptEdges = activeEdges(store.edges).filter((e) => e.department_id === departmentId);
  if (!isLeafNode(node, deptEdges)) {
    return { ok: false, reason: '成果進捗を直接入力できるのは末端施策のみです。上位階層は自動計算されます。' };
  }
  if (outcomeProgress < 0 || outcomeProgress > 1 || Number.isNaN(outcomeProgress)) {
    return { ok: false, reason: '成果進捗は0〜100%の範囲で入力してください。' };
  }

  const existing = store.progressInputs.find((p) => p.node_id === nodeId && p.as_of_date === today());
  if (existing) {
    existing.outcome_progress = outcomeProgress;
  } else {
    store.progressInputs.push({ node_id: nodeId, as_of_date: today(), outcome_progress: outcomeProgress });
  }
  touch(true);
  return { ok: true };
}

export function updateFirstLevelArea(departmentId: string, fiscalYear: number, nodeId: string, area: number): OperationResult {
  const node = findNode(nodeId);
  if (!node || node.level !== 1) return { ok: false, reason: '可能面積を編集できるのは第1階層の施策のみです。' };
  if (area < 0 || Number.isNaN(area)) return { ok: false, reason: '面積は0以上の数値で入力してください。' };

  const existing = store.firstLevelAreas.find((a) => a.department_id === departmentId && a.fiscal_year === fiscalYear && a.node_id === nodeId);
  if (existing) {
    existing.area = area;
  } else {
    store.firstLevelAreas.push({ department_id: departmentId, fiscal_year: fiscalYear, node_id: nodeId, area });
  }
  touch(true);
  return { ok: true };
}

// ---- persistence -------------------------------------------------------------

export function save(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  dirty = false;
  touch(false);
}

export function resetMockData(): void {
  store = buildSeed();
  dirty = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  touch(false);
}

/** Test-only escape hatch: replaces the in-memory store without touching localStorage. */
export function __setStoreForTests(next: DataStore): void {
  store = next;
  dirty = false;
  touch(false);
}
