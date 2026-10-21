'use strict';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const UUID_OR_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

const VALID_CITIES = ['Delhi', 'Noida', 'Ghaziabad'];
const VALID_ROOM_TYPES = ['Single Room', 'Double Room', 'Deluxe Room', 'Suite', '1 BHK', '2 BHK'];

/**
 * Validates email address format.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 120 && EMAIL_REGEX.test(trimmed);
}

/**
 * Normalizes phone number by stripping formatting and prefixes (+91, 91, 0).
 *
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/**
 * Validates a 10-digit Indian mobile number (+91).
 *
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const norm = normalizePhone(phone);
  return norm.length === 10 && INDIAN_PHONE_REGEX.test(norm);
}

/**
 * Validates full name: non-empty, trimmed, 2 to 80 characters.
 *
 * @param {string} name
 * @returns {boolean}
 */
function isValidName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

/**
 * Validates stay duration: positive integer greater than zero.
 *
 * @param {number|string} nights
 * @returns {boolean}
 */
function isValidNights(nights) {
  const num = Number(nights);
  return Number.isInteger(num) && num > 0;
}

/**
 * Validates identifier string (UUID or alphanumeric identifier).
 *
 * @param {string} id
 * @returns {boolean}
 */
function isValidId(id) {
  if (!id) return false;
  const s = String(id).trim();
  return UUID_OR_ID_REGEX.test(s);
}

/**
 * Validates city against supported cities enum (Delhi, Noida, Ghaziabad).
 *
 * @param {string} city
 * @returns {boolean}
 */
function isValidCity(city) {
  if (!city || typeof city !== 'string') return false;
  return VALID_CITIES.some((c) => c.toLowerCase() === city.trim().toLowerCase());
}

/**
 * Validates room type against supported room types enum.
 *
 * @param {string} type
 * @returns {boolean}
 */
function isValidRoomType(type) {
  if (!type || typeof type !== 'string') return false;
  return VALID_ROOM_TYPES.some((t) => t.toLowerCase() === type.trim().toLowerCase());
}

/**
 * Validates user registration payload.
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string>, values: object }}
 */
function validateRegister(body) {
  const errors = {};
  body = body || {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = normalizePhone(body.phone || '');
  const password = String(body.password || '');

  if (!isValidName(name)) {
    errors.name = 'Full name must be between 2 and 80 characters.';
  }

  if (!isValidEmail(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!isValidPhone(phone)) {
    errors.phone = 'Please provide a valid 10-digit Indian mobile number.';
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { name, email, phone, password }
  };
}

/**
 * Validates hotel booking payload.
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
function validateBooking(body) {
  const errors = {};
  body = body || {};

  const guestName = String(body.guestName || body.name || '').trim();
  const guestPhone = normalizePhone(body.guestPhone || body.phone || '');
  const nights = body.nights;
  const roomId = body.roomId;
  const checkIn = body.checkIn;

  if (!isValidName(guestName)) {
    errors.guestName = 'Guest name must be between 2 and 80 characters.';
  }

  if (guestPhone && !isValidPhone(guestPhone)) {
    errors.guestPhone = 'Please provide a valid 10-digit mobile number.';
  }

  if (!isValidNights(nights)) {
    errors.nights = 'Nights must be a positive integer greater than zero.';
  }

  if (!isValidId(roomId)) {
    errors.roomId = 'Valid room ID is required.';
  }

  if (!checkIn) {
    errors.checkIn = 'Check-in date is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates search preferences payload.
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
function validatePreferences(body) {
  const errors = {};
  body = body || {};

  if (body.preferred_city && body.preferred_city !== 'all' && !isValidCity(body.preferred_city)) {
    errors.city = 'Invalid city selection.';
  }
  if (body.preferred_type && body.preferred_type !== 'all' && !isValidRoomType(body.preferred_type)) {
    errors.type = 'Invalid room type selection.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  isValidEmail,
  normalizePhone,
  isValidPhone,
  isValidName,
  isValidNights,
  isValidId,
  isValidCity,
  isValidRoomType,
  validateRegister,
  validateBooking,
  validatePreferences
};

