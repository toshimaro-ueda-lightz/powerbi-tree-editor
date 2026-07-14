import { Crosshair, Maximize, Search } from 'lucide-react';
import { STRINGS } from '../strings';

interface SidebarProps {
  searchTerm: string;
  onChangeSearch: (v: string) => void;
  maxLevel: number;
  onChangeMaxLevel: (v: number) => void;
  assigneeFilter: string;
  onChangeAssigneeFilter: (v: string) => void;
  assigneeOptions: string[];
  onFitView: () => void;
  onFocusSelected: () => void;
  hasSelection: boolean;
  matchCount: number | null;
}

export function Sidebar({
  searchTerm,
  onChangeSearch,
  maxLevel,
  onChangeMaxLevel,
  assigneeFilter,
  onChangeAssigneeFilter,
  assigneeOptions,
  onFitView,
  onFocusSelected,
  hasSelection,
  matchCount,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <label className="sidebar__label" htmlFor="search-input">
          {STRINGS.sidebar.searchLabel}
        </label>
        <div className="sidebar__search-box">
          <Search size={14} className="sidebar__search-icon" aria-hidden />
          <input
            id="search-input"
            type="text"
            placeholder={STRINGS.sidebar.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onChangeSearch(e.target.value)}
          />
        </div>
        {searchTerm && <div className="sidebar__hint">{STRINGS.sidebar.hitCount(matchCount ?? 0)}</div>}
      </div>

      <div className="sidebar__section">
        <label className="sidebar__label" htmlFor="level-filter">
          {STRINGS.sidebar.levelFilterLabel}
        </label>
        <select id="level-filter" value={maxLevel} onChange={(e) => onChangeMaxLevel(Number(e.target.value))}>
          <option value={6}>{STRINGS.sidebar.levelOptions.all}</option>
          <option value={5}>{STRINGS.sidebar.levelOptions.upTo5}</option>
          <option value={4}>{STRINGS.sidebar.levelOptions.upTo4}</option>
          <option value={3}>{STRINGS.sidebar.levelOptions.upTo3}</option>
          <option value={2}>{STRINGS.sidebar.levelOptions.upTo2}</option>
          <option value={1}>{STRINGS.sidebar.levelOptions.upTo1}</option>
        </select>
      </div>

      <div className="sidebar__section">
        <label className="sidebar__label" htmlFor="assignee-filter">
          {STRINGS.sidebar.assigneeFilterLabel}
        </label>
        <select id="assignee-filter" value={assigneeFilter} onChange={(e) => onChangeAssigneeFilter(e.target.value)}>
          <option value="">{STRINGS.sidebar.assigneeAll}</option>
          {assigneeOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar__section sidebar__actions">
        <button type="button" className="button button--secondary" onClick={onFitView}>
          <Maximize size={14} />
          {STRINGS.sidebar.fitView}
        </button>
        <button type="button" className="button button--secondary" onClick={onFocusSelected} disabled={!hasSelection}>
          <Crosshair size={14} />
          {STRINGS.sidebar.focusSelected}
        </button>
      </div>

      <div className="sidebar__legend">
        <div className="sidebar__legend-title">{STRINGS.sidebar.legendTitle}</div>
        <div className="sidebar__legend-item">
          <span className="legend-swatch legend-swatch--common" /> {STRINGS.sidebar.legendCommon}
        </div>
        <div className="sidebar__legend-item">
          <span className="legend-swatch legend-swatch--dept" /> {STRINGS.sidebar.legendDept}
        </div>
        <div className="sidebar__legend-item">
          <span className="legend-swatch legend-swatch--path" /> {STRINGS.sidebar.legendPath}
        </div>
      </div>
    </aside>
  );
}
