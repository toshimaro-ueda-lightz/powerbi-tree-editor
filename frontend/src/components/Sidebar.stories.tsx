import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const assigneeOptions = ['伊藤', '高橋', '佐藤', '田中', '鈴木'];

export const Default: Story = {
  args: {
    searchTerm: '',
    onChangeSearch: () => {},
    maxLevel: 6,
    onChangeMaxLevel: () => {},
    assigneeFilter: '',
    onChangeAssigneeFilter: () => {},
    assigneeOptions,
    onFitView: () => {},
    onFocusSelected: () => {},
    hasSelection: false,
    matchCount: null,
  },
};

export const WithSearchHits: Story = {
  args: {
    ...Default.args,
    searchTerm: '展示会',
    matchCount: 3,
  },
};

export const WithSearchNoHits: Story = {
  args: {
    ...Default.args,
    searchTerm: '存在しない施策',
    matchCount: 0,
  },
};

export const NodeSelected: Story = {
  args: {
    ...Default.args,
    hasSelection: true,
  },
};
