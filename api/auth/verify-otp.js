'use strict';

const { verifyOtp } = require('../_lib/otp');
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

    return json(res, 200, {
      ok: true,
      verified: true,
      message: 'Email successfully verified.'
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return error(res, 500, 'Server error verifying OTP: ' + err.message);
  }
};

