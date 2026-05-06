/**
 * MangAfriq — aligned with front/src/styles/global.css
 */
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { Platform } from 'react-native';

export const MangAfriq = {
  primary: '#e63946',
  primaryDark: '#c1121f',
  primaryLight: '#ff6b6b',
  bgLight: '#f4f4f6',
  bgWhite: '#ffffff',
  textDark: '#111111',
  textMuted: '#888888',
  textSecondary: '#555555',
  border: '#e0e0e0',
  cardShadow: 'rgba(0,0,0,0.08)',
  rating: '#f5a623',
  ongoingBg: '#e8f5e9',
  ongoingText: '#2e7d32',
  completedBg: '#e3f2fd',
  completedText: '#1565c0',
  hiatusBg: '#fff3e0',
  hiatusText: '#e65100',
  accentOrange: '#f97316',
  accentPink: '#ec4899',
  accentPurple: '#a855f7',
} as const;

const tintLight = MangAfriq.primary;
const tintDark = '#ff6b6b';

export const Colors = {
  light: {
    text: MangAfriq.textDark,
    background: MangAfriq.bgLight,
    tint: tintLight,
    icon: MangAfriq.textMuted,
    tabIconDefault: MangAfriq.textMuted,
    tabIconSelected: tintLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0d0d0d',
    tint: tintDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintDark,
  },
};

export const NavigationLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: MangAfriq.primary,
    background: MangAfriq.bgLight,
    card: MangAfriq.bgWhite,
    text: MangAfriq.textDark,
    border: MangAfriq.border,
    notification: MangAfriq.primary,
  },
};

export const NavigationDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: MangAfriq.primaryLight,
    background: '#0d0d0d',
    card: '#1a1a1a',
    text: '#f4f4f6',
    border: '#2e2e2e',
    notification: MangAfriq.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
