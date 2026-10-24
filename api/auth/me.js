'use strict';

const { getDb, ObjectId } = require('../_lib/mongodb');
const { getUserFromReq } = require('../_lib/auth');
const { json, error } = require('../_lib/respond');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return error(res, 405, 'Method not allowed');
  }

  const tokenUser = getUserFromReq(req);
  if (!tokenUser || !tokenUser.userId) {
    return error(res, 401, 'Not authenticated or session expired.');
  }

  try {
    const { db } = await getDb();
    let user = null;

    if (db) {
      const usersCol = db.collection('users');
      try {
        user = await usersCol.findOne({ _id: new ObjectId(tokenUser.userId) });
      } catch (e) {
        user = null;
      }

      if (!user) {
        user = await usersCol.findOne({
          $or: [
            { _id: tokenUser.userId },
            { id: tokenUser.userId },
            { email: tokenUser.email }
          ]
        });
      }
    }

    const userId = (user && (user._id ? user._id.toString() : user.id)) || tokenUser.userId;
    const name = (user && user.name) || tokenUser.name || 'User';
    const email = (user && user.email) || tokenUser.email || '';
    const phone = (user && user.phone) || '';
    const isVerified = user ? Boolean(user.email_verified) : true;

    return json(res, 200, {
      ok: true,
      user: {
        id: userId,
        name,
        email,
        phone,
        emailVerified: isVerified,
        createdAt: (user && user.created_at) || new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return json(res, 200, {
      ok: true,
      user: {
        id: tokenUser.userId,
        name: tokenUser.name || 'User',
        email: tokenUser.email,
        phone: '',
        emailVerified: true
      }
    });
  }
};
