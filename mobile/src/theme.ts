import { vars } from 'nativewind';

/**
 * Shell geometry and color tokens.
 *
 * Geometric tokens are layout values shared between the tab bar, the FAB and screen padding.
 * Color tokens are the runtime theme variables driving NativeWind utilities via VariableContextProvider.
 */

/** Height of the tab bar above the bottom safe-area inset. */
export const TAB_BAR_HEIGHT = 60;

/** Diameter of the floating action button (d-0cd3wr: raised clear of the bar). */
export const FAB_SIZE = 56;

/** Gap between the top edge of the tab bar and the bottom of the FAB. */
export const FAB_GAP = 16;

/** Bottom padding a scrolling screen needs so content clears bar + FAB. */
export const SCREEN_BOTTOM_INSET = TAB_BAR_HEIGHT + FAB_GAP + FAB_SIZE;

/** Light mode token dictionary matching global.css :root. */
export const LIGHT_TOKENS: Record<`--${string}`, string> = {
  '--background': '#fefcf9',
  '--foreground': '#1c1714',
  '--card': '#ffffff',
  '--card-foreground': '#1c1714',
  '--popover': '#ffffff',
  '--popover-foreground': '#1c1714',
  '--primary': '#576cb7',
  '--primary-foreground': '#fcfcfc',
  '--secondary': '#f4f1ee',
  '--secondary-foreground': '#2a2522',
  '--muted': '#f4f1ee',
  '--muted-foreground': '#706b66',
  '--accent': '#f4f1ee',
  '--accent-foreground': '#2a2522',
  '--destructive': '#e62b34',
  '--destructive-foreground': '#fcfcfc',
  '--border': '#e9e7e6',
  '--hairline': '#f0eeec',
  '--input': '#dcdad8',
  '--ring': '#576cb7',
  '--tab-bar': '#131110',
  '--tab-bar-foreground': '#f0eeeb',
  '--tab-bar-muted': '#96918c',
  '--ghost-active': '#3bb974',
  '--ghost-stale': '#efa831',
  '--ghost-ghosted': '#e94554',
};

/**
 * Dark mode token dictionary matching global.css @media dark block.
 *
 * Tab bar treatment: Option B (pitch black '#000000' against '#131110' page background).
 */
export const DARK_TOKENS: Record<`--${string}`, string> = {
  '--background': '#131110',
  '--foreground': '#f0eeeb',
  '--card': '#1a1816',
  '--card-foreground': '#f0eeeb',
  '--popover': '#1a1816',
  '--popover-foreground': '#f0eeeb',
  '--primary': '#708ade',
  '--primary-foreground': '#090b0f',
  '--secondary': '#282624',
  '--secondary-foreground': '#f0eeeb',
  '--muted': '#282624',
  '--muted-foreground': '#96918c',
  '--accent': '#282624',
  '--accent-foreground': '#f0eeeb',
  '--destructive': '#bb061e',
  '--destructive-foreground': '#f8f8f8',
  '--border': '#282623',
  '--hairline': '#302d2b',
  '--input': '#282623',
  '--ring': '#708ade',
  // Option B: Pitch black (#000000) borderless tab bar under #131110 page
  '--tab-bar': '#000000',
  '--tab-bar-foreground': '#f0eeeb',
  '--tab-bar-muted': '#96918c',
  '--ghost-active': '#43c07a',
  '--ghost-stale': '#f5ae39',
  '--ghost-ghosted': '#f44f5d',
};

export const lightVars = vars(LIGHT_TOKENS);
export const darkVars = vars(DARK_TOKENS);

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  hairline: string;
  input: string;
  ring: string;
  tabBar: string;
  tabBarForeground: string;
  tabBarMuted: string;
  ghostActive: string;
  ghostStale: string;
  ghostGhosted: string;
};

export const LIGHT_COLORS: ThemeColors = {
  background: '#fefcf9',
  foreground: '#1c1714',
  card: '#ffffff',
  cardForeground: '#1c1714',
  popover: '#ffffff',
  popoverForeground: '#1c1714',
  primary: '#576cb7',
  primaryForeground: '#fcfcfc',
  secondary: '#f4f1ee',
  secondaryForeground: '#2a2522',
  muted: '#f4f1ee',
  mutedForeground: '#706b66',
  accent: '#f4f1ee',
  accentForeground: '#2a2522',
  destructive: '#e62b34',
  destructiveForeground: '#fcfcfc',
  border: '#e9e7e6',
  hairline: '#f0eeec',
  input: '#dcdad8',
  ring: '#576cb7',
  tabBar: '#131110',
  tabBarForeground: '#f0eeeb',
  tabBarMuted: '#96918c',
  ghostActive: '#3bb974',
  ghostStale: '#efa831',
  ghostGhosted: '#e94554',
};

export const DARK_COLORS: ThemeColors = {
  background: '#131110',
  foreground: '#f0eeeb',
  card: '#1a1816',
  cardForeground: '#f0eeeb',
  popover: '#1a1816',
  popoverForeground: '#f0eeeb',
  primary: '#708ade',
  primaryForeground: '#090b0f',
  secondary: '#282624',
  secondaryForeground: '#f0eeeb',
  muted: '#282624',
  mutedForeground: '#96918c',
  accent: '#282624',
  accentForeground: '#f0eeeb',
  destructive: '#bb061e',
  destructiveForeground: '#f8f8f8',
  border: '#282623',
  hairline: '#302d2b',
  input: '#282623',
  ring: '#708ade',
  tabBar: '#000000',
  tabBarForeground: '#f0eeeb',
  tabBarMuted: '#96918c',
  ghostActive: '#43c07a',
  ghostStale: '#f5ae39',
  ghostGhosted: '#f44f5d',
};
