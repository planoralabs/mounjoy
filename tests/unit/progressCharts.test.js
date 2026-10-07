import { describe, it, expect } from 'vitest';
import { nutrientHistory, nutrientSummary, nutrientGoal } from '../../src/utils/nutrition';
import { intakeKey, measuresDue } from '../../src/utils/journal';

const NOW = new Date(2026, 9, 7, 15, 0);
const day = (n) => new Date(2026, 9, 7 - n, 12, 0);

describe('nutrient chart data', () => {
    const user = {
        settings: { proteinGoal: 90 },
        dailyIntakeHistory: {
            [intakeKey(day(0))]: { protein: 95, calories: 1500 },
            [intakeKey(day(2))]: { protein: 60, calories: 2100 },
            [intakeKey(day(9))]: { protein: 120 },
        },
    };

    it('lists only the recorded days, oldest first', () => {
        const h = nutrientHistory(user, 'protein');
        expect(h.map((d) => d.value)).toEqual([120, 60, 95]);
        expect(h[2].date.getDate()).toBe(7);
        expect(nutrientHistory(user, 'fiber')).toEqual([]);
    });

    it('averages recorded days only and counts calories as a ceiling', () => {
        const protein = nutrientHistory(user, 'protein').slice(1);
        expect(nutrientSummary(protein, nutrientGoal(user, 'protein'), 'protein')).toEqual({ avg: 77.5, met: 1, recorded: 2 });
        const kcal = nutrientHistory(user, 'calories');
        expect(nutrientSummary(kcal, nutrientGoal(user, 'calories'), 'calories')).toEqual({ avg: 1800, met: 1, recorded: 2 });
    });

    it('falls back to the default goal', () => {
        expect(nutrientGoal(user, 'calories')).toBe(1800);
        expect(nutrientGoal(user, 'protein')).toBe(90);
    });
});

describe('measures reminder', () => {
    it('asks for the first measures, then again after two weeks', () => {
        expect(measuresDue({ measurements: [{ date: day(1).toISOString(), weight: 90 }] }, NOW)).toBe('first');
        expect(measuresDue({ measurements: [{ date: day(13).toISOString(), waist: 100 }] }, NOW)).toBeNull();
        expect(measuresDue({ measurements: [{ date: day(14).toISOString(), hip: 110 }] }, NOW)).toBe('due');
    });
});
