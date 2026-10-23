'use strict';

const { getDb } = require('./_lib/mongodb');
const { getUserFromReq } = require('./_lib/auth');
const { isValidPhone, normalizePhone, validateBooking } = require('./_lib/validate');
const { json, error } = require('./_lib/respond');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const user = getUserFromReq(req);
    if (!user || !user.userId) {
      return error(res, 401, 'Sign in to view cloud bookings.');
    }

    try {
      const { db } = await getDb();
      const bookingsCol = db.collection('bookings');

      const bookings = await bookingsCol
        .find({ user_id: user.userId })
        .sort({ created_at: -1 })
        .toArray();

      const mapped = (bookings || []).map((b) => ({
        bookingId: b.booking_id,
        roomId: b.room_id,
        roomTitle: b.hotel,
        hotel: b.hotel,
        type: b.room_type,
        city: b.city,
        locality: b.area,
        checkIn: b.check_in,
        nights: b.nights,
        guestName: b.guest_name,
        name: b.guest_name,
        guestPhone: b.guest_phone,
        phone: b.guest_phone,
        tariff: b.tariff,
        taxes: b.taxes,
        discount: b.discount,
        total: b.total,
        coupon: b.coupon,
        status: b.status || 'confirmed',
        image: b.image,
        createdAt: b.created_at
      }));

      return json(res, 200, { ok: true, bookings: mapped });
    } catch (err) {
      console.error('Bookings GET server error:', err);
      return error(res, 500, 'Server error retrieving bookings.');
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    validateBooking(body);

    const rawPhone = String(body.guestPhone || body.phone || '').trim();
    const guestPhone = normalizePhone(rawPhone);
    if (!isValidPhone(guestPhone)) {
      return error(res, 400, 'Please provide a valid 10-digit Indian mobile number.', {
        errors: { phone: 'Please provide a valid 10-digit Indian mobile number.' }
      });
    }

    const user = getUserFromReq(req);
    const userId = user ? user.userId : null;

    try {
      const { db } = await getDb();
      const bookingsCol = db.collection('bookings');

      const nightsVal = body.nights !== undefined ? Number(body.nights) : 1;
      const guestNameVal = body.guestName !== undefined ? String(body.guestName) : (body.name !== undefined ? String(body.name) : '');

      const bookingRecord = {
        booking_id: String(body.bookingId || ('MS-' + Math.random().toString(36).substring(2, 8).toUpperCase())),
        user_id: userId,
        room_id: body.roomId !== undefined ? String(body.roomId) : null,
        hotel: String(body.roomTitle || body.hotel || 'Hotel Stay'),
        room_type: String(body.type || 'Standard'),
        city: String(body.city || 'Delhi'),
        area: String(body.locality || body.area || ''),
        check_in: body.checkIn,
        nights: isNaN(nightsVal) ? 1 : nightsVal,
        guest_name: guestNameVal,
        guest_phone: guestPhone,
        tariff: typeof body.tariff === 'number' ? body.tariff : (Number(body.tariff) || null),
        taxes: String(body.taxes || ''),
        discount: Number(body.discount) || 0,
        total: Number(body.total) || 0,
        coupon: body.coupon || null,
        status: body.status || 'confirmed',
        image: body.image || null,
        created_at: body.createdAt || new Date().toISOString()
      };

      const result = await bookingsCol.insertOne(bookingRecord);
      bookingRecord._id = result.insertedId || bookingRecord._id;

      return json(res, 201, { ok: true, booking: bookingRecord });
    } catch (err) {
      console.error('Bookings POST server error:', err);
      return error(res, 500, 'Server error saving booking: ' + err.message);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return error(res, 405, 'Method not allowed');
};
