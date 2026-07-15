import { Crosshair, Maximize, Search } from 'lucide-react';
import { STRINGS } from '../strings';
import { Button, Hint } from './ui';
import {
  Actions,
  Label,
  Legend,
  LegendItem,
  LegendSwatch,
  LegendTitle,
  SearchBox,
  SearchIcon,
  Section,
  SidebarAside,
} from './Sidebar.styled';

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
    <SidebarAside>
      <Section>
        <Label htmlFor="search-input">{STRINGS.sidebar.searchLabel}</Label>
        <SearchBox>
          <SearchIcon>
            <Search size={14} aria-hidden />
          </SearchIcon>
          <input
            id="search-input"
            type="text"
            placeholder={STRINGS.sidebar.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onChangeSearch(e.target.value)}
          />
        </SearchBox>
        {searchTerm && <Hint>{STRINGS.sidebar.hitCount(matchCount ?? 0)}</Hint>}
      </Section>

      <Section>
        <Label htmlFor="level-filter">{STRINGS.sidebar.levelFilterLabel}</Label>
        <select id="level-filter" value={maxLevel} onChange={(e) => onChangeMaxLevel(Number(e.target.value))}>
          <option value={6}>{STRINGS.sidebar.levelOptions.all}</option>
          <option value={5}>{STRINGS.sidebar.levelOptions.upTo5}</option>
          <option value={4}>{STRINGS.sidebar.levelOptions.upTo4}</option>
          <option value={3}>{STRINGS.sidebar.levelOptions.upTo3}</option>
          <option value={2}>{STRINGS.sidebar.levelOptions.upTo2}</option>
          <option value={1}>{STRINGS.sidebar.levelOptions.upTo1}</option>
        </select>
      </Section>

      <Section>
        <Label htmlFor="assignee-filter">{STRINGS.sidebar.assigneeFilterLabel}</Label>
        <select id="assignee-filter" value={assigneeFilter} onChange={(e) => onChangeAssigneeFilter(e.target.value)}>
          <option value="">{STRINGS.sidebar.assigneeAll}</option>
          {assigneeOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Section>

      <Actions>
        <Button type="button" $variant="secondary" onClick={onFitView}>
          <Maximize size={14} />
          {STRINGS.sidebar.fitView}
        </Button>
        <Button type="button" $variant="secondary" onClick={onFocusSelected} disabled={!hasSelection}>
          <Crosshair size={14} />
          {STRINGS.sidebar.focusSelected}
        </Button>
      </Actions>

      <Legend>
        <LegendTitle>{STRINGS.sidebar.legendTitle}</LegendTitle>
        <LegendItem>
          <LegendSwatch $variant="common" /> {STRINGS.sidebar.legendCommon}
        </LegendItem>
        <LegendItem>
          <LegendSwatch $variant="dept" /> {STRINGS.sidebar.legendDept}
        </LegendItem>
        <LegendItem>
          <LegendSwatch $variant="path" /> {STRINGS.sidebar.legendPath}
        </LegendItem>
      </Legend>
    </SidebarAside>
  );
}
