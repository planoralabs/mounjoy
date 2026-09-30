// Canonical storage is always metric (kg, m, cm, L, g) — see
// mobile_documentation.md 7.6. Everything here only converts for display and
// converts user input back to metric before it is stored.

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const L_PER_FL_OZ = 0.0295735;
const G_PER_OZ = 28.349523125;

export const kgToLb = (kg) => kg / KG_PER_LB;
export const lbToKg = (lb) => lb * KG_PER_LB;
export const cmToIn = (cm) => cm / CM_PER_IN;
export const inToCm = (inches) => inches * CM_PER_IN;
export const litersToFlOz = (l) => l / L_PER_FL_OZ;
export const flOzToLiters = (oz) => oz * L_PER_FL_OZ;
export const gramsToOz = (g) => g / G_PER_OZ;
export const ozToGrams = (oz) => oz * G_PER_OZ;

export const round = (n, digits = 1) => {
    const f = 10 ** digits;
    return Math.round((Number(n) || 0) * f) / f;
};

/** Height in metres → { feet, inches } with inches rounded to a whole number. */
export const metersToFeetInches = (m) => {
    const totalIn = Math.round(cmToIn((Number(m) || 0) * 100));
    return { feet: Math.floor(totalIn / 12), inches: totalIn % 12 };
};

/**
 * Display helpers bound to one unit system. `formatNumber` is injected so the
 * app can pass a locale-aware formatter (decimal comma in pt/es/fr/de/it)
 * while tests use the plain default.
 */
export const createUnits = (system, formatNumber = (n) => String(n)) => {
    const imperial = system === 'imperial';
    const fmt = (n, digits) => formatNumber(round(n, digits), digits);

    const weight = (kg) => (imperial ? kgToLb(kg) : Number(kg) || 0);
    const volume = (l) => (imperial ? litersToFlOz(l) : Number(l) || 0);
    const food = (g) => (imperial ? gramsToOz(g) : Number(g) || 0);
    const length = (cm) => (imperial ? cmToIn(cm) : Number(cm) || 0);

    const weightUnit = imperial ? 'lb' : 'kg';
    const volumeUnit = imperial ? 'fl oz' : 'L';
    const foodUnit = imperial ? 'oz' : 'g';
    const lengthUnit = imperial ? 'in' : 'cm';
    const volumeDigits = imperial ? 0 : 1;
    const foodDigits = imperial ? 1 : 0;

    return {
        system: imperial ? 'imperial' : 'metric',
        imperial,
        weightUnit,
        volumeUnit,
        foodUnit,
        lengthUnit,

        weight: (kg, digits = 1) => round(weight(kg), digits),
        weightToKg: (v) => (imperial ? lbToKg(Number(v) || 0) : Number(v) || 0),
        formatWeightValue: (kg, digits = 1) => fmt(weight(kg), digits),
        formatWeight: (kg, digits = 1) => `${fmt(weight(kg), digits)} ${weightUnit}`,
        formatWeightDiff: (kgDiff, digits = 1) => {
            const v = round(weight(kgDiff), digits);
            return `${v > 0 ? '+' : ''}${formatNumber(v, digits)} ${weightUnit}`;
        },

        volume: (l) => round(volume(l), volumeDigits),
        volumeToLiters: (v) => (imperial ? flOzToLiters(Number(v) || 0) : Number(v) || 0),
        formatVolumeValue: (l) => fmt(volume(l), volumeDigits),
        formatVolume: (l) => `${fmt(volume(l), volumeDigits)} ${volumeUnit}`,

        food: (g) => round(food(g), foodDigits),
        foodToGrams: (v) => (imperial ? ozToGrams(Number(v) || 0) : Number(v) || 0),
        formatFoodValue: (g) => fmt(food(g), foodDigits),
        /** Step used by the +/- portion buttons, in grams (≈¼ oz or 5 g). */
        foodStepGrams: imperial ? ozToGrams(0.25) : 5,

        length: (cm, digits = 1) => round(length(cm), digits),
        lengthToCm: (v) => (imperial ? inToCm(Number(v) || 0) : Number(v) || 0),

        formatHeight: (m) => {
            if (imperial) {
                const { feet, inches } = metersToFeetInches(m);
                return `${feet}′ ${inches}″`;
            }
            return `${fmt(m, 2)} m`;
        },
    };
};
