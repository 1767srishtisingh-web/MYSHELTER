'use strict';

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

  const password = String(body.password || '');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin2026';

  if (!password) {
    return error(res, 400, 'Password is required.');
  }

  if (password !== adminPassword) {
    return error(res, 401, 'Incorrect administrator password.');
  }

  // Admin session token (valid 24 hours)
  const token = createToken({
    role: 'admin',
    isAdmin: true
  }, 24 * 60 * 60 * 1000);

  return json(res, 200, {
    ok: true,
    token
  });
};
