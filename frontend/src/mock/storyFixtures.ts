// Shared mock props for *.stories.tsx files. Not part of the mock service —
// stories should not depend on `mockService`'s localStorage-backed state, so
// these are small hand-written `TreeNodeView` / `DepartmentRecord` fixtures
// kept separate from `seedData.ts` (which seeds the real mock store).
import type { DepartmentRecord } from '../domain/types';
import type { TreeNodeView } from './types';

export const storyDepartments: DepartmentRecord[] = [
  { department_id: 'dept-sales', name: '営業部' },
  { department_id: 'dept-dev', name: '開発部' },
];

/** Level-1 root node: common scope, non-leaf, has an area value. */
export const storyRootNode: TreeNodeView = {
  node_id: 'n1',
  name: '売上拡大',
  subtitle: '主力事業の成長',
  level: 1,
  scope: 'common',
  department_id: null,
  assignee: null,
  isLeaf: false,
  hasDirectProgressInput: false,
  outcomeProgress: 0.59,
  area: 120,
  parentNodeId: null,
  parentEdgeId: null,
  weightFromParent: null,
  childNodeIds: ['n1-1', 'n1-2'],
};

/** Level-2 child node: common scope, non-leaf, computed progress. */
export const storyChildNode: TreeNodeView = {
  node_id: 'n1-1',
  name: '新規顧客獲得',
  subtitle: null,
  level: 2,
  scope: 'common',
  department_id: null,
  assignee: null,
  isLeaf: false,
  hasDirectProgressInput: false,
  outcomeProgress: 0.55,
  area: null,
  parentNodeId: 'n1',
  parentEdgeId: 'n1-n1-1',
  weightFromParent: 0.6,
  childNodeIds: ['s-n6-1', 's-n6-2'],
};

/** Level-6 leaf node: department scope, directly editable progress. */
export const storyLeafNode: TreeNodeView = {
  node_id: 's-n6-1',
  name: '展示会Aブース設営',
  subtitle: null,
  level: 6,
  scope: 'dept',
  department_id: 'dept-sales',
  assignee: '佐藤',
  isLeaf: true,
  hasDirectProgressInput: true,
  outcomeProgress: 0.7,
  area: null,
  parentNodeId: 'n1-1',
  parentEdgeId: 's-n5-1-s-n6-1',
  weightFromParent: 0.5,
  childNodeIds: [],
};

export const storySiblingLeafNode: TreeNodeView = {
  ...storyLeafNode,
  node_id: 's-n6-2',
  name: '展示会A商談運営',
  assignee: '伊藤',
  outcomeProgress: 0.3,
  weightFromParent: 0.5,
};

export const storySiblings: TreeNodeView[] = [storyLeafNode, storySiblingLeafNode];
