import { ChevronLeft, ChevronRight, RotateCcw, Save } from 'lucide-react';
import type { DepartmentRecord } from '../domain/types';

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
      <div className="app-header__brand">変革ツリー更新アプリ</div>

      <div className="app-header__field">
        <label htmlFor="department-select">部署</label>
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
        <label>年度</label>
        <button type="button" className="icon-button" aria-label="前年度" onClick={() => onChangeFiscalYear(fiscalYear - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="app-header__fiscal-year-value">{fiscalYear}年度</span>
        <button type="button" className="icon-button" aria-label="次年度" onClick={() => onChangeFiscalYear(fiscalYear + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="app-header__spacer" />

      <span className={`dirty-indicator ${isDirty ? 'dirty-indicator--dirty' : 'dirty-indicator--clean'}`}>
        {isDirty ? '未保存の変更があります' : '保存済み'}
      </span>

      <button
        type="button"
        className="button button--ghost"
        onClick={() => {
          if (window.confirm('モックデータを初期状態にリセットします。よろしいですか？（保存前の変更は失われます）')) {
            onReset();
          }
        }}
      >
        <RotateCcw size={14} />
        モックデータ初期化
      </button>

      <button type="button" className="button button--primary" onClick={onSave} disabled={!isDirty}>
        <Save size={14} />
        保存
      </button>
    </header>
  );
}
