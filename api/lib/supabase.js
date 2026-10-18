'use strict';

const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  // Service role key has admin rights to bypass RLS, fallback to anon key if service role is not provided
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedClient;
}

module.exports = { getSupabase };
