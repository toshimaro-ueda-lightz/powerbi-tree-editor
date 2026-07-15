// Reads the current SQLite state into the same `DataStore` shape the (now
// retired-from-the-UI) mock service used, and applies a recorded changelog
// of mutations back to SQLite in a single transaction on save.
//
// Gaps this module bridges (see issue #4):
//  - node_id / edge_id are DB integers; DataStore/domain use strings. We
//    stringify on read and parse back to integers on write.
//  - department.display_name -> DepartmentRecord.name.
//  - node.is_retired: only is_retired = 0 rows are loaded (soft-removed
//    nodes never resurface in a session).

import type Database from 'better-sqlite3';
import type {
  DataStore,
  DepartmentRecord,
  FirstLevelAreaRecord,
  KpiTargetRecord,
  NodeEdgeRecord,
  NodeRecord,
  ProgressInputRecord,
} from '@powerbi-tree-editor/domain';

export function loadSnapshot(db: Database.Database): DataStore {
  const departments = db
    .prepare('SELECT department_id, display_name AS name FROM department')
    .all() as DepartmentRecord[];

  const nodeRows = db
    .prepare(
      'SELECT node_id, name, subtitle, level, scope, department_id, assignee FROM node WHERE is_retired = 0',
    )
    .all() as Array<{
    node_id: number;
    name: string;
    subtitle: string | null;
    level: NodeRecord['level'];
    scope: NodeRecord['scope'];
    department_id: string | null;
    assignee: string | null;
  }>;
  const nodes: NodeRecord[] = nodeRows.map((r) => ({ ...r, node_id: String(r.node_id) }));

  const edgeRows = db
    .prepare(
      'SELECT edge_id, department_id, parent_node_id, child_node_id, weight, valid_from, valid_to FROM node_edge',
    )
    .all() as Array<{
    edge_id: number;
    department_id: string;
    parent_node_id: number;
    child_node_id: number;
    weight: number;
    valid_from: string;
    valid_to: string | null;
  }>;
  const edges: NodeEdgeRecord[] = edgeRows.map((r) => ({
    ...r,
    edge_id: String(r.edge_id),
    parent_node_id: String(r.parent_node_id),
    child_node_id: String(r.child_node_id),
  }));

  const progressRows = db
    .prepare('SELECT node_id, as_of_date, outcome_progress FROM progress_input')
    .all() as Array<{ node_id: number; as_of_date: string; outcome_progress: number }>;
  const progressInputs: ProgressInputRecord[] = progressRows.map((r) => ({
    ...r,
    node_id: String(r.node_id),
  }));

  const areaRows = db
    .prepare('SELECT department_id, fiscal_year, node_id, area FROM first_level_area')
    .all() as Array<{ department_id: string; fiscal_year: number; node_id: number; area: number }>;
  const firstLevelAreas: FirstLevelAreaRecord[] = areaRows.map((r) => ({
    ...r,
    node_id: String(r.node_id),
  }));

  const kpiTargets = db
    .prepare('SELECT department_id, fiscal_year, target_value FROM kpi_target')
    .all() as KpiTargetRecord[];

  return { departments, nodes, edges, progressInputs, firstLevelAreas, kpiTargets };
}

// ---- changelog replay (save) ----------------------------------------------

export type Command =
  | { type: 'addChild'; node: NodeRecord; edge: NodeEdgeRecord }
  | { type: 'updateNode'; nodeId: string; name: string; subtitle: string | null; assignee: string | null }
  | { type: 'updateWeights'; items: { edgeId: string; weight: number }[] }
  | { type: 'updateProgress'; nodeId: string; asOfDate: string; outcomeProgress: number }
  | { type: 'updateArea'; departmentId: string; fiscalYear: number; nodeId: string; area: number }
  | { type: 'detach'; edgeId: string; validTo: string; renormalized: { edgeId: string; weight: number }[] };

/** temp-prefixed ids are session-local placeholders for not-yet-persisted rows. */
export function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

function resolveId(map: Map<string, number>, id: string): number {
  const mapped = map.get(id);
  if (mapped !== undefined) return mapped;
  const n = Number(id);
  if (!Number.isInteger(n)) {
    throw new Error(`Cannot resolve id "${id}" to a real DB row (not a temp id and not numeric).`);
  }
  return n;
}

/**
 * Applies every recorded command to the real database inside one
 * transaction (satisfies §10's requirement that a sibling-weight
 * renormalization and a node+edge insert each land atomically together).
 */
export function applyChangelog(db: Database.Database, changeLog: Command[]): void {
  const nodeIdMap = new Map<string, number>();
  const edgeIdMap = new Map<string, number>();

  const insertNode = db.prepare(
    'INSERT INTO node (name, subtitle, level, scope, department_id, assignee) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertEdge = db.prepare(
    'INSERT INTO node_edge (department_id, parent_node_id, child_node_id, weight, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const updateNodeStmt = db.prepare(
    "UPDATE node SET name = ?, subtitle = ?, assignee = ?, updated_at = datetime('now') WHERE node_id = ?",
  );
  const updateWeightStmt = db.prepare('UPDATE node_edge SET weight = ? WHERE edge_id = ?');
  const upsertProgressStmt = db.prepare(`
    INSERT INTO progress_input (node_id, as_of_date, outcome_progress)
    VALUES (?, ?, ?)
    ON CONFLICT(node_id, as_of_date) DO UPDATE SET outcome_progress = excluded.outcome_progress
  `);
  const upsertAreaStmt = db.prepare(`
    INSERT INTO first_level_area (department_id, fiscal_year, node_id, area)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(department_id, fiscal_year, node_id) DO UPDATE SET area = excluded.area, updated_at = datetime('now')
  `);
  const detachStmt = db.prepare('UPDATE node_edge SET valid_to = ? WHERE edge_id = ?');

  const run = db.transaction((commands: Command[]) => {
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'addChild': {
          const parentId = resolveId(nodeIdMap, cmd.edge.parent_node_id);
          const info = insertNode.run(
            cmd.node.name,
            cmd.node.subtitle,
            cmd.node.level,
            cmd.node.scope,
            cmd.node.department_id,
            cmd.node.assignee,
          );
          const realNodeId = Number(info.lastInsertRowid);
          nodeIdMap.set(cmd.node.node_id, realNodeId);

          const edgeInfo = insertEdge.run(
            cmd.edge.department_id,
            parentId,
            realNodeId,
            cmd.edge.weight,
            cmd.edge.valid_from,
            cmd.edge.valid_to,
          );
          edgeIdMap.set(cmd.edge.edge_id, Number(edgeInfo.lastInsertRowid));
          break;
        }
        case 'updateNode': {
          updateNodeStmt.run(cmd.name, cmd.subtitle, cmd.assignee, resolveId(nodeIdMap, cmd.nodeId));
          break;
        }
        case 'updateWeights': {
          for (const item of cmd.items) {
            updateWeightStmt.run(item.weight, resolveId(edgeIdMap, item.edgeId));
          }
          break;
        }
        case 'updateProgress': {
          upsertProgressStmt.run(resolveId(nodeIdMap, cmd.nodeId), cmd.asOfDate, cmd.outcomeProgress);
          break;
        }
        case 'updateArea': {
          upsertAreaStmt.run(cmd.departmentId, cmd.fiscalYear, resolveId(nodeIdMap, cmd.nodeId), cmd.area);
          break;
        }
        case 'detach': {
          detachStmt.run(cmd.validTo, resolveId(edgeIdMap, cmd.edgeId));
          for (const sib of cmd.renormalized) {
            updateWeightStmt.run(sib.weight, resolveId(edgeIdMap, sib.edgeId));
          }
          break;
        }
      }
    }
  });

  run(changeLog);
}
