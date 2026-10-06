// Builds supabase/seed/food_items.csv — the reference food base behind the
// manual meal log (search by name, macros per 100 g). Run once whenever the
// sources are updated; the generated CSV is committed.
//
// Sources (download and unzip first, then pass the folders):
//   TACO 4ª ed. (NEPA/Unicamp), normalized CSVs from github.com/raulfdm/taco-api
//     references/csv/{food,categories,nutrients}.csv           → pt names
//   USDA FoodData Central — SR Legacy (2018-04) and Foundation Foods CSV zips
//     https://fdc.nal.usda.gov/download-datasets/               → en names
//
//   node scripts/build-food-seed.mjs <tacoDir> <srLegacyDir> <foundationDir>

import fs from 'node:fs';
import path from 'node:path';

const [tacoDir, srDir, fndDir] = process.argv.slice(2);
if (!tacoDir || !srDir || !fndDir) {
    console.error('usage: node scripts/build-food-seed.mjs <tacoDir> <srLegacyDir> <foundationDir>');
    process.exit(1);
}

/** Minimal RFC 4180 parser (quoted fields, "" escapes, CRLF). */
const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [header, ...data] = rows;
    return data.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
};
const readCsv = (file) => parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const num = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};
const r1 = (n) => Math.round(n * 10) / 10;

const out = [];
const add = (item) => {
    const { calories, protein, carbs, fat } = item;
    if ([calories, protein, carbs, fat].some((v) => v === null || v < 0)) return;
    out.push({ ...item, calories: Math.round(calories), protein: r1(protein), carbs: r1(carbs), fat: r1(fat), fiber: item.fiber === null ? '' : r1(item.fiber) });
};

// ── TACO ─────────────────────────────────────────────────────────────────
// Category ids → the app's meal categories (mealScan.categories.*).
const TACO_CATEGORY = { 1: 'carb', 2: 'vegetable', 3: 'fruit', 4: 'fat', 5: 'protein', 6: 'protein', 7: 'dairy', 8: 'beverage', 9: 'protein', 10: 'other', 11: 'other', 12: 'other', 13: 'other', 14: 'protein', 15: 'fat' };
const tacoNutrients = new Map(readCsv(path.join(tacoDir, 'nutrients.csv')).map((n) => [n.foodId, n]));
for (const f of readCsv(path.join(tacoDir, 'food.csv'))) {
    const n = tacoNutrients.get(f.id);
    if (!n) continue;
    // TACO marks traces as "Tr" / missing as blank: traces count as 0.
    const v = (k) => (/^tr$/i.test(n[k]) ? 0 : num(n[k]));
    add({
        name: f.name.trim(), category: TACO_CATEGORY[f.categoryId] || 'other', source: 'taco', source_id: f.id, lang: 'pt',
        calories: v('kcal'), protein: v('protein'), carbs: v('carbohydrates'), fat: v('lipids'), fiber: v('dietaryFiber'),
    });
}
const tacoCount = out.length;

// ── USDA FoodData Central ───────────────────────────────────────────────
// Category codes → app categories; baby foods, regional native foods,
// branded and QC rows are left out.
const USDA_CATEGORY = {
    '0100': 'dairy', '0200': 'other', '0400': 'fat', '0500': 'protein', '0600': 'other', '0700': 'protein', '0800': 'carb',
    '0900': 'fruit', '1000': 'protein', '1100': 'vegetable', '1200': 'fat', '1300': 'protein', '1400': 'beverage', '1410': 'beverage',
    '1500': 'protein', '1600': 'protein', '1700': 'protein', '1800': 'carb', '1900': 'other', '2000': 'carb', '2100': 'other',
    '2200': 'other', '2500': 'other', '3600': 'other',
};
const NUTRIENTS = { 1003: 'protein', 1004: 'fat', 1005: 'carbs', 1008: 'kcal', 2047: 'kcalGeneral', 2048: 'kcalSpecific', 1079: 'fiber' };

const loadUsda = (dir, dataType) => {
    const categories = new Map(readCsv(path.join(dir, 'food_category.csv')).map((c) => [c.id, c.code]));
    const foods = readCsv(path.join(dir, 'food.csv')).filter((f) => f.data_type === dataType);
    const ids = new Set(foods.map((f) => f.fdc_id));
    const values = new Map();
    // food_nutrient.csv is large: stream it line by line by hand.
    const text = fs.readFileSync(path.join(dir, 'food_nutrient.csv'), 'utf8');
    const lines = text.split('\n');
    const header = lines[0].replace(/"/g, '').trim().split(',');
    const iFood = header.indexOf('fdc_id');
    const iNutrient = header.indexOf('nutrient_id');
    const iAmount = header.indexOf('amount');
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].replace(/"/g, '').split(',');
        const key = NUTRIENTS[cols[iNutrient]];
        if (!key || !ids.has(cols[iFood])) continue;
        if (!values.has(cols[iFood])) values.set(cols[iFood], {});
        values.get(cols[iFood])[key] = num(cols[iAmount]);
    }
    return foods.map((f) => ({ f, code: categories.get(f.food_category_id), n: values.get(f.fdc_id) || {} }));
};

const seen = new Set();
const usdaRows = [...loadUsda(fndDir, 'foundation_food'), ...loadUsda(srDir, 'sr_legacy_food')];
for (const { f, code, n } of usdaRows) {
    if (!code || !(code in USDA_CATEGORY)) continue;
    const name = f.description.trim();
    const key = name.toLowerCase();
    if (seen.has(key)) continue; // Foundation (newer) wins over SR Legacy
    seen.add(key);
    add({
        name, category: USDA_CATEGORY[code], source: 'usda', source_id: f.fdc_id, lang: 'en',
        calories: n.kcal ?? n.kcalSpecific ?? n.kcalGeneral ?? null,
        protein: n.protein ?? null, carbs: n.carbs ?? 0, fat: n.fat ?? null, fiber: n.fiber ?? null,
    });
}

const COLUMNS = ['name', 'category', 'source', 'source_id', 'lang', 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'fiber_per_100g'];
const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = [COLUMNS.join(','), ...out.map((o) => [o.name, o.category, o.source, o.source_id, o.lang, o.calories, o.protein, o.carbs, o.fat, o.fiber].map(esc).join(','))].join('\n') + '\n';
const target = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'supabase', 'seed', 'food_items.csv');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, csv);
console.log(`food_items.csv: ${out.length} foods (TACO ${tacoCount}, USDA ${out.length - tacoCount}) → ${target}`);
