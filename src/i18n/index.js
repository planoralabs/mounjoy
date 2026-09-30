import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales, getCalendars } from 'expo-localization';

import { FALLBACK_LANGUAGE, resolveLanguage, resolveFormatLocale, unitSystemFromLocale, weekStartFromCalendar } from './resolve';
import { createUnits } from '../utils/units';

import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';

// The app has no language setting of its own: it always follows the device
// (and, on iOS / Android 13+, the per-app language the user picks in system
// Settings — both surface through getLocales()).
//
// Dev-only escape hatch for previewing translations in the browser:
// http://localhost:8081/?lng=de (also accepts a full tag, e.g. ?lng=en-GB).
const devLocaleOverride = () => {
    if (!__DEV__ || typeof window === 'undefined' || !window.location?.search) return null;
    const tag = new URLSearchParams(window.location.search).get('lng');
    if (!tag) return null;
    const [languageCode, regionCode = null] = tag.split('-');
    return [{ languageTag: tag, languageCode, regionCode, measurementSystem: null }];
};
const deviceLocales = () => devLocaleOverride() || getLocales();

let formatLocale = resolveFormatLocale(deviceLocales());

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        pt: { translation: pt },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
        it: { translation: it },
    },
    lng: resolveLanguage(deviceLocales()),
    fallbackLng: FALLBACK_LANGUAGE,
    // React already escapes rendered strings.
    interpolation: { escapeValue: false },
    returnNull: false,
});

/** Re-reads the device locale (called when the app returns to foreground). */
export const syncWithDeviceLocale = (locales = deviceLocales()) => {
    formatLocale = resolveFormatLocale(locales);
    const lng = resolveLanguage(locales);
    if (lng !== i18n.language) i18n.changeLanguage(lng);
};

export const getFormatLocale = () => formatLocale;

export const getDeviceUnitSystem = () => unitSystemFromLocale(deviceLocales()[0]);

/** 0 = Sunday … 6 = Saturday. */
export const getWeekStart = () => weekStartFromCalendar(getCalendars()[0]);

export const formatDate = (date, options) =>
    new Intl.DateTimeFormat(formatLocale, options).format(new Date(date));

export const formatNumber = (n, maxDigits = 1) =>
    new Intl.NumberFormat(formatLocale, { maximumFractionDigits: maxDigits }).format(Number(n) || 0);

/** Unit helpers for a user's saved preference, formatted for the current locale. */
export const unitsFor = (user) => createUnits(user?.settings?.unitSystem, formatNumber);

/** Localized weekday name; `day` is 0 = Sunday … 6 = Saturday. */
export const weekdayName = (day, style = 'long') => {
    // 2023-01-01 was a Sunday.
    const name = formatDate(new Date(2023, 0, 1 + day), { weekday: style }).replace('.', '');
    return name.charAt(0).toLocaleUpperCase(formatLocale) + name.slice(1);
};

/** The 7 weekday indexes starting at the device's first day of the week. */
export const orderedWeekdays = () => {
    const start = getWeekStart();
    return Array.from({ length: 7 }, (_, i) => (start + i) % 7);
};

export default i18n;
