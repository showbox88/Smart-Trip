import { state } from '../state.js';

let translations = {};

/**
 * Loads a language pack from the server.
 */
export async function loadLanguage(langCode) {
    try {
        const response = await fetch(`./i18n/${langCode}.json`);
        if (!response.ok) throw new Error(`Failed to load language: ${langCode}`);
        const data = await response.json();
        translations = data;
        if (!state.settings) state.settings = {};
        state.settings.language = langCode;
        return true;
    } catch (error) {
        console.error("i18n Error:", error);
        return false;
    }
}

/**
 * Translates a key using the loaded translations.
 * Supports nested keys like 'dashboard.title'.
 */
export function t(key) {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            return key; // Fallback to key itself
        }
    }
    return value;
}
window.t = t;

/**
 * Utility to fetch available languages from the API.
 */
export async function getAvailableLanguages() {
    try {
        const { getAvailableLanguages: fetchLangs } = await import('../api.js');
        return await fetchLangs();
    } catch (e) {
        console.error("Failed to fetch languages:", e);
        return [{ code: 'zh', name: '简体中文' }, { code: 'en', name: 'English' }];
    }
}

