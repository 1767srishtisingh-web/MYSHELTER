/*
 * MYSHELTER — persistence layer.
 * The selected room and bookings live in localStorage so they survive a page
 * refresh (Bug 1: stateful vs stateless). Every access is wrapped in try/catch:
 * private windows or blocked site data make storage throw, and the app must
 * keep working (and say so) instead of crashing.
 */
(function (root) {
  'use strict';

  var KEYS = {
    selectedRoom: 'myshelter:selectedRoom',
    bookings: 'myshelter:bookings',
    draft: 'myshelter:checkoutDraft'
  };

  function probe(kind) {
    try {
      var s = root[kind];
      var k = '__myshelter_probe__';
      s.setItem(k, '1');
      s.removeItem(k);
      return s;
    } catch (e) {
      return null;
    }
  }

  var local = probe('localStorage');
  var session = probe('sessionStorage');
  var memory = {};

  function get(storage, key) {
    try {
      if (storage) return storage.getItem(key);
    } catch (e) { /* fall through */ }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function set(storage, key, value) {
    try {
      if (storage) { storage.setItem(key, value); return true; }
    } catch (e) { /* quota or blocked */ }
    memory[key] = value;
    return false;
  }

  function remove(storage, key) {
    try { if (storage) storage.removeItem(key); } catch (e) { /* ignore */ }
    delete memory[key];
  }

  function readJSON(storage, key, fallback) {
    var raw = get(storage, key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  var Store = {
    isPersistent: !!local,

    setSelectedRoom: function (id) {
      return set(local, KEYS.selectedRoom, String(id));
    },
    getSelectedRoom: function () {
      var v = get(local, KEYS.selectedRoom);
      return v && /^[a-z0-9-]{1,40}$/i.test(v) ? v : null;
    },
    clearSelectedRoom: function () { remove(local, KEYS.selectedRoom); },

    getBookings: function () {
      var list = readJSON(local, KEYS.bookings, []);
      if (!Array.isArray(list)) return [];
      return list.filter(function (b) {
        return b && typeof b.bookingId === 'string' && typeof b.roomId === 'string';
      });
    },
    saveBookings: function (list) {
      return set(local, KEYS.bookings, JSON.stringify(list));
    },
    addBooking: function (booking) {
      var list = Store.getBookings();
      list.unshift(booking);
      return Store.saveBookings(list);
    },
    updateBooking: function (bookingId, patch) {
      var list = Store.getBookings().map(function (b) {
        if (b.bookingId !== bookingId) return b;
        var copy = {};
        Object.keys(b).forEach(function (k) { copy[k] = b[k]; });
        Object.keys(patch).forEach(function (k) { copy[k] = patch[k]; });
        return copy;
      });
      return Store.saveBookings(list);
    },
    activeBookingCount: function () {
      return Store.getBookings().filter(function (b) { return b.status !== 'cancelled'; }).length;
    },

    // Draft form fields survive a refresh within the same tab.
    getDraft: function (roomId) {
      var d = readJSON(session, KEYS.draft, null);
      return d && d.roomId === roomId ? d : null;
    },
    saveDraft: function (draft) { set(session, KEYS.draft, JSON.stringify(draft)); },
    clearDraft: function () { remove(session, KEYS.draft); }
  };

  root.MyShelterStore = Store;
})(window);
