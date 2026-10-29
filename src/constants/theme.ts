import { Platform } from 'react-native';

// App color palette - recovered from APK binary analysis
export const Colors = {
  // Editorial palette used by the shipped BioLens design.
  paper: '#F5F4EF',
  paperDeep: '#EDEBE4',
  card: '#FFFFFF',
  line: '#E4E1D8',
  lineSoft: '#EFEDE6',
  ink: '#121412',
  forest: '#1E3A31',
  forestDeep: '#14241E',
  moss: '#2F6A4F',
  muted2: '#6F746F',
  faint: '#9A9E98',
  chipBg: '#F1EFE8',
  gold2: '#D9A420',
  red2: '#B3261E',
  // Primary forest greens
  primary: '#1B5E20',
  primaryDark: '#1B2F29',
  primaryMid: '#2D5A27',
  primaryLight: '#2E7D32',
  accent: '#00E676',

  // Backgrounds
  background: '#F9F9F7',
  backgroundWarm: '#EDEBE6',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F0EC',
  surfaceMid: '#E4E1DA',
  surfaceLight: '#E3E0D9',
  surfacePale: '#D8D5CD',

  // Status colors
  danger: '#D32F2F',
  dangerLight: '#FFCDD2',
  dangerBg: '#FFEBEE',
  warning: '#E65100',
  warningBg: '#FFF8F0',
  warningLight: '#FFE0B2',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  successMid: '#C8E6C9',
  gold: '#FFD700',

  // Text
  textPrimary: '#141716',
  textSecondary: '#6A6E6A',
  textMuted: '#7A807C',
  textLight: '#8A968F',
  textPlaceholder: '#9CA3AF',

  // Misc
  border: '#CFCBC3',
  borderLight: '#ECECEC',
  overlay: 'rgba(27, 47, 41, 0.85)',
  white: '#FFFFFF',
  transparent: 'transparent',

  // Blue (system)
  blue: '#2196F3',
  blueLight: '#007AFF',

  // Dark
  dark: '#141716',
};

export const Fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 32,
  display: 40,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
