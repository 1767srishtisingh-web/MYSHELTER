'use strict';

const { getSupabase } = require('../lib/supabase');
const { hashPassword, createToken } = require('../lib/auth');

function validateRegister(body) {
  const errors = {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').replace(/\D/g, '');
  const password = String(body.password || '');

  if (!name || name.length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (name.length > 80) {
    errors.name = 'Full name must be 80 characters or fewer.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  // 10 digit Indian phone check, handles +91 or leading 0
  let normPhone = phone;
  if (normPhone.length === 12 && normPhone.startsWith('91')) normPhone = normPhone.slice(2);
  if (normPhone.length === 11 && normPhone.startsWith('0')) normPhone = normPhone.slice(1);
  if (!normPhone || normPhone.length !== 10 || !/^[6-9]\d{9}$/.test(normPhone)) {
    errors.phone = 'Please provide a valid 10-digit mobile number.';
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { name, email, phone: normPhone, password }
  };
}

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

  const validation = validateRegister(body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, errors: validation.errors });
  }

  const { name, email, phone, password } = validation.values;
  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({
      ok: false,
      error: 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.'
    });
  }

  try {
    // Check if email already registered
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Database query error:', checkError);
      return res.status(500).json({ ok: false, error: 'Failed to verify account uniqueness. ' + checkError.message });
    }

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        errors: { email: 'An account with this email already exists.' }
      });
    }

    // Hash password with salt
    const { salt, hash } = hashPassword(password);

    // Insert user into database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          phone,
          password_hash: hash,
          salt
        }
      ])
      .select('id, name, email, phone, created_at')
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return res.status(500).json({ ok: false, error: 'Could not create account: ' + insertError.message });
    }

    // Create session token
    const token = createToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    return res.status(201).json({
      ok: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone
      },
      token
    });
  } catch (err) {
    console.error('Server error during registration:', err);
    return res.status(500).json({ ok: false, error: 'An unexpected server error occurred.' });
  }
};
