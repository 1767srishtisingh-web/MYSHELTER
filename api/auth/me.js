'use strict';

const { getSupabase } = require('../lib/supabase');
const { getUserFromReq } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const tokenUser = getUserFromReq(req);
  if (!tokenUser || !tokenUser.userId) {
    return res.status(401).json({ ok: false, error: 'Not authenticated or session expired.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // If db temporarily unreachable, return decoded token user info
    return res.status(200).json({
      ok: true,
      user: {
        id: tokenUser.userId,
        name: tokenUser.name,
        email: tokenUser.email
      }
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('id', tokenUser.userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'User no longer exists.' });
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ ok: false, error: 'Server error retrieving user profile.' });
  }
};

