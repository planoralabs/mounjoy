import { describe, it, expect } from 'vitest';
import { planReminders, reminderSettingsOf, isValidTime, MAX_PER_DAY } from '../../src/utils/reminders';
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
    const on = { dose: { enabled: false }, water: { enabled: true }, protein: { enabled: true, time: '18:00' }, weight: { enabled: true, time: '08:00', frequency: 'daily' } };

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

    it(`never schedules more than ${MAX_PER_DAY} a day, keeping the most important`, () => {
        const user = baseUser({ settings: { reminders: { ...on, dose: { enabled: true, time: '09:00' } } }, doseHistory: [{ date: day(-7).toISOString() }] });
        const plan = planReminders(user, { now: NOW, intervalDays: 7 });
        const today = plan.filter((p) => p.date.getDate() === 6);
        expect(today).toHaveLength(MAX_PER_DAY);
        expect(kinds(today)).toEqual(['weight', 'dose', 'water', 'protein']);
    });

    it('never schedules in the past', () => {
        const late = new Date(2026, 9, 6, 17, 0);
        const user = baseUser({ settings: { reminders: { ...on, protein: { enabled: false }, weight: { enabled: false } } } });
        const today = planReminders(user, { now: late }).filter((p) => p.date.getDate() === 6);
        expect(today.map((p) => p.date.getHours())).toEqual([19]);
    });
});
