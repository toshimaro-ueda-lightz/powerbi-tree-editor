import type { Meta, StoryObj } from '@storybook/react-vite';
import { UnsavedSwitchDialog } from './UnsavedSwitchDialog';

const meta = {
  title: 'Components/UnsavedSwitchDialog',
  component: UnsavedSwitchDialog,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof UnsavedSwitchDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** DLG-04: shown when the user tries to switch department/fiscal year while editing with unsaved changes. */
export const Default: Story = {
  args: {
    onDiscardAndSwitch: () => {},
    onCancel: () => {},
  },
};
