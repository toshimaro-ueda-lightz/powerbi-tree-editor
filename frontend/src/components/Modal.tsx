import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { STRINGS } from '../strings';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 420 }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label={STRINGS.common.close} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
