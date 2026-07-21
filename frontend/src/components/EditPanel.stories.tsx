import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditPanel } from './EditPanel';
import { CURRENT_FISCAL_YEAR } from '../config';
import { storyChildNode, storyLeafNode, storyRootNode } from '../mock/storyFixtures';

const meta = {
  title: 'Components/EditPanel',
  component: EditPanel,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EditPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

export const Empty: Story = {
  args: {
    selected: null,
    parentView: null,
    fiscalYear: CURRENT_FISCAL_YEAR,
    readOnly: false,
    onUpdateNode: noop,
    onUpdateProgress: noop,
    onUpdateArea: noop,
    onOpenWeightEditor: noop,
    onDetach: noop,
    errorMessage: null,
  },
};

/** Level-1 common node: name/subtitle/assignee are read-only, area is editable. */
export const CommonRootNode: Story = {
  args: {
    ...Empty.args,
    selected: storyRootNode,
    parentView: null,
  },
};

/** Leaf node: name/subtitle/assignee editable, progress is a slider, can be detached. */
export const LeafNode: Story = {
  args: {
    ...Empty.args,
    selected: storyLeafNode,
    parentView: storyChildNode,
  },
};

export const WithError: Story = {
  args: {
    ...LeafNode.args,
    errorMessage: '成果進捗は0〜100%の範囲で入力してください。',
  },
};

/** 閲覧モード: 入力欄・保存・重み編集・ツリーから外すボタンをすべて隠し、値のみ表示する。 */
export const ReadOnly: Story = {
  args: {
    ...LeafNode.args,
    readOnly: true,
  },
};
