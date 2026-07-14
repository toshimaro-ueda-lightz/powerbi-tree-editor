import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronRight, ChevronDown, Plus, Unlink, User } from 'lucide-react';
import { STRINGS } from '../strings';
import type { TreeFlowNode } from './types';

const LEVEL_LABEL = STRINGS.treeNode.levelBadge;

export function TreeNodeCard({ data }: NodeProps<TreeFlowNode>) {
  const { view, isSelected, isOnPath, isDimmed, isCollapsed, hasHiddenChildren, canAddChild, canDetach } = data;
  const pct = Math.round(view.outcomeProgress * 100);

  const classNames = [
    'tree-node',
    `tree-node--scope-${view.scope}`,
    isSelected ? 'tree-node--selected' : '',
    isOnPath && !isSelected ? 'tree-node--on-path' : '',
    isDimmed ? 'tree-node--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      onClick={(e) => {
        e.stopPropagation();
        data.onSelect(view.node_id);
      }}
      data-testid={`tree-node-${view.node_id}`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: view.level === 1 ? 0 : 1 }} />
      <div className="tree-node__header">
        <span className={`tree-node__level-badge tree-node__level-badge--${view.scope}`}>{LEVEL_LABEL[view.level]}</span>
        {view.assignee && (
          <span className="tree-node__assignee" title={STRINGS.treeNode.assigneeTitle(view.assignee)}>
            <User size={11} aria-hidden />
            {view.assignee}
          </span>
        )}
        {hasHiddenChildren && (
          <button
            type="button"
            className="tree-node__collapse-btn"
            title={isCollapsed ? STRINGS.treeNode.expand : STRINGS.treeNode.collapse}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse(view.node_id);
            }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      <div className="tree-node__name" title={view.name}>
        {view.name}
      </div>
      {view.subtitle && (
        <div className="tree-node__subtitle" title={view.subtitle}>
          {view.subtitle}
        </div>
      )}

      <div className="tree-node__progress-row">
        <div className="tree-node__progress-track">
          <div className="tree-node__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="tree-node__progress-pct">{pct}%</span>
      </div>
      {!view.isLeaf && <span className="tree-node__calc-tag">{STRINGS.treeNode.computed}</span>}

      {view.level === 1 && view.area !== null && <div className="tree-node__area">{STRINGS.treeNode.area(view.area)}</div>}

      <div className="tree-node__actions">
        {canDetach && (
          <button
            type="button"
            className="tree-node__icon-btn tree-node__icon-btn--danger"
            title={STRINGS.treeNode.detach}
            onClick={(e) => {
              e.stopPropagation();
              data.onDetach(view.node_id);
            }}
          >
            <Unlink size={13} />
          </button>
        )}
      </div>

      {canAddChild && (
        <button
          type="button"
          className="tree-node__add-btn"
          title={STRINGS.treeNode.addChild}
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild(view.node_id);
          }}
        >
          <Plus size={14} />
        </button>
      )}

      <Handle type="source" position={Position.Right} style={{ opacity: view.level === 6 ? 0 : 1 }} />
    </div>
  );
}
