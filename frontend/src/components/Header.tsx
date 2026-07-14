import { ChevronLeft, ChevronRight, RotateCcw, Save } from 'lucide-react';
import type { DepartmentRecord } from '../domain/types';
import { STRINGS } from '../strings';

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
  return (
    <header className="app-header">
      <div className="app-header__brand">{STRINGS.header.brand}</div>

      <div className="app-header__field">
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
      </div>

      <div className="app-header__field app-header__fiscal-year">
        <label>{STRINGS.header.fiscalYearLabel}</label>
        <button type="button" className="icon-button" aria-label={STRINGS.header.prevYear} onClick={() => onChangeFiscalYear(fiscalYear - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="app-header__fiscal-year-value">{STRINGS.header.fiscalYearValue(fiscalYear)}</span>
        <button type="button" className="icon-button" aria-label={STRINGS.header.nextYear} onClick={() => onChangeFiscalYear(fiscalYear + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="app-header__spacer" />

      <span className={`dirty-indicator ${isDirty ? 'dirty-indicator--dirty' : 'dirty-indicator--clean'}`}>
        {isDirty ? STRINGS.header.dirty : STRINGS.header.clean}
      </span>

      <button
        type="button"
        className="button button--ghost"
        onClick={() => {
          if (window.confirm(STRINGS.header.resetConfirm)) {
            onReset();
          }
        }}
      >
        <RotateCcw size={14} />
        {STRINGS.header.resetButton}
      </button>

      <button type="button" className="button button--primary" onClick={onSave} disabled={!isDirty}>
        <Save size={14} />
        {STRINGS.header.saveButton}
      </button>
    </header>
  );
}
