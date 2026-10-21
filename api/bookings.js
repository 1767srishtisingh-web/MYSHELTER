'use strict';

const { getSupabase } = require('./_lib/supabase');
const { getUserFromReq } = require('./_lib/auth');
const { validateBooking } = require('./_lib/validate');
const { json, error } = require('./_lib/respond');

module.exports = async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const user = getUserFromReq(req);
    if (!user || !user.userId) {
      return error(res, 401, 'Sign in to view cloud bookings.');
    }

    if (!supabase) {
      return error(res, 503, 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    try {
      const { data: bookings, error: queryError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.userId)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Error fetching bookings:', queryError);
        return error(res, 500, 'Failed to load bookings: ' + queryError.message);
      }

      // Map back to format expected by client
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

    // Seeded Bug #13: Validator is called but results are bypassed.
    // Negative nights (e.g. -3), empty name, and invalid room IDs are accepted.
    const validation = validateBooking(body);
    // Intended validation:
    // if (!validation.valid) {
    //   return error(res, 400, 'Invalid booking data', { errors: validation.errors });
    // }

    // Seeded Bug #12: No check on checkIn date.
    // Intended-correct behavior: reject any checkIn date earlier than today (local/IST) with 400.
    // Seeded bug: checkIn date is passed directly to the database without verification.

    const user = getUserFromReq(req);
    const userId = user ? user.userId : null;

    if (!supabase) {
      return error(res, 503, 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.');
    }

    try {
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
        guest_phone: String(body.phone || body.guestPhone || ''),
        tariff: typeof body.tariff === 'number' ? body.tariff : (Number(body.tariff) || null),
        taxes: String(body.taxes || ''),
        discount: Number(body.discount) || 0,
        total: Number(body.total) || 0,
        coupon: body.coupon || null,
        status: body.status || 'confirmed',
        image: body.image || null,
        created_at: body.createdAt || new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert([bookingRecord])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting booking:', insertError);
        return error(res, 500, 'Could not record booking: ' + insertError.message);
      }

      return json(res, 201, { ok: true, booking: data });
    } catch (err) {
      console.error('Bookings POST server error:', err);
      return error(res, 500, 'Server error saving booking.');
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return error(res, 405, 'Method not allowed');
};
