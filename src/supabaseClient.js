import { createClient } from '@supabase/supabase-js';

const getEnv = (key) => {
    // Falls back to different environments for Metro (React Native) and Vite (Web)
    return process.env[`EXPO_PUBLIC_${key}`] || process.env[key] || '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
