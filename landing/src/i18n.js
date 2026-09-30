// Same rule as the app (src/i18n in the Expo project): follow the visitor's
// browser language, fall back to English. A language in the URL wins:
//   /en, /pt        — pages built with their own title/description, so link
//                     previews (WhatsApp, Instagram…) show that language
//   ?lng=pt         — works on any path
// Strings live in ./translations.js.

import { translations } from './translations.js';

const FALLBACK = 'en';

const pick = (tag) => {
    const code = String(tag || '').toLowerCase().split('-')[0];
    return translations[code] ? code : null;
};

export const detectLanguage = () => {
    const fromQuery = pick(new URLSearchParams(window.location.search).get('lng'));
    if (fromQuery) return fromQuery;
    const fromPath = pick(window.location.pathname.split('/')[1]);
    if (fromPath) return fromPath;
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of preferred) {
        const lang = pick(tag);
        if (lang) return lang;
    }
    return FALLBACK;
};

export const language = detectLanguage();
export const t = translations[language];
