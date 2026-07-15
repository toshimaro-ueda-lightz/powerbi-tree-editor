import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddChildDialog } from './AddChildDialog';
import { storyChildNode } from '../mock/storyFixtures';

const meta = {
  title: 'Components/AddChildDialog',
  component: AddChildDialog,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AddChildDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    parentView: storyChildNode,
    suggestedWeightPct: 40,
    onSubmit: async () => ({ ok: true, nodeId: 'story-new-node' }),
    onClose: () => {},
  },
};

export const RejectedByService: Story = {
  args: {
    ...Default.args,
    onSubmit: async () => ({ ok: false, reason: '兄弟施策の重み合計が1.0になりません（現在の合計 0.9000）。追加前に重み一括編集で調整してください。' }),
  },
};
