import { Position, ReactFlowProvider } from '@xyflow/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TreeNodeCard } from './TreeNodeCard';
import { NODE_HEIGHT, NODE_WIDTH, type TreeNodeCardData } from './types';
import { storyLeafNode, storyRootNode } from '../mock/storyFixtures';

// `TreeNodeCard` is a React Flow custom node (`NodeProps<TreeFlowNode>`), so
// its `<Handle>` children need a `ReactFlowProvider` ancestor to read the
// internal flow store. This wraps a single card for viewing in isolation —
// it does not render a `<ReactFlow>` canvas, so `TreeCanvas` itself stays
// out of scope here.
function buildNodeProps(data: TreeNodeCardData) {
  return {
    id: data.view.node_id,
    type: 'treeNode' as const,
    data,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    dragHandle: undefined,
    parentId: undefined,
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    selected: data.isSelected,
    draggable: false,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };
}

const baseData: TreeNodeCardData = {
  view: storyRootNode,
  isSelected: false,
  isOnPath: false,
  isDimmed: false,
  isCollapsed: false,
  hasHiddenChildren: true,
  canAddChild: false,
  canDetach: false,
  onSelect: () => {},
  onToggleCollapse: () => {},
  onAddChild: () => {},
  onDetach: () => {},
};

const meta = {
  title: 'Tree/TreeNodeCard',
  component: TreeNodeCard,
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <div style={{ padding: 40, width: NODE_WIDTH + 80 }}>
          <Story />
        </div>
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof TreeNodeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommonRootNode: Story = {
  args: buildNodeProps(baseData),
};

export const Selected: Story = {
  args: buildNodeProps({ ...baseData, isSelected: true }),
};

export const OnPath: Story = {
  args: buildNodeProps({ ...baseData, isOnPath: true }),
};

export const Dimmed: Story = {
  args: buildNodeProps({ ...baseData, isDimmed: true }),
};

export const Collapsed: Story = {
  args: buildNodeProps({ ...baseData, isCollapsed: true }),
};

export const LeafDeptScope: Story = {
  args: buildNodeProps({
    ...baseData,
    view: storyLeafNode,
    hasHiddenChildren: false,
    canAddChild: true,
    canDetach: true,
  }),
};
