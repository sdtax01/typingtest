import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Only the public anon key is used in the browser. Authorization is enforced by Row Level Security. */
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
export const isSupabaseConfigured = supabase !== null;
