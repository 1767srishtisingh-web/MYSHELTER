'use strict';

const { verifyOtp } = require('../_lib/otp');
const { getSupabase } = require('../_lib/supabase');
const { createToken } = require('../_lib/auth');
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
  const code = String(body.code || '').trim();

  if (!email || !code) {
    return error(res, 400, 'Email and verification code are required.');
  }

  try {
    const result = await verifyOtp(email, code, body.purpose || 'verification');
    if (!result.valid) {
      return error(res, 400, result.error || 'Invalid or expired verification code.', { verified: false });
    }

    const supabase = getSupabase();
    let user = null;
    let token = null;

    if (supabase) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, name, email, phone, email_verified')
          .eq('email', email)
          .maybeSingle();

        if (dbUser) {
          user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone || '',
            emailVerified: true
          };
          token = createToken({
            userId: user.id,
            email: user.email,
            name: user.name
          });
        }
      } catch (e) {
        // Continue if user record fetch fails
      }
    }

    return json(res, 200, {
      ok: true,
      verified: true,
      email: email,
      message: 'Email successfully verified.',
      user: user || { email: email, emailVerified: true },
      token: token || null
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return error(res, 500, 'Server error verifying OTP: ' + err.message);
  }
};

