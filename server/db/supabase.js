import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const supabaseAdmin = (isSupabaseConfigured && config.supabaseServiceRoleKey)
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : supabase;

let isSchemaReadyCache = null;
let lastCheckTime = 0;

export async function checkSupabaseHealth() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      connected: false,
      schemaReady: false,
      message: 'Supabase URL or Anon Key is missing in environment.',
    };
  }

  // Cache check for 15 seconds to avoid excessive network overhead
  const now = Date.now();
  if (isSchemaReadyCache !== null && now - lastCheckTime < 15000) {
    return isSchemaReadyCache;
  }

  try {
    const { data, error } = await supabase.from('colleges').select('id').limit(1);
    lastCheckTime = now;
    if (error) {
      const isMissingTable = error.message?.includes('schema cache') || error.code === 'PGRST205';
      isSchemaReadyCache = {
        configured: true,
        connected: true,
        schemaReady: !isMissingTable,
        error: error.message,
        message: isMissingTable
          ? 'Supabase is connected, but database tables are not yet created. The server will use the resilient persistent store while migrations are pending.'
          : `Supabase error: ${error.message}`,
      };
      return isSchemaReadyCache;
    }

    isSchemaReadyCache = {
      configured: true,
      connected: true,
      schemaReady: true,
      message: 'Supabase database is connected and active tables detected.',
    };
    return isSchemaReadyCache;
  } catch (err) {
    lastCheckTime = now;
    isSchemaReadyCache = {
      configured: true,
      connected: false,
      schemaReady: false,
      error: err.message,
      message: `Failed to connect to Supabase: ${err.message}`,
    };
    return isSchemaReadyCache;
  }
}
