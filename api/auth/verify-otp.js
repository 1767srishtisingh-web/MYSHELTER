'use strict';

const { verifyOtp } = require('../_lib/otp');
const { getDb } = require('../_lib/mongodb');
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

    let user = null;
    let token = null;

    try {
      const { db } = await getDb();
      if (db) {
        const dbUser = await db.collection('users').findOne({ email });
        if (dbUser) {
          const userId = (dbUser._id ? dbUser._id.toString() : dbUser.id) || 'usr_' + Date.now();
          user = {
            id: userId,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone || '',
            emailVerified: true
          };
          token = createToken({
            userId,
            email: user.email,
            name: user.name
          });
        }
      }
    } catch (e) {}

    return json(res, 200, {
      ok: true,
      verified: true,
      email,
      message: 'Email successfully verified.',
      user: user || { email, emailVerified: true },
      token: token || null
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return error(res, 500, 'Server error verifying OTP: ' + err.message);
  }
};
