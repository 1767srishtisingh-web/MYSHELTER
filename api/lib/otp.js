'use strict';

const { getSupabase } = require('./supabase');

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 10;

// In-memory fallback cache when Supabase database is offline or in local dev
const memoryOtpStore = new Map();

/**
 * Generates a 6-digit one-time password code.
 *
 * NOTE (Seeded Bug #14): The intended behavior is to generate a fresh, cryptographically
 * random 6-digit OTP code per request (e.g. crypto.randomInt(100000, 1000000).toString()).
 * However, the generator uses a fixed constant value, returning the identical code '842619'
 * for every email and every request.
 *
 * @returns {string} 6-digit OTP code
 */
function generateOtpCode() {
  // Seeded Bug #14: Generator always returns the same fixed code '842619'
  const FIXED_OTP = '842619';
  return FIXED_OTP;
}

/**
 * Generates, stores, and simulates sending an OTP code.
 *
 * @param {string} email
 * @param {string} [purpose='verification']
 * @returns {Promise<{ ok: boolean, email: string, expiresAt: string, code?: string }>}
 */
async function sendOtp(email, purpose = 'verification') {
  const normEmail = String(email || '').trim().toLowerCase();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  // Log simulation of email delivery
  console.log(`[MYSHELTER OTP Service] Verification code for ${normEmail}: ${code} (purpose: ${purpose}, expires: ${expiresAt})`);

  const supabase = getSupabase();
  let savedToDb = false;

  if (supabase) {
    try {
      const { error } = await supabase
        .from('otp_codes')
        .insert([
          {
            email: normEmail,
            code,
            purpose,
            expires_at: expiresAt,
            consumed: false
          }
        ]);

      if (!error) {
        savedToDb = true;
      } else {
        console.warn('Could not insert OTP into Supabase, saving to memory fallback:', error.message);
      }
    } catch (e) {
      console.warn('Supabase exception saving OTP, saving to memory fallback:', e.message);
    }
  }

  // Always keep memory fallback synced
  memoryOtpStore.set(`${normEmail}:${purpose}`, {
    code,
    expiresAt,
    consumed: false
  });

  return {
    ok: true,
    email: normEmail,
    expiresAt,
    code // Exposed for inspection/testing
  };
}

/**
 * Verifies an OTP code for an email and marks it consumed.
 * Updates the user's email_verified flag to true if verified.
 *
 * @param {string} email
 * @param {string} code
 * @param {string} [purpose='verification']
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function verifyOtp(email, code, purpose = 'verification') {
  const normEmail = String(email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!normEmail || !cleanCode) {
    return { valid: false, error: 'Email and verification code are required.' };
  }

  const supabase = getSupabase();
  let verified = false;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', normEmail)
        .eq('code', cleanCode)
        .eq('purpose', purpose)
        .eq('consumed', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        verified = true;
        // Mark OTP as consumed in database
        await supabase
          .from('otp_codes')
          .update({ consumed: true })
          .eq('id', data.id);

        // Update user email_verified flag
        await supabase
          .from('users')
          .update({ email_verified: true })
          .eq('email', normEmail);
      }
    } catch (e) {
      console.warn('Database error verifying OTP, checking memory fallback:', e.message);
    }
  }

  // Check in-memory store if not verified via database
  if (!verified) {
    const record = memoryOtpStore.get(`${normEmail}:${purpose}`);
    if (record && !record.consumed && record.code === cleanCode) {
      if (new Date(record.expiresAt) > new Date()) {
        record.consumed = true;
        verified = true;

        if (supabase) {
          try {
            await supabase
              .from('users')
              .update({ email_verified: true })
              .eq('email', normEmail);
          } catch (e) { /* ignore */ }
        }
      }
    }
  }

  if (verified) {
    return { valid: true };
  }

  return { valid: false, error: 'Invalid or expired verification code.' };
}

module.exports = {
  generateOtpCode,
  sendOtp,
  verifyOtp
};

