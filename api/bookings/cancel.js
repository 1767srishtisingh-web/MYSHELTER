'use strict';

const { getDb } = require('../_lib/mongodb');
const { getUserFromReq } = require('../_lib/auth');
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

  const bookingId = body.bookingId;
  if (!bookingId) {
    return error(res, 400, 'Booking ID required.');
  }

  try {
    const { db } = await getDb();
    const bookingsCol = db.collection('bookings');

    const user = getUserFromReq(req);
    const filter = { booking_id: bookingId };
    if (user && user.userId) {
      filter.$or = [{ user_id: user.userId }, { user_id: null }];
    }

    const updateRes = await bookingsCol.updateOne(filter, { $set: { status: 'cancelled' } });
    if (updateRes.matchedCount === 0) {
      await bookingsCol.updateOne({ booking_id: bookingId }, { $set: { status: 'cancelled' } });
    }

    return json(res, 200, { ok: true, cancelled: bookingId });
  } catch (err) {
    console.error('Cancel booking server error:', err);
    return error(res, 500, 'Server error processing cancellation: ' + err.message);
  }
};
