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

// ---- Daily nutrients over time (Progress → Nutrients chart) ---------------

/** Goal field in user.settings for each nutrient. */
export const NUTRIENT_GOALS = { protein: 'proteinGoal', calories: 'calorieGoal', carbs: 'carbsGoal', fat: 'fatGoal', fiber: 'fiberGoal', water: 'waterGoal' };
// Used when the user never set a goal (same as Today's).
const DEFAULT_GOALS = { protein: 100, calories: 1800, carbs: 150, fat: 60, fiber: 25, water: 2.5 };

export const nutrientGoal = (user, key) => parseFloat(user?.settings?.[NUTRIENT_GOALS[key]]) || DEFAULT_GOALS[key];

/** Every day with a record of `key`, oldest first: [{ date, value }]. */
export const nutrientHistory = (user, key) =>
    Object.entries(user?.dailyIntakeHistory || {})
        .filter(([, day]) => day?.[key] > 0)
        .map(([k, day]) => {
            const [y, m, d] = k.split('-').map(Number);
            return { date: new Date(y, m - 1, d), value: day[key] };
        })
        .sort((a, b) => a.date - b.date);

/**
 * Average over the recorded days and how many met the goal. Calories count as
 * a ceiling (at or under the goal), everything else as a target (at or over).
 */
export const nutrientSummary = (series, goal, key) => {
    const recorded = series.filter((d) => d.value != null);
    const avg = recorded.length ? recorded.reduce((s, d) => s + d.value, 0) / recorded.length : null;
    const met = goal ? recorded.filter((d) => (key === 'calories' ? d.value <= goal : d.value >= goal)).length : null;
    return { avg, met, recorded: recorded.length };
};

export const mealTotals =(items) => items.reduce((acc, item) => {
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
