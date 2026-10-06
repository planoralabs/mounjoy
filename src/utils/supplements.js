// Supplements the user takes, and what they marked as taken.
//
// user.supplements    = [{ id, name?, custom?, frequency, nutrients? }]
// user.supplementLogs = [{ date, supplementId, name }]
//
// Vitamins and the like are only counted (Today card, Journal). Whey carries
// nutrients per dose: each dose also goes into that day's goals.

import { intakeKey, isSameDay, startOfDay } from './journal';

export const SUPPLEMENT_CATALOG = [
    { id: 'multivitamin', frequency: 'daily' },
    { id: 'vitaminD', frequency: 'weekly' },
    { id: 'b12', frequency: 'daily' },
    { id: 'iron', frequency: 'daily' },
    { id: 'calcium', frequency: 'daily' },
    { id: 'magnesium', frequency: 'daily' },
    { id: 'omega3', frequency: 'daily' },
    { id: 'creatine', frequency: 'daily' },
    { id: 'collagen', frequency: 'daily' },
];

// One dose (scoop) of a typical whey; the user adjusts it to their label.
export const WHEY_ID = 'whey';
export const DEFAULT_WHEY_NUTRIENTS = { protein: 24, calories: 120, carbs: 3, fat: 2 };

export const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30 };

export const supplementName = (t, s) => (s.custom ? s.name : t(`supplements.names.${s.id}`));

/** Countable supplements (everything but whey). */
export const trackedSupplements = (user) => (user?.supplements || []).filter((s) => s.id !== WHEY_ID);
export const wheyOf = (user) => (user?.supplements || []).find((s) => s.id === WHEY_ID) || null;

/** The logs minus one entry: the first one of `id` on `day`. */
const withoutOne = (user, id, day) => {
    const logs = user.supplementLogs || [];
    const i = logs.findIndex((l) => l.supplementId === id && isSameDay(l.date, day));
    return i < 0 ? logs : [...logs.slice(0, i), ...logs.slice(i + 1)];
};

export const logsOn = (user, day, id) =>
    (user?.supplementLogs || []).filter((l) => l.supplementId === id && isSameDay(l.date, day));

/** Most recent log of `id` within its period ending on `day` (daily → that day, weekly → last 7 days…). */
export const lastTakenInPeriod = (user, supplement, day = new Date()) => {
    const end = startOfDay(day).getTime() + 24 * 60 * 60 * 1000;
    const start = end - PERIOD_DAYS[supplement.frequency || 'daily'] * 24 * 60 * 60 * 1000;
    return (user?.supplementLogs || [])
        .filter((l) => l.supplementId === supplement.id)
        .map((l) => new Date(l.date))
        .filter((d) => d.getTime() >= start && d.getTime() < end)
        .sort((a, b) => b - a)[0] || null;
};

export const progressOn = (user, day = new Date()) => {
    const list = trackedSupplements(user);
    return { done: list.filter((s) => lastTakenInPeriod(user, s, day)).length, total: list.length };
};

const withIntake = (user, day, nutrients, sign) => {
    const key = intakeKey(day);
    const current = user.dailyIntakeHistory?.[key] || {};
    const next = { ...current };
    ['protein', 'carbs', 'fat'].forEach((k) => {
        next[k] = Math.max(0, Math.round(((current[k] || 0) + sign * (nutrients[k] || 0)) * 10) / 10);
    });
    next.calories = Math.max(0, Math.round((current.calories || 0) + sign * (nutrients.calories || 0)));
    return { ...(user.dailyIntakeHistory || {}), [key]: next };
};

/** Marks `supplement` as taken now, or unmarks today's log. */
export const toggleTaken = (user, supplement, t, now = new Date()) => {
    const today = logsOn(user, now, supplement.id);
    if (today.length > 0) return { ...user, supplementLogs: withoutOne(user, supplement.id, now) };
    const log = { date: now.toISOString(), supplementId: supplement.id, name: supplementName(t, supplement) };
    return { ...user, supplementLogs: [log, ...(user.supplementLogs || [])] };
};

const scale = (n, k) => Object.fromEntries(Object.entries(n).map(([key, v]) => [key, (v || 0) * k]));

const wheyNutrients = (user) => wheyOf(user)?.nutrients || DEFAULT_WHEY_NUTRIENTS;

/**
 * One more (+1) or one less (-1) of `item` ({ id, name? }) on the day of `when`.
 * Whey keeps that day's goals in step. Works for past days (Journal editor).
 */
export const changeSupplement = (user, item, delta, t, when = new Date()) => {
    const isWhey = item.id === WHEY_ID;
    if (delta > 0) {
        const log = { date: when.toISOString(), supplementId: item.id, name: item.custom || !item.name ? supplementName(t, item) : item.name };
        return {
            ...user,
            supplementLogs: [log, ...(user.supplementLogs || [])],
            ...(isWhey ? { dailyIntakeHistory: withIntake(user, when, wheyNutrients(user), 1) } : {}),
        };
    }
    if (logsOn(user, when, item.id).length === 0) return user;
    return {
        ...user,
        supplementLogs: withoutOne(user, item.id, when),
        ...(isWhey ? { dailyIntakeHistory: withIntake(user, when, wheyNutrients(user), -1) } : {}),
    };
};

/** One more (+1) or one less (-1) whey dose today. */
export const changeWhey = (user, delta, t, now = new Date()) =>
    (wheyOf(user) ? changeSupplement(user, wheyOf(user), delta, t, now) : user);

/** Removes every supplement logged on `day`, taking whey back out of that day's goals. */
export const removeSupplementsOn = (user, day) => {
    const logs = user.supplementLogs || [];
    const wheyCount = logs.filter((l) => l.supplementId === WHEY_ID && isSameDay(l.date, day)).length;
    return {
        ...user,
        supplementLogs: logs.filter((l) => !isSameDay(l.date, day)),
        ...(wheyCount ? { dailyIntakeHistory: withIntake(user, day, scale(wheyNutrients(user), wheyCount), -1) } : {}),
    };
};
