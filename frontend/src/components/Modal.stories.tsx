import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from './Modal';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'サンプルダイアログ',
    onClose: () => {},
    width: 420,
    children: <p>モーダル本文のサンプルです。</p>,
  },
};

export const Wide: Story = {
  args: {
    ...Default.args,
    title: '幅広ダイアログ',
    width: 640,
  },
};
