'use strict';

const { getDb } = require('../_lib/mongodb');
const { verifyToken } = require('../_lib/auth');
const { json, error } = require('../_lib/respond');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return error(res, 405, 'Method not allowed');
  }

  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ((req.headers && req.headers['x-auth-token']) || null);

  const tokenData = verifyToken(token);
  if (!tokenData || !tokenData.isAdmin) {
    return error(res, 401, 'Unauthorized. Admin credentials required.');
  }

  try {
    const { db } = await getDb();
    const usersCol = db.collection('users');
    const bookingsCol = db.collection('bookings');
    const prefCol = db.collection('preferences');

    const rawUsers = await usersCol.find({}).sort({ created_at: -1 }).toArray();
    const users = (rawUsers || []).map((u) => ({
      id: (u._id ? u._id.toString() : u.id) || '',
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      email_verified: Boolean(u.email_verified),
      created_at: u.created_at
    }));

    const rawBookings = await bookingsCol.find({}).sort({ created_at: -1 }).toArray();
    const bookings = (rawBookings || []).map((b) => ({
      ...b,
      id: (b._id ? b._id.toString() : b.id) || b.booking_id
    }));

    const rawPrefs = await prefCol.find({}).sort({ updated_at: -1 }).toArray();
    const userMap = new Map(users.map((u) => [u.id, u]));
    const preferences = (rawPrefs || []).map((p) => {
      const u = userMap.get(p.user_id) || null;
      return {
        ...p,
        id: (p._id ? p._id.toString() : p.id) || p.user_id,
        users: u ? { name: u.name, email: u.email, phone: u.phone } : null
      };
    });

    return json(res, 200, {
      ok: true,
      users,
      bookings,
      preferences
    });
  } catch (err) {
    console.error('Admin data server error:', err);
    return error(res, 500, 'Server error retrieving admin data: ' + err.message);
  }
};
