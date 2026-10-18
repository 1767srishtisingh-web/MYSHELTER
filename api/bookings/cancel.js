'use strict';

const { getSupabase } = require('../lib/supabase');
const { getUserFromReq } = require('../lib/auth');

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

  const bookingId = body.bookingId;
  if (!bookingId) {
    return res.status(400).json({ ok: false, error: 'Booking ID required.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Database not connected.' });
  }

  try {
    const user = getUserFromReq(req);
    let query = supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId);

    // If user is logged in and not admin, match user_id
    if (user && user.userId) {
      query = query.eq('user_id', user.userId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('Error cancelling booking:', error);
      return res.status(500).json({ ok: false, error: 'Could not cancel booking: ' + error.message });
    }

    return res.status(200).json({ ok: true, cancelled: bookingId });
  } catch (err) {
    console.error('Cancel booking server error:', err);
    return res.status(500).json({ ok: false, error: 'Server error processing cancellation.' });
  }
};
