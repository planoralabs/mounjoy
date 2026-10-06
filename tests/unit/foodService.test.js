import { describe, it, expect, vi } from 'vitest';

let rpcResult = { data: [], error: null };
const rpc = vi.fn(async () => rpcResult);

vi.mock('../../src/supabaseClient.js', () => ({ supabase: { rpc: (...args) => rpc(...args) } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => {} } }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const { normalize, matchCustomFoods, searchFoods, findFoodForScan, foodLang } = await import('../../src/services/FoodService.js');

const row = (extra) => ({
    id: 'a', name: 'Feijão, carioca, cozido', category: 'protein', source: 'taco', lang: 'pt',
    calories_per_100g: 76, protein_per_100g: 4.8, carbs_per_100g: 13.6, fat_per_100g: 0.5, fiber_per_100g: 8.5,
    all_words: true, score: 1, ...extra,
});

describe('FoodService', () => {
    it('normalizes accents and case', () => {
        expect(normalize('Pão Francês')).toBe('pao frances');
        expect(foodLang('pt-BR')).toBe('pt');
        expect(foodLang('de')).toBe('en');
    });

    it('matches the user\'s own foods by every typed word, accent-free', () => {
        const foods = [{ id: '1', name: 'Pão de queijo da padaria', calories: 300 }, { id: '2', name: 'Queijo minas', calories: 260 }];
        expect(matchCustomFoods(foods, 'pao queijo').map((f) => f.id)).toEqual(['1']);
        expect(matchCustomFoods(foods, 'queijo').map((f) => f.id)).toEqual(['1', '2']);
        expect(matchCustomFoods(foods, '')).toEqual([]);
    });

    it('lists own foods first, then the reference base with per-100 g rates', async () => {
        rpcResult = { data: [row()], error: null };
        const list = await searchFoods('feijao', { language: 'pt-BR', customFoods: [{ id: '9', name: 'Feijão da vó', calories: 90, protein: 6 }] });
        expect(list.map((f) => f.source)).toEqual(['custom', 'taco']);
        expect(list[1].rate100g).toEqual({ calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5, fiber: 8.5 });
        expect(rpc).toHaveBeenLastCalledWith('search_food_items', { q: 'feijao', pref_lang: 'pt', max_results: 25 });
    });

    it('only trusts a scan match that is confident', async () => {
        rpcResult = { data: [row()], error: null };
        expect(await findFoodForScan('feijão', 'pt')).toBeNull(); // one word: ambiguous
        expect((await findFoodForScan('feijão carioca', 'pt')).name).toBe('Feijão, carioca, cozido');
        rpcResult = { data: [row({ all_words: false })], error: null };
        expect(await findFoodForScan('feijão carioca', 'pt')).toBeNull();
        rpcResult = { data: [row({ lang: 'en' })], error: null };
        expect(await findFoodForScan('feijão carioca', 'pt')).toBeNull();
    });
});
