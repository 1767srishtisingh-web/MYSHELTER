'use strict';

const { getSupabase } = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Verify admin authorization
  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ((req.headers && req.headers['x-auth-token']) || null);
  
  const tokenData = verifyToken(token);
  if (!tokenData || !tokenData.isAdmin) {
    return res.status(401).json({ ok: false, error: 'Unauthorized. Admin credentials required.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.'
    });
  }

  try {
    // 1. Fetch all users (excluding password hashes and salts)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error querying users:', usersError);
      return res.status(500).json({ ok: false, error: 'Failed to query users: ' + usersError.message });
    }

    // 2. Fetch all bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error querying bookings:', bookingsError);
      return res.status(500).json({ ok: false, error: 'Failed to query bookings: ' + bookingsError.message });
    }

    // 3. Fetch all preferences with user details
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('*, users(name, email, phone)')
      .order('updated_at', { ascending: false });

    if (prefError) {
      console.error('Error querying preferences:', prefError);
      return res.status(500).json({ ok: false, error: 'Failed to query preferences: ' + prefError.message });
    }

    return res.status(200).json({
      ok: true,
      users: users || [],
      bookings: bookings || [],
      preferences: preferences || []
    });
  } catch (err) {
    console.error('Admin data server error:', err);
    return res.status(500).json({ ok: false, error: 'Server error retrieving admin data.' });
  }
};

