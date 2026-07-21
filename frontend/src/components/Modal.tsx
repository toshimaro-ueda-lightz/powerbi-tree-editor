import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { STRINGS } from '../strings';
import { IconButton } from './ui';
import { Body, Box, Header, Overlay } from './Modal.styled';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 420 }: ModalProps) {
  return (
    <Overlay onClick={onClose}>
      <Box style={{ width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <Header>
          <h2>{title}</h2>
          <IconButton type="button" aria-label={STRINGS.common.close} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </Header>
        <Body>{children}</Body>
      </Box>
    </Overlay>
  );
}
