import { describe, it, expect } from 'vitest';
import { toggleTaken, changeWhey, changeSupplement, removeSupplementsOn, progressOn, lastTakenInPeriod, WHEY_ID } from '../../src/utils/supplements';
import { intakeKey, supplementSummaryOn } from '../../src/utils/journal';

const t = (k) => k;
const NOW = new Date(2026, 9, 6, 9, 0);
const daysAgo = (n) => new Date(2026, 9, 6 - n, 9, 0).toISOString();

const user = (extra = {}) => ({
    supplements: [
        { id: 'multivitamin', frequency: 'daily' },
        { id: 'vitaminD', frequency: 'weekly' },
        { id: 'custom-1', custom: true, name: 'Probiótico', frequency: 'daily' },
        { id: WHEY_ID, frequency: 'daily', nutrients: { protein: 25, calories: 110, carbs: 2, fat: 1 } },
    ],
    supplementLogs: [],
    dailyIntakeHistory: {},
    ...extra,
});

describe('supplements', () => {
    it('toggles today\'s log on and off, keeping custom names', () => {
        const u1 = toggleTaken(user(), user().supplements[2], t, NOW);
        expect(u1.supplementLogs).toEqual([{ date: NOW.toISOString(), supplementId: 'custom-1', name: 'Probiótico' }]);
        expect(toggleTaken(u1, u1.supplements[2], t, NOW).supplementLogs).toEqual([]);
    });

    it('counts a weekly supplement as done for 7 days, and leaves whey out of the count', () => {
        const u = user({ supplementLogs: [{ date: daysAgo(4), supplementId: 'vitaminD', name: 'D' }] });
        expect(progressOn(u, NOW)).toEqual({ done: 1, total: 3 });
        expect(lastTakenInPeriod(u, { id: 'vitaminD', frequency: 'weekly' }, new Date(2026, 9, 9))).toBeNull();
    });

    it('adds whey doses to the day\'s goals and removes them again', () => {
        const key = intakeKey(NOW);
        let u = user({ dailyIntakeHistory: { [key]: { protein: 40, calories: 500, water: 1 } } });
        u = changeWhey(changeWhey(u, 1, t, NOW), 1, t, NOW);
        expect(u.dailyIntakeHistory[key]).toEqual({ protein: 90, calories: 720, carbs: 4, fat: 2, water: 1 });
        u = changeWhey(u, -1, t, NOW);
        expect(u.dailyIntakeHistory[key].protein).toBe(65);
        expect(u.supplementLogs).toHaveLength(1);
    });

    it('edits a past day and removes all of a day\'s supplements, whey included', () => {
        const past = new Date(2026, 9, 3, 12);
        const key = intakeKey(past);
        let u = user({ dailyIntakeHistory: { [key]: { protein: 50, calories: 900 } } });
        u = changeSupplement(u, { id: WHEY_ID }, 1, t, past);
        u = changeSupplement(u, { id: 'creatine' }, 1, t, past);
        u = changeSupplement(u, { id: 'old-custom', name: 'Removido' }, 1, t, past);
        expect(u.dailyIntakeHistory[key].protein).toBe(75);
        expect(supplementSummaryOn(u, past).find((g) => g.id === 'old-custom').name).toBe('Removido');
        u = removeSupplementsOn(u, past);
        expect(u.supplementLogs).toEqual([]);
        expect(u.dailyIntakeHistory[key]).toMatchObject({ protein: 50, calories: 900 });
    });

    it('groups a day\'s logs for the Journal', () => {
        const u = user({ supplementLogs: [
            { date: daysAgo(0), supplementId: WHEY_ID, name: 'Whey' },
            { date: new Date(2026, 9, 6, 15).toISOString(), supplementId: WHEY_ID, name: 'Whey' },
            { date: daysAgo(0), supplementId: 'multivitamin', name: 'Multi' },
            { date: daysAgo(1), supplementId: 'multivitamin', name: 'Multi' },
        ] });
        expect(supplementSummaryOn(u, NOW).map((g) => [g.id, g.count])).toEqual([[WHEY_ID, 2], ['multivitamin', 1]]);
    });
});
