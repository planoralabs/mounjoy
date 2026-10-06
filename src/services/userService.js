import { supabase } from '../supabaseClient';
import { sanitizeInput } from '../utils/securityUtils';

const isoDate = (d) => {
    const t = new Date(d);
    return isNaN(t.getTime()) ? null : t.toISOString();
};

/**
 * Makes a per-user table match the app's list. Records are identified by
 * their timestamp (the app has no row ids): a stored row with the same
 * timestamp is updated when its fields changed, list entries with no stored
 * row are inserted, and stored rows no longer in the list are deleted —
 * that is how edits and removals made in the Journal reach the database.
 */
const syncRows = async (uid, table, records, toFields) => {
    const { data: existing, error: readError } = await supabase.from(table).select('*').eq('user_id', uid);
    if (readError) throw readError;

    const byDate = new Map();
    (existing || []).forEach((row) => {
        const key = isoDate(row.date);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push(row);
    });

    const toInsert = [];
    for (const record of records) {
        const date = isoDate(record.date);
        if (!date) continue;
        const fields = toFields(record);
        const row = byDate.get(date)?.shift();
        if (!row) {
            toInsert.push({ user_id: uid, date, ...fields });
        } else if (Object.entries(fields).some(([k, v]) => JSON.stringify(row[k] ?? null) !== JSON.stringify(v ?? null))) {
            const { error } = await supabase.from(table).update(fields).eq('id', row.id);
            if (error) throw error;
        }
    }

    for (const leftovers of byDate.values()) {
        for (const row of leftovers) {
            const { error } = await supabase.from(table).delete().eq('id', row.id);
            if (error) throw error;
        }
    }

    if (toInsert.length > 0) {
        const { error } = await supabase.from(table).insert(toInsert);
        if (error) throw error;
    }
};

// Column / table missing: the database hasn't run the supplements & reminders
// migration yet (supabase/migrations/20261006_reminders_supplements.sql).
const MISSING_SCHEMA = new Set(['PGRST204', 'PGRST205', '42703', '42P01']);
const isMissingSchema = (error) => !!error && MISSING_SCHEMA.has(error.code);

/** Runs a write that needs the newer schema; skipped (with a warning) until it exists. */
const withNewerSchema = async (label, write) => {
    try {
        const result = await write();
        if (result?.error) throw result.error;
    } catch (error) {
        if (!isMissingSchema(error)) throw error;
        console.warn(`Skipped ${label}: run the 20261006 Supabase migration.`);
    }
};

/**
 * Service to handle user-related data operations in Supabase (PostgreSQL).
 */
export const userService = {
    /**
     * Gets a user profile in Supabase.
     */
    getUserProfile: async (uid) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
            return data;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            throw error;
        }
    },

    /**
     * Saves or overwrites the user profile and syncs relational tables.
     */
    saveUserProfile: async (uid, userData) => {
        try {
            const settings = userData.settings || {};
            const num = (v) => (v === undefined || v === null || v === '' || isNaN(parseFloat(v)) ? null : parseFloat(v));

            // 1. Profile row
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: uid,
                name: sanitizeInput(userData.name),
                email: userData.email || '',
                photo_url: userData.photoURL || '',
                start_date: userData.startDate || new Date().toISOString(),
                medication_id: userData.medicationId || 'ozempic',
                current_dose: userData.currentDose || '0.25 mg',
                is_maintenance: userData.isMaintenance || false,
                protein_goal: settings.proteinGoal || 100,
                water_goal: settings.waterGoal || 2.5,
                fiber_goal: settings.fiberGoal || 25,
                calorie_goal: settings.calorieGoal || 1800,
                fat_goal: settings.fatGoal || 60,
                carbs_goal: settings.carbsGoal || 150,
                unit_system: settings.unitSystem || 'metric',
                height_m: num(userData.height),
                start_weight: num(userData.startWeight),
                goal_weight: num(userData.goalWeight),
                injection_day: userData.injectionDay ?? null,
                reminders_enabled: settings.remindersEnabled ?? true,
                reminder_time: settings.reminderTime || '09:00',
                updated_at: new Date().toISOString()
            });

            if (profileError) throw profileError;

            await withNewerSchema('supplements and reminders', () => supabase.from('profiles').update({
                supplements: Array.isArray(userData.supplements) ? userData.supplements : [],
                reminder_settings: settings.reminders || {},
            }).eq('id', uid));

            // 2–4. Record tables mirror the app's lists exactly: new records
            // are inserted, edited ones updated and removed ones deleted.
            if (Array.isArray(userData.measurements)) {
                await syncRows(uid, 'measurements', userData.measurements, (m) => ({
                    weight: parseFloat(m.weight) || 0,
                    waist: parseFloat(m.waist) || 0,
                    hip: parseFloat(m.hip) || 0,
                }));
            }

            if (Array.isArray(userData.doseHistory)) {
                await syncRows(uid, 'dose_history', userData.doseHistory, (d) => ({
                    dose: d.dose || '0.25 mg',
                    medication: d.medication || 'ozempic',
                    site: d.siteId || d.site || 'not_recorded',
                }));
            }

            if (Array.isArray(userData.sideEffectsLogs)) {
                await syncRows(uid, 'symptoms_logs', userData.sideEffectsLogs, (s) => ({
                    symptoms: Array.isArray(s.symptoms) ? s.symptoms : [],
                    food_noise: Number.isInteger(s.foodNoise) ? s.foodNoise : null,
                    trigger: s.trigger || '',
                    notes: s.note ?? s.notes ?? '',
                    is_memory_only: !!s.isMemoryOnly,
                }));
            }

            if (Array.isArray(userData.supplementLogs)) {
                await withNewerSchema('supplement logs', () => syncRows(uid, 'supplement_logs', userData.supplementLogs, (l) => ({
                    supplement_id: l.supplementId,
                    name: l.name || '',
                })));
            }

            // 5. Daily intakes (one row per day)
            if (userData.dailyIntakeHistory && Object.keys(userData.dailyIntakeHistory).length > 0) {
                const toUpsert = Object.entries(userData.dailyIntakeHistory).map(([dateStr, intake]) => ({
                    user_id: uid,
                    date: dateStr,
                    water: parseFloat(intake.water) || 0,
                    protein: parseFloat(intake.protein) || 0,
                    fiber: parseFloat(intake.fiber) || 0,
                    calories: parseFloat(intake.calories) || 0,
                    fat: parseFloat(intake.fat) || 0,
                    carbs: parseFloat(intake.carbs) || 0
                }));

                const { error: diError } = await supabase.from('daily_intake').upsert(toUpsert, {
                    onConflict: 'user_id,date'
                });
                if (diError) throw diError;
            }
        } catch (error) {
            console.error("Error saving user profile in Supabase:", error);
            throw error;
        }
    },

    /**
     * Updates specific fields in the user profile.
     */
    updateUserData: async (uid, data) => {
        try {
            const updatePayload = {};
            if (data.name !== undefined) updatePayload.name = sanitizeInput(data.name);
            if (data.photoURL !== undefined) updatePayload.photo_url = data.photoURL;
            if (data.medicationId !== undefined) updatePayload.medication_id = data.medicationId;
            if (data.currentDose !== undefined) updatePayload.current_dose = data.currentDose;
            if (data.isMaintenance !== undefined) updatePayload.is_maintenance = data.isMaintenance;
            if (data.settings?.proteinGoal !== undefined) updatePayload.protein_goal = data.settings.proteinGoal;
            if (data.settings?.waterGoal !== undefined) updatePayload.water_goal = data.settings.waterGoal;
            if (data.settings?.fiberGoal !== undefined) updatePayload.fiber_goal = data.settings.fiberGoal;
            if (data.settings?.unitSystem !== undefined) updatePayload.unit_system = data.settings.unitSystem;

            updatePayload.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', uid);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating user data:", error);
            throw error;
        }
    },

    /**
     * Real-time listener for user data changes across relational tables.
     */
    subscribeToUser: (uid, callback) => {
        const fetchData = async () => {
            try {
                const { data: profile, error: profileErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', uid)
                    .single();

                if (profileErr) {
                    if (profileErr.code === 'PGRST116') {
                        callback(null);
                        return;
                    }
                    throw profileErr;
                }

                const { data: measurements } = await supabase.from('measurements').select('*').eq('user_id', uid).order('date', { ascending: false });
                const { data: doses } = await supabase.from('dose_history').select('*').eq('user_id', uid).order('date', { ascending: false });
                const { data: symptoms } = await supabase.from('symptoms_logs').select('*').eq('user_id', uid).order('date', { ascending: false });
                const { data: dailyIntakes } = await supabase.from('daily_intake').select('*').eq('user_id', uid);
                // Empty until the 20261006 migration creates the table.
                const { data: supplementRows } = await supabase.from('supplement_logs').select('*').eq('user_id', uid).order('date', { ascending: false });

                const formattedMeasurements = measurements?.map(m => ({
                    date: m.date,
                    weight: parseFloat(m.weight),
                    waist: m.waist ? parseFloat(m.waist) : 0,
                    hip: m.hip ? parseFloat(m.hip) : 0
                })) || [];

                // Waist/hip-only entries are stored with weight 0; they are not weigh-ins.
                const weighIns = formattedMeasurements.filter(m => m.weight > 0);
                const formattedHistory = weighIns.map(m => m.weight).reverse();

                const formattedDoseHistory = doses?.map(d => ({
                    date: d.date,
                    dose: d.dose,
                    medication: d.medication,
                    site: d.site,
                    // Rotation suggestions (InjectionService) key off siteId.
                    siteId: d.site
                })) || [];

                // Current check-ins carry `symptoms`/`food_noise`; rows saved by
                // older builds only have the 0–10 nausea/fatigue columns.
                const formattedSideEffectsLogs = symptoms?.map(s => {
                    const list = Array.isArray(s.symptoms) && s.symptoms.length > 0
                        ? s.symptoms
                        : [...(s.nausea > 0 ? ['nausea'] : []), ...(s.fatigue > 0 ? ['fadiga'] : [])];
                    return {
                        date: s.date,
                        symptoms: list,
                        ...(s.food_noise !== null && s.food_noise !== undefined ? { foodNoise: s.food_noise } : {}),
                        trigger: s.trigger || '',
                        note: s.notes || '',
                        ...(s.is_memory_only ? { isMemoryOnly: true } : {}),
                    };
                }) || [];

                const dailyIntakeHistory = {};
                dailyIntakes?.forEach(di => {
                    dailyIntakeHistory[di.date] = {
                        water: parseFloat(di.water) || 0,
                        protein: parseFloat(di.protein) || 0,
                        fiber: parseFloat(di.fiber) || 0,
                        // Present once the October/2026 migration has run.
                        ...(di.calories != null ? { calories: parseFloat(di.calories) || 0 } : {}),
                        ...(di.fat != null ? { fat: parseFloat(di.fat) || 0 } : {}),
                        ...(di.carbs != null ? { carbs: parseFloat(di.carbs) || 0 } : {}),
                    };
                });

                const userObj = {
                    uid: profile.id,
                    name: profile.name,
                    email: profile.email,
                    photoURL: profile.photo_url,
                    startDate: profile.start_date,
                    medicationId: profile.medication_id,
                    currentDose: profile.current_dose,
                    isMaintenance: profile.is_maintenance,
                    ...(profile.height_m != null ? { height: String(profile.height_m) } : {}),
                    ...(profile.start_weight != null ? { startWeight: String(profile.start_weight) } : {}),
                    ...(profile.goal_weight != null ? { goalWeight: String(profile.goal_weight) } : {}),
                    ...(profile.injection_day != null ? { injectionDay: profile.injection_day } : {}),
                    currentWeight: weighIns[0]?.weight || 0,
                    history: formattedHistory,
                    doseHistory: formattedDoseHistory,
                    measurements: formattedMeasurements,
                    sideEffectsLogs: formattedSideEffectsLogs,
                    dailyIntakeHistory: dailyIntakeHistory,
                    supplements: Array.isArray(profile.supplements) ? profile.supplements : [],
                    supplementLogs: (supplementRows || []).map((l) => ({ date: l.date, supplementId: l.supplement_id, name: l.name })),
                    settings: {
                        proteinGoal: parseFloat(profile.protein_goal) || 100,
                        waterGoal: parseFloat(profile.water_goal) || 2.5,
                        fiberGoal: parseFloat(profile.fiber_goal) || 25,
                        calorieGoal: parseFloat(profile.calorie_goal) || 1800,
                        fatGoal: parseFloat(profile.fat_goal) || 60,
                        carbsGoal: parseFloat(profile.carbs_goal) || 150,
                        unitSystem: profile.unit_system || 'metric',
                        remindersEnabled: profile.reminders_enabled ?? true,
                        reminderTime: profile.reminder_time || '09:00',
                        ...(profile.reminder_settings && Object.keys(profile.reminder_settings).length ? { reminders: profile.reminder_settings } : {}),
                    }
                };

                callback(userObj);
            } catch (err) {
                console.error("Error fetching user data from Supabase:", err);
            }
        };

        fetchData();

        // Subscribe to changes on profiles, measurements, dose_history, symptoms_logs, daily_intake
        const channel = supabase.channel(`public-db-changes-${uid}`)
            .on('postgres_changes', { event: '*', schema: 'public', filter: `user_id=eq.${uid}` }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * 🔐 Direito ao Esquecimento (OWASP Pillar 02/LGPD)
     * Remove todos os dados do usuário do Supabase profiles.
     */
    deleteUserAccount: async (uid) => {
        try {
            // Delete user profile (cascades automatically to all tables due to 'on delete cascade')
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', uid);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting user account:", error);
            throw error;
        }
    },

    /**
     * Sends a base64 meal photo to the analyze-meal-photo Edge Function.
     * The image itself is never persisted — only the extracted item list
     * comes back. See mobile_documentation.md section 7.
     */
    // ⚠️ TEMPORARY (2026-08-25): no longer requires a session, to make guest
    // mode testable without wiring up anonymous sign-in yet — mirrors the
    // Edge Function's own temporary auth-optional state. See
    // mobile_documentation.md section 7.9 for what to restore before a real
    // release.
    // `language` (e.g. 'en', 'pt') asks Gemini to name the foods in the
    // user's language.
    analyzeMealPhoto: async (imageBase64, mimeType = 'image/jpeg', totalWeightHintGrams = null, language = 'en') => {
        const { data, error } = await supabase.functions.invoke('analyze-meal-photo', {
            body: { imageBase64, mimeType, totalWeightHintGrams, language },
        });

        if (error) {
            // FunctionsHttpError carries the actual response on `.context`.
            // Rate-limit responses come with a `reason` code
            // ('too_frequent' | 'daily_limit_reached') that the screen
            // translates; anything else surfaces the server message instead
            // of a generic "Edge Function returned a non-2xx status code".
            let body = null;
            try {
                body = await error.context?.json?.();
            } catch {
                // Not a JSON body — fall through to the original error.
            }
            if (body?.reason || body?.error) {
                const friendly = new Error(body.error || error.message);
                friendly.reason = body.reason;
                friendly.limit = body.limit;
                throw friendly;
            }
            throw error;
        }
        return data.items || [];
    },

    /**
     * Best-effort lookup of a food item's macros per 100g by name. Returns
     * null if nothing matches — food_items starts empty until seeded (see
     * mobile_documentation.md 7.8), so callers must handle a null result.
     */
    findFoodItemByName: async (name) => {
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .ilike('name_search', `%${name.toLowerCase().trim()}%`)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error looking up food item:', error);
            return null;
        }
        return data;
    },

    /** Manual search for the "add item" flow (returns up to 10 matches). */
    searchFoodItems: async (query) => {
        if (!query || query.trim().length < 2) return [];
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .ilike('name_search', `%${query.toLowerCase().trim()}%`)
            .limit(10);

        if (error) {
            console.error('Error searching food items:', error);
            return [];
        }
        return data || [];
    },

    /** Persists a confirmed meal log (own table, independent of profiles). */
    saveMealLog: async (uid, meal) => {
        const { error } = await supabase.from('meal_logs').insert({
            user_id: uid,
            // Meals logged for a past day (Journal); omitted = now (column default).
            ...(meal.loggedAt ? { logged_at: meal.loggedAt } : {}),
            items: meal.items,
            total_calories: meal.totalCalories,
            total_protein: meal.totalProtein,
            total_carbs: meal.totalCarbs,
            total_fat: meal.totalFat,
            total_fiber: meal.totalFiber || 0,
        });

        if (error) throw error;
    },

    /** Removes one meal from the history (Journal → trash). */
    deleteMealLog: async (uid, mealId) => {
        const { error } = await supabase.from('meal_logs').delete().eq('id', mealId).eq('user_id', uid);
        if (error) throw error;
    },

    /** Meal history for the "Refeições Registradas" section — most recent first. */
    getMealLogs: async (uid, limit = 30) => {
        const { data, error } = await supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', uid)
            .order('logged_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching meal logs:', error);
            return [];
        }
        return data || [];
    },
};
