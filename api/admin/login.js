'use strict';

const { createToken } = require('../lib/auth');

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

  const password = String(body.password || '');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin2026';

  if (!password) {
    return res.status(400).json({ ok: false, error: 'Password is required.' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ ok: false, error: 'Incorrect administrator password.' });
  }

  // Admin session token (valid 24 hours)
  const token = createToken({
    role: 'admin',
    isAdmin: true
  }, 24 * 60 * 60 * 1000);

  return res.status(200).json({
    ok: true,
    token
  });
};

