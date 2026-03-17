import { createContext, useContext, useState, useCallback } from 'react';
import zhTranslations from '../i18n/zh.json';
import enTranslations from '../i18n/en.json';

const bundles = { zh: zhTranslations, en: enTranslations };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem('smart-trip-lang') || 'zh'
  );

  const setLanguage = useCallback((lang) => {
    if (bundles[lang]) {
      setLanguageState(lang);
      localStorage.setItem('smart-trip-lang', lang);
    }
  }, []);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = bundles[language];
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key;
      }
    }
    return value;
  }, [language]);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
