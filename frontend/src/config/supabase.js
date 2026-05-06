import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''

let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SUPABASE] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing/empty. Using fallback dummy client to prevent app crash. Please restart your Vite dev server (npm run dev) so it can load the .env variables.')
  supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => {},
      signInWithOAuth: async () => ({ error: new Error('Supabase is not configured') })
    }
  }
} else {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  } catch (err) {
    console.error('[SUPABASE] Error initializing Supabase client:', err)
    supabaseClient = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => {},
        signInWithOAuth: async () => ({ error: err })
      }
    }
  }
}

export const supabase = supabaseClient
