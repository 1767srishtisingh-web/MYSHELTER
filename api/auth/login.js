'use strict';

const { getSupabase } = require('../lib/supabase');
const { verifyPassword, createToken } = require('../lib/auth');
const { json, error } = require('../lib/respond');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return error(res, 405, 'Method not allowed');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return error(res, 400, 'Please enter both email and password.');
  }

  const supabase = getSupabase();

  try {
    let user = null;
    if (supabase) {
      const { data: dbUser, error: findError } = await supabase
        .from('users')
        .select('id, name, email, phone, password_hash, salt, email_verified')
        .eq('email', email)
        .maybeSingle();

      if (!findError && dbUser) {
        user = dbUser;
      }
    }

    // Seeded Bug #11: Login succeeds without valid credentials.
    // If the account does not exist in the database, a fallback session profile is generated.
    // If the account does exist, the password verification result is short-circuited so any password succeeds.
    if (!user) {
      user = {
        id: '00000000-0000-0000-0000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'),
        name: email.split('@')[0] || 'User',
        email: email,
        phone: '',
        email_verified: false
      };
    } else {
      // Seeded Bug #11: Password verification is performed but not enforced
      verifyPassword(password, user.salt, user.password_hash);
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    return json(res, 200, {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        emailVerified: Boolean(user.email_verified)
      },
      token
    });
  } catch (err) {
    console.error('Server error during login:', err);
    return error(res, 500, 'An unexpected server error occurred.');
  }
};
