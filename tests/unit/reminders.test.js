import { describe, it, expect } from 'vitest';
import { planReminders, reminderSettingsOf, isValidTime, waterTimes } from '../../src/utils/reminders';
import { intakeKey } from '../../src/utils/journal';

// Tuesday 6 Oct 2026, 07:00 local.
const NOW = new Date(2026, 9, 6, 7, 0);
const day = (offset, h = 9, m = 0) => new Date(2026, 9, 6 + offset, h, m);

const baseUser = (extra = {}) => ({
    medicationId: 'mounjaro',
    doseHistory: [],
    measurements: [],
    dailyIntakeHistory: {},
    ...extra,
    settings: { waterGoal: 2.5, proteinGoal: 100, ...(extra.settings || {}) },
});
const kinds = (plan) => plan.map((p) => p.kind);

describe('reminderSettingsOf', () => {
    it('maps the older dose-only fields', () => {
        const r = reminderSettingsOf({ remindersEnabled: false, reminderTime: '20:30' });
        expect(r.dose).toEqual({ enabled: false, time: '20:30' });
        expect(r.water.enabled).toBe(false);
    });

    it('validates HH:MM', () => {
        expect(isValidTime('09:00')).toBe(true);
        expect(isValidTime('9:00')).toBe(false);
        expect(isValidTime('24:00')).toBe(false);
    });
});

describe('planReminders — dose', () => {
    it('weekly: reminds on the due day and nudges the day after', () => {
        const user = baseUser({ doseHistory: [{ date: day(-5, 20).toISOString() }] });
        const plan = planReminders(user, { now: NOW, intervalDays: 7 });
        expect(plan.map((p) => [p.kind, p.date.getTime()])).toEqual([
            ['dose', day(2).getTime()],
            ['doseLate', day(3).getTime()],
        ]);
    });

    it('weekly overdue: reminds today', () => {
        const user = baseUser({ doseHistory: [{ date: day(-10).toISOString() }] });
        expect(planReminders(user, { now: NOW, intervalDays: 7 })[0].date).toEqual(day(0));
    });

    it('daily pills: skips a day that already has a dose', () => {
        const user = baseUser({ doseHistory: [{ date: day(0, 6).toISOString() }] });
        const plan = planReminders(user, { now: NOW, intervalDays: 1 });
        expect(plan.map((p) => p.date.getDate())).toEqual([7, 8]);
    });

    it('is off when disabled', () => {
        const user = baseUser({ settings: { reminders: { dose: { enabled: false } } } });
        expect(planReminders(user, { now: NOW })).toEqual([]);
    });
});

describe('planReminders — water, protein, weight', () => {
    const on = { dose: { enabled: false }, water: { enabled: true, count: 4, start: '10:00' }, protein: { enabled: true, time: '18:00' }, weight: { enabled: true, time: '08:00', frequency: 'daily' } };

    it('drops today\'s water reminders once the goal is reached', () => {
        const user = baseUser({
            settings: { reminders: { ...on, protein: { enabled: false }, weight: { enabled: false } } },
            dailyIntakeHistory: { [intakeKey(NOW)]: { water: 2.6 } },
        });
        const plan = planReminders(user, { now: NOW });
        expect(plan.some((p) => p.date.getDate() === 6)).toBe(false);
        expect(plan.filter((p) => p.date.getDate() === 7)).toHaveLength(4);
    });

    it('skips protein on a day the goal is met and weight on a day already weighed', () => {
        const user = baseUser({
            settings: { reminders: { ...on, water: { enabled: false } } },
            dailyIntakeHistory: { [intakeKey(NOW)]: { protein: 120 } },
            measurements: [{ date: day(0, 6).toISOString(), weight: 90 }],
        });
        const today = planReminders(user, { now: NOW }).filter((p) => p.date.getDate() === 6);
        expect(today).toEqual([]);
    });

    it('weekly weigh-in only on the chosen weekday', () => {
        const user = baseUser({ settings: { reminders: { dose: { enabled: false }, weight: { enabled: true, time: '08:00', frequency: 'weekly', day: 4 } } } });
        const plan = planReminders(user, { now: NOW });
        expect(plan.map((p) => p.date)).toEqual([day(2, 8)]);
    });

    it('schedules everything the user picked on a busy day', () => {
        const user = baseUser({ settings: { reminders: { ...on, dose: { enabled: true, time: '09:00' } } }, doseHistory: [{ date: day(-7).toISOString() }] });
        const today = planReminders(user, { now: NOW, intervalDays: 7 }).filter((p) => p.date.getDate() === 6);
        expect(kinds(today)).toEqual(['weight', 'dose', 'water', 'water', 'water', 'protein', 'water']);
    });

    it('never schedules in the past', () => {
        const late = new Date(2026, 9, 6, 17, 0);
        const user = baseUser({ settings: { reminders: { ...on, protein: { enabled: false }, weight: { enabled: false } } } });
        const today = planReminders(user, { now: late }).filter((p) => p.date.getDate() === 6);
        expect(today.map((p) => p.date.getHours())).toEqual([19]);
    });
});

describe('waterTimes', () => {
    it('spreads the chosen number of reminders from the first time', () => {
        expect(waterTimes('10:00', 1)).toEqual(['10:00']);
        expect(waterTimes('08:00', 5)).toEqual(['08:00', '11:00', '14:00', '17:00', '20:00']);
        expect(waterTimes('10:00', 4)).toEqual(['10:00', '13:00', '16:00', '19:00']);
        expect(waterTimes('16:00', 3)).toEqual(['16:00', '18:30', '21:00']);
    });

    it('keeps at least an hour between reminders, even late in the day', () => {
        expect(waterTimes('21:00', 3)).toEqual(['21:00', '22:00', '23:00']);
    });
});
