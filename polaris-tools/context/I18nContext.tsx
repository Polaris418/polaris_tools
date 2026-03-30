import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getTranslation, type Language, type TranslationKey } from '../i18n';

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('systemLanguage');
    return stored === 'en' || stored === 'zh' ? (stored as Language) : 'zh';
  });

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('systemLanguage', nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const nextLanguage: Language = prev === 'en' ? 'zh' : 'en';
      localStorage.setItem('systemLanguage', nextLanguage);
      return nextLanguage;
    });
  }, []);

  const t = useMemo(() => getTranslation(language), [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n 必须在 I18nProvider 内使用');
  }
  return context;
};
