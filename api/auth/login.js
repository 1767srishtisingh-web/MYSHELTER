'use strict';

const { getDb } = require('../_lib/mongodb');
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

  try {
    const { db } = await getDb();
    const usersCol = db.collection('users');

    const user = await usersCol.findOne({ email });

    if (!user) {
      return error(res, 401, 'Invalid email or password.');
    }

    const passwordValid = verifyPassword(password, user.salt, user.password_hash);
    if (!passwordValid) {
      return error(res, 401, 'Invalid email or password.');
    }

    const userId = user._id ? user._id.toString() : user.id;

    if (otp) {
      const otpResult = await verifyOtp(user.email, otp, 'login');
      if (!otpResult.valid) {
        return error(res, 400, otpResult.error || 'Invalid or expired verification code.');
      }

      const token = createToken({
        userId,
        email: user.email,
        name: user.name
      });

      return json(res, 200, {
        ok: true,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          emailVerified: true
        },
        token
      });
    }

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
