import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../supabaseClient';

// Reference foods for the manual meal log. Every food is handled as
// `rate100g` = { calories, protein, carbs, fat, fiber } per 100 g — the same
// shape the photo scan uses, so both flows share the review screen.
//
// Sources: food_items (TACO in pt, USDA in en; supabase/seed), the user's own
// foods (user.customFoods) and Open Food Facts by barcode.

export const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const fromRow = (row) => ({
    key: `${row.source}:${row.id}`,
    id: row.id,
    name: row.name,
    category: row.category || 'other',
    source: row.source,
    lang: row.lang,
    rate100g: {
        calories: Number(row.calories_per_100g) || 0,
        protein: Number(row.protein_per_100g) || 0,
        carbs: Number(row.carbs_per_100g) || 0,
        fat: Number(row.fat_per_100g) || 0,
        fiber: Number(row.fiber_per_100g) || 0,
    },
    allWords: row.all_words,
});

const fromCustom = (food) => ({
    key: `custom:${food.id}`,
    id: food.id,
    name: food.name,
    category: 'other',
    source: 'custom',
    rate100g: { calories: food.calories || 0, protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0, fiber: food.fiber || 0 },
});

/** Base language for ranking: Portuguese names first for pt, English otherwise. */
export const foodLang = (language) => (String(language || '').startsWith('pt') ? 'pt' : 'en');

/** The user's own foods whose name has every typed word. */
export const matchCustomFoods = (customFoods = [], query) => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return customFoods.filter((f) => words.every((w) => normalize(f.name).includes(w))).map(fromCustom);
};

/** Own foods first, then the reference base (accent- and typo-tolerant, see search_food_items). */
export const searchFoods = async (query, { language, customFoods } = {}) => {
    const own = matchCustomFoods(customFoods, query);
    if (normalize(query).trim().length < 2) return own;
    const { data, error } = await supabase.rpc('search_food_items', { q: query, pref_lang: foodLang(language), max_results: 25 });
    if (error) throw error;
    return [...own, ...(data || []).map(fromRow)];
};

/**
 * Reference macros for a name the photo analysis returned. Only a confident
 * match counts (every word found, more than one word, same language) —
 * otherwise the analysis' own estimate is kept.
 */
export const findFoodForScan = async (name, language) => {
    const words = normalize(name).split(/\s+/).filter((w) => w.length > 1);
    if (words.length < 2) return null;
    const { data, error } = await supabase.rpc('search_food_items', { q: name, pref_lang: foodLang(language), max_results: 1 });
    if (error || !data?.[0]) return null;
    const top = data[0];
    return top.all_words && top.lang === foodLang(language) ? fromRow(top) : null;
};

export const customFoodToItem = fromCustom;

// ── Recent foods (per device) ───────────────────────────────────────────
const RECENT_KEY = 'mounjoy_recent_foods';
const MAX_RECENT = 12;

export const loadRecentFoods = async () => {
    try {
        return JSON.parse((await AsyncStorage.getItem(RECENT_KEY)) || '[]');
    } catch {
        return [];
    }
};

/** Most recent first; remembers the last portion used. */
export const rememberFood = async (food, grams) => {
    const list = (await loadRecentFoods()).filter((f) => f.key !== food.key);
    const next = [{ key: food.key, name: food.name, category: food.category, source: food.source, rate100g: food.rate100g, grams }, ...list].slice(0, MAX_RECENT);
    try {
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        // Recents are a convenience only.
    }
    return next;
};

// ── Barcode → Open Food Facts ───────────────────────────────────────────
// Free, open API (ODbL: cite "Open Food Facts"). Returns null when the
// product is unknown or has no per-100 g energy.
export const lookupBarcode = async (code, language) => {
    const fields = 'code,product_name,product_name_pt,product_name_en,brands,nutriments';
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
        // OFF asks apps to identify themselves; browsers don't allow setting it.
        headers: Platform.OS === 'web' ? {} : { 'User-Agent': 'Mounjoy/1.0 (mobile app)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.product;
    const n = p?.nutriments || {};
    const kcal = Number(n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : NaN));
    if (json?.status !== 1 || !p || !Number.isFinite(kcal)) return null;
    const localName = p[`product_name_${foodLang(language)}`] || p.product_name || p.product_name_en || '';
    const name = [localName.trim(), p.brands ? p.brands.split(',')[0].trim() : ''].filter(Boolean).join(' · ') || code;
    return {
        key: `off:${p.code || code}`,
        id: p.code || code,
        name,
        category: 'other',
        source: 'openfoodfacts',
        rate100g: {
            calories: Math.round(kcal),
            protein: Number(n.proteins_100g) || 0,
            carbs: Number(n.carbohydrates_100g) || 0,
            fat: Number(n.fat_100g) || 0,
            fiber: Number(n.fiber_100g) || 0,
        },
    };
};
