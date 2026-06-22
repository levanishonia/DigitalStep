import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import ka from './ka.json';

export type Language = 'ka' | 'en';
const DEFAULT_LANGUAGE: Language = 'ka';
const STORAGE_KEY = 'digitalstep.language';
const dictionaries = { en, ka } as const;

type TranslationKey = keyof typeof ka;
type I18nContextValue = { language: Language; setLanguage: (language: Language) => Promise<void>; t: (key: TranslationKey) => string };
const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function isSupportedLanguage(value: unknown): value is Language { return value === 'ka' || value === 'en'; }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((value) => { if (isSupportedLanguage(value)) setLanguageState(value); }).catch(() => undefined); }, []);
  const value = useMemo<I18nContextValue>(() => ({
    language,
    async setLanguage(next) { setLanguageState(next); await AsyncStorage.setItem(STORAGE_KEY, next); },
    t(key) { return dictionaries[language][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key; }
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { const context = useContext(I18nContext); if (!context) throw new Error('useI18n must be used within I18nProvider'); return context; }
