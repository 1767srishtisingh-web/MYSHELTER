/*
 * MYSHELTER — Explore page: search, filters, sort, cards and carousels.
 */
(function () {
  'use strict';

  var Data = window.MyShelterData;
  var Core = window.MyShelterCore;
  var Store = window.MyShelterStore;
  var UI = window.MyShelterUI;
  var I = UI.ICONS;
  var esc = Core.escapeHTML;

  var ROOMS = Data.ROOMS;
  var CITIES = Array.from(new Set(ROOMS.map(function (r) { return r.city; }))).sort();

  var state = Core.readFilters(window.location.search);

  // Bug 10 fix: every card keeps its OWN photo index, keyed by room id.
  // (Previously one shared global index moved every card at once.)
  var slideIndex = new Map();

  var els = {
    q: document.getElementById('q'),
    searchForm: document.getElementById('search-form'),
    cityChips: document.getElementById('city-chips'),
    typeFilter: document.getElementById('type-filter'),
    genderFilter: document.getElementById('gender-filter'),
    amenityFilter: document.getElementById('amenity-filter'),
    sort: document.getElementById('sort'),
    grid: document.getElementById('grid'),
    count: document.getElementById('results-count'),
    clear: document.getElementById('clear-filters')
  };

  /* ---------- static bits ---------- */

  function renderStats() {
    var minRent = Math.min.apply(null, ROOMS.map(function (r) { return r.rent; }));
    var set = function (k, v) { var el = document.querySelector('[data-stat="' + k + '"]'); if (el) el.textContent = v; };
    set('rooms', String(ROOMS.length));
    set('cities', String(CITIES.length));
    set('from', Core.formatINR(minRent));
  }

  function renderCityChips() {
    els.cityChips.innerHTML = CITIES.map(function (c) {
      return '<button type="button" class="chip" data-city="' + esc(c) + '" aria-pressed="false">' + I.pin + esc(c) + '</button>';
    }).join('');
  }

  function renderAmenityFilters() {
    var html = Object.keys(Data.AMENITIES).map(function (key) {
      return '<label class="check-pill"><input type="checkbox" value="' + key + '" name="amenity">' +
        '<span class="tick">' + I.check + '</span>' + esc(Data.AMENITIES[key]) + '</label>';
    }).join('');
    els.amenityFilter.insertAdjacentHTML('beforeend', html);
  }

  /* ---------- controls <-> state ---------- */

  function syncControls() {
    els.q.value = state.query;
    els.sort.value = state.sort;
    els.typeFilter.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.type === state.type));
    });
    els.genderFilter.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.gender === state.gender));
    });
    els.amenityFilter.querySelectorAll('input').forEach(function (i) {
      i.checked = state.amenities.indexOf(i.value) !== -1;
    });
    var q = state.query.trim().toLowerCase();
    els.cityChips.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(q === b.dataset.city.toLowerCase()));
    });
  }

  function isFiltered() {
    return !!(state.query || state.type !== 'all' || state.gender !== 'any' || state.amenities.length || state.sort !== 'recommended');
  }

  function update(patch) {
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    // Keep filters in the URL so a refresh or shared link restores the view.
    var url = window.location.pathname + Core.writeFilters(state) + window.location.hash;
    try { window.history.replaceState(null, '', url); } catch (e) { /* file:// in some browsers */ }
    syncControls();
    render();
  }

  /* ---------- cards ---------- */

  var GENDER_TAG = {
    Girls: { cls: 'tag--girls', icon: I.venus, label: 'Girls only' },
    Boys: { cls: 'tag--boys', icon: I.mars, label: 'Boys only' },
    Any: { cls: 'tag--any', icon: I.users, label: 'Anyone' }
  };
  var AMENITY_ICON = { wifi: I.wifi, ac: I.ac, food: I.food };

  function cardHTML(room, position) {
    var g = GENDER_TAG[room.gender] || GENDER_TAG.Any;
    var n = room.images.length;
    var eager = position < 3;
    var imgs = room.images.map(function (src, k) {
      return '<img src="' + esc(src) + '" alt="' + esc(room.title) + ' — photo ' + (k + 1) + ' of ' + n + '"' +
        ' loading="' + (eager && k === 0 ? 'eager' : 'lazy') + '" decoding="async" width="900" height="675"' +
        (k === 0 ? '' : ' aria-hidden="true"') + '>';
    }).join('');
    var dots = room.images.map(function (_, k) {
      return '<button type="button" data-dot="' + k + '" aria-label="Show photo ' + (k + 1) + '"' + (k === 0 ? ' aria-current="true"' : '') + '></button>';
    }).join('');
    var amenities = room.amenities.map(function (a) {
      return '<span class="meta">' + AMENITY_ICON[a] + esc(Data.AMENITIES[a]) + '</span>';
    }).join('');

    return '' +
      '<article class="card glass glow" data-room-id="' + esc(room.id) + '" aria-labelledby="t-' + esc(room.id) + '">' +
        '<div class="carousel" role="group" aria-roledescription="carousel" aria-label="Photos of ' + esc(room.title) + '" tabindex="0">' +
          '<div class="carousel-track">' + imgs + '</div>' +
          '<div class="tag-row"><span class="tag ' + g.cls + '">' + g.icon + g.label + '</span>' +
            '<span class="tag tag--rating">' + I.star + room.rating.toFixed(1) + ' <span class="sr-only">out of 5 from</span>(' + room.reviews + ')</span></div>' +
          (n > 1 ?
            '<button type="button" class="icon-btn icon-btn--clear nav-arrow prev" data-step="-1" aria-label="Previous photo">' + I.chevL + '</button>' +
            '<button type="button" class="icon-btn icon-btn--clear nav-arrow next" data-step="1" aria-label="Next photo">' + I.chevR + '</button>' +
            '<div class="dots">' + dots + '</div>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title" id="t-' + esc(room.id) + '">' + esc(room.title) + ' – ' + esc(room.city) + '</h3>' +
          '<p class="card-loc">' + I.pin + '<span>' + esc(room.locality) + ', ' + esc(room.city) + '</span></p>' +
          '<div class="meta-row"><span class="meta meta--type">' + I.bed + esc(room.type) + '</span>' +
            '<span class="meta">' + esc(room.category) + '</span>' + amenities + '</div>' +
          '<p class="card-note">' + esc(room.highlight) + '</p>' +
          '<div class="card-foot">' +
            '<div class="price"><strong>' + Core.formatINR(room.rent) + '</strong><span>/month</span>' +
              '<small>Deposit ' + Core.formatINR(room.deposit) + '</small></div>' +
            // Bug 3 fix: the button carries the room's stable id, never a list index.
            '<a class="btn btn--violet btn--sm" href="checkout.html?room=' + encodeURIComponent(room.id) + '" data-book="' + esc(room.id) + '">Book now</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function emptyHTML() {
    return '<div class="empty glass" role="status">' +
      '<span class="orb">' + I.search + '</span>' +
      '<h3>No stays match those filters</h3>' +
      '<p>Try another area, remove an amenity, or switch the room type to “All”.</p>' +
      '<div class="actions"><button type="button" class="btn btn--violet btn--sm" data-action="reset">Clear all filters</button></div>' +
      '</div>';
  }

  function describeCount(n) {
    var parts = [n + (n === 1 ? ' stay' : ' stays') + ' found'];
    if (state.query) parts.push('for “' + state.query + '”');
    return parts.join(' ');
  }

  function render() {
    var list = Core.sortRooms(Core.filterRooms(ROOMS, state), state.sort);
    els.count.textContent = describeCount(list.length);
    els.clear.hidden = !isFiltered();
    els.grid.setAttribute('aria-busy', 'true');
    if (!list.length) {
      els.grid.innerHTML = emptyHTML();
    } else {
      els.grid.innerHTML = list.map(cardHTML).join('');
      els.grid.querySelectorAll('.card').forEach(function (card, i) {
        card.style.setProperty('--i', String(Math.min(i, 8)));
        wireCard(card);
      });
    }
    els.grid.removeAttribute('aria-busy');
  }

  /* ---------- carousel (per card) ---------- */

  function showSlide(card, index) {
    var id = card.dataset.roomId;
    var imgs = card.querySelectorAll('.carousel-track img');
    var i = Core.stepIndex(index, imgs.length, 0);
    slideIndex.set(id, i);
    card.querySelector('.carousel-track').style.transform = 'translateX(' + (-100 * i) + '%)';
    imgs.forEach(function (img, k) {
      if (k === i) { img.removeAttribute('aria-hidden'); img.loading = 'eager'; }
      else img.setAttribute('aria-hidden', 'true');
    });
    card.querySelectorAll('[data-dot]').forEach(function (d) {
      if (Number(d.dataset.dot) === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }

  function step(card, delta) {
    var id = card.dataset.roomId;
    var len = card.querySelectorAll('.carousel-track img').length;
    showSlide(card, Core.stepIndex(slideIndex.get(id) || 0, len, delta));
  }

  function wireCard(card) {
    var carousel = card.querySelector('.carousel');
    var imgs = card.querySelectorAll('.carousel-track img');
    imgs.forEach(function (img, k) {
      UI.bindImageFallback(img);
      var done = function () {
        img.classList.add('is-loaded');
        if (k === 0) carousel.classList.add('is-ready');
      };
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener('load', done);
        img.addEventListener('error', function () { setTimeout(done, 0); });
      }
    });
    // Restore this card's own position after a re-render (e.g. changing sort).
    showSlide(card, slideIndex.get(card.dataset.roomId) || 0);

    // Swipe on touch screens
    var startX = null;
    carousel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') startX = e.clientX;
    });
    carousel.addEventListener('pointerup', function (e) {
      if (startX == null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) step(card, dx < 0 ? 1 : -1);
    });
    carousel.addEventListener('pointercancel', function () { startX = null; });
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(card, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(card, -1); }
    });
  }

  /* ---------- events ---------- */

  els.grid.addEventListener('click', function (e) {
    var target = e.target.closest('button, a');
    if (!target) return;
    var card = target.closest('.card');

    if (target.dataset.action === 'reset') { resetFilters(); return; }
    if (!card) return;

    if (target.dataset.step) { step(card, Number(target.dataset.step)); return; }
    if (target.dataset.dot) { showSlide(card, Number(target.dataset.dot)); return; }

    if (target.dataset.book) {
      // Bug 1 fix: persist the chosen room so checkout survives a refresh.
      // The URL also carries ?room=<id>, so either source restores it.
      Store.setSelectedRoom(target.dataset.book);
    }
  });

  els.searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    update({ query: els.q.value.trim().slice(0, 80) });
    document.getElementById('results-title').scrollIntoView({ behavior: UI.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  var typing;
  els.q.addEventListener('input', function () {
    clearTimeout(typing);
    typing = setTimeout(function () { update({ query: els.q.value.trim().slice(0, 80) }); }, 220);
  });

  els.cityChips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-city]');
    if (!b) return;
    var on = b.getAttribute('aria-pressed') === 'true';
    update({ query: on ? '' : b.dataset.city });
  });

  els.typeFilter.addEventListener('click', function (e) {
    var b = e.target.closest('[data-type]');
    if (b) update({ type: b.dataset.type });
  });

  els.genderFilter.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gender]');
    if (b) update({ gender: b.dataset.gender });
  });

  els.amenityFilter.addEventListener('change', function () {
    var picked = Array.prototype.map.call(els.amenityFilter.querySelectorAll('input:checked'), function (i) { return i.value; });
    update({ amenities: picked });
  });

  els.sort.addEventListener('change', function () { update({ sort: els.sort.value }); });

  function resetFilters() {
    update({ query: '', type: 'all', gender: 'any', amenities: [], sort: 'recommended' });
    UI.toast('Filters cleared');
  }
  els.clear.addEventListener('click', resetFilters);

  // Back/forward restores from the URL
  window.addEventListener('popstate', function () {
    state = Core.readFilters(window.location.search);
    syncControls();
    render();
  });

  /* ---------- boot ---------- */
  renderStats();
  renderCityChips();
  renderAmenityFilters();
  syncControls();
  render();
  UI.storageNotice(document.querySelector('.results'));
})();
