'use strict';

let createClient = null;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  // In offline dev or before npm install, createClient will be null
}

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;

  if (!createClient) {
    try {
      createClient = require('@supabase/supabase-js').createClient;
    } catch (e) {
      return null;
    }
  }

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
