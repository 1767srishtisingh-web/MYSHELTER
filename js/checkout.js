/*
 * MYSHELTER — Checkout & Booking Flow Controller (checkout.html)
 * Implements: Review details -> Payment confirmation (demo) -> Animated success popup
 * Retains all seeded bugs (Bug 1: param stripped, Bug 7: coupon stacking, Bug 8/9: validation quirks)
 */
(function () {
  'use strict';

  var Data = window.MyShelterData;
  var Core = window.MyShelterCore;
  var Store = window.MyShelterStore;
  var UI = window.MyShelterUI;
  var I = UI.ICONS;

  var $ = function (id) { return document.getElementById(id); };

  // Elements
  var noRoomPanel = $('no-room');
  var checkoutGrid = $('checkout-grid');
  var paymentStep = $('payment-step');
  var bookingForm = $('booking-form');
  var continueBtn = $('continue-payment-btn');
  var proceedPayBtn = $('proceed-pay-btn');
  var backReviewBtn = $('back-review-btn');
  var successDialog = $('success-dialog');

  var fields = {
    name: $('name'),
    phone: $('phone'),
    checkIn: $('checkIn'),
    nights: $('nights')
  };

  var couponInput = $('coupon');
  var couponApply = $('coupon-apply');
  var couponMsg = $('coupon-msg');

  // State
  var selectedRoom = null;
  var discount = 0;
  var appliedCode = null;
  var currentValues = null;
  var currentBill = null;

  /* ---------- 1. Selected Room Loader ---------- */

  function loadSelectedRoom() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('room');
    if (id) {
      selectedRoom = Core.findRoom(Data.ROOMS, id);
      // Bug 1: strip query parameter from address bar
      try { window.history.replaceState(null, '', window.location.pathname); } catch (e) { /* ignore */ }
    }
    return id;
  }

  function showNoRoom(requestedId) {
    if (checkoutGrid) checkoutGrid.hidden = true;
    if (paymentStep) paymentStep.hidden = true;
    if (noRoomPanel) {
      noRoomPanel.hidden = false;
      if (requestedId) {
        $('no-room-title').textContent = 'That room isn’t available';
        $('no-room-text').textContent = 'This room is no longer listed. Choose another room.';
      }
    }
  }

  /* ---------- 2. Summary & Bill Rendering ---------- */

  function renderSummary() {
    var room = selectedRoom;
    var img = $('sum-img');
    UI.bindImageFallback(img);
    img.src = room.images[0];
    img.alt = room.hotel + ', ' + room.type + ' room';

    $('summary-title').textContent = room.hotel;
    $('sum-loc').textContent = room.address;

    // Badges: type, bed, guests
    $('sum-meta').innerHTML = '' +
      '<span class="meta meta--type">' + I.bed + Core.escapeHTML(room.type) + '</span>' +
      '<span class="meta">' + Core.escapeHTML(room.bed) + '</span>' +
      '<span class="meta">' + I.users + room.guests + (room.guests === 1 ? ' guest' : ' guests') + '</span>';

    // Amenities pills
    var amEl = $('sum-amenities');
    if (amEl && Array.isArray(room.amenities)) {
      amEl.innerHTML = room.amenities.map(function (a) {
        var label = Data.AMENITIES[a] || a;
        return '<span class="amenity-chip">' + Core.escapeHTML(label) + '</span>';
      }).join('');
    }

    // Cancellation policy
    var policyEl = $('sum-policy');
    if (policyEl) {
      if (room.freeCancellation) {
        policyEl.innerHTML = '<span class="policy-chip policy-chip--free">' + I.check + 'Free cancellation up to 24h before check-in</span>';
      } else {
        policyEl.innerHTML = '<span class="policy-chip policy-chip--std">Standard cancellation policy applies</span>';
      }
    }

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
    currentBill = bill;
    return bill;
  }

  /* ---------- 3. Coupon Handling (Bug 7: stacking) ---------- */

  function setCouponMsg(text, ok) {
    if (!couponMsg) return;
    couponMsg.textContent = text;
    couponMsg.className = 'coupon-msg ' + (text ? (ok ? 'ok' : 'err') : '');
  }

  function applyCoupon() {
    var code = couponInput.value.trim().toUpperCase();
    var coupon = Data.COUPONS[code];
    if (!code) { setCouponMsg('Enter a coupon code.', false); return; }
    if (!coupon) { setCouponMsg('That coupon code isn’t valid.', false); return; }

    // Bug 7: coupon stacking
    discount = discount + coupon.amount;
    appliedCode = coupon.code;
    setCouponMsg(coupon.label + ' applied.', true);
    renderBill();
  }

  if (couponApply) couponApply.addEventListener('click', applyCoupon);
  if (couponInput) {
    couponInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
    });
  }

  /* ---------- 4. Form Validation & Step Transitions ---------- */

  function readValues() {
    return {
      name: fields.name.value,
      phone: fields.phone.value,
      checkIn: fields.checkIn.value,
      nights: fields.nights.value
    };
  }

  function showErrors(errors) {
    Object.keys(fields).forEach(function (key) {
      var input = fields[key];
      var pill = input.closest('.input-pill');
      var msg = $(key + '-error');
      var err = errors[key] || '';
      if (msg) msg.textContent = err;
      if (pill) pill.classList.toggle('has-error', !!err);
      if (err) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  }

  // Step 1 -> Step 2
  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var result = Core.validateBooking(readValues());
    showErrors(result.errors);
    if (!result.valid) {
      var first = Object.keys(fields).filter(function (k) { return result.errors[k]; })[0];
      if (first) fields[first].focus();
      UI.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    var v = result.values;
    var duplicate = Store.getBookings().some(function (b) {
      return b.status !== 'cancelled' && b.roomId === selectedRoom.id && b.checkIn === v.checkIn && b.phone === v.phone;
    });
    if (duplicate) {
      UI.toast('You already have this room booked for that date.', 'error');
      return;
    }

    currentValues = v;
    var bill = renderBill();

    // Populate Step 2: Payment Confirmation
    var pmImg = $('pm-sum-img');
    UI.bindImageFallback(pmImg);
    pmImg.src = selectedRoom.images[0];
    $('pm-sum-hotel').textContent = selectedRoom.hotel;
    $('pm-sum-type').textContent = selectedRoom.type + ' room · ' + selectedRoom.city;
    $('pm-sum-checkin').textContent = Core.formatDate(v.checkIn);
    $('pm-sum-nights').textContent = v.nights + (v.nights === 1 ? ' night' : ' nights');
    $('pm-sum-guest').textContent = v.name || 'Guest';
    $('pm-sum-phone').textContent = v.phone ? '+91 ' + v.phone : 'Not provided';
    $('payment-summary-total').textContent = Core.formatINR(bill.total);
    $('pay-btn-amount').textContent = Core.formatINR(bill.total);

    // Transition view
    checkoutGrid.hidden = true;
    paymentStep.hidden = false;
    window.scrollTo({ top: $('checkout-section').offsetTop - 30, behavior: 'smooth' });
  });

  // Step 2 -> Step 1 (Back button)
  if (backReviewBtn) {
    backReviewBtn.addEventListener('click', function () {
      paymentStep.hidden = true;
      checkoutGrid.hidden = false;
      window.scrollTo({ top: $('checkout-section').offsetTop - 30, behavior: 'smooth' });
    });
  }

  // Payment method radio selection highlights
  var pmCards = document.querySelectorAll('.payment-method-card');
  pmCards.forEach(function (card) {
    card.addEventListener('click', function () {
      pmCards.forEach(function (c) { c.classList.remove('is-selected'); });
      card.classList.add('is-selected');
    });
  });

  /* ---------- 5. Step 2 Submit: Demo Payment & Success Dialog ---------- */

  if (proceedPayBtn) {
    proceedPayBtn.addEventListener('click', function () {
      if (proceedPayBtn.disabled) return;
      proceedPayBtn.disabled = true;
      proceedPayBtn.textContent = 'Processing reservation…';

      var v = currentValues || readValues();
      var bill = currentBill || renderBill();
      var room = selectedRoom;

      var selectedMethod = 'UPI';
      var checkedMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
      if (checkedMethodInput) selectedMethod = checkedMethodInput.value;

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
        paymentMethod: selectedMethod,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      // 1. Save to localStorage
      var persisted = Store.addBooking(booking);

      // 2. Sync to Supabase cloud database
      if (window.MyShelterAuth) {
        window.MyShelterAuth.authFetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        }).catch(function (err) {
          console.warn('Could not sync booking to database:', err);
        });
      }

      UI.refreshBookingBadge();

      // Populate Success Dialog
      $('success-ref').textContent = booking.bookingId;
      $('success-hotel').textContent = room.hotel + ' (' + room.type + ')';
      $('success-date').textContent = Core.formatDate(v.checkIn) + ' · ' + v.nights + (v.nights === 1 ? ' night' : ' nights');
      $('success-total').textContent = Core.formatINR(bill.total) + ' (' + selectedMethod + ')';

      // Open Success modal
      if (typeof successDialog.showModal === 'function') {
        successDialog.showModal();
      } else {
        UI.toast('Room booked successfully! Ref: ' + booking.bookingId, 'success');
      }

      proceedPayBtn.disabled = false;
      proceedPayBtn.innerHTML = 'Proceed to pay <span id="pay-btn-amount">' + Core.formatINR(bill.total) + '</span>';
    });
  }

  if (successDialog) {
    successDialog.addEventListener('click', function (e) {
      if (e.target === successDialog) successDialog.close();
    });
  }

  /* ---------- 6. Nights Selector ---------- */

  function renderNights() {
    var html = '';
    for (var n = 1; n <= Core.MAX_NIGHTS; n++) {
      html += '<option value="' + n + '">' + n + (n === 1 ? ' night' : ' nights') + '</option>';
    }
    fields.nights.innerHTML = html;
  }
  fields.nights.addEventListener('change', function () { renderBill(); });

  /* ---------- 7. Boot ---------- */

  var requested = loadSelectedRoom();
  if (!selectedRoom) {
    showNoRoom(requested);
  } else {
    noRoomPanel.hidden = true;
    checkoutGrid.hidden = false;
    paymentStep.hidden = true;

    // Prefill user details if authenticated
    if (window.MyShelterAuth && window.MyShelterAuth.isLoggedIn()) {
      var user = window.MyShelterAuth.getUser();
      if (user) {
        if (user.name && !fields.name.value) fields.name.value = user.name;
        if (user.phone && !fields.phone.value) fields.phone.value = user.phone;
      }
    }

    if (fields.checkIn && !fields.checkIn.value) {
      fields.checkIn.removeAttribute('min');
      fields.checkIn.value = Core.todayISO();
    }

    renderNights();
    renderSummary();
    renderBill();
  }

  UI.storageNotice($('checkout-section'));
})();
