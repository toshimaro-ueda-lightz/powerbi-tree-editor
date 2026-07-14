import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronRight, ChevronDown, Plus, Unlink, User } from 'lucide-react';
import { STRINGS } from '../strings';
import type { TreeFlowNode } from './types';
import {
  AddButton,
  Area,
  Assignee,
  CalcTag,
  CardHeader,
  CollapseButton,
  LevelBadge,
  Name,
  NodeActions,
  NodeCard,
  NodeIconButton,
  ProgressFill,
  ProgressPct,
  ProgressRow,
  ProgressTrack,
  Subtitle,
} from './TreeNodeCard.styled';

const LEVEL_LABEL = STRINGS.treeNode.levelBadge;

export function TreeNodeCard({ data }: NodeProps<TreeFlowNode>) {
  const { view, isSelected, isOnPath, isDimmed, isCollapsed, hasHiddenChildren, canAddChild, canDetach } = data;
  const pct = Math.round(view.outcomeProgress * 100);

  return (
    <NodeCard
      $scope={view.scope}
      $selected={isSelected}
      $onPath={isOnPath}
      $dimmed={isDimmed}
      onClick={(e) => {
        e.stopPropagation();
        data.onSelect(view.node_id);
      }}
      data-testid={`tree-node-${view.node_id}`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: view.level === 1 ? 0 : 1 }} />
      <CardHeader>
        <LevelBadge $scope={view.scope}>{LEVEL_LABEL[view.level]}</LevelBadge>
        {view.assignee && (
          <Assignee title={STRINGS.treeNode.assigneeTitle(view.assignee)}>
            <User size={11} aria-hidden />
            {view.assignee}
          </Assignee>
        )}
        {hasHiddenChildren && (
          <CollapseButton
            type="button"
            title={isCollapsed ? STRINGS.treeNode.expand : STRINGS.treeNode.collapse}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse(view.node_id);
            }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </CollapseButton>
        )}
      </CardHeader>

      <Name title={view.name}>{view.name}</Name>
      {view.subtitle && <Subtitle title={view.subtitle}>{view.subtitle}</Subtitle>}

      <ProgressRow>
        <ProgressTrack>
          <ProgressFill style={{ width: `${pct}%` }} />
        </ProgressTrack>
        <ProgressPct>{pct}%</ProgressPct>
      </ProgressRow>
      {!view.isLeaf && <CalcTag>{STRINGS.treeNode.computed}</CalcTag>}

      {view.level === 1 && view.area !== null && <Area>{STRINGS.treeNode.area(view.area)}</Area>}

      <NodeActions>
        {canDetach && (
          <NodeIconButton
            type="button"
            title={STRINGS.treeNode.detach}
            onClick={(e) => {
              e.stopPropagation();
              data.onDetach(view.node_id);
            }}
          >
            <Unlink size={13} />
          </NodeIconButton>
        )}
      </NodeActions>

      {canAddChild && (
        <AddButton
          type="button"
          title={STRINGS.treeNode.addChild}
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild(view.node_id);
          }}
        >
          <Plus size={14} />
        </AddButton>
      )}

      <Handle type="source" position={Position.Right} style={{ opacity: view.level === 6 ? 0 : 1 }} />
    </NodeCard>
  );
}
