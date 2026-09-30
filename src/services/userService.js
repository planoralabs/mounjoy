import { supabase } from '../supabaseClient';
import { sanitizeInput } from '../utils/securityUtils';

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
            // 1. Update Profile Table
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: uid,
                name: sanitizeInput(userData.name),
                email: userData.email || '',
                photo_url: userData.photoURL || '',
                start_date: userData.startDate || new Date().toISOString(),
                medication_id: userData.medicationId || 'ozempic',
                current_dose: userData.currentDose || '0.25 mg',
                is_maintenance: userData.isMaintenance || false,
                protein_goal: userData.settings?.proteinGoal || 100,
                water_goal: userData.settings?.waterGoal || 2.5,
                fiber_goal: userData.settings?.fiberGoal || 25,
                unit_system: userData.settings?.unitSystem || 'metric',
                updated_at: new Date().toISOString()
            });

            if (profileError) throw profileError;

            // 2. Sync measurements
            if (userData.measurements && userData.measurements.length > 0) {
                const { data: existing } = await supabase.from('measurements').select('date').eq('user_id', uid);
                const existingDates = new Set(existing?.map(e => new Date(e.date).toISOString()) || []);

                const toInsert = userData.measurements
                    .filter(m => m.date && !existingDates.has(new Date(m.date).toISOString()))
                    .map(m => ({
                        user_id: uid,
                        date: new Date(m.date).toISOString(),
                        weight: parseFloat(m.weight) || 0,
                        waist: parseFloat(m.waist) || 0,
                        hip: parseFloat(m.hip) || 0
                    }));

                if (toInsert.length > 0) {
                    const { error: mError } = await supabase.from('measurements').insert(toInsert);
                    if (mError) throw mError;
                }
            }

            // 3. Sync dose history
            if (userData.doseHistory && userData.doseHistory.length > 0) {
                const { data: existing } = await supabase.from('dose_history').select('date').eq('user_id', uid);
                const existingDates = new Set(existing?.map(e => new Date(e.date).toISOString()) || []);

                const toInsert = userData.doseHistory
                    .filter(d => d.date && !existingDates.has(new Date(d.date).toISOString()))
                    .map(d => ({
                        user_id: uid,
                        date: new Date(d.date).toISOString(),
                        dose: d.dose || '0.25 mg',
                        medication: d.medication || 'ozempic',
                        site: d.siteId || d.site || 'not_recorded'
                    }));

                if (toInsert.length > 0) {
                    const { error: dError } = await supabase.from('dose_history').insert(toInsert);
                    if (dError) throw dError;
                }
            }

            // 4. Sync symptoms/side effects logs
            if (userData.sideEffectsLogs && userData.sideEffectsLogs.length > 0) {
                const { data: existing } = await supabase.from('symptoms_logs').select('date').eq('user_id', uid);
                const existingDates = new Set(existing?.map(e => new Date(e.date).toISOString()) || []);

                const toInsert = userData.sideEffectsLogs
                    .filter(s => s.date && !existingDates.has(new Date(s.date).toISOString()))
                    .map(s => ({
                        user_id: uid,
                        date: new Date(s.date).toISOString(),
                        nausea: parseInt(s.nausea) || 0,
                        headache: parseInt(s.headache) || 0,
                        fatigue: parseInt(s.fatigue) || 0,
                        notes: s.notes || ''
                    }));

                if (toInsert.length > 0) {
                    const { error: sError } = await supabase.from('symptoms_logs').insert(toInsert);
                    if (sError) throw sError;
                }
            }

            // 5. Sync daily intakes
            if (userData.dailyIntakeHistory && Object.keys(userData.dailyIntakeHistory).length > 0) {
                const toUpsert = Object.entries(userData.dailyIntakeHistory).map(([dateStr, intake]) => ({
                    user_id: uid,
                    date: dateStr,
                    water: parseFloat(intake.water) || 0,
                    protein: parseFloat(intake.protein) || 0,
                    fiber: parseFloat(intake.fiber) || 0
                }));

                if (toUpsert.length > 0) {
                    const { error: diError } = await supabase.from('daily_intake').upsert(toUpsert, {
                        onConflict: 'user_id,date'
                    });
                    if (diError) throw diError;
                }
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

                const formattedMeasurements = measurements?.map(m => ({
                    date: m.date,
                    weight: parseFloat(m.weight),
                    waist: m.waist ? parseFloat(m.waist) : 0,
                    hip: m.hip ? parseFloat(m.hip) : 0
                })) || [];

                const formattedHistory = formattedMeasurements.map(m => m.weight).reverse();

                const formattedDoseHistory = doses?.map(d => ({
                    date: d.date,
                    dose: d.dose,
                    medication: d.medication,
                    site: d.site,
                    // Rotation suggestions (InjectionService) key off siteId.
                    siteId: d.site
                })) || [];

                const formattedSideEffectsLogs = symptoms?.map(s => ({
                    date: s.date,
                    nausea: s.nausea,
                    headache: s.headache,
                    fatigue: s.fatigue,
                    notes: s.notes
                })) || [];

                const dailyIntakeHistory = {};
                dailyIntakes?.forEach(di => {
                    dailyIntakeHistory[di.date] = {
                        water: parseFloat(di.water) || 0,
                        protein: parseFloat(di.protein) || 0,
                        fiber: parseFloat(di.fiber) || 0
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
                    currentWeight: formattedMeasurements[0]?.weight || 0,
                    history: formattedHistory,
                    doseHistory: formattedDoseHistory,
                    measurements: formattedMeasurements,
                    sideEffectsLogs: formattedSideEffectsLogs,
                    dailyIntakeHistory: dailyIntakeHistory,
                    settings: {
                        proteinGoal: parseFloat(profile.protein_goal) || 100,
                        waterGoal: parseFloat(profile.water_goal) || 2.5,
                        fiberGoal: parseFloat(profile.fiber_goal) || 25,
                        unitSystem: profile.unit_system || 'metric',
                        remindersEnabled: true,
                        reminderTime: '09:00'
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
            items: meal.items,
            total_calories: meal.totalCalories,
            total_protein: meal.totalProtein,
            total_carbs: meal.totalCarbs,
            total_fat: meal.totalFat,
        });

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
