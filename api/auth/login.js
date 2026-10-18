'use strict';

const { getSupabase } = require('../lib/supabase');
const { verifyPassword, createToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: 'Please enter both email and password.'
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.'
    });
  }

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, name, email, phone, password_hash, salt')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error('Database query error on login:', findError);
      return res.status(500).json({ ok: false, error: 'Database query failed: ' + findError.message });
    }

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid email or password.'
      });
    }

    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid email or password.'
      });
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      token
    });
  } catch (err) {
    console.error('Server error during login:', err);
    return res.status(500).json({ ok: false, error: 'An unexpected server error occurred.' });
  }
};

