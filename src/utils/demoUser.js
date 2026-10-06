import { Asset } from 'expo-asset';
import { intakeKey } from './journal';

// Development-only test patient: about two months on low-dose Mounjaro, with
// weigh-ins and photos every 3 days, weekly applications, body measures,
// check-ins, daily intake and supplements. Lives only in memory (see App.js) — it is never
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

    // Waist and hip every two weeks.
    const bodies = days.filter((i) => i % 14 === 0).map((i) => ({
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
        { id: 'vitaminD', frequency: 'weekly' },
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
        settings: { proteinGoal: 100, waterGoal: 2.5, fiberGoal: 25, calorieGoal: 1800, fatGoal: 60, carbsGoal: 150, unitSystem: 'metric' },
    };
};
