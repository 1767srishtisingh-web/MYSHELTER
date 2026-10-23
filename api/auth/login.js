'use strict';

const { getSupabase } = require('../_lib/supabase');
const { verifyPassword, createToken } = require('../_lib/auth');
const { sendOtp, verifyOtp } = require('../_lib/otp');
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

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const otp = body.otp ? String(body.otp).trim() : null;

  if (!email || !password) {
    return error(res, 400, 'Please enter both email and password.');
  }

  const supabase = getSupabase();

  try {
    let user = null;
    if (supabase) {
      let { data: dbUser, error: findError } = await supabase
        .from('users')
        .select('id, name, email, phone, password_hash, salt')
        .eq('email', email)
        .maybeSingle();

      if (!findError && dbUser) {
        user = dbUser;
      }
    }

    // 1. Require valid email and correct password
    if (!user) {
      return error(res, 401, 'Invalid email or password.');
    }

    const passwordValid = verifyPassword(password, user.salt, user.password_hash);
    if (!passwordValid) {
      return error(res, 401, 'Invalid email or password.');
    }

    // 2. If OTP was provided in the login payload, verify it
    if (otp) {
      const otpResult = await verifyOtp(user.email, otp, 'login');
      if (!otpResult.valid) {
        return error(res, 400, otpResult.error || 'Invalid or expired verification code.');
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
          emailVerified: true
        },
        token
      });
    }

    // 3. Credentials are valid; send common OTP to user's email address
    await sendOtp(user.email, 'login');

    return json(res, 200, {
      ok: true,
      requireOtp: true,
      email: user.email,
      message: 'Password verified. An OTP has been sent to your email address.'
    });
  } catch (err) {
    console.error('Server error during login:', err);
    return error(res, 500, 'An unexpected server error occurred.');
  }
};
