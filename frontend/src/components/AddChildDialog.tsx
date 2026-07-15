import { useState } from 'react';
import type { AddChildResult, TreeNodeView } from '../types';
import { STRINGS } from '../strings';
import { Modal } from './Modal';
import { Actions as ModalActions, Description } from './Modal.styled';
import { Banner, Button, FieldGroup, Hint } from './ui';

interface AddChildDialogProps {
  parentView: TreeNodeView;
  suggestedWeightPct: number;
  onSubmit: (input: { name: string; subtitle?: string | null; assignee?: string | null; weight: number }) => Promise<AddChildResult>;
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
    <Modal title={STRINGS.addChildDialog.title(parentView.name)} onClose={onClose} width={440}>
      <Description>{STRINGS.addChildDialog.description(childLevel, parentView.name)}</Description>

      <FieldGroup>
        <label htmlFor="new-child-name">{STRINGS.addChildDialog.nameRequired}</label>
        <input id="new-child-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="new-child-subtitle">{STRINGS.addChildDialog.subtitle}</label>
        <input id="new-child-subtitle" type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="new-child-assignee">{STRINGS.addChildDialog.assignee}</label>
        <input id="new-child-assignee" type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="new-child-weight">{STRINGS.addChildDialog.weightLabel}</label>
        <input
          id="new-child-weight"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={weightPct}
          onChange={(e) => setWeightPct(e.target.value)}
        />
        <Hint as="p">{STRINGS.addChildDialog.weightHint}</Hint>
      </FieldGroup>

      {error && <Banner>{error}</Banner>}

      <ModalActions>
        <Button type="button" $variant="ghost" onClick={onClose}>
          {STRINGS.common.cancel}
        </Button>
        <Button
          type="button"
          $variant="primary"
          disabled={name.trim() === ''}
          onClick={async () => {
            const weight = Number(weightPct) / 100;
            const result = await onSubmit({
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
          {STRINGS.addChildDialog.add}
        </Button>
      </ModalActions>
    </Modal>
  );
}
