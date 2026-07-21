// DLG-04 (画面設計書): confirms discarding in-progress edits before switching
// department/fiscal year while the edit-mode session is dirty.
import { STRINGS } from '../strings';
import { Modal } from './Modal';
import { Actions as ModalActions, Description } from './Modal.styled';
import { Button } from './ui';

interface UnsavedSwitchDialogProps {
  onDiscardAndSwitch: () => void;
  onCancel: () => void;
}

export function UnsavedSwitchDialog({ onDiscardAndSwitch, onCancel }: UnsavedSwitchDialogProps) {
  return (
    <Modal title={STRINGS.dialog.unsavedTitle} onClose={onCancel} width={420}>
      <Description>{STRINGS.dialog.unsavedBody}</Description>
      <ModalActions>
        <Button type="button" $variant="ghost" onClick={onCancel}>
          {STRINGS.common.cancel}
        </Button>
        <Button type="button" $variant="danger" onClick={onDiscardAndSwitch}>
          {STRINGS.dialog.unsavedDiscardSwitch}
        </Button>
      </ModalActions>
    </Modal>
  );
}
