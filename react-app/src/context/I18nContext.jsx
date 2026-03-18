import { createContext, useContext, useState, useCallback } from 'react';

// Automatically import all JSON files in src/i18n/
const modules = import.meta.glob('../i18n/*.json', { eager: true });

// Build bundles: { zh: {...}, en: {...}, ja: {...}, ... }
const bundles = {};
const availableLanguages = []; // [{ code: 'zh', label: '中文' }, ...]

for (const path in modules) {
  const code = path.match(/\/(\w+)\.json$/)?.[1];
  if (!code) continue;
  const data = modules[path].default ?? modules[path];
  bundles[code] = data;
  availableLanguages.push({
    code,
    label: data?._meta?.label || code.toUpperCase(),
  });
}

// Sort: put zh and en first, then alphabetical
const PRIORITY = ['zh', 'en'];
availableLanguages.sort((a, b) => {
  const ai = PRIORITY.indexOf(a.code);
  const bi = PRIORITY.indexOf(b.code);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.code.localeCompare(b.code);
});

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('smart-trip-lang');
    return saved && bundles[saved] ? saved : (availableLanguages[0]?.code || 'en');
  });

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
    <I18nContext.Provider value={{ t, language, setLanguage, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
