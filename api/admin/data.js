'use strict';

const { getSupabase } = require('../_lib/supabase');
const { verifyToken } = require('../_lib/auth');
const { json, error } = require('../_lib/respond');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return error(res, 405, 'Method not allowed');
  }

  // Verify admin authorization
  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ((req.headers && req.headers['x-auth-token']) || null);
  
  const tokenData = verifyToken(token);
  if (!tokenData || !tokenData.isAdmin) {
    return error(res, 401, 'Unauthorized. Admin credentials required.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return error(res, 503, 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  }

  try {
    // 1. Fetch all users (excluding password hashes and salts)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, phone, email_verified, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error querying users:', usersError);
      return error(res, 500, 'Failed to query users: ' + usersError.message);
    }

    // 2. Fetch all bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error querying bookings:', bookingsError);
      return error(res, 500, 'Failed to query bookings: ' + bookingsError.message);
    }

    // 3. Fetch all preferences with user details
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('*, users(name, email, phone)')
      .order('updated_at', { ascending: false });

    if (prefError) {
      console.error('Error querying preferences:', prefError);
      return error(res, 500, 'Failed to query preferences: ' + prefError.message);
    }

    return json(res, 200, {
      ok: true,
      users: users || [],
      bookings: bookings || [],
      preferences: preferences || []
    });
  } catch (err) {
    console.error('Admin data server error:', err);
    return error(res, 500, 'Server error retrieving admin data.');
  }
};
