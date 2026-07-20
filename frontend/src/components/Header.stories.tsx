import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';
import { storyDepartments } from '../mock/storyFixtures';
import { CURRENT_FISCAL_YEAR } from '../config';

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    departments: storyDepartments,
    selectedDepartmentId: storyDepartments[0].department_id,
    onChangeDepartment: () => {},
    fiscalYear: CURRENT_FISCAL_YEAR - 1,
    onChangeFiscalYear: () => {},
    mode: 'edit',
    onEnterEdit: () => {},
    isDirty: false,
    saveStatus: 'idle',
    onSave: () => {},
    onDiscard: () => {},
  },
};

/** 閲覧モード: 部署/年度セレクトと編集ボタンのみ。保存/破棄/未保存マークは非表示。 */
export const ViewMode: Story = {
  args: {
    ...Default.args,
    mode: 'view',
  },
};

/** 編集モード（未保存なし）: 破棄ボタンは確認なしで押せる。 */
export const EditModeClean: Story = {
  args: {
    ...Default.args,
    mode: 'edit',
    isDirty: false,
  },
};

export const Dirty: Story = {
  args: {
    ...Default.args,
    mode: 'edit',
    isDirty: true,
  },
};

export const Saving: Story = {
  args: {
    ...Default.args,
    isDirty: true,
    saveStatus: 'saving',
  },
};

export const SaveFailed: Story = {
  args: {
    ...Default.args,
    isDirty: true,
    saveStatus: 'error',
  },
};

/** At the current fiscal year the "next year" button must be disabled. */
export const AtCurrentFiscalYear: Story = {
  args: {
    ...Default.args,
    fiscalYear: CURRENT_FISCAL_YEAR,
  },
};

/** Interactive: fiscal year state actually changes, demonstrating the future-year guard. */
export const Interactive: Story = {
  render: (args) => {
    function InteractiveHeader() {
      const [fiscalYear, setFiscalYear] = useState(CURRENT_FISCAL_YEAR - 2);
      const [isDirty, setIsDirty] = useState(false);
      return (
        <Header
          {...args}
          fiscalYear={fiscalYear}
          onChangeFiscalYear={setFiscalYear}
          isDirty={isDirty}
          onSave={() => setIsDirty(false)}
        />
      );
    }
    return <InteractiveHeader />;
  },
  args: {
    ...Default.args,
  },
};
