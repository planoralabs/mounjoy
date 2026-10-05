import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFakeSupabase } from '../helpers/supabase-fake.js';

let fake;

// userService.js imports `supabase` at module scope from '../supabaseClient'.
// We swap it for the in-memory fake so these tests never touch the network,
// mirroring the role of tests/helpers/firestore-fake.mjs in the toursinop suite.
vi.mock('../../src/supabaseClient.js', () => ({
    supabase: {
        from: (...args) => fake.from(...args),
        channel: (...args) => fake.channel(...args),
        removeChannel: (...args) => fake.removeChannel(...args),
    },
}));

const { userService } = await import('../../src/services/userService.js');

const UID = 'user-1';

beforeEach(() => {
    fake = createFakeSupabase();
});

describe('userService.getUserProfile', () => {
    it('returns null (not a throw) when no profile row exists yet', async () => {
        const profile = await userService.getUserProfile(UID);
        expect(profile).toBeNull();
    });

    it('returns the row when a profile exists', async () => {
        fake._store.profiles.push({ id: UID, name: 'Ana' });
        const profile = await userService.getUserProfile(UID);
        expect(profile).toMatchObject({ id: UID, name: 'Ana' });
    });
});

describe('userService.saveUserProfile', () => {
    it('upserts the profile row with sanitized name and snake_case columns', async () => {
        await userService.saveUserProfile(UID, {
            name: '<b>Ana</b>',
            email: 'ana@example.com',
            currentDose: '0.5 mg',
            medicationId: 'mounjaro',
            settings: { proteinGoal: 120, waterGoal: 3, fiberGoal: 30 },
        });

        expect(fake._store.profiles).toHaveLength(1);
        expect(fake._store.profiles[0]).toMatchObject({
            id: UID,
            name: '&lt;b&gt;Ana&lt;/b&gt;',
            medication_id: 'mounjaro',
            current_dose: '0.5 mg',
            protein_goal: 120,
            water_goal: 3,
            fiber_goal: 30,
        });
    });

    it('only inserts measurements/doses/symptoms whose date is not already stored (diff-insert)', async () => {
        const existingDate = '2026-01-01T00:00:00.000Z';
        fake._store.measurements.push({ user_id: UID, date: existingDate, weight: 90 });

        await userService.saveUserProfile(UID, {
            name: 'Ana',
            measurements: [
                { date: existingDate, weight: 90 }, // already stored -> skipped
                { date: '2026-01-08T00:00:00.000Z', weight: 89 }, // new -> inserted
            ],
        });

        expect(fake._store.measurements).toHaveLength(2);
        expect(fake._store.measurements.map((m) => m.weight)).toEqual([90, 89]);
    });

    it('updates edited records and deletes removed ones (matched by date)', async () => {
        fake._store.measurements.push(
            { id: 'm1', user_id: UID, date: '2026-01-01T00:00:00.000Z', weight: 90, waist: 0, hip: 0 },
            { id: 'm2', user_id: UID, date: '2026-01-08T00:00:00.000Z', weight: 89, waist: 0, hip: 0 },
        );
        fake._store.dose_history.push(
            { id: 'd1', user_id: UID, date: '2026-01-02T00:00:00.000Z', dose: '5.0 mg', medication: 'mounjaro', site: 'abdomen-left' },
        );

        await userService.saveUserProfile(UID, {
            name: 'Ana',
            // weigh-in of the 8th removed; the 1st edited to 88.5
            measurements: [{ date: '2026-01-01T00:00:00.000Z', weight: 88.5 }],
            // dose edited in the Journal: new dose and site
            doseHistory: [{ date: '2026-01-02T00:00:00.000Z', dose: '7.5 mg', medication: 'mounjaro', siteId: 'thigh-right' }],
        });

        expect(fake._store.measurements).toHaveLength(1);
        expect(fake._store.measurements[0]).toMatchObject({ id: 'm1', weight: 88.5 });
        expect(fake._store.dose_history).toHaveLength(1);
        expect(fake._store.dose_history[0]).toMatchObject({ id: 'd1', dose: '7.5 mg', site: 'thigh-right' });
    });

    it('stores check-ins in the current format and the new profile fields', async () => {
        await userService.saveUserProfile(UID, {
            name: 'Ana',
            height: '1.71',
            goalWeight: '69.5',
            injectionDay: 1,
            settings: { calorieGoal: 1600, fatGoal: 55, carbsGoal: 140 },
            sideEffectsLogs: [{ date: '2026-01-03T12:00:00.000Z', symptoms: ['nausea'], foodNoise: 4, trigger: 'doce', note: 'enjoo' }],
            dailyIntakeHistory: { '2026-01-03': { water: 1, calories: 900, fat: 30, carbs: 80 } },
        });

        expect(fake._store.profiles[0]).toMatchObject({ height_m: 1.71, goal_weight: 69.5, injection_day: 1, calorie_goal: 1600, fat_goal: 55, carbs_goal: 140 });
        expect(fake._store.symptoms_logs[0]).toMatchObject({ symptoms: ['nausea'], food_noise: 4, trigger: 'doce', notes: 'enjoo' });
        expect(fake._store.daily_intake[0]).toMatchObject({ calories: 900, fat: 30, carbs: 80 });

        const userObj = await new Promise((resolve) => userService.subscribeToUser(UID, resolve));
        expect(userObj).toMatchObject({ height: '1.71', goalWeight: '69.5', injectionDay: 1 });
        expect(userObj.settings).toMatchObject({ calorieGoal: 1600, fatGoal: 55, carbsGoal: 140 });
        expect(userObj.sideEffectsLogs[0]).toMatchObject({ symptoms: ['nausea'], foodNoise: 4, trigger: 'doce', note: 'enjoo' });
        expect(userObj.dailyIntakeHistory['2026-01-03']).toMatchObject({ calories: 900, fat: 30, carbs: 80 });
    });

    it('upserts daily_intake keyed on (user_id, date) instead of duplicating rows', async () => {
        await userService.saveUserProfile(UID, {
            name: 'Ana',
            dailyIntakeHistory: { '2026-01-01': { water: 1, protein: 20, fiber: 5 } },
        });
        await userService.saveUserProfile(UID, {
            name: 'Ana',
            dailyIntakeHistory: { '2026-01-01': { water: 2, protein: 40, fiber: 10 } },
        });

        expect(fake._store.daily_intake).toHaveLength(1);
        expect(fake._store.daily_intake[0]).toMatchObject({ water: 2, protein: 40, fiber: 10 });
    });
});

describe('userService.updateUserData', () => {
    it('only updates the fields that were provided', async () => {
        fake._store.profiles.push({ id: UID, name: 'Ana', current_dose: '0.25 mg', water_goal: 2.5 });

        await userService.updateUserData(UID, { currentDose: '0.5 mg' });

        expect(fake._store.profiles[0]).toMatchObject({
            name: 'Ana', // untouched
            current_dose: '0.5 mg', // updated
            water_goal: 2.5, // untouched
        });
    });
});

describe('userService.subscribeToUser', () => {
    it('assembles the unified userObj from the 5 relational tables', async () => {
        fake._store.profiles.push({
            id: UID,
            name: 'Ana',
            email: 'ana@example.com',
            photo_url: '',
            start_date: '2026-01-01T00:00:00.000Z',
            medication_id: 'ozempic',
            current_dose: '0.5 mg',
            is_maintenance: false,
            protein_goal: 100,
            water_goal: 2.5,
            fiber_goal: 25,
        });
        fake._store.measurements.push(
            { user_id: UID, date: '2026-01-08T00:00:00.000Z', weight: 89, waist: 0, hip: 0 },
            { user_id: UID, date: '2026-01-01T00:00:00.000Z', weight: 90, waist: 0, hip: 0 }
        );
        fake._store.daily_intake.push({ user_id: UID, date: '2026-01-08', water: 1.5, protein: 60, fiber: 10 });

        const userObj = await new Promise((resolve) => {
            userService.subscribeToUser(UID, resolve);
        });

        expect(userObj.uid).toBe(UID);
        expect(userObj.currentWeight).toBe(89); // most recent measurement (ordered desc)
        expect(userObj.history).toEqual([90, 89]); // reversed -> oldest to newest
        expect(userObj.dailyIntakeHistory['2026-01-08']).toEqual({ water: 1.5, protein: 60, fiber: 10 });
        expect(userObj.settings).toMatchObject({ proteinGoal: 100, waterGoal: 2.5, fiberGoal: 25 });
    });

    it('calls back with null when the profile does not exist (guest not yet migrated)', async () => {
        const result = await new Promise((resolve) => {
            userService.subscribeToUser('missing-user', resolve);
        });
        expect(result).toBeNull();
    });
});
