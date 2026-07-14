import { useState } from 'react';
import type { TreeNodeView } from '../mock/types';
import type { OperationResult } from '../mock/types';
import { Modal } from './Modal';

interface WeightEditorDialogProps {
  parentView: TreeNodeView;
  siblings: TreeNodeView[];
  onSubmit: (items: { childNodeId: string; weight: number }[]) => OperationResult;
  onClose: () => void;
}

export function WeightEditorDialog({ parentView, siblings, onSubmit, onClose }: WeightEditorDialogProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(siblings.map((s) => [s.node_id, (s.weightFromParent !== null ? s.weightFromParent * 100 : 0).toString()])),
  );
  const [error, setError] = useState<string | null>(null);

  const numericValues = siblings.map((s) => Number(drafts[s.node_id] ?? '0'));
  const total = numericValues.reduce((a, b) => a + (Number.isNaN(b) ? 0 : b), 0);
  const diff = total - 100;
  const isValid = Math.abs(diff) <= 1e-4;

  return (
    <Modal title={`重み一括編集: ${parentView.name}`} onClose={onClose} width={480}>
      <p className="modal__description">直下の施策（{siblings.length}件）の重みを編集します。合計が100%になるときのみ反映できます。</p>

      <table className="weight-table">
        <thead>
          <tr>
            <th>施策名</th>
            <th>重み (%)</th>
          </tr>
        </thead>
        <tbody>
          {siblings.map((s) => (
            <tr key={s.node_id}>
              <td>{s.name}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={drafts[s.node_id]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [s.node_id]: e.target.value }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`weight-sum ${isValid ? 'weight-sum--valid' : 'weight-sum--invalid'}`}>
        合計: {total.toFixed(1)}%{' '}
        {!isValid && <span>({diff > 0 ? `${diff.toFixed(1)}% 超過` : `${Math.abs(diff).toFixed(1)}% 不足`})</span>}
        {isValid && <span>OK</span>}
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <div className="modal__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>
          キャンセル
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={!isValid}
          onClick={() => {
            const items = siblings.map((s) => ({ childNodeId: s.node_id, weight: Number(drafts[s.node_id]) / 100 }));
            const result = onSubmit(items);
            if (result.ok) {
              onClose();
            } else {
              setError(result.reason);
            }
          }}
        >
          反映
        </button>
      </div>
    </Modal>
  );
}
