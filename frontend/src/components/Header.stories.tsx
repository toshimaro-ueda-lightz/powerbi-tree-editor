import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';
import { storyDepartments } from '../mock/storyFixtures';
import { CURRENT_FISCAL_YEAR } from '../mock/seedData';

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
    isDirty: false,
    onSave: () => {},
    onReset: () => {},
  },
};

export const Dirty: Story = {
  args: {
    ...Default.args,
    isDirty: true,
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
