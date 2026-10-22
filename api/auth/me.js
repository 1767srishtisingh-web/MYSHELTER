'use strict';

const { getSupabase } = require('../_lib/supabase');
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

  const supabase = getSupabase();
  if (!supabase) {
    // If db temporarily unreachable, return decoded token user info
    return json(res, 200, {
      ok: true,
      user: {
        id: tokenUser.userId,
        name: tokenUser.name,
        email: tokenUser.email,
        emailVerified: false
      }
    });
  }

  try {
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, name, email, phone, email_verified, created_at')
      .eq('id', tokenUser.userId)
      .maybeSingle();

    const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

    // If user record is not found in database (e.g. seeded bug #11 fallback or memory store restart),
    // retain session from decoded JWT payload rather than throwing 401 and destroying the session.
    if (queryError || !user) {
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

    return json(res, 200, {
      ok: true,
      user: {
        id: user.id,
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
