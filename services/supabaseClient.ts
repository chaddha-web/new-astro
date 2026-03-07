
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access environment variables directly.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

// robust check: ensure they are strings, not empty, and URL looks valid
if (
  typeof supabaseUrl === 'string' && 
  supabaseUrl.trim().length > 0 && 
  supabaseUrl.startsWith('http') &&
  typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.trim().length > 0
) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn("Supabase client failed to initialize despite having keys:", error);
  }
} else {
  // Only warn if we are in a mode where we expect it, otherwise silent for offline demo
}

export const supabase = supabaseInstance;
