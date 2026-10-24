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
        const usersCol = db.collection('users');
        const dbUser = await usersCol.findOne({
          email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        });
        if (dbUser) {
          const userId = (dbUser._id ? dbUser._id.toString() : dbUser.id) || 'usr_' + Date.now();
          await usersCol.updateOne({ _id: dbUser._id }, { $set: { email_verified: true } });
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

    if (!token) {
      const fallbackUserId = (user && user.id) || 'usr_' + Date.now().toString(36);
      const fallbackName = (user && user.name) || (email.split('@')[0] || 'User');
      user = user || {
        id: fallbackUserId,
        name: fallbackName,
        email,
        phone: '',
        emailVerified: true
      };
      token = createToken({
        userId: fallbackUserId,
        email: user.email,
        name: user.name
      });
    }

    return json(res, 200, {
      ok: true,
      verified: true,
      email,
      message: 'Email successfully verified.',
      user,
      token
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return error(res, 500, 'Server error verifying OTP: ' + err.message);
  }
};
