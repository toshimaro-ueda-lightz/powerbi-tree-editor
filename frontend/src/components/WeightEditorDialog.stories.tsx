import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeightEditorDialog } from './WeightEditorDialog';
import { storyChildNode, storySiblings } from '../mock/storyFixtures';

const meta = {
  title: 'Components/WeightEditorDialog',
  component: WeightEditorDialog,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WeightEditorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValidSum: Story = {
  args: {
    parentView: storyChildNode,
    siblings: storySiblings,
    onSubmit: async () => ({ ok: true }),
    onClose: () => {},
  },
};

export const InvalidSum: Story = {
  args: {
    ...ValidSum.args,
    siblings: storySiblings.map((s, i) => (i === 0 ? { ...s, weightFromParent: 0.3 } : s)),
  },
};
