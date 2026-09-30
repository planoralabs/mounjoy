// Pure locale helpers — no expo imports, so they run under vitest in node.
// `locales` has the shape returned by expo-localization's getLocales():
// [{ languageTag: 'pt-BR', languageCode: 'pt', regionCode: 'BR', measurementSystem: 'metric' | 'us' | 'uk' | null, ... }]

// A new language needs its ./locales file, an entry in ./index.js resources,
// and supportedLocales / locales in app.json.
export const SUPPORTED_LANGUAGES = ['en', 'pt', 'es', 'fr', 'de', 'it'];
export const FALLBACK_LANGUAGE = 'en';
const FALLBACK_FORMAT_LOCALE = 'en-US';

// Countries that use US customary units for body weight/height when the OS
// doesn't report a measurement system (web returns null).
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

const firstSupported = (locales = []) =>
    locales.find((l) => SUPPORTED_LANGUAGES.includes(l?.languageCode));

/** First of the user's preferred languages that the app has translations for. */
export const resolveLanguage = (locales) =>
    firstSupported(locales)?.languageCode || FALLBACK_LANGUAGE;

/**
 * BCP-47 tag for Intl date/number formatting. Uses the full device tag of the
 * matched language (so en-GB gets day/month, pt-PT gets its own format), and
 * falls back to en-US when the UI itself fell back to English.
 */
export const resolveFormatLocale = (locales) =>
    firstSupported(locales)?.languageTag || FALLBACK_FORMAT_LOCALE;

/**
 * Default unit system from the device. iOS reports the user's choice in
 * Settings; Android derives it from the region; web returns null, so we fall
 * back to the region code. 'uk' maps to metric: UK health apps track body
 * weight in kg (or stones, which we don't support), not in pounds.
 */
export const unitSystemFromLocale = (locale) => {
    if (!locale) return 'metric';
    if (locale.measurementSystem === 'us') return 'imperial';
    if (locale.measurementSystem === 'metric' || locale.measurementSystem === 'uk') return 'metric';
    return IMPERIAL_REGIONS.has(locale.regionCode) ? 'imperial' : 'metric';
};

/**
 * 0 = Sunday … 6 = Saturday, from expo-localization's getCalendars()[0].firstWeekday
 * (1 = Sunday … 7 = Saturday, null when unknown).
 */
export const weekStartFromCalendar = (calendar) => {
    const fw = calendar?.firstWeekday;
    return typeof fw === 'number' && fw >= 1 && fw <= 7 ? fw - 1 : 0;
};
