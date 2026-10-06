// Nutrients of a meal item: `rate100g` (per 100 g) scaled to the grams eaten.
// Shared by the photo scan and the manual food search.

export const round1 = (n) => Math.round((n || 0) * 10) / 10;

export const nutritionFor = (rate100g, grams) => {
    const factor = grams / 100;
    return {
        calories: Math.round(rate100g.calories * factor),
        protein: round1(rate100g.protein * factor),
        carbs: round1(rate100g.carbs * factor),
        fat: round1(rate100g.fat * factor),
        fiber: round1((rate100g.fiber || 0) * factor),
    };
};

export const mealTotals = (items) => items.reduce((acc, item) => {
    const n = item.nutrition;
    if (!n) return acc;
    return {
        calories: acc.calories + (n.calories || 0),
        protein: acc.protein + (n.protein || 0),
        carbs: acc.carbs + (n.carbs || 0),
        fat: acc.fat + (n.fat || 0),
        fiber: acc.fiber + (n.fiber || 0),
    };
}, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
