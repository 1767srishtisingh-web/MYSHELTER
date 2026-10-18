'use strict';

const { getSupabase } = require('./lib/supabase');
const { getUserFromReq } = require('./lib/auth');

module.exports = async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const user = getUserFromReq(req);
    if (!user || !user.userId) {
      return res.status(401).json({ ok: false, error: 'Sign in to view cloud bookings.' });
    }

    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return res.status(500).json({ ok: false, error: 'Failed to load bookings: ' + error.message });
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

      return res.status(200).json({ ok: true, bookings: mapped });
    } catch (err) {
      console.error('Bookings GET server error:', err);
      return res.status(500).json({ ok: false, error: 'Server error retrieving bookings.' });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const user = getUserFromReq(req);
    const userId = user ? user.userId : null;

    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: 'Database not connected. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.'
      });
    }

    try {
      const bookingRecord = {
        booking_id: String(body.bookingId || ('MS-' + Math.random().toString(36).substring(2, 8).toUpperCase())),
        user_id: userId,
        room_id: body.roomId || null,
        hotel: String(body.roomTitle || body.hotel || 'Hotel Stay'),
        room_type: String(body.type || 'Standard'),
        city: String(body.city || 'Delhi'),
        area: String(body.locality || body.area || ''),
        check_in: body.checkIn,
        nights: Number(body.nights) || 1,
        guest_name: String(body.name || body.guestName || 'Guest'),
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

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingRecord])
        .select()
        .single();

      if (error) {
        console.error('Error inserting booking:', error);
        return res.status(500).json({ ok: false, error: 'Could not record booking: ' + error.message });
      }

      return res.status(201).json({ ok: true, booking: data });
    } catch (err) {
      console.error('Bookings POST server error:', err);
      return res.status(500).json({ ok: false, error: 'Server error saving booking.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
