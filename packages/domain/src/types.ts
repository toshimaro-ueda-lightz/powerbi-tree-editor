// Domain types mirror DB column names 1:1 so a future SQLite/API backend
// can be swapped in without changing shapes consumed by the UI layer.

export type Scope = 'common' | 'dept';
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export interface DepartmentRecord {
  department_id: string;
  name: string;
}

export interface NodeRecord {
  node_id: string;
  name: string;
  subtitle: string | null;
  level: Level;
  scope: Scope;
  department_id: string | null;
  assignee: string | null;
}

export interface NodeEdgeRecord {
  edge_id: string;
  department_id: string;
  parent_node_id: string;
  child_node_id: string;
  weight: number;
  valid_from: string;
  valid_to: string | null;
}

export interface ProgressInputRecord {
  node_id: string;
  as_of_date: string;
  outcome_progress: number;
}

export interface FirstLevelAreaRecord {
  department_id: string;
  fiscal_year: number;
  node_id: string;
  area: number;
}

export interface KpiTargetRecord {
  department_id: string;
  fiscal_year: number;
  target_value: number;
}

export interface DataStore {
  departments: DepartmentRecord[];
  nodes: NodeRecord[];
  edges: NodeEdgeRecord[];
  progressInputs: ProgressInputRecord[];
  firstLevelAreas: FirstLevelAreaRecord[];
  kpiTargets: KpiTargetRecord[];
}
