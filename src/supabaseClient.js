import { createClient } from '@supabase/supabase-js';

// Used by every platform (iOS, Android and `expo start --web`). Static
// process.env.EXPO_PUBLIC_* access, since babel-preset-expo only replaces
// static reads, not computed/bracket access. Do not use import.meta here —
// Metro/Hermes can't parse it (Script goal, not Module goal).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (supabaseUrl.includes('placeholder-project')) {
    console.warn("Supabase credentials missing. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. App running in offline/placeholder mode.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


