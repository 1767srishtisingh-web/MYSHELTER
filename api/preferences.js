'use strict';

const { getDb } = require('./_lib/mongodb');
const { getUserFromReq } = require('./_lib/auth');
const { validatePreferences } = require('./_lib/validate');
const { json, error } = require('./_lib/respond');

module.exports = async function handler(req, res) {
  const user = getUserFromReq(req);
  if (!user || !user.userId) {
    return error(res, 401, 'Authentication required.');
  }

  if (req.method === 'GET') {
    try {
      const { db } = await getDb();
      const prefCol = db.collection('preferences');

      const data = await prefCol.findOne({ user_id: user.userId });
      return json(res, 200, { ok: true, preferences: data || null });
    } catch (err) {
      console.error('Preferences GET server error:', err);
      return error(res, 500, err.message);
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const validation = validatePreferences(body);
    if (!validation.valid) {
      return error(res, 400, 'Invalid preferences data', { errors: validation.errors });
    }

    const prefRecord = {
      user_id: user.userId,
      preferred_city: body.preferred_city || body.city || null,
      preferred_type: body.preferred_type || body.type || null,
      query: body.query || null,
      free_cancellation: Boolean(body.free_cancellation || body.freeCancellation),
      breakfast: Boolean(body.breakfast || (Array.isArray(body.amenities) && body.amenities.includes('breakfast'))),
      pool: Boolean(body.pool || (Array.isArray(body.amenities) && body.amenities.includes('pool'))),
      parking: Boolean(body.parking || (Array.isArray(body.amenities) && body.amenities.includes('parking'))),
      sort: body.sort || null,
      updated_at: new Date().toISOString()
    };

    try {
      const { db } = await getDb();
      const prefCol = db.collection('preferences');

      await prefCol.updateOne(
        { user_id: user.userId },
        { $set: prefRecord },
        { upsert: true }
      );

      return json(res, 200, { ok: true, preferences: prefRecord });
    } catch (err) {
      console.error('Preferences server error:', err);
      return error(res, 500, err.message);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return error(res, 405, 'Method not allowed');
};
