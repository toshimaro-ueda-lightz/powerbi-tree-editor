import { useEffect, useState } from 'react';
import { Scale3d, Unlink } from 'lucide-react';
import { isTempId } from '@powerbi-tree-editor/domain';
import type { TreeNodeView } from '../types';
import { STRINGS } from '../strings';
import { Banner, Button, FieldGroup, Tag } from './ui';
import {
  ComputedValue,
  DetachButton,
  EditPanelAside,
  EditPanelEmpty,
  Meta,
  ProgressEditor,
  ProgressNumberRow,
  ReadonlyNote,
  SaveButton,
  Title,
  WeightRow,
  WeightValue,
} from './EditPanel.styled';

interface EditPanelProps {
  selected: TreeNodeView | null;
  parentView: TreeNodeView | null;
  fiscalYear: number;
  readOnly: boolean;
  onUpdateNode: (patch: { name?: string; subtitle?: string | null; assignee?: string | null }) => void;
  onUpdateProgress: (pct: number) => void;
  onUpdateArea: (value: number) => void;
  onOpenWeightEditor: (parentNodeId: string) => void;
  onDetach: (nodeId: string) => void;
  errorMessage: string | null;
}

const LEVEL_TEXT = STRINGS.editPanel.levelText;

export function EditPanel({
  selected,
  parentView,
  fiscalYear,
  readOnly,
  onUpdateNode,
  onUpdateProgress,
  onUpdateArea,
  onOpenWeightEditor,
  onDetach,
  errorMessage,
}: EditPanelProps) {
  const [draftName, setDraftName] = useState('');
  const [draftSubtitle, setDraftSubtitle] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [draftArea, setDraftArea] = useState('');

  useEffect(() => {
    if (!selected) return;
    setDraftName(selected.name);
    setDraftSubtitle(selected.subtitle ?? '');
    setDraftAssignee(selected.assignee ?? '');
    setDraftArea(selected.area !== null ? String(selected.area) : '');
  }, [selected]);

  if (!selected) {
    return (
      <EditPanelEmpty>
        <p>{STRINGS.editPanel.emptyHint}</p>
      </EditPanelEmpty>
    );
  }

  const editableBasic = selected.level >= 4;
  const dirtyBasic =
    draftName !== selected.name || draftSubtitle !== (selected.subtitle ?? '') || draftAssignee !== (selected.assignee ?? '');

  return (
    <EditPanelAside>
      <Title>{STRINGS.editPanel.title}</Title>

      {errorMessage && <Banner>{errorMessage}</Banner>}

      <Meta>
        <dt>{STRINGS.editPanel.nodeCode}</dt>
        {/* A not-yet-saved node only has a session-local placeholder id; the
            real code is assigned by SQLite on save, so show the pending note
            rather than leaking the internal uuid to the user (正本 §5.1). */}
        <dd>{isTempId(selected.node_id) ? STRINGS.editPanel.nodeCodePending : selected.node_id}</dd>
        <dt>{STRINGS.editPanel.level}</dt>
        <dd>{LEVEL_TEXT[selected.level]}</dd>
        <dt>{STRINGS.editPanel.scope}</dt>
        <dd>{selected.scope === 'common' ? STRINGS.editPanel.scopeCommon : STRINGS.editPanel.scopeDept}</dd>
        <dt>{STRINGS.editPanel.parent}</dt>
        <dd>{parentView ? parentView.name : STRINGS.common.noneFirstLevel}</dd>
      </Meta>

      {readOnly ? (
        <>
          <FieldGroup>
            <label>{STRINGS.editPanel.name}</label>
            <ComputedValue>{selected.name}</ComputedValue>
          </FieldGroup>

          <FieldGroup>
            <label>{STRINGS.editPanel.subtitle}</label>
            <ComputedValue>{selected.subtitle || STRINGS.common.noneFirstLevel}</ComputedValue>
          </FieldGroup>

          <FieldGroup>
            <label>{STRINGS.editPanel.assignee}</label>
            <ComputedValue>{selected.assignee || STRINGS.common.noneFirstLevel}</ComputedValue>
          </FieldGroup>
        </>
      ) : (
        <>
          <FieldGroup>
            <label htmlFor="field-name">{STRINGS.editPanel.name}</label>
            <input
              id="field-name"
              type="text"
              value={draftName}
              disabled={!editableBasic}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <label htmlFor="field-subtitle">{STRINGS.editPanel.subtitle}</label>
            <input
              id="field-subtitle"
              type="text"
              value={draftSubtitle}
              disabled={!editableBasic}
              onChange={(e) => setDraftSubtitle(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <label htmlFor="field-assignee">{STRINGS.editPanel.assignee}</label>
            <input
              id="field-assignee"
              type="text"
              value={draftAssignee}
              disabled={!editableBasic}
              onChange={(e) => setDraftAssignee(e.target.value)}
            />
          </FieldGroup>

          {editableBasic ? (
            <SaveButton
              type="button"
              $variant="primary"
              disabled={!dirtyBasic || draftName.trim() === ''}
              onClick={() =>
                onUpdateNode({
                  name: draftName.trim(),
                  subtitle: draftSubtitle.trim() === '' ? null : draftSubtitle,
                  assignee: draftAssignee.trim() === '' ? null : draftAssignee,
                })
              }
            >
              {STRINGS.editPanel.saveBasic}
            </SaveButton>
          ) : (
            <ReadonlyNote>{STRINGS.editPanel.readonlyCommonNote}</ReadonlyNote>
          )}
        </>
      )}

      <FieldGroup>
        <label>{STRINGS.editPanel.weightFromParent}</label>
        <WeightRow>
          <WeightValue>
            {selected.weightFromParent !== null ? `${(selected.weightFromParent * 100).toFixed(1)}%` : STRINGS.common.noneFirstLevel}
          </WeightValue>
          {!readOnly && selected.parentNodeId && (
            <Button type="button" $variant="secondary" $small onClick={() => onOpenWeightEditor(selected.parentNodeId!)}>
              <Scale3d size={13} />
              {STRINGS.editPanel.openWeightEditor}
            </Button>
          )}
        </WeightRow>
      </FieldGroup>

      <FieldGroup>
        <label htmlFor="field-progress">{STRINGS.editPanel.outcomeProgress}</label>
        {!readOnly && selected.isLeaf ? (
          <ProgressEditor>
            <input
              id="field-progress"
              type="range"
              min={0}
              max={100}
              value={Math.round(selected.outcomeProgress * 100)}
              onChange={(e) => onUpdateProgress(Number(e.target.value))}
            />
            <ProgressNumberRow>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(selected.outcomeProgress * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) onUpdateProgress(Math.min(100, Math.max(0, v)));
                }}
              />
              <span>%</span>
            </ProgressNumberRow>
          </ProgressEditor>
        ) : (
          <ComputedValue>
            {Math.round(selected.outcomeProgress * 100)}%{' '}
            {!selected.isLeaf && <Tag>{STRINGS.editPanel.computedTag}</Tag>}
          </ComputedValue>
        )}
      </FieldGroup>

      {selected.level === 1 && (
        <FieldGroup>
          <label htmlFor={readOnly ? undefined : 'field-area'}>{STRINGS.editPanel.areaLabel(fiscalYear)}</label>
          {readOnly ? (
            <ComputedValue>{selected.area !== null ? selected.area : STRINGS.editPanel.areaPlaceholder}</ComputedValue>
          ) : (
            <input
              id="field-area"
              type="number"
              min={0}
              value={draftArea}
              placeholder={STRINGS.editPanel.areaPlaceholder}
              onChange={(e) => setDraftArea(e.target.value)}
              onBlur={() => {
                const v = Number(draftArea);
                if (draftArea.trim() !== '' && !Number.isNaN(v)) onUpdateArea(v);
              }}
            />
          )}
          {selected.area === null && <ReadonlyNote>{STRINGS.editPanel.areaMissing(fiscalYear)}</ReadonlyNote>}
        </FieldGroup>
      )}

      {!readOnly && selected.isLeaf && (
        <DetachButton type="button" $variant="danger" onClick={() => onDetach(selected.node_id)}>
          <Unlink size={14} />
          {STRINGS.editPanel.detach}
        </DetachButton>
      )}
    </EditPanelAside>
  );
}
