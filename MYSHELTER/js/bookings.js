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
        '<h2>' + esc(b.roomTitle) + ' – ' + esc(b.city) + '</h2>' +
        '<p class="details">' + esc(b.locality) + ' · Booked for ' + esc(b.name) + ' · +91 ' + esc(b.phone) + '</p>' +
        '<div class="meta-row">' +
          '<span class="meta meta--type">' + I.bed + esc(b.type) + '</span>' +
          '<span class="meta">' + I.calendar + 'Check-in ' + esc(Core.formatDate(b.checkIn)) + '</span>' +
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
      ? active + ' active · ' + (list.length - active) + ' cancelled · saved in this browser'
      : 'Saved in this browser.';

    if (!list.length) {
      host.innerHTML = '<div class="empty glass" role="status">' +
        '<span class="orb">' + I.calendar + '</span>' +
        '<h2>No bookings yet</h2>' +
        '<p>When you book a room it’ll show up here, even after you close the browser.</p>' +
        '<div class="actions"><a class="btn btn--violet" href="index.html">Find a room</a></div></div>';
    } else {
      host.innerHTML = list.map(bookingHTML).join('');
      host.querySelectorAll('img').forEach(UI.bindImageFallback);
    }
    UI.refreshBookingBadge();
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
    Store.updateBooking(pendingCancel, { status: 'cancelled', cancelledAt: new Date().toISOString() });
    UI.toast('Booking ' + pendingCancel + ' cancelled', 'success');
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

  render();
  UI.storageNotice(document.querySelector('.page-head'));
})();
