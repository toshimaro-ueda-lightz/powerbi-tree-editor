import { ChevronLeft, ChevronRight, RotateCcw, Save } from 'lucide-react';
import type { DepartmentRecord } from '../domain/types';
import { STRINGS } from '../strings';
import { CURRENT_FISCAL_YEAR } from '../mock/seedData';
import { Button, IconButton } from './ui';
import { Brand, DirtyIndicator, Field, FiscalYearField, FiscalYearValue, HeaderBar, Spacer } from './Header.styled';

interface HeaderProps {
  departments: DepartmentRecord[];
  selectedDepartmentId: string;
  onChangeDepartment: (id: string) => void;
  fiscalYear: number;
  onChangeFiscalYear: (year: number) => void;
  isDirty: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function Header({
  departments,
  selectedDepartmentId,
  onChangeDepartment,
  fiscalYear,
  onChangeFiscalYear,
  isDirty,
  onSave,
  onReset,
}: HeaderProps) {
  const nextYearDisabled = fiscalYear >= CURRENT_FISCAL_YEAR;

  return (
    <HeaderBar>
      <Brand>{STRINGS.header.brand}</Brand>

      <Field>
        <label htmlFor="department-select">{STRINGS.header.departmentLabel}</label>
        <select
          id="department-select"
          value={selectedDepartmentId}
          onChange={(e) => onChangeDepartment(e.target.value)}
        >
          {departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <FiscalYearField>
        <label>{STRINGS.header.fiscalYearLabel}</label>
        <IconButton type="button" aria-label={STRINGS.header.prevYear} onClick={() => onChangeFiscalYear(fiscalYear - 1)}>
          <ChevronLeft size={16} />
        </IconButton>
        <FiscalYearValue>{STRINGS.header.fiscalYearValue(fiscalYear)}</FiscalYearValue>
        <IconButton
          type="button"
          aria-label={STRINGS.header.nextYear}
          aria-disabled={nextYearDisabled}
          disabled={nextYearDisabled}
          onClick={() => onChangeFiscalYear(fiscalYear + 1)}
        >
          <ChevronRight size={16} />
        </IconButton>
      </FiscalYearField>

      <Spacer />

      <DirtyIndicator $dirty={isDirty}>{isDirty ? STRINGS.header.dirty : STRINGS.header.clean}</DirtyIndicator>

      <Button
        type="button"
        $variant="ghost"
        onClick={() => {
          if (window.confirm(STRINGS.header.resetConfirm)) {
            onReset();
          }
        }}
      >
        <RotateCcw size={14} />
        {STRINGS.header.resetButton}
      </Button>

      <Button type="button" $variant="primary" onClick={onSave} disabled={!isDirty}>
        <Save size={14} />
        {STRINGS.header.saveButton}
      </Button>
    </HeaderBar>
  );
}
