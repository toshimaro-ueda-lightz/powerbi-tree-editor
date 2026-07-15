import { ChevronLeft, ChevronRight, Save, Undo2 } from 'lucide-react';
import type { DepartmentRecord } from '@powerbi-tree-editor/domain';
import { STRINGS } from '../strings';
import { CURRENT_FISCAL_YEAR } from '../config';
import type { SaveStatus } from '../types';
import { Button, IconButton } from './ui';
import { Brand, DirtyIndicator, Field, FiscalYearField, FiscalYearValue, HeaderBar, Spacer } from './Header.styled';

interface HeaderProps {
  departments: DepartmentRecord[];
  selectedDepartmentId: string;
  onChangeDepartment: (id: string) => void;
  fiscalYear: number;
  onChangeFiscalYear: (year: number) => void;
  isDirty: boolean;
  saveStatus: SaveStatus;
  onSave: () => void;
  onDiscard: () => void;
}

export function Header({
  departments,
  selectedDepartmentId,
  onChangeDepartment,
  fiscalYear,
  onChangeFiscalYear,
  isDirty,
  saveStatus,
  onSave,
  onDiscard,
}: HeaderProps) {
  const nextYearDisabled = fiscalYear >= CURRENT_FISCAL_YEAR;
  const busy = saveStatus === 'saving';
  const statusLabel =
    saveStatus === 'saving'
      ? STRINGS.header.saving
      : saveStatus === 'error'
        ? STRINGS.header.saveFailed
        : isDirty
          ? STRINGS.header.dirty
          : STRINGS.header.clean;

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

      <DirtyIndicator $dirty={isDirty || saveStatus === 'error'} $saving={busy}>
        {statusLabel}
      </DirtyIndicator>

      <Button
        type="button"
        $variant="ghost"
        disabled={!isDirty || busy}
        onClick={() => {
          if (window.confirm(STRINGS.header.discardConfirm)) {
            onDiscard();
          }
        }}
      >
        <Undo2 size={14} />
        {STRINGS.header.discardButton}
      </Button>

      <Button type="button" $variant="primary" onClick={onSave} disabled={!isDirty || busy}>
        <Save size={14} />
        {STRINGS.header.saveButton}
      </Button>
    </HeaderBar>
  );
}
