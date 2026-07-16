import type { Node } from '@xyflow/react';
import type { TreeNodeView } from '../types';

export interface TreeNodeCardData extends Record<string, unknown> {
  view: TreeNodeView;
  isSelected: boolean;
  isOnPath: boolean;
  isDimmed: boolean;
  isCollapsed: boolean;
  hasHiddenChildren: boolean;
  canAddChild: boolean;
  canDetach: boolean;
  onSelect: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onAddChild: (parentNodeId: string) => void;
  onDetach: (nodeId: string) => void;
}

export type TreeFlowNode = Node<TreeNodeCardData, 'treeNode'>;

export const NODE_WIDTH = 236;
export const NODE_HEIGHT = 112;

/** Height (px) of the fixed level-1..6 column header bar above the canvas (§4.3). */
export const COLUMN_HEADER_HEIGHT = 32;
