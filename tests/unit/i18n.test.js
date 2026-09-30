import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LANGUAGES, resolveLanguage, resolveFormatLocale, unitSystemFromLocale, weekStartFromCalendar } from '../../src/i18n/resolve';

const localesDir = path.resolve(__dirname, '../../src/i18n/locales');
const load = (lang) => JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8'));

// Flattens { a: { b: 'x' } } into ['a.b']; arrays count as one leaf.
const flatKeys = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' && !Array.isArray(v) ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);

const interpolations = (str) => [...String(str).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

const get = (obj, key) => key.split('.').reduce((o, k) => o?.[k], obj);

describe('translation files', () => {
    const en = load('en');
    const enKeys = flatKeys(en).sort();

    // Every translation file (launched or not yet) must stay complete.
    const allLanguages = fs.readdirSync(localesDir).map((f) => f.replace('.json', ''));

    it('launch languages all have translation files', () => {
        expect(allLanguages).toEqual(expect.arrayContaining(SUPPORTED_LANGUAGES));
    });

    it.each(allLanguages)('%s has exactly the same keys as en', (lang) => {
        expect(flatKeys(load(lang)).sort()).toEqual(enKeys);
    });

    it.each(allLanguages)('%s keeps the same {{placeholders}} as en', (lang) => {
        const t = load(lang);
        for (const key of enKeys) {
            expect([key, interpolations(get(t, key))]).toEqual([key, interpolations(get(en, key))]);
        }
    });

    it('every static t() key used in the app exists in en', () => {
        const roots = [path.resolve(__dirname, '../../App.js'), path.resolve(__dirname, '../../src')];
        const files = [];
        const walk = (p) => {
            if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach((f) => walk(path.join(p, f)));
            else if (/\.(js|jsx)$/.test(p)) files.push(p);
        };
        roots.forEach(walk);

        const missing = [];
        for (const file of files) {
            const src = fs.readFileSync(file, 'utf8');
            for (const [, key] of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) {
                // Plural keys are stored as key_one / key_other.
                if (get(en, key) === undefined && get(en, `${key}_other`) === undefined) missing.push(`${path.basename(file)}: ${key}`);
            }
            for (const [, key] of src.matchAll(/i18nKey="([^"]+)"/g)) {
                if (get(en, key) === undefined) missing.push(`${path.basename(file)}: ${key}`);
            }
        }
        expect(missing).toEqual([]);
    });
});

describe('resolveLanguage', () => {
    it('picks the first preferred language the app supports', () => {
        expect(resolveLanguage([{ languageCode: 'ja' }, { languageCode: 'es', languageTag: 'es-MX' }])).toBe('es');
    });

    it('falls back to English', () => {
        expect(resolveLanguage([{ languageCode: 'ja' }])).toBe('en');
        expect(resolveLanguage([])).toBe('en');
    });

    it('uses the device tag of the matched language for formatting', () => {
        expect(resolveFormatLocale([{ languageCode: 'pt', languageTag: 'pt-PT' }])).toBe('pt-PT');
        expect(resolveFormatLocale([{ languageCode: 'ja', languageTag: 'ja-JP' }])).toBe('en-US');
    });
});

describe('unitSystemFromLocale', () => {
    it('follows the OS measurement system', () => {
        expect(unitSystemFromLocale({ measurementSystem: 'us', regionCode: 'BR' })).toBe('imperial');
        expect(unitSystemFromLocale({ measurementSystem: 'metric', regionCode: 'US' })).toBe('metric');
        expect(unitSystemFromLocale({ measurementSystem: 'uk', regionCode: 'GB' })).toBe('metric');
    });

    it('falls back to the region when the OS reports nothing (web)', () => {
        expect(unitSystemFromLocale({ measurementSystem: null, regionCode: 'US' })).toBe('imperial');
        expect(unitSystemFromLocale({ measurementSystem: null, regionCode: 'DE' })).toBe('metric');
        expect(unitSystemFromLocale(undefined)).toBe('metric');
    });
});

describe('weekStartFromCalendar', () => {
    it('maps expo-localization weekdays (1 = Sunday) to JS getDay() (0 = Sunday)', () => {
        expect(weekStartFromCalendar({ firstWeekday: 1 })).toBe(0);
        expect(weekStartFromCalendar({ firstWeekday: 2 })).toBe(1);
        expect(weekStartFromCalendar({ firstWeekday: null })).toBe(0);
        expect(weekStartFromCalendar(undefined)).toBe(0);
    });
});
