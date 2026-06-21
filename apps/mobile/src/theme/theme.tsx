import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'digitalstep.themeMode';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  card: string;
  text: string;
  muted: string;
  placeholder: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  border: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  purple: string;
  purpleSoft: string;
  tabBackground: string;
  inactiveIcon: string;
  shadow: string;
  overlay: string;
};

export const LightTheme: ThemeColors = {
  background: '#f4f7f5',
  surface: '#eef5f1',
  card: '#ffffff',
  text: '#10201d',
  muted: '#66736f',
  placeholder: '#66736f',
  primary: '#0f766e',
  primaryDark: '#115e59',
  primarySoft: '#d9f4ef',
  accent: '#f59e0b',
  accentSoft: '#fff4d6',
  border: '#dbe7e3',
  danger: '#b42318',
  dangerSoft: '#fee4e2',
  success: '#15803d',
  successSoft: '#dcfce7',
  warning: '#f59e0b',
  warningSoft: '#fff4d6',
  info: '#2563eb',
  infoSoft: '#dbeafe',
  purple: '#7c3aed',
  purpleSoft: '#ede9fe',
  tabBackground: '#ffffff',
  inactiveIcon: '#66736f',
  shadow: '#0f172a',
  overlay: 'rgba(15,32,29,0.32)'
};

export const DarkTheme: ThemeColors = {
  background: '#000000',
  surface: '#1A1A1A',
  card: '#111111',
  text: '#FFFFFF',
  muted: '#B3B3B3',
  placeholder: '#7A7A7A',
  primary: '#6C63FF',
  primaryDark: '#4F46E5',
  primarySoft: 'rgba(108,99,255,0.18)',
  accent: '#6C63FF',
  accentSoft: 'rgba(108,99,255,0.16)',
  border: '#222222',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.16)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.16)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.16)',
  info: '#6C63FF',
  infoSoft: 'rgba(108,99,255,0.16)',
  purple: '#6C63FF',
  purpleSoft: 'rgba(108,99,255,0.18)',
  tabBackground: '#000000',
  inactiveIcon: '#8A8A8A',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.72)'
};

export const colors: ThemeColors = { ...LightTheme };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 };

function applyTheme(mode: ThemeMode) {
  Object.assign(colors, mode === 'dark' ? DarkTheme : LightTheme);
}

type ThemeContextValue = { mode: ThemeMode; isDark: boolean; colors: ThemeColors; setMode: (mode: ThemeMode) => Promise<void>; toggleTheme: () => Promise<void> };
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    async function restoreTheme() {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'dark' || stored === 'light') {
        applyTheme(stored);
        setModeState(stored);
      }
    }
    void restoreTheme();
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    isDark: mode === 'dark',
    colors,
    async setMode(nextMode) {
      applyTheme(nextMode);
      setModeState(nextMode);
      await AsyncStorage.setItem(THEME_KEY, nextMode);
    },
    async toggleTheme() {
      const nextMode = mode === 'dark' ? 'light' : 'dark';
      applyTheme(nextMode);
      setModeState(nextMode);
      await AsyncStorage.setItem(THEME_KEY, nextMode);
    }
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
