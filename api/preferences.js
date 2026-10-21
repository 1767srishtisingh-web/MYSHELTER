'use strict';

const { getSupabase } = require('./lib/supabase');
const { getUserFromReq } = require('./lib/auth');
const { validatePreferences } = require('./lib/validate');
const { json, error } = require('./lib/respond');

module.exports = async function handler(req, res) {
  const user = getUserFromReq(req);
  if (!user || !user.userId) {
    return error(res, 401, 'Authentication required.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return error(res, 503, 'Database not connected.');
  }

  if (req.method === 'GET') {
    try {
      const { data, error: queryError } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.userId)
        .maybeSingle();

      if (queryError) {
        return error(res, 500, queryError.message);
      }

      return json(res, 200, { ok: true, preferences: data || null });
    } catch (err) {
      return error(res, 500, err.message);
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // Validate preferences payload
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
      // Upsert preferences for this user_id
      const { data, error: upsertError } = await supabase
        .from('preferences')
        .upsert(prefRecord, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Error saving preferences:', upsertError);
        return error(res, 500, upsertError.message);
      }

      return json(res, 200, { ok: true, preferences: data });
    } catch (err) {
      console.error('Preferences server error:', err);
      return error(res, 500, err.message);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return error(res, 405, 'Method not allowed');
};
