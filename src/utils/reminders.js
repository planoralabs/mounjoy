// Which local notifications to schedule, as a pure function of the user record
// and "now" — NotificationService turns the plan into real notifications.
// The app re-plans every time the record changes or the app comes back to the
// foreground, so a reminder whose job is already done (dose logged, water goal
// reached, weighed today) simply isn't in the next plan: that is how reminders
// cancel themselves.

import { intakeKey, isSameDay, sortedDoses, weightLogs } from './journal';

export const WATER_TIMES = ['10:00', '13:00', '16:00', '19:00'];
// At most this many reminders on any day; lower-priority ones are dropped first.
export const MAX_PER_DAY = 4;
// iOS keeps at most 64 pending local notifications per app; we stay well below.
const HORIZON_DAYS = 3;
const PRIORITY = { dose: 0, weight: 1, protein: 2, water: 3 };

export const DEFAULT_REMINDERS = {
    dose: { enabled: true, time: '09:00' },
    water: { enabled: false },
    protein: { enabled: false, time: '18:00' },
    weight: { enabled: false, time: '08:00', frequency: 'weekly', day: 1 },
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isValidTime = (s) => TIME_RE.test(String(s || '').trim());

/** Saved settings merged over the defaults. `remindersEnabled` / `reminderTime` are the older dose-only fields. */
export const reminderSettingsOf = (settings = {}) => {
    const saved = settings.reminders || {};
    const legacyDose = {
        ...(settings.remindersEnabled !== undefined ? { enabled: settings.remindersEnabled } : {}),
        ...(settings.reminderTime ? { time: settings.reminderTime } : {}),
    };
    return {
        dose: { ...DEFAULT_REMINDERS.dose, ...legacyDose, ...saved.dose },
        water: { ...DEFAULT_REMINDERS.water, ...saved.water },
        protein: { ...DEFAULT_REMINDERS.protein, ...saved.protein },
        weight: { ...DEFAULT_REMINDERS.weight, ...saved.weight },
    };
};

export const anyReminderEnabled = (r) => Object.values(r).some((x) => x.enabled);

const at = (day, time) => {
    const [h, m] = (isValidTime(time) ? time : '09:00').split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * @param user     the app's user record
 * @param options  { now, intervalDays (1 daily / 7 weekly), isOral }
 * @returns [{ id, kind, date }] sorted by date — kinds: dose | doseLate | water | protein | weight
 */
export const planReminders = (user, { now = new Date(), intervalDays = 7, isOral = false } = {}) => {
    const r = reminderSettingsOf(user?.settings);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i));
    const intakeOf = (d) => user?.dailyIntakeHistory?.[intakeKey(d)] || {};
    const goals = { water: user?.settings?.waterGoal || 2.5, protein: user?.settings?.proteinGoal || 100 };
    const plan = [];
    const add = (kind, date, n = 0) => { if (date > now) plan.push({ id: `${kind}-${date.toISOString()}-${n}`, kind, date }); };

    if (r.dose.enabled && user?.medicationId) {
        const doses = sortedDoses(user);
        if (intervalDays === 1) {
            days.forEach((d) => { if (!doses.some((x) => isSameDay(x.date, d))) add('dose', at(d, r.dose.time)); });
        } else {
            const last = doses[0] ? new Date(doses[0].date) : null;
            let due = last ? addDays(last, intervalDays) : today;
            if (due < today) due = today; // overdue: remind today
            add('dose', at(due, r.dose.time));
            // Not logged by then: one nudge the next day.
            add('doseLate', at(addDays(due, 1), r.dose.time));
        }
    }

    if (r.weight.enabled) {
        const weighed = (d) => weightLogs(user).some((m) => isSameDay(m.date, d));
        days.forEach((d) => {
            if (r.weight.frequency === 'weekly' && d.getDay() !== Number(r.weight.day)) return;
            if (!weighed(d)) add('weight', at(d, r.weight.time));
        });
    }

    if (r.protein.enabled) {
        days.forEach((d) => { if ((intakeOf(d).protein || 0) < goals.protein) add('protein', at(d, r.protein.time)); });
    }

    if (r.water.enabled) {
        days.forEach((d) => {
            if ((intakeOf(d).water || 0) >= goals.water) return;
            WATER_TIMES.forEach((time, n) => add('water', at(d, time), n));
        });
    }

    // Daily cap: keep the most important ones.
    const byDay = new Map();
    plan.forEach((p) => {
        const k = p.date.toDateString();
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(p);
    });
    const kept = [];
    byDay.forEach((list) => {
        const rank = (p) => PRIORITY[p.kind === 'doseLate' ? 'dose' : p.kind];
        list.sort((a, b) => rank(a) - rank(b) || a.date - b.date);
        kept.push(...list.slice(0, MAX_PER_DAY));
    });
    // `isOral` only changes the wording; kept on each item for the message.
    return kept.sort((a, b) => a.date - b.date).map((p) => ({ ...p, isOral }));
};
