import { Crosshair, Maximize, Search } from 'lucide-react';

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
          施策名検索
        </label>
        <div className="sidebar__search-box">
          <Search size={14} className="sidebar__search-icon" aria-hidden />
          <input
            id="search-input"
            type="text"
            placeholder="施策名で検索"
            value={searchTerm}
            onChange={(e) => onChangeSearch(e.target.value)}
          />
        </div>
        {searchTerm && <div className="sidebar__hint">{matchCount ?? 0} 件ヒット</div>}
      </div>

      <div className="sidebar__section">
        <label className="sidebar__label" htmlFor="level-filter">
          階層フィルター
        </label>
        <select id="level-filter" value={maxLevel} onChange={(e) => onChangeMaxLevel(Number(e.target.value))}>
          <option value={6}>全階層を表示</option>
          <option value={5}>第5階層まで表示</option>
          <option value={4}>第4階層まで表示</option>
          <option value={3}>第3階層まで表示</option>
          <option value={2}>第2階層まで表示</option>
          <option value={1}>第1階層まで表示</option>
        </select>
      </div>

      <div className="sidebar__section">
        <label className="sidebar__label" htmlFor="assignee-filter">
          担当者フィルター
        </label>
        <select id="assignee-filter" value={assigneeFilter} onChange={(e) => onChangeAssigneeFilter(e.target.value)}>
          <option value="">すべての担当者</option>
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
          全体表示
        </button>
        <button type="button" className="button button--secondary" onClick={onFocusSelected} disabled={!hasSelection}>
          <Crosshair size={14} />
          選択ノードへ移動
        </button>
      </div>

      <div className="sidebar__legend">
        <div className="sidebar__legend-title">凡例</div>
        <div className="sidebar__legend-item">
          <span className="legend-swatch legend-swatch--common" /> 共通施策 (第1〜3階層)
        </div>
        <div className="sidebar__legend-item">
          <span className="legend-swatch legend-swatch--dept" /> 部署固有施策 (第4〜6階層)
        </div>
        <div className="sidebar__legend-item">
          <span className="legend-swatch legend-swatch--path" /> 選択施策までの経路
        </div>
      </div>
    </aside>
  );
}
