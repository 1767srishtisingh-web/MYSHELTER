/*
 * MYSHELTER — My Bookings page: list and cancel bookings stored in localStorage.
 */
(function () {
  'use strict';

  var Core = window.MyShelterCore;
  var Store = window.MyShelterStore;
  var UI = window.MyShelterUI;
  var I = UI.ICONS;
  var esc = Core.escapeHTML;

  var host = document.getElementById('bookings');
  var summary = document.getElementById('bookings-summary');
  var dialog = document.getElementById('cancel-dialog');
  var pendingCancel = null;

  function bookingHTML(b) {
    var cancelled = b.status === 'cancelled';
    var src = typeof b.image === 'string' && /^https:\/\/images\.unsplash\.com\//.test(b.image) ? b.image : UI.PLACEHOLDER;
    return '<article class="booking glass glow' + (cancelled ? ' is-cancelled' : '') + '" data-id="' + esc(b.bookingId) + '">' +
      '<img src="' + esc(src) + '" alt="" loading="lazy" width="120" height="100">' +
      '<div>' +
        '<h2>' + esc(b.roomTitle) + '</h2>' +
        '<p class="details">' + esc(b.locality) + ', ' + esc(b.city) + (b.name ? ' · ' + esc(b.name) : '') + (b.phone ? ' · +91 ' + esc(b.phone) : '') + '</p>' +
        '<div class="meta-row">' +
          '<span class="meta meta--type">' + I.bed + esc(b.type) + '</span>' +
          '<span class="meta">' + I.calendar + esc(Core.formatDate(b.checkIn)) + (b.nights ? ' · ' + Number(b.nights) + (Number(b.nights) === 1 ? ' night' : ' nights') : '') + '</span>' +
          '<span class="meta">' + I.tag + esc(b.bookingId) + '</span>' +
          (b.coupon ? '<span class="meta">' + esc(b.coupon) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="side">' +
        '<span class="status status--' + (cancelled ? 'cancelled' : 'confirmed') + '">' + (cancelled ? 'Cancelled' : 'Confirmed') + '</span>' +
        '<strong>' + Core.formatINR(b.total) + '</strong>' +
        (cancelled ? '' : '<button type="button" class="btn btn--danger btn--sm" data-cancel="' + esc(b.bookingId) + '">' + I.trash + 'Cancel</button>') +
      '</div>' +
    '</article>';
  }

  function render() {
    var list = Store.getBookings();
    var active = list.filter(function (b) { return b.status !== 'cancelled'; }).length;
    summary.textContent = list.length
      ? active + ' active · ' + (list.length - active) + ' cancelled'
      : '';

    if (!list.length) {
      host.innerHTML = '<div class="empty glass" role="status">' +
        '<span class="orb">' + I.calendar + '</span>' +
        '<h2>No bookings yet</h2>' +
        '<p>Your confirmed rooms appear here.</p>' +
        '<div class="actions"><a class="btn btn--olive" href="index.html">Browse rooms</a></div></div>';
    } else {
      host.innerHTML = list.map(bookingHTML).join('');
      host.querySelectorAll('img').forEach(UI.bindImageFallback);
    }
    UI.refreshBookingBadge();
  }

  async function loadDatabaseBookings() {
    if (!window.MyShelterAuth || !window.MyShelterAuth.isLoggedIn()) {
      render();
      return;
    }

    try {
      summary.textContent = 'Syncing bookings with database…';
      var res = await window.MyShelterAuth.authFetch('/api/bookings');
      if (res.ok) {
        var data = await res.json();
        if (data.ok && Array.isArray(data.bookings)) {
          // Merge database bookings with any un-synced local bookings
          var localList = Store.getBookings();
          var dbIds = new Set(data.bookings.map(function (b) { return b.bookingId; }));
          var merged = data.bookings.slice();

          localList.forEach(function (lb) {
            if (!dbIds.has(lb.bookingId)) {
              merged.push(lb);
            }
          });

          Store.saveBookings(merged);
        }
      }
    } catch (err) {
      console.warn('Could not sync with database bookings:', err);
    } finally {
      render();
    }
  }

  host.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    pendingCancel = btn.dataset.cancel;
    var b = Store.getBookings().filter(function (x) { return x.bookingId === pendingCancel; })[0];
    document.getElementById('cancel-text').textContent = b
      ? b.roomTitle + ' (check-in ' + Core.formatDate(b.checkIn) + ') will be released.'
      : 'The room will be released.';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else if (window.confirm('Cancel this booking?')) doCancel();
  });

  function doCancel() {
    if (!pendingCancel) return;
    var idToCancel = pendingCancel;
    Store.updateBooking(idToCancel, { status: 'cancelled', cancelledAt: new Date().toISOString() });

    // Sync cancellation to Supabase database
    if (window.MyShelterAuth) {
      window.MyShelterAuth.authFetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: idToCancel })
      }).catch(function (err) {
        console.warn('Database cancellation sync error:', err);
      });
    }

    UI.toast('Booking ' + idToCancel + ' cancelled', 'success');
    pendingCancel = null;
    render();
  }

  dialog.addEventListener('close', function () {
    if (dialog.returnValue === 'cancel') doCancel();
    else pendingCancel = null;
    dialog.returnValue = '';
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close('keep'); });

  window.addEventListener('storage', function (e) {
    if (!e.key || e.key === 'myshelter:bookings') render();
  });

  loadDatabaseBookings();
  UI.storageNotice(document.querySelector('.page-head'));
})();
