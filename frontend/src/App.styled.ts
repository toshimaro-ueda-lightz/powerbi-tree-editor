import styled from 'styled-components';
import { Banner } from './components/ui';

export const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 960px;
  overflow: hidden;
`;

export const AppBody = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
`;

export const AppMain = styled.main`
  flex: 1;
  min-width: 0;
  position: relative;
  background: ${({ theme }) => theme.colors.surfaceMuted};
`;

export const TreeCanvasEmpty = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 24px;
  text-align: center;
`;

export const FloatingBanner = styled(Banner)`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  max-width: 640px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
`;
