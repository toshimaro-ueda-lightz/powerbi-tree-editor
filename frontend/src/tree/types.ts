import type { Node } from '@xyflow/react';
import type { TreeNodeView } from '../mock/types';

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
