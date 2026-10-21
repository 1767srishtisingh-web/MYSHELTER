'use strict';

const { sendOtp } = require('../lib/otp');
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
  if (!email) {
    return error(res, 400, 'Email address is required.');
  }

  try {
    const result = await sendOtp(email, body.purpose || 'verification');
    return json(res, 200, {
      ok: true,
      message: 'Verification code sent to ' + email,
      email: result.email,
      expiresAt: result.expiresAt
    });
  } catch (err) {
    console.error('Error sending OTP:', err);
    return error(res, 500, 'Failed to send verification code: ' + err.message);
  }
};

