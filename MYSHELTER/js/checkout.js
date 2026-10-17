/*
 * MYSHELTER — Checkout page.
 * Fixes covered here: Bug 1 (refresh keeps the room), Bug 3 (room resolved by id),
 * Bug 4 (numeric bill), Bug 7 (coupon once), Bug 8 (no past dates),
 * Bug 9 (name/phone validation).
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
  var fields = { name: $('name'), phone: $('phone'), checkIn: $('checkIn') };
  var couponInput = $('coupon');
  var couponApply = $('coupon-apply');
  var couponMsg = $('coupon-msg');
  var confirmBtn = $('confirm-btn');
  var dialog = $('success-dialog');

  var room = null;
  var couponState = { coupon: null };
  var touched = {};

  /* ---------- resolve the selected room (Bug 1 + Bug 3) ---------- */

  function resolveRoom() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get('room');
    var fromStore = Store.getSelectedRoom();
    var id = fromUrl || fromStore;
    var found = Core.findRoom(Data.ROOMS, id);
    return { room: found, requested: id, hadUrl: !!fromUrl };
  }

  function showNoRoom(requestedId) {
    $('checkout-grid').hidden = true;
    $('no-room').hidden = false;
    if (requestedId) {
      $('no-room-title').textContent = 'That room isn’t available';
      $('no-room-text').textContent = 'The listing you followed may have been removed. Pick another stay from Explore.';
      Store.clearSelectedRoom();
    }
  }

  /* ---------- summary & bill ---------- */

  function renderSummary() {
    var img = $('sum-img');
    UI.bindImageFallback(img);
    img.src = room.images[0];
    img.alt = room.title;
    $('summary-title').textContent = room.title + ' – ' + room.city;
    $('sum-loc').textContent = room.locality + ', ' + room.city;
    var meta = '<span class="meta meta--type">' + I.bed + Core.escapeHTML(room.type) + '</span>' +
      '<span class="meta">' + Core.escapeHTML(room.category) + '</span>' +
      room.amenities.map(function (a) { return '<span class="meta">' + Core.escapeHTML(Data.AMENITIES[a]) + '</span>'; }).join('');
    $('sum-meta').innerHTML = meta;
    document.title = 'Checkout · ' + room.title + ' — MYSHELTER';
  }

  function renderBill() {
    var discount = couponState.coupon ? couponState.coupon.amount : 0;
    // Bug 4 fix: calculateBill converts every value with Number() before adding.
    var bill = Core.calculateBill({ rent: room.rent, deposit: room.deposit, discount: discount });
    $('bill-rent').textContent = Core.formatINR(bill.rent);
    $('bill-deposit').textContent = Core.formatINR(bill.deposit);
    $('bill-discount-row').hidden = bill.discount === 0;
    $('bill-discount').textContent = '−' + Core.formatINR(bill.discount);
    $('bill-total').textContent = Core.formatINR(bill.total);
    return bill;
  }

  /* ---------- coupon (Bug 7) ---------- */

  function renderCoupon() {
    var applied = !!couponState.coupon;
    $('coupon-entry').hidden = applied;
    $('coupon-applied').hidden = !applied;
    // Belt and braces: the Apply control is disabled once a coupon is in place.
    couponApply.disabled = applied;
    if (applied) $('coupon-applied-code').textContent = couponState.coupon.code;
  }

  function setCouponMsg(text, ok) {
    couponMsg.textContent = text;
    couponMsg.className = 'coupon-msg ' + (text ? (ok ? 'ok' : 'err') : '');
  }

  function applyCoupon() {
    var result = Core.applyCoupon(couponState, couponInput.value, Data.COUPONS);
    couponState = result.state;
    setCouponMsg(result.message, result.ok);
    renderCoupon();
    renderBill();
    saveDraft();
    if (result.ok) {
      couponInput.value = '';
      $('coupon-remove').focus();
    }
  }

  couponApply.addEventListener('click', applyCoupon);
  couponInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
  });
  $('coupon-remove').addEventListener('click', function () {
    couponState = Core.removeCoupon();
    setCouponMsg('Coupon removed.', true);
    renderCoupon();
    renderBill();
    saveDraft();
    couponInput.focus();
  });

  /* ---------- dates (Bug 8) ---------- */

  function setDateBounds() {
    var today = Core.todayISO();
    fields.checkIn.min = today;
    fields.checkIn.max = Core.addDaysISO(today, Core.MAX_ADVANCE_DAYS);
  }

  /* ---------- validation (Bug 9) ---------- */

  function readValues() {
    return { name: fields.name.value, phone: fields.phone.value, checkIn: fields.checkIn.value };
  }

  function showErrors(errors, only) {
    Object.keys(fields).forEach(function (key) {
      if (only && only.indexOf(key) === -1) return;
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

  Object.keys(fields).forEach(function (key) {
    var input = fields[key];
    input.addEventListener('blur', function () {
      if (!input.value && !touched[key]) return;
      touched[key] = true;
      showErrors(Core.validateBooking(readValues()).errors, [key]);
    });
    input.addEventListener('input', function () {
      if (touched[key]) showErrors(Core.validateBooking(readValues()).errors, [key]);
      saveDraft();
    });
  });

  /* ---------- draft persistence (same tab) ---------- */

  function saveDraft() {
    if (!room) return;
    Store.saveDraft({
      roomId: room.id,
      name: fields.name.value,
      phone: fields.phone.value,
      checkIn: fields.checkIn.value,
      coupon: couponState.coupon ? couponState.coupon.code : null
    });
  }

  function restoreDraft() {
    var d = Store.getDraft(room.id);
    if (!d) return;
    fields.name.value = d.name || '';
    fields.phone.value = d.phone || '';
    if (d.checkIn && d.checkIn >= fields.checkIn.min) fields.checkIn.value = d.checkIn;
    if (d.coupon) couponState = Core.applyCoupon({ coupon: null }, d.coupon, Data.COUPONS).state;
  }

  /* ---------- submit ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (confirmBtn.disabled) return;
    setDateBounds(); // in case the page stayed open past midnight

    var result = Core.validateBooking(readValues());
    Object.keys(fields).forEach(function (k) { touched[k] = true; });
    showErrors(result.errors);
    if (!result.valid) {
      var first = Object.keys(fields).filter(function (k) { return result.errors[k]; })[0];
      if (first) fields[first].focus();
      UI.toast('Please fix the highlighted fields.', 'error');
      return;
    }

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
      roomTitle: room.title,
      city: room.city,
      locality: room.locality,
      type: room.type,
      image: room.images[0],
      name: v.name,
      phone: v.phone,
      checkIn: v.checkIn,
      rent: bill.rent,
      deposit: bill.deposit,
      discount: bill.discount,
      total: bill.total,
      coupon: couponState.coupon ? couponState.coupon.code : null,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    var persisted = Store.addBooking(booking);

    // Booking is done: clear the in-progress state.
    Store.clearSelectedRoom();
    Store.clearDraft();
    form.reset();
    touched = {};
    couponState = Core.removeCoupon();
    setCouponMsg('', true);
    renderCoupon();
    renderBill();
    UI.refreshBookingBadge();

    $('success-ref').textContent = booking.bookingId;
    $('success-text').textContent = 'Thanks, ' + v.name.split(' ')[0] + '! ' + room.title +
      ' is reserved from ' + Core.formatDate(v.checkIn) + '. Pay ' + Core.formatINR(bill.total) + ' at move-in.' +
      (persisted ? '' : ' (Storage is blocked, so this booking won’t be kept after you close the tab.)');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else UI.toast('Booking successful! Ref ' + booking.bookingId, 'success');
    confirmBtn.disabled = false;
  });

  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close(); // click on backdrop
  });

  /* ---------- boot ---------- */

  var resolved = resolveRoom();
  room = resolved.room;
  if (!room) {
    showNoRoom(resolved.requested);
  } else {
    // Keep both sources in sync so either survives a refresh or a shared link.
    Store.setSelectedRoom(room.id);
    if (!resolved.hadUrl) {
      try { window.history.replaceState(null, '', window.location.pathname + '?room=' + encodeURIComponent(room.id)); } catch (e) { /* ignore */ }
    }
    $('no-room').hidden = true;
    $('checkout-grid').hidden = false;
    setDateBounds();
    renderSummary();
    restoreDraft();
    renderCoupon();
    renderBill();
  }
  UI.storageNotice($('checkout-section'));
})();
