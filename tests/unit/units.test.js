import { describe, it, expect } from 'vitest';
import { createUnits, kgToLb, lbToKg, metersToFeetInches, round } from '../../src/utils/units';

describe('conversions', () => {
    it('round-trips kg ↔ lb', () => {
        expect(round(kgToLb(80), 1)).toBe(176.4);
        expect(round(lbToKg(kgToLb(72.35)), 2)).toBe(72.35);
    });

    it('converts height to feet and inches', () => {
        expect(metersToFeetInches(1.7)).toEqual({ feet: 5, inches: 7 });
        expect(metersToFeetInches(1.83)).toEqual({ feet: 6, inches: 0 });
    });
});

describe('createUnits', () => {
    it('metric shows stored values as-is', () => {
        const u = createUnits('metric');
        expect(u.formatWeight(80)).toBe('80 kg');
        expect(u.formatVolume(2.5)).toBe('2.5 L');
        expect(u.formatHeight(1.7)).toBe('1.7 m');
        expect(u.weightToKg(80)).toBe(80);
        expect(u.food(150)).toBe(150);
    });

    it('imperial converts for display and back to metric for storage', () => {
        const u = createUnits('imperial');
        expect(u.formatWeight(80)).toBe('176.4 lb');
        expect(u.formatVolume(2.5)).toBe('85 fl oz');
        expect(u.formatHeight(1.7)).toBe('5′ 7″');
        expect(round(u.weightToKg(176.4), 1)).toBe(80);
        expect(u.food(100)).toBe(3.5);
        expect(round(u.foodToGrams(3.5), 0)).toBe(99);
        expect(round(u.lengthToCm(32), 1)).toBe(81.3);
    });

    it('signs weight differences', () => {
        expect(createUnits('metric').formatWeightDiff(-1.5)).toBe('-1.5 kg');
        expect(createUnits('metric').formatWeightDiff(0.8)).toBe('+0.8 kg');
    });

    it('defaults to metric when the preference is missing', () => {
        expect(createUnits(undefined).system).toBe('metric');
    });

    it('uses the injected locale formatter', () => {
        const u = createUnits('metric', (n) => String(n).replace('.', ','));
        expect(u.formatWeight(79.5)).toBe('79,5 kg');
    });
});
