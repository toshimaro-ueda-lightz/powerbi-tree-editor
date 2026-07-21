// Augments styled-components' DefaultTheme with our app theme shape so
// `props => props.theme.colors.*` is typed everywhere without casting.
import 'styled-components';
import type { AppTheme } from './theme';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends AppTheme {}
}
