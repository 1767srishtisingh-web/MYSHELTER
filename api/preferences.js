'use strict';

const { getSupabase } = require('./lib/supabase');
const { getUserFromReq } = require('./lib/auth');

module.exports = async function handler(req, res) {
  const user = getUserFromReq(req);
  if (!user || !user.userId) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Database not connected.' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.userId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, preferences: data || null });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

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
      const { data, error } = await supabase
        .from('preferences')
        .upsert(prefRecord, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving preferences:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, preferences: data });
    } catch (err) {
      console.error('Preferences server error:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};

