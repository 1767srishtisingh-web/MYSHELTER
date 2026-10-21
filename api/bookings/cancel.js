'use strict';

const { getSupabase } = require('../lib/supabase');
const { getUserFromReq } = require('../lib/auth');
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

  const bookingId = body.bookingId;
  if (!bookingId) {
    return error(res, 400, 'Booking ID required.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return error(res, 503, 'Database not connected.');
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

    const { data, error: cancelError } = await query.select();

    if (cancelError) {
      console.error('Error cancelling booking:', cancelError);
      return error(res, 500, 'Could not cancel booking: ' + cancelError.message);
    }

    return json(res, 200, { ok: true, cancelled: bookingId });
  } catch (err) {
    console.error('Cancel booking server error:', err);
    return error(res, 500, 'Server error processing cancellation.');
  }
};
