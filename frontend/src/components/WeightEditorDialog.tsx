import { useState } from 'react';
import type { TreeNodeView } from '../mock/types';
import type { OperationResult } from '../mock/types';
import { STRINGS } from '../strings';
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
    <Modal title={STRINGS.weightDialog.title(parentView.name)} onClose={onClose} width={480}>
      <p className="modal__description">{STRINGS.weightDialog.description(siblings.length)}</p>

      <table className="weight-table">
        <thead>
          <tr>
            <th>{STRINGS.weightDialog.colName}</th>
            <th>{STRINGS.weightDialog.colWeight}</th>
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
        {STRINGS.weightDialog.sum(total)}{' '}
        {!isValid && <span>({diff > 0 ? STRINGS.weightDialog.surplus(diff) : STRINGS.weightDialog.shortfall(diff)})</span>}
        {isValid && <span>{STRINGS.weightDialog.sumOk}</span>}
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <div className="modal__actions">
        <button type="button" className="button button--ghost" onClick={onClose}>
          {STRINGS.common.cancel}
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
          {STRINGS.weightDialog.apply}
        </button>
      </div>
    </Modal>
  );
}
