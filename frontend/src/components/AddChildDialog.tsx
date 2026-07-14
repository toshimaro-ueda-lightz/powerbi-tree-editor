import { useState } from 'react';
import type { AddChildResult, TreeNodeView } from '../mock/types';
import { Modal } from './Modal';

interface AddChildDialogProps {
  parentView: TreeNodeView;
  suggestedWeightPct: number;
  onSubmit: (input: { name: string; subtitle?: string | null; assignee?: string | null; weight: number }) => AddChildResult;
  onClose: () => void;
}

export function AddChildDialog({ parentView, suggestedWeightPct, onSubmit, onClose }: AddChildDialogProps) {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [weightPct, setWeightPct] = useState(String(Math.max(0, Math.min(100, suggestedWeightPct))));
  const [error, setError] = useState<string | null>(null);

  const childLevel = parentView.level + 1;

  return (
    <Modal title={`子施策を追加: ${parentView.name}`} onClose={onClose} width={440}>
      <p className="modal__description">第{childLevel}階層の施策として、「{parentView.name}」の子に追加します。</p>

      <div className="edit-panel__field">
        <label htmlFor="new-child-name">施策名（必須）</label>
        <input id="new-child-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="edit-panel__field">
        <label htmlFor="new-child-subtitle">サブタイトル</label>
        <input id="new-child-subtitle" type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="edit-panel__field">
        <label htmlFor="new-child-assignee">担当者</label>
        <input id="new-child-assignee" type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      </div>
      <div className="edit-panel__field">
        <label htmlFor="new-child-weight">親からの重み (%)</label>
        <input
          id="new-child-weight"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={weightPct}
          onChange={(e) => setWeightPct(e.target.value)}
        />
        <p className="sidebar__hint">兄弟施策との合計が100%になるように入力してください。</p>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <div className="modal__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>
          キャンセル
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={name.trim() === ''}
          onClick={() => {
            const weight = Number(weightPct) / 100;
            const result = onSubmit({
              name: name.trim(),
              subtitle: subtitle.trim() === '' ? null : subtitle.trim(),
              assignee: assignee.trim() === '' ? null : assignee.trim(),
              weight,
            });
            if (result.ok) {
              onClose();
            } else {
              setError(result.reason);
            }
          }}
        >
          追加
        </button>
      </div>
    </Modal>
  );
}
