import { Asset } from 'expo-asset';
import { intakeKey } from './journal';

// Development-only test patient: about two months on low-dose Mounjaro, with
// weigh-ins and photos every 3 days, weekly applications, body measures,
// check-ins, daily intake, supplements and a week of meals. Lives only in memory (see App.js) — it is never
// written to the device or to Supabase.

const DAYS = 60;

const EVOLUTION_IMAGES = [
    require('../../assets/library/mock_evolution/step1.png'),
    require('../../assets/library/mock_evolution/step2.png'),
    require('../../assets/library/mock_evolution/step3.png'),
    require('../../assets/library/mock_evolution/step4.png'),
];
const SITE_ROTATION = ['abdomen-left', 'abdomen-right', 'thigh-left', 'thigh-right', 'arm-left', 'arm-right'];

// Seeded so the test patient looks the same on every run.
const seededRandom = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

const round1 = (n) => Math.round(n * 10) / 10;

// Foods for the sample meals, per 100 g (TACO 4th ed., rounded).
const FOODS = {
    bread: { name: 'Pão francês', category: 'carb', per100: { calories: 300, protein: 8, carbs: 58.6, fat: 3.1, fiber: 2.3 } },
    egg: { name: 'Ovo de galinha cozido', category: 'protein', per100: { calories: 146, protein: 13.3, carbs: 0.6, fat: 9.5, fiber: 0 } },
    papaya: { name: 'Mamão papaia', category: 'fruit', per100: { calories: 40, protein: 0.5, carbs: 10.4, fat: 0.1, fiber: 1 } },
    yogurt: { name: 'Iogurte natural', category: 'dairy', per100: { calories: 51, protein: 4.1, carbs: 1.9, fat: 3, fiber: 0 } },
    oats: { name: 'Aveia em flocos', category: 'carb', per100: { calories: 394, protein: 13.9, carbs: 66.6, fat: 8.5, fiber: 9.1 } },
    banana: { name: 'Banana prata', category: 'fruit', per100: { calories: 98, protein: 1.3, carbs: 26, fat: 0.1, fiber: 2 } },
    rice: { name: 'Arroz branco cozido', category: 'carb', per100: { calories: 128, protein: 2.5, carbs: 28.1, fat: 0.2, fiber: 1.6 } },
    beans: { name: 'Feijão carioca cozido', category: 'protein', per100: { calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5, fiber: 8.5 } },
    chicken: { name: 'Peito de frango grelhado', category: 'protein', per100: { calories: 159, protein: 32, carbs: 0, fat: 2.5, fiber: 0 } },
    tilapia: { name: 'Filé de tilápia grelhado', category: 'protein', per100: { calories: 128, protein: 26.2, carbs: 0, fat: 2.7, fiber: 0 } },
    lettuce: { name: 'Alface', category: 'vegetable', per100: { calories: 11, protein: 1.3, carbs: 1.7, fat: 0.2, fiber: 1.8 } },
    tomato: { name: 'Tomate', category: 'vegetable', per100: { calories: 15, protein: 1.1, carbs: 3.1, fat: 0.2, fiber: 1.2 } },
    sweetPotato: { name: 'Batata-doce cozida', category: 'carb', per100: { calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1, fiber: 2.2 } },
    broccoli: { name: 'Brócolis cozido', category: 'vegetable', per100: { calories: 25, protein: 2.1, carbs: 4.4, fat: 0.5, fiber: 3.4 } },
};

// [hour, [food, grams]…]: breakfast, lunch, snack and dinner, alternating day to day.
const MEAL_PLANS = [
    [[8, [['bread', 50], ['egg', 100], ['papaya', 150]]], [8, [['yogurt', 170], ['oats', 30], ['banana', 80]]]],
    [[12, [['rice', 100], ['beans', 100], ['chicken', 120], ['lettuce', 30], ['tomato', 50]]], [13, [['rice', 90], ['beans', 80], ['tilapia', 130], ['broccoli', 80]]]],
    [[16, [['yogurt', 170], ['banana', 80]]], [16, [['papaya', 200], ['oats', 20]]]],
    [[20, [['sweetPotato', 120], ['chicken', 110], ['broccoli', 80]]], [20, [['egg', 100], ['tomato', 60], ['bread', 50]]]],
];
const MEAL_DAYS = 7; // the last week (and today) get meals

const buildMeal = (date, items, id) => {
    const list = items.map(([key, grams]) => {
        const f = FOODS[key];
        const nutrition = Object.fromEntries(Object.entries(f.per100).map(([k, v]) => [k, round1((v * grams) / 100)]));
        return { name: f.name, category: f.category, grams, source: 'taco', nutrition };
    });
    const sum = (k) => list.reduce((s, i) => s + i.nutrition[k], 0);
    return {
        id,
        logged_at: date.toISOString(),
        items: list,
        total_calories: Math.round(sum('calories')),
        total_protein: round1(sum('protein')),
        total_carbs: round1(sum('carbs')),
        total_fat: round1(sum('fat')),
        total_fiber: round1(sum('fiber')),
    };
};

export const buildDemoUser = (now = new Date()) => {
    const rand = seededRandom(42);
    const jitter = (amp) => (rand() - 0.5) * 2 * amp;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS, 9, 0);
    const dayAt = (i, hour = 9) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, hour, 0);
    const days = Array.from({ length: DAYS + 1 }, (_, i) => i);

    // Weight: 104 kg → ~96 kg, faster at first, with day-to-day noise.
    const startWeight = 104;
    const trend = (i) => startWeight - 8.2 * (1 - Math.exp(-i / 38)) / (1 - Math.exp(-DAYS / 38));
    const weighDays = days.filter((i) => i % 3 === 0);
    const weights = weighDays.map((i) => ({ date: dayAt(i, 7).toISOString(), weight: i === 0 ? startWeight : round1(trend(i) + jitter(0.4)) }));

    // Waist and hip every two weeks; the last one 16 days ago, so Today shows
    // the "time to measure" reminder.
    const bodies = days.filter((i) => i % 14 === 2 && i <= DAYS - 16).map((i) => ({
        date: dayAt(i, 7).toISOString(),
        waist: round1(112 - (i / DAYS) * 7 + jitter(0.5)),
        hip: round1(121 - (i / DAYS) * 5 + jitter(0.5)),
    }));

    // Weekly applications: 2.5 mg for the first 4 weeks, then 5.0 mg.
    const doseHistory = days.filter((i) => i % 7 === 0).map((i, n) => {
        const siteId = SITE_ROTATION[n % SITE_ROTATION.length];
        const [area, side] = siteId.split('-');
        return { date: dayAt(i, 20).toISOString(), dose: i < 28 ? '2.5 mg' : '5.0 mg', medication: 'mounjaro', siteId, site: siteId, area, side };
    });

    // Photos every 3 days; the evolution images advance with the treatment.
    const photos = weighDays.map((i) => ({
        url: Asset.fromModule(EVOLUTION_IMAGES[Math.min(EVOLUTION_IMAGES.length - 1, Math.floor((i / (DAYS + 1)) * EVOLUTION_IMAGES.length))]).uri,
        date: dayAt(i, 8).toISOString(),
    }));

    // Check-ins: mild nausea after dose changes, food noise easing over time.
    const sideEffectsLogs = days.filter((i) => i % 4 === 1).map((i) => {
        const afterIncrease = (i >= 1 && i <= 5) || (i >= 29 && i <= 33);
        const symptoms = afterIncrease ? ['nausea'] : i % 12 === 1 ? ['fadiga'] : [];
        return {
            date: dayAt(i, 21).toISOString(),
            foodNoise: Math.max(1, Math.round(8 - (i / DAYS) * 6 + jitter(1))),
            symptoms,
            trigger: symptoms.includes('nausea') ? 'Refeição muito gordurosa' : '',
            note: '',
        };
    });

    // Daily intake for every day, including today so far.
    const dailyIntakeHistory = {};
    days.forEach((i) => {
        const today = i === DAYS;
        const f = today ? 0.45 : 1;
        dailyIntakeHistory[intakeKey(dayAt(i, 12))] = {
            water: round1((1.8 + rand() * 0.9) * f),
            protein: round1((70 + rand() * 40) * f),
            fiber: round1((14 + rand() * 14) * f),
            carbs: round1((100 + rand() * 60) * f),
            fat: round1((40 + rand() * 25) * f),
            calories: Math.round((1300 + rand() * 450) * f),
        };
    });

    // Supplements: a daily multivitamin and creatine, weekly vitamin D, whey
    // most days (its protein is already part of the intake above). Today only
    // the multivitamin is checked off so far.
    const supplements = [
        { id: 'multivitamin', frequency: 'daily' },
        { id: 'creatine', frequency: 'daily' },
        { id: 'vitaminD', frequency: 'weekly', day: dayAt(3).getDay() },
        { id: 'whey', frequency: 'daily', nutrients: { protein: 24, calories: 120, carbs: 3, fat: 2 } },
    ];
    const supplementLogs = [];
    days.forEach((i) => {
        const today = i === DAYS;
        const log = (id, name, hour) => supplementLogs.push({ date: dayAt(i, hour).toISOString(), supplementId: id, name });
        if (today || rand() > 0.15) log('multivitamin', 'Multivitamínico', 8);
        if (!today && rand() > 0.25) log('creatine', 'Creatina', 10);
        if (!today && i % 7 === 3) log('vitaminD', 'Vitamina D', 9);
        if (!today && rand() > 0.3) log('whey', 'Whey protein', 16);
    });

    // Sample meals for the last week; those days' intake is what they add up
    // to, plus that day's whey.
    const meals = [];
    days.filter((i) => i >= DAYS - MEAL_DAYS).forEach((i) => {
        const dayMeals = MEAL_PLANS
            .map((options, k) => {
                const [hour, items] = options[(i + k) % options.length];
                return buildMeal(dayAt(i, hour), items, `demo-meal-${i}-${k}`);
            })
            .filter((m) => new Date(m.logged_at) <= now);
        if (!dayMeals.length) return;
        meals.push(...dayMeals);
        const key = intakeKey(dayAt(i, 12));
        const wheyDoses = supplementLogs.filter((l) => l.supplementId === 'whey' && intakeKey(new Date(l.date)) === key).length;
        const whey = supplements.find((s) => s.id === 'whey').nutrients;
        const total = (k, mealKey) => dayMeals.reduce((s, m) => s + m[mealKey], 0) + wheyDoses * (whey[k] || 0);
        dailyIntakeHistory[key] = {
            ...dailyIntakeHistory[key],
            protein: round1(total('protein', 'total_protein')),
            carbs: round1(total('carbs', 'total_carbs')),
            fat: round1(total('fat', 'total_fat')),
            fiber: round1(total('fiber', 'total_fiber')),
            calories: Math.round(total('calories', 'total_calories')),
        };
    });
    meals.reverse(); // newest first, like the meal_logs query

    const latest = weights[weights.length - 1].weight;
    return {
        isDemo: true,
        name: 'Paciente Teste',
        email: '',
        photoURL: '',
        medicationId: 'mounjaro',
        currentDose: '5.0 mg',
        injectionDay: start.getDay(),
        isMaintenance: false,
        height: '1.68',
        startWeight: String(startWeight),
        goalWeight: '80',
        currentWeight: latest,
        startDate: start.toISOString(),
        lastWeightDate: weights[weights.length - 1].date,
        history: weights.map((w) => w.weight),
        measurements: [...weights, ...bodies],
        doseHistory,
        photos,
        sideEffectsLogs,
        dailyIntakeHistory,
        supplements,
        supplementLogs,
        meals,
        settings: { proteinGoal: 100, waterGoal: 2.5, fiberGoal: 25, calorieGoal: 1800, fatGoal: 60, carbsGoal: 150, unitSystem: 'metric' },
    };
};
