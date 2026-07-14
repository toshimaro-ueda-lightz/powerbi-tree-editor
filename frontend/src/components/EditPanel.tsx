import { useEffect, useState } from 'react';
import { Scale3d, Unlink } from 'lucide-react';
import type { TreeNodeView } from '../mock/types';
import { STRINGS } from '../strings';

interface EditPanelProps {
  selected: TreeNodeView | null;
  parentView: TreeNodeView | null;
  fiscalYear: number;
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
      <aside className="edit-panel edit-panel--empty">
        <p>{STRINGS.editPanel.emptyHint}</p>
      </aside>
    );
  }

  const editableBasic = selected.level >= 4;
  const dirtyBasic =
    draftName !== selected.name || draftSubtitle !== (selected.subtitle ?? '') || draftAssignee !== (selected.assignee ?? '');

  return (
    <aside className="edit-panel">
      <h2 className="edit-panel__title">{STRINGS.editPanel.title}</h2>

      {errorMessage && <div className="banner banner--error">{errorMessage}</div>}

      <dl className="edit-panel__meta">
        <dt>{STRINGS.editPanel.nodeCode}</dt>
        <dd>{selected.node_id}</dd>
        <dt>{STRINGS.editPanel.level}</dt>
        <dd>{LEVEL_TEXT[selected.level]}</dd>
        <dt>{STRINGS.editPanel.scope}</dt>
        <dd>{selected.scope === 'common' ? STRINGS.editPanel.scopeCommon : STRINGS.editPanel.scopeDept}</dd>
        <dt>{STRINGS.editPanel.parent}</dt>
        <dd>{parentView ? parentView.name : STRINGS.common.noneFirstLevel}</dd>
      </dl>

      <div className="edit-panel__field">
        <label htmlFor="field-name">{STRINGS.editPanel.name}</label>
        <input
          id="field-name"
          type="text"
          value={draftName}
          disabled={!editableBasic}
          onChange={(e) => setDraftName(e.target.value)}
        />
      </div>

      <div className="edit-panel__field">
        <label htmlFor="field-subtitle">{STRINGS.editPanel.subtitle}</label>
        <input
          id="field-subtitle"
          type="text"
          value={draftSubtitle}
          disabled={!editableBasic}
          onChange={(e) => setDraftSubtitle(e.target.value)}
        />
      </div>

      <div className="edit-panel__field">
        <label htmlFor="field-assignee">{STRINGS.editPanel.assignee}</label>
        <input
          id="field-assignee"
          type="text"
          value={draftAssignee}
          disabled={!editableBasic}
          onChange={(e) => setDraftAssignee(e.target.value)}
        />
      </div>

      {editableBasic ? (
        <button
          type="button"
          className="button button--primary edit-panel__save-btn"
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
        </button>
      ) : (
        <p className="edit-panel__readonly-note">{STRINGS.editPanel.readonlyCommonNote}</p>
      )}

      <div className="edit-panel__field">
        <label>{STRINGS.editPanel.weightFromParent}</label>
        <div className="edit-panel__weight-row">
          <span className="edit-panel__weight-value">
            {selected.weightFromParent !== null ? `${(selected.weightFromParent * 100).toFixed(1)}%` : STRINGS.common.noneFirstLevel}
          </span>
          {selected.parentNodeId && (
            <button type="button" className="button button--secondary button--small" onClick={() => onOpenWeightEditor(selected.parentNodeId!)}>
              <Scale3d size={13} />
              {STRINGS.editPanel.openWeightEditor}
            </button>
          )}
        </div>
      </div>

      <div className="edit-panel__field">
        <label htmlFor="field-progress">{STRINGS.editPanel.outcomeProgress}</label>
        {selected.isLeaf ? (
          <div className="edit-panel__progress-editor">
            <input
              id="field-progress"
              type="range"
              min={0}
              max={100}
              value={Math.round(selected.outcomeProgress * 100)}
              onChange={(e) => onUpdateProgress(Number(e.target.value))}
            />
            <div className="edit-panel__progress-number-row">
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
            </div>
          </div>
        ) : (
          <div className="edit-panel__computed-value">
            {Math.round(selected.outcomeProgress * 100)}% <span className="tag tag--muted">{STRINGS.editPanel.computedTag}</span>
          </div>
        )}
      </div>

      {selected.level === 1 && (
        <div className="edit-panel__field">
          <label htmlFor="field-area">{STRINGS.editPanel.areaLabel(fiscalYear)}</label>
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
          {selected.area === null && <p className="edit-panel__readonly-note">{STRINGS.editPanel.areaMissing(fiscalYear)}</p>}
        </div>
      )}

      {selected.isLeaf && (
        <button type="button" className="button button--danger edit-panel__detach-btn" onClick={() => onDetach(selected.node_id)}>
          <Unlink size={14} />
          {STRINGS.editPanel.detach}
        </button>
      )}
    </aside>
  );
}
