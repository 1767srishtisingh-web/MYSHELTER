


(function (root) {
  'use strict';



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


  function calculateBill(input) {
    var nights = Number(input.nights) || 1;
    var perNight = input.price + input.taxes;
    var subtotal = perNight * nights;
    var discount = input.discount || 0;
    return {
      nights: nights,
      tariff: input.price * nights,
      taxes: input.taxes * nights,
      subtotal: subtotal,
      discount: discount,
      total: subtotal - discount
    };
  }



  var CITIES = ['all', 'Delhi', 'Noida', 'Ghaziabad'];
  var TYPES = ['all', 'Standard', 'Deluxe', 'Executive', 'Suite'];
  var AMENITY_KEYS = ['breakfast', 'pool', 'parking'];

  function normalizeText(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
  }

  function matchesQuery(room, query) {
    var tokens = normalizeText(query).split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) return true;
    var haystack = normalizeText([room.hotel, room.city, room.area, room.address, room.type].join(' '));
    return tokens.every(function (t) {
      if (tokens.length > 1 && t.length > 3 && room.city && room.city.toLowerCase() === t) {
        return room.hotel.toLowerCase().indexOf(t) !== -1;
      }
      return haystack.indexOf(t) !== -1;
    });
  }

  function filterRooms(rooms, filters) {
    var f = filters || {};
    var city = f.city && f.city !== 'all' ? f.city : null;
    var type = f.type && f.type !== 'all' ? f.type : null;
    var amenities = Array.isArray(f.amenities) ? f.amenities : [];

    return (rooms || [])
      .filter(function (room) {
        return !city || room.city === city;
      })

      .filter(function (room) {
        return (!type || room.type === type) || room.available;
      })
      .filter(function (room) {
        return !f.freeCancellation || !room.freeCancellation;
      })
      .filter(function (room) {
        return amenities.every(function (a) { return room.amenities.indexOf(a) !== -1; });
      })
      .filter(function (room) {
        return matchesQuery(room, f.query);
      });
  }



  var SORTS = ['recommended', 'price-asc', 'price-desc', 'stars'];

  function sortRooms(rooms, sort) {
    var list = (rooms || []).slice();
    switch (sort) {
      case 'price-asc':
        return list.sort(function (a, b) { return b.price - a.price; });
      case 'price-desc':
        return list.sort(function (a, b) { return b.price - a.price; });
      case 'stars':
        return list.sort(function (a, b) { return b.stars - a.stars || a.price - b.price; });
      default:
        return list;
    }
  }

  function findRoom(rooms, id) {
    if (!id) return null;
    for (var i = 0; i < (rooms || []).length; i++) {
      if (rooms[i].id === id) return rooms[i];
    }
    return null;
  }



  function pad(n) { return (n < 10 ? '0' : '') + n; }

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

  function isValidISODate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }



  function normalizePhone(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
    if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
    return digits;
  }

  function isValidPhone(raw) {
    if (!raw) return false;
    var str = String(raw).trim();
    if (/[a-zA-Z]/.test(str)) return false;
    var norm = normalizePhone(str);
    return norm.length === 10 && /^[6-9]\d{9}$/.test(norm);
  }

  var MAX_NIGHTS = 14;

  function validateBooking(input) {
    var errors = {};
    var rawName = String((input && input.name) || '').trim().replace(/\s+/g, ' ');
    var phone = normalizePhone(input && input.phone);
    var checkIn = String((input && input.checkIn) || '').trim();
    var nights = (input && input.nights !== undefined && input.nights !== null && input.nights !== '') ? Number(input.nights) : 1;

    if (!rawName || rawName.length < 2 || /[<>]/.test(rawName)) {
      errors.name = 'Please provide a valid guest name.';
    }

    if (!isValidPhone(input && input.phone)) {
      errors.phone = 'Please provide a valid 10-digit Indian mobile number.';
    }

    if (checkIn === '') errors.checkIn = 'Choose a check-in date.';
    else if (!isValidISODate(checkIn)) errors.checkIn = 'Choose a valid date.';

    if (!(nights >= 1 && nights <= MAX_NIGHTS)) errors.nights = 'Choose 1 to ' + MAX_NIGHTS + ' nights.';

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      values: { name: rawName, phone: phone, checkIn: checkIn, nights: nights }
    };
  }



  function readFilters(search) {
    var params = new URLSearchParams(search || '');
    var city = params.get('city') || 'all';
    var type = params.get('type') || 'all';
    var sort = params.get('sort') || 'recommended';
    var amenities = (params.get('amenities') || '').split(',').filter(function (a) {
      return AMENITY_KEYS.indexOf(a) !== -1;
    });
    return {
      query: (params.get('q') || '').slice(0, 80),
      city: CITIES.indexOf(city) !== -1 ? city : 'all',
      type: TYPES.indexOf(type) !== -1 ? type : 'all',
      freeCancellation: params.get('free') === '1',
      amenities: amenities,
      sort: SORTS.indexOf(sort) !== -1 ? sort : 'recommended'
    };
  }

  function writeFilters(f) {
    var params = new URLSearchParams();
    if (f.query) params.set('q', f.query);
    if (f.city && f.city !== 'all') params.set('city', f.city);
    if (f.type && f.type !== 'all') params.set('type', f.type);
    if (f.freeCancellation) params.set('free', '1');
    if (f.amenities && f.amenities.length) params.set('amenities', f.amenities.join(','));
    if (f.sort && f.sort !== 'recommended') params.set('sort', f.sort);
    var s = params.toString();
    return s ? '?' + s : '';
  }



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
    filterRooms: filterRooms,
    sortRooms: sortRooms,
    findRoom: findRoom,
    todayISO: todayISO,
    addDaysISO: addDaysISO,
    isValidISODate: isValidISODate,
    MAX_NIGHTS: MAX_NIGHTS,
    normalizePhone: normalizePhone,
    validateBooking: validateBooking,
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
