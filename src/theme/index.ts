import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  accent: '#16A34A',
  accentSoft: '#DCFCE7',
  onAccent: '#FFFFFF',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
};

const dark: typeof light = {
  bg: '#0B0F14',
  surface: '#151B23',
  surfaceAlt: '#1E2630',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#263241',
  accent: '#22C55E',
  accentSoft: '#14361F',
  onAccent: '#04130A',
  danger: '#F87171',
  dangerSoft: '#3B1616',
  warning: '#FBBF24',
  warningSoft: '#3A2A0A',
};

export type Colors = typeof light;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const font = {
  title: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6 },
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
