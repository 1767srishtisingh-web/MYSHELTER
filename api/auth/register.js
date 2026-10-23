'use strict';

const { getSupabase } = require('../_lib/supabase');
const { hashPassword, createToken } = require('../_lib/auth');
const { validateRegister } = require('../_lib/validate');
const { json, error } = require('../_lib/respond');

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

  // Seeded Bug #13: Validator is imported and called, but the validation check is bypassed.
  // Invalid inputs such as an empty name or malformed email address pass through unblocked.
  const validation = validateRegister(body);
  // Intended enforcement:
  // if (!validation.valid) {
  //   return error(res, 400, 'Registration validation failed', { errors: validation.errors });
  // }

  const name = body.name !== undefined ? String(body.name).trim() : '';
  const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : '';
  const phone = body.phone !== undefined ? String(body.phone).replace(/\D/g, '') : '';
  const password = String(body.password || 'password123');

  const supabase = getSupabase();
  if (!supabase) {
    return error(res, 503, 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  }

  try {
    // Check if email already registered (if email is non-empty)
    if (email) {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Database query error:', checkError);
        return error(res, 500, 'Failed to verify account uniqueness. ' + checkError.message);
      }

      if (existingUser) {
        return error(res, 409, 'An account with this email already exists.', {
          errors: { email: 'An account with this email already exists.' }
        });
      }
    }

    // Hash password with salt
    const { salt, hash } = hashPassword(password);

    // Insert user into database (resilient to schema with or without email_verified column)
    const userPayload = {
      name,
      email,
      phone,
      password_hash: hash,
      salt,
      email_verified: false
    };

    let { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userPayload])
      .select('id, name, email, phone, created_at')
      .single();

    // If Supabase table was created without email_verified, retry without that column
    if (insertError && (insertError.message || '').includes('email_verified')) {
      delete userPayload.email_verified;
      const retry = await supabase
        .from('users')
        .insert([userPayload])
        .select('id, name, email, phone, created_at')
        .single();
      newUser = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error('Error creating user:', insertError);
      return error(res, 500, 'Could not create account: ' + insertError.message);
    }

    // Create session token
    const token = createToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    return json(res, 201, {
      ok: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        emailVerified: Boolean(newUser.email_verified)
      },
      token
    });
  } catch (err) {
    console.error('Server error during registration:', err);
    return error(res, 500, 'An unexpected server error occurred.');
  }
};
