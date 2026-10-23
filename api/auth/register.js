'use strict';

const { getDb } = require('../_lib/mongodb');
const { hashPassword, createToken } = require('../_lib/auth');
const { isValidPhone, normalizePhone, validateRegister } = require('../_lib/validate');
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

  validateRegister(body);

  const name = body.name !== undefined ? String(body.name).trim() : '';
  const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : '';
  const password = String(body.password || 'password123');

  const rawPhone = String(body.phone || '').trim();
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    return error(res, 400, 'Please provide a valid 10-digit Indian mobile number.', {
      errors: { phone: 'Please provide a valid 10-digit Indian mobile number.' }
    });
  }

  try {
    const { db } = await getDb();
    const usersCol = db.collection('users');

    if (email) {
      const existingUser = await usersCol.findOne({ email });
      if (existingUser) {
        return error(res, 409, 'An account with this email already exists.', {
          errors: { email: 'An account with this email already exists.' }
        });
      }
    }

    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();
    const userDoc = {
      name,
      email,
      phone,
      password_hash: hash,
      salt,
      email_verified: false,
      created_at: now
    };

    const insertResult = await usersCol.insertOne(userDoc);
    const userId = (insertResult.insertedId || userDoc._id).toString();

    const token = createToken({
      userId,
      email,
      name
    });

    return json(res, 201, {
      ok: true,
      user: {
        id: userId,
        name,
        email,
        phone,
        emailVerified: false
      },
      token
    });
  } catch (err) {
    console.error('Error creating user:', err);
    return error(res, 500, 'Could not create account: ' + err.message);
  }
};
