// Computed, storage-agnostic "view" shapes. These are the JSON wire contract
// between the api/ server and the frontend's api client — kept here (rather
// than duplicated in both packages) so there is exactly one definition each
// side compiles against.

import type { Level, Scope } from './types';

/** Computed, UI-ready view of a single node within a resolved department tree. */
export interface TreeNodeView {
  node_id: string;
  name: string;
  subtitle: string | null;
  level: Level;
  scope: Scope;
  department_id: string | null;
  assignee: string | null;
  isLeaf: boolean;
  hasDirectProgressInput: boolean;
  outcomeProgress: number;
  /** Only populated for level-1 nodes; possible area for the selected department/fiscal year. */
  area: number | null;
  parentNodeId: string | null;
  parentEdgeId: string | null;
  weightFromParent: number | null;
  childNodeIds: string[];
}

export interface TreeSnapshot {
  departmentId: string;
  fiscalYear: number;
  nodesById: Record<string, TreeNodeView>;
  rootIds: string[];
  kpiTarget: number | null;
}

export interface NewChildInput {
  name: string;
  subtitle?: string | null;
  assignee?: string | null;
  weight: number;
}

export interface NodeUpdateInput {
  name?: string;
  subtitle?: string | null;
  assignee?: string | null;
}

export interface WeightUpdateItem {
  childNodeId: string;
  weight: number;
}
