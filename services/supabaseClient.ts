
import { createClient } from '@supabase/supabase-js';

// Configuration du client Supabase avec les identifiants du nouveau projet
const supabaseUrl = (process.env.SUPABASE_URL as string) || 'https://aaeqzcffwehqajriwrqs.supabase.co';
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY as string) || 'sb_publishable_NyJ_wHCueqbmLUAqLZUb4g_g45FVSmM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Ensure environment variables or default values are set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
