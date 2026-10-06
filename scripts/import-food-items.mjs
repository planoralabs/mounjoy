// Loads supabase/seed/food_items.csv into the food_items table (insert or
// update by source + source_id, so it can be re-run safely).
//
// Needs the project's SERVICE ROLE key (Supabase → Project Settings → API).
// It bypasses row-level security: keep it out of the app and of git.
//
//   SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-food-items.mjs
//
// Run the 20261007_food_search migration first.

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const file = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'supabase', 'seed', 'food_items.csv');
const parseLine = (line) => {
    const out = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { out.push(field); field = ''; } else field += c;
    }
    out.push(field);
    return out;
};

const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
const columns = header.split(',');
const numeric = new Set(['calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'fiber_per_100g']);
const rows = lines.map((line) => Object.fromEntries(parseLine(line).map((v, i) => {
    const col = columns[i];
    return [col, v === '' ? null : numeric.has(col) ? Number(v) : v];
})));

const supabase = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 500;
for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('food_items').upsert(rows.slice(i, i + BATCH), { onConflict: 'source,source_id' });
    if (error) {
        console.error(`Batch starting at row ${i + 1} failed:`, error.message);
        process.exit(1);
    }
    process.stdout.write(`\r${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
}
console.log('\nDone.');
