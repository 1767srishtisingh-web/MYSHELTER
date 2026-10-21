'use strict';

const { getSupabase } = require('../lib/supabase');
const { getUserFromReq } = require('../lib/auth');
const { json, error } = require('../lib/respond');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return error(res, 405, 'Method not allowed');
  }

  const tokenUser = getUserFromReq(req);
  if (!tokenUser || !tokenUser.userId) {
    return error(res, 401, 'Not authenticated or session expired.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    // If db temporarily unreachable, return decoded token user info
    return json(res, 200, {
      ok: true,
      user: {
        id: tokenUser.userId,
        name: tokenUser.name,
        email: tokenUser.email,
        emailVerified: false
      }
    });
  }

  try {
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, name, email, phone, email_verified, created_at')
      .eq('id', tokenUser.userId)
      .maybeSingle();

    if (queryError || !user) {
      return error(res, 401, 'User no longer exists.');
    }

    return json(res, 200, {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emailVerified: Boolean(user.email_verified),
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return error(res, 500, 'Server error retrieving user profile.');
  }
};
