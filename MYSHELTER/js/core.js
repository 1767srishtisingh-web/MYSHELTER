/*
 * MYSHELTER — core logic (pure functions, no DOM).
 * Shared by the browser pages and the Node unit tests.
 * Each function notes the report bug it guards against.
 */
(function (root) {
  'use strict';

  /* ---------- numbers & money (Bug 4) ---------- */

  // Converts "10,000", "₹ 5000", 5000 → a real Number. Never concatenates strings.
  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;
    var cleaned = value.replace(/[^0-9.\-]/g, '');
    var n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  var inrFormatter = (typeof Intl !== 'undefined')
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
    : null;

  function formatINR(value) {
    var n = Math.round(toNumber(value));
    var body = inrFormatter ? inrFormatter.format(Math.abs(n)) : String(Math.abs(n));
    return (n < 0 ? '−' : '') + '₹' + body;
  }

  // Total = Rent + Security Deposit − Discount (report §2). Discount can never
  // push the total below zero.
  function calculateBill(input) {
    var rent = toNumber(input && input.rent);
    var deposit = toNumber(input && input.deposit);
    var subtotal = rent + deposit;
    var discount = Math.min(Math.max(toNumber(input && input.discount), 0), subtotal);
    return { rent: rent, deposit: deposit, subtotal: subtotal, discount: discount, total: subtotal - discount };
  }

  /* ---------- coupons (Bug 7) ---------- */

  // Pure state transition. A coupon already applied cannot be applied again,
  // so clicking "Apply" five times still gives a single discount.
  function applyCoupon(state, rawCode, coupons) {
    var current = state && state.coupon ? state.coupon : null;
    var code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { ok: false, state: { coupon: current }, message: 'Enter a coupon code.' };
    if (current) {
      return {
        ok: false,
        state: { coupon: current },
        message: current.code === code ? 'This coupon is already applied.' : 'Only one coupon can be used per booking.'
      };
    }
    var found = coupons && Object.prototype.hasOwnProperty.call(coupons, code) ? coupons[code] : null;
    if (!found) return { ok: false, state: { coupon: null }, message: 'That coupon code isn’t valid.' };
    return { ok: true, state: { coupon: found }, message: found.label + ' applied.' };
  }

  function removeCoupon() {
    return { coupon: null };
  }

  /* ---------- filtering (Bugs 2 & 6) ---------- */

  var GENDERS = ['any', 'Girls', 'Boys'];

  function normalizeText(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
  }

  function matchesQuery(room, query) {
    var tokens = normalizeText(query).split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) return true;
    var haystack = normalizeText([room.title, room.city, room.locality, room.type, room.category].join(' '));
    return tokens.every(function (t) { return haystack.indexOf(t) !== -1; });
  }

  // Every active condition must hold (AND), so "1 BHK" never lets a 2 BHK through,
  // and "Girls" shows only rooms whose gender is exactly Girls (no stray NOT).
  function filterRooms(rooms, filters) {
    var f = filters || {};
    var type = f.type && f.type !== 'all' ? f.type : null;
    var gender = f.gender && f.gender !== 'any' ? f.gender : null;
    var amenities = Array.isArray(f.amenities) ? f.amenities : [];
    return (rooms || []).filter(function (room) {
      return (!type || room.type === type) &&
        (!gender || room.gender === gender) &&
        amenities.every(function (a) { return room.amenities.indexOf(a) !== -1; }) &&
        matchesQuery(room, f.query);
    });
  }

  /* ---------- sorting (Bug 5) ---------- */

  var SORTS = ['recommended', 'rent-asc', 'rent-desc', 'rating'];

  // Returns a new array; never mutates the source list.
  function sortRooms(rooms, sort) {
    var list = (rooms || []).slice();
    switch (sort) {
      case 'rent-asc':
        return list.sort(function (a, b) { return toNumber(a.rent) - toNumber(b.rent); });
      case 'rent-desc':
        return list.sort(function (a, b) { return toNumber(b.rent) - toNumber(a.rent); });
      case 'rating':
        return list.sort(function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; });
      default:
        return list.sort(function (a, b) {
          return (b.rating * Math.log10(b.reviews + 10)) - (a.rating * Math.log10(a.reviews + 10));
        });
    }
  }

  /* ---------- lookups (Bug 3) ---------- */

  // Rooms are always looked up by their stable id, never by list position.
  function findRoom(rooms, id) {
    if (!id) return null;
    for (var i = 0; i < (rooms || []).length; i++) {
      if (rooms[i].id === id) return rooms[i];
    }
    return null;
  }

  /* ---------- dates (Bug 8) ---------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Uses the *local* calendar date (toISOString would give yesterday in IST
  // between 00:00 and 05:30).
  function toISODate(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function todayISO(now) {
    return toISODate(now || new Date());
  }

  function addDaysISO(iso, days) {
    var parts = iso.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  var MAX_ADVANCE_DAYS = 180;

  function isValidISODate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }

  /* ---------- validation (Bug 9) ---------- */

  function normalizePhone(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
    if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
    return digits;
  }

  // Returns { valid, errors, values }. Checked on submit in addition to the
  // HTML `required`/`min` attributes, because those alone can be bypassed.
  function validateBooking(input, now) {
    var errors = {};
    var name = String((input && input.name) || '').replace(/\s+/g, ' ').trim();
    var phone = normalizePhone(input && input.phone);
    var checkIn = String((input && input.checkIn) || '').trim();
    var today = todayISO(now);
    var latest = addDaysISO(today, MAX_ADVANCE_DAYS);

    if (name === '') errors.name = 'Please enter your full name.';
    else if (name.length < 2) errors.name = 'Name must be at least 2 characters.';
    else if (name.length > 60) errors.name = 'Name must be 60 characters or fewer.';
    else if (!/^[\p{L}][\p{L} .'-]*$/u.test(name)) errors.name = 'Use letters, spaces, apostrophes or hyphens only.';

    if (String((input && input.phone) || '').trim() === '') errors.phone = 'Please enter your phone number.';
    else if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';

    if (checkIn === '') errors.checkIn = 'Please choose a check-in date.';
    else if (!isValidISODate(checkIn)) errors.checkIn = 'Please choose a valid date.';
    else if (checkIn < today) errors.checkIn = 'Check-in can’t be in the past.';
    else if (checkIn > latest) errors.checkIn = 'Bookings open up to ' + MAX_ADVANCE_DAYS + ' days ahead.';

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      values: { name: name, phone: phone, checkIn: checkIn }
    };
  }

  /* ---------- carousel (Bug 10) ---------- */

  // Wrap-around index for one card's own slider.
  function stepIndex(index, length, delta) {
    if (!length) return 0;
    return ((index + delta) % length + length) % length;
  }

  /* ---------- filters <-> URL ---------- */

  function readFilters(search) {
    var params = new URLSearchParams(search || '');
    var type = params.get('type') || 'all';
    var gender = params.get('gender') || 'any';
    var sort = params.get('sort') || 'recommended';
    var amenities = (params.get('amenities') || '').split(',').filter(function (a) {
      return a === 'wifi' || a === 'ac' || a === 'food';
    });
    return {
      query: (params.get('q') || '').slice(0, 80),
      type: ['all', '1 BHK', '2 BHK', 'Single Room', 'Shared Room'].indexOf(type) !== -1 ? type : 'all',
      gender: GENDERS.indexOf(gender) !== -1 ? gender : 'any',
      amenities: amenities,
      sort: SORTS.indexOf(sort) !== -1 ? sort : 'recommended'
    };
  }

  function writeFilters(f) {
    var params = new URLSearchParams();
    if (f.query) params.set('q', f.query);
    if (f.type && f.type !== 'all') params.set('type', f.type);
    if (f.gender && f.gender !== 'any') params.set('gender', f.gender);
    if (f.amenities && f.amenities.length) params.set('amenities', f.amenities.join(','));
    if (f.sort && f.sort !== 'recommended') params.set('sort', f.sort);
    var s = params.toString();
    return s ? '?' + s : '';
  }

  /* ---------- misc ---------- */

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function createBookingId(rand) {
    var r = rand || Math.random;
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = 'MS-';
    for (var i = 0; i < 6; i++) out += chars.charAt(Math.floor(r() * chars.length));
    return out;
  }

  function formatDate(iso) {
    if (!isValidISODate(iso)) return iso || '';
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  var api = {
    toNumber: toNumber,
    formatINR: formatINR,
    calculateBill: calculateBill,
    applyCoupon: applyCoupon,
    removeCoupon: removeCoupon,
    filterRooms: filterRooms,
    sortRooms: sortRooms,
    findRoom: findRoom,
    todayISO: todayISO,
    addDaysISO: addDaysISO,
    isValidISODate: isValidISODate,
    MAX_ADVANCE_DAYS: MAX_ADVANCE_DAYS,
    normalizePhone: normalizePhone,
    validateBooking: validateBooking,
    stepIndex: stepIndex,
    readFilters: readFilters,
    writeFilters: writeFilters,
    escapeHTML: escapeHTML,
    createBookingId: createBookingId,
    formatDate: formatDate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MyShelterCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
