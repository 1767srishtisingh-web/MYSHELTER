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
    const usersCol = db.collection('users');

    let user = null;
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

    const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

    if (!user) {
      if (REQUIRE_EMAIL_VERIFICATION) {
        return error(res, 403, 'Email not verified.', { code: 'EMAIL_NOT_VERIFIED' });
      }
      return json(res, 200, {
        ok: true,
        user: {
          id: tokenUser.userId,
          name: tokenUser.name,
          email: tokenUser.email,
          phone: '',
          emailVerified: false
        }
      });
    }

    const isVerified = Boolean(user.email_verified);
    if (REQUIRE_EMAIL_VERIFICATION && !isVerified) {
      return error(res, 403, 'Email not verified.', { code: 'EMAIL_NOT_VERIFIED' });
    }

    const userId = (user._id ? user._id.toString() : user.id) || tokenUser.userId;

    return json(res, 200, {
      ok: true,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        emailVerified: isVerified,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return error(res, 500, 'Server error retrieving user profile.');
  }
};
