// Seed data for the mock service. Kept isolated from components so the
// tree shape/scenario can be inspected and adjusted without touching UI code.
//
// Scenario covered:
// - 2 departments (dept-sales / dept-dev)
// - common nodes (level 1-3) shared by both departments, department-specific
//   weights on the connecting edges (see WEIGHTS_DEPT_SALES / _DEV below)
// - department-specific nodes (level 4-6), reaching level 6 only under
//   dept-sales (n1-1-1 -> s-n4-1 -> s-n5-1 -> s-n6-1 / s-n6-2) to prove the
//   UI can render a full 1-6 path, while dept-dev stops at level 4 to prove
//   trees can legitimately differ in depth per department
// - first_level_area differs both by department and by fiscal year
// - outcome_progress differs across leaves/departments

import type { DataStore } from '../domain/types';

const FY_CURRENT = 2026;
const FY_PREVIOUS = 2025;
const AS_OF = '2026-07-01';

export const FISCAL_YEARS = [FY_PREVIOUS, FY_CURRENT, 2027] as const;
export const CURRENT_FISCAL_YEAR = FY_CURRENT;

export function buildSeed(): DataStore {
  return {
    departments: [
      { department_id: 'dept-sales', name: '営業部' },
      { department_id: 'dept-dev', name: '開発部' },
    ],
    nodes: [
      // Level 1 (common)
      { node_id: 'n1', name: '売上拡大', subtitle: '主力事業の成長', level: 1, scope: 'common', department_id: null, assignee: null },
      { node_id: 'n2', name: 'コスト削減', subtitle: '業務効率の向上', level: 1, scope: 'common', department_id: null, assignee: null },

      // Level 2 (common)
      { node_id: 'n1-1', name: '新規顧客獲得', subtitle: null, level: 2, scope: 'common', department_id: null, assignee: null },
      { node_id: 'n1-2', name: '既存顧客深耕', subtitle: null, level: 2, scope: 'common', department_id: null, assignee: null },
      { node_id: 'n2-1', name: '業務プロセス改善', subtitle: null, level: 2, scope: 'common', department_id: null, assignee: null },

      // Level 3 (common)
      { node_id: 'n1-1-1', name: 'リード獲得強化', subtitle: null, level: 3, scope: 'common', department_id: null, assignee: null },
      { node_id: 'n1-1-2', name: '商談化率向上', subtitle: null, level: 3, scope: 'common', department_id: null, assignee: null },
      { node_id: 'n1-2-1', name: '顧客満足度向上', subtitle: null, level: 3, scope: 'common', department_id: null, assignee: null },
      { node_id: 'n2-1-1', name: '業務標準化', subtitle: null, level: 3, scope: 'common', department_id: null, assignee: null },

      // Level 4 - dept-sales
      { node_id: 's-n4-1', name: '展示会出展強化', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-sales', assignee: '佐藤' },
      { node_id: 's-n4-2', name: 'Web広告拡充', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-sales', assignee: '鈴木' },
      { node_id: 's-n4-3', name: '提案資料改善', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-sales', assignee: '田中' },
      { node_id: 's-n4-4', name: '顧客訪問頻度向上', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-sales', assignee: '田中' },
      { node_id: 's-n4-5', name: '営業日報デジタル化', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-sales', assignee: '高橋' },

      // Level 5-6 - dept-sales (full depth path)
      { node_id: 's-n5-1', name: '大型展示会出展', subtitle: null, level: 5, scope: 'dept', department_id: 'dept-sales', assignee: '佐藤' },
      { node_id: 's-n5-2', name: '地方展示会出展', subtitle: '年2回開催予定', level: 5, scope: 'dept', department_id: 'dept-sales', assignee: '伊藤' },
      { node_id: 's-n6-1', name: '展示会Aブース設営', subtitle: null, level: 6, scope: 'dept', department_id: 'dept-sales', assignee: '佐藤' },
      { node_id: 's-n6-2', name: '展示会A商談運営', subtitle: null, level: 6, scope: 'dept', department_id: 'dept-sales', assignee: '伊藤' },

      // Level 4 - dept-dev (stops at level 4 - shallower tree, same common ancestors)
      { node_id: 'd-n4-1', name: '製品デモ充実', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-dev', assignee: '渡辺' },
      { node_id: 'd-n4-2', name: '見積精度向上', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-dev', assignee: '山本' },
      { node_id: 'd-n4-3', name: 'サポート体制強化', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-dev', assignee: '中村' },
      { node_id: 'd-n4-4', name: 'FAQ整備', subtitle: '一次対応の削減が目的', level: 4, scope: 'dept', department_id: 'dept-dev', assignee: '中村' },
      { node_id: 'd-n4-5', name: '開発プロセス標準化', subtitle: null, level: 4, scope: 'dept', department_id: 'dept-dev', assignee: '小林' },
    ],
    edges: [
      ...buildDeptEdges('dept-sales', WEIGHTS_DEPT_SALES),
      ...buildDeptEdges('dept-dev', WEIGHTS_DEPT_DEV),
    ],
    progressInputs: [
      // dept-sales leaves
      { node_id: 's-n4-2', as_of_date: AS_OF, outcome_progress: 0.8 },
      { node_id: 's-n4-3', as_of_date: AS_OF, outcome_progress: 0.5 },
      { node_id: 's-n4-4', as_of_date: AS_OF, outcome_progress: 0.65 },
      { node_id: 's-n4-5', as_of_date: AS_OF, outcome_progress: 0.9 },
      { node_id: 's-n5-2', as_of_date: AS_OF, outcome_progress: 0.4 },
      { node_id: 's-n6-1', as_of_date: AS_OF, outcome_progress: 0.7 },
      { node_id: 's-n6-2', as_of_date: AS_OF, outcome_progress: 0.3 },
      // dept-dev leaves
      { node_id: 'd-n4-1', as_of_date: AS_OF, outcome_progress: 0.55 },
      { node_id: 'd-n4-2', as_of_date: AS_OF, outcome_progress: 0.75 },
      { node_id: 'd-n4-3', as_of_date: AS_OF, outcome_progress: 0.2 },
      { node_id: 'd-n4-4', as_of_date: AS_OF, outcome_progress: 0.9 },
      { node_id: 'd-n4-5', as_of_date: AS_OF, outcome_progress: 0.6 },
    ],
    firstLevelAreas: [
      { department_id: 'dept-sales', fiscal_year: FY_PREVIOUS, node_id: 'n1', area: 100 },
      { department_id: 'dept-sales', fiscal_year: FY_PREVIOUS, node_id: 'n2', area: 90 },
      { department_id: 'dept-sales', fiscal_year: FY_CURRENT, node_id: 'n1', area: 120 },
      { department_id: 'dept-sales', fiscal_year: FY_CURRENT, node_id: 'n2', area: 80 },
      { department_id: 'dept-dev', fiscal_year: FY_PREVIOUS, node_id: 'n1', area: 50 },
      { department_id: 'dept-dev', fiscal_year: FY_PREVIOUS, node_id: 'n2', area: 130 },
      { department_id: 'dept-dev', fiscal_year: FY_CURRENT, node_id: 'n1', area: 60 },
      { department_id: 'dept-dev', fiscal_year: FY_CURRENT, node_id: 'n2', area: 140 },
    ],
    kpiTargets: [
      { department_id: 'dept-sales', fiscal_year: FY_CURRENT, target_value: 100 },
      { department_id: 'dept-dev', fiscal_year: FY_CURRENT, target_value: 100 },
    ],
  };
}

interface DeptWeights {
  n1_to_n1_1: number;
  n1_to_n1_2: number;
  n2_to_n2_1: number;
  n1_1_to_n1_1_1: number;
  n1_1_to_n1_1_2: number;
  n1_2_to_n1_2_1: number;
  n2_1_to_n2_1_1: number;
}

// dept-sales weights toward common ancestors emphasise new-customer acquisition
const WEIGHTS_DEPT_SALES: DeptWeights = {
  n1_to_n1_1: 0.6,
  n1_to_n1_2: 0.4,
  n2_to_n2_1: 1.0,
  n1_1_to_n1_1_1: 0.5,
  n1_1_to_n1_1_2: 0.5,
  n1_2_to_n1_2_1: 1.0,
  n2_1_to_n2_1_1: 1.0,
};

// dept-dev weights lean toward existing-customer retention instead
const WEIGHTS_DEPT_DEV: DeptWeights = {
  n1_to_n1_1: 0.3,
  n1_to_n1_2: 0.7,
  n2_to_n2_1: 1.0,
  n1_1_to_n1_1_1: 0.4,
  n1_1_to_n1_1_2: 0.6,
  n1_2_to_n1_2_1: 1.0,
  n2_1_to_n2_1_1: 1.0,
};

function buildDeptEdges(departmentId: string, w: DeptWeights) {
  const common = [
    edge(`${departmentId}-e-n1-n1_1`, departmentId, 'n1', 'n1-1', w.n1_to_n1_1),
    edge(`${departmentId}-e-n1-n1_2`, departmentId, 'n1', 'n1-2', w.n1_to_n1_2),
    edge(`${departmentId}-e-n2-n2_1`, departmentId, 'n2', 'n2-1', w.n2_to_n2_1),
    edge(`${departmentId}-e-n1_1-n1_1_1`, departmentId, 'n1-1', 'n1-1-1', w.n1_1_to_n1_1_1),
    edge(`${departmentId}-e-n1_1-n1_1_2`, departmentId, 'n1-1', 'n1-1-2', w.n1_1_to_n1_1_2),
    edge(`${departmentId}-e-n1_2-n1_2_1`, departmentId, 'n1-2', 'n1-2-1', w.n1_2_to_n1_2_1),
    edge(`${departmentId}-e-n2_1-n2_1_1`, departmentId, 'n2-1', 'n2-1-1', w.n2_1_to_n2_1_1),
  ];

  if (departmentId === 'dept-sales') {
    return [
      ...common,
      edge('e-s-n1_1_1-s_n4_1', 'dept-sales', 'n1-1-1', 's-n4-1', 0.6),
      edge('e-s-n1_1_1-s_n4_2', 'dept-sales', 'n1-1-1', 's-n4-2', 0.4),
      edge('e-s-n1_1_2-s_n4_3', 'dept-sales', 'n1-1-2', 's-n4-3', 1.0),
      edge('e-s-n1_2_1-s_n4_4', 'dept-sales', 'n1-2-1', 's-n4-4', 1.0),
      edge('e-s-n2_1_1-s_n4_5', 'dept-sales', 'n2-1-1', 's-n4-5', 1.0),
      edge('e-s-n4_1-s_n5_1', 'dept-sales', 's-n4-1', 's-n5-1', 0.7),
      edge('e-s-n4_1-s_n5_2', 'dept-sales', 's-n4-1', 's-n5-2', 0.3),
      edge('e-s-n5_1-s_n6_1', 'dept-sales', 's-n5-1', 's-n6-1', 0.5),
      edge('e-s-n5_1-s_n6_2', 'dept-sales', 's-n5-1', 's-n6-2', 0.5),
    ];
  }

  return [
    ...common,
    edge('e-d-n1_1_1-d_n4_1', 'dept-dev', 'n1-1-1', 'd-n4-1', 1.0),
    edge('e-d-n1_1_2-d_n4_2', 'dept-dev', 'n1-1-2', 'd-n4-2', 1.0),
    edge('e-d-n1_2_1-d_n4_3', 'dept-dev', 'n1-2-1', 'd-n4-3', 0.5),
    edge('e-d-n1_2_1-d_n4_4', 'dept-dev', 'n1-2-1', 'd-n4-4', 0.5),
    edge('e-d-n2_1_1-d_n4_5', 'dept-dev', 'n2-1-1', 'd-n4-5', 1.0),
  ];
}

function edge(edgeId: string, departmentId: string, parent: string, child: string, weight: number) {
  return {
    edge_id: edgeId,
    department_id: departmentId,
    parent_node_id: parent,
    child_node_id: child,
    weight,
    valid_from: '2025-04-01',
    valid_to: null,
  };
}
