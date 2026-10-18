/*
 * MYSHELTER — Checkout page.
 */
(function () {
  'use strict';

  var Data = window.MyShelterData;
  var Core = window.MyShelterCore;
  var Store = window.MyShelterStore;
  var UI = window.MyShelterUI;
  var I = UI.ICONS;

  var $ = function (id) { return document.getElementById(id); };
  var form = $('booking-form');
  var fields = { name: $('name'), phone: $('phone'), checkIn: $('checkIn'), nights: $('nights') };
  var couponInput = $('coupon');
  var couponApply = $('coupon-apply');
  var couponMsg = $('coupon-msg');
  var confirmBtn = $('confirm-btn');
  var dialog = $('success-dialog');

  // the room being booked
  var selectedRoom = null;
  var discount = 0;
  var appliedCode = null;

  /* ---------- selected room ---------- */

  function loadSelectedRoom() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('room');
    if (id) {
      selectedRoom = Core.findRoom(Data.ROOMS, id);
      // tidy the address bar
      try { window.history.replaceState(null, '', window.location.pathname); } catch (e) { /* ignore */ }
    }
    return id;
  }

  function showNoRoom(requestedId) {
    $('checkout-grid').hidden = true;
    $('no-room').hidden = false;
    if (requestedId) {
      $('no-room-title').textContent = 'That room isn’t available';
      $('no-room-text').textContent = 'This room is no longer listed. Choose another room.';
    }
  }

  /* ---------- summary & bill ---------- */

  function renderSummary() {
    var room = selectedRoom;
    var img = $('sum-img');
    UI.bindImageFallback(img);
    img.src = room.images[0];
    img.alt = room.hotel + ', ' + room.type + ' room';
    $('summary-title').textContent = room.hotel;
    $('sum-loc').textContent = room.address;
    $('sum-meta').innerHTML = '<span class="meta meta--type">' + I.bed + Core.escapeHTML(room.type) + '</span>' +
      '<span class="meta">' + Core.escapeHTML(room.bed) + '</span>' +
      '<span class="meta">' + room.guests + ' guests</span>' +
      (room.freeCancellation ? '<span class="meta">Free cancellation</span>' : '<span class="meta">Non-refundable</span>') +
      (room.amenities.indexOf('breakfast') !== -1 ? '<span class="meta">' + Core.escapeHTML(Data.AMENITIES.breakfast) + '</span>' : '');
    document.title = 'Checkout · ' + room.hotel + ' — MYSHELTER';
  }

  function renderBill() {
    var bill = Core.calculateBill({
      price: selectedRoom.price,
      taxes: selectedRoom.taxes,
      nights: fields.nights.value,
      discount: discount
    });
    $('bill-tariff-label').textContent = 'Room tariff (' + Core.formatINR(selectedRoom.price) + ' × ' + bill.nights + (bill.nights === 1 ? ' night)' : ' nights)');
    $('bill-tariff').textContent = Core.formatINR(bill.tariff);
    $('bill-taxes').textContent = Core.formatINR(bill.taxes);
    $('bill-discount-row').hidden = bill.discount === 0;
    $('bill-discount').textContent = '−' + Core.formatINR(bill.discount);
    $('bill-total').textContent = Core.formatINR(bill.total);
    return bill;
  }

  /* ---------- coupon ---------- */

  function setCouponMsg(text, ok) {
    couponMsg.textContent = text;
    couponMsg.className = 'coupon-msg ' + (text ? (ok ? 'ok' : 'err') : '');
  }

  function applyCoupon() {
    var code = couponInput.value.trim().toUpperCase();
    var coupon = Data.COUPONS[code];
    if (!code) { setCouponMsg('Enter a coupon code.', false); return; }
    if (!coupon) { setCouponMsg('That coupon code isn’t valid.', false); return; }
    discount = discount + coupon.amount;
    appliedCode = coupon.code;
    setCouponMsg(coupon.label + ' applied.', true);
    renderBill();
  }

  couponApply.addEventListener('click', applyCoupon);
  couponInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
  });

  /* ---------- validation ---------- */

  function readValues() {
    return { name: fields.name.value, phone: fields.phone.value, checkIn: fields.checkIn.value, nights: fields.nights.value };
  }

  function showErrors(errors) {
    Object.keys(fields).forEach(function (key) {
      var input = fields[key];
      var pill = input.closest('.input-pill');
      var msg = $(key + '-error');
      var err = errors[key] || '';
      msg.textContent = err;
      pill.classList.toggle('has-error', !!err);
      if (err) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  }

  /* ---------- submit ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (confirmBtn.disabled) return;

    var result = Core.validateBooking(readValues());
    showErrors(result.errors);
    if (!result.valid) {
      var first = Object.keys(fields).filter(function (k) { return result.errors[k]; })[0];
      if (first) fields[first].focus();
      UI.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    var room = selectedRoom;
    var v = result.values;
    var duplicate = Store.getBookings().some(function (b) {
      return b.status !== 'cancelled' && b.roomId === room.id && b.checkIn === v.checkIn && b.phone === v.phone;
    });
    if (duplicate) {
      UI.toast('You already have this room booked for that date.', 'error');
      return;
    }

    confirmBtn.disabled = true;
    var bill = renderBill();
    var booking = {
      bookingId: Core.createBookingId(),
      roomId: room.id,
      roomTitle: room.hotel,
      city: room.city,
      locality: room.area,
      type: room.type,
      nights: v.nights,
      image: room.images[0],
      name: v.name,
      phone: v.phone,
      checkIn: v.checkIn,
      tariff: bill.tariff,
      taxes: bill.taxes,
      discount: bill.discount,
      total: bill.total,
      coupon: appliedCode,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    var persisted = Store.addBooking(booking);

    form.reset();
    fields.nights.value = '1';
    discount = 0;
    appliedCode = null;
    setCouponMsg('', true);
    renderBill();
    UI.refreshBookingBadge();

    $('success-ref').textContent = booking.bookingId;
    $('success-text').textContent = (v.name ? v.name.split(' ')[0] + ', your ' : 'Your ') + room.type + ' room at ' + room.hotel +
      ' is reserved from ' + Core.formatDate(v.checkIn) + ' for ' + v.nights + (v.nights === 1 ? ' night' : ' nights') +
      '. Pay ' + Core.formatINR(bill.total) + ' at the hotel.' +
      (persisted ? '' : ' (Storage is blocked, so this booking won’t be kept after you close the tab.)');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else UI.toast('Booking successful! Ref ' + booking.bookingId, 'success');
    confirmBtn.disabled = false;
  });

  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  /* ---------- nights ---------- */

  function renderNights() {
    var html = '';
    for (var n = 1; n <= Core.MAX_NIGHTS; n++) {
      html += '<option value="' + n + '">' + n + (n === 1 ? ' night' : ' nights') + '</option>';
    }
    fields.nights.innerHTML = html;
  }
  fields.nights.addEventListener('change', function () { renderBill(); });

  /* ---------- boot ---------- */

  var requested = loadSelectedRoom();
  if (!selectedRoom) {
    showNoRoom(requested);
  } else {
    $('no-room').hidden = true;
    $('checkout-grid').hidden = false;
    renderNights();
    renderSummary();
    renderBill();
  }
  UI.storageNotice($('checkout-section'));
})();
