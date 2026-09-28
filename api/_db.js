import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

/**
 * Returns a server-side Supabase client using privileged service-role credentials.
 * This client runs strictly inside Vercel serverless functions and is NEVER exposed to the frontend.
 */
export function getServiceClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Use SUPABASE_SERVICE_ROLE_KEY; fall back to VITE_SUPABASE_ANON_KEY only during local development testing
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL in server environment.');
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in server environment.');
  }

  cachedClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
