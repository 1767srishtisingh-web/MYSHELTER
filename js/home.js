


(function () {
  'use strict';

  var Data = window.MyShelterData;
  var Core = window.MyShelterCore;
  var Store = window.MyShelterStore;
  var UI = window.MyShelterUI;
  var I = UI.ICONS;
  var esc = Core.escapeHTML;

  var ROOMS = Data.ROOMS;
  var PAGE_SIZE = 24;
  var AREAS = ['Connaught Place', 'Aerocity', 'Sector 18', 'Greater Noida', 'Kaushambi', 'Vaishali'];

  var state = Core.readFilters(window.location.search);


  var currentSlide = 0;


  var currentList = [];
  var shown = 0;

  var els = {
    q: document.getElementById('q'),
    searchForm: document.getElementById('search-form'),
    areaChips: document.getElementById('area-chips'),
    cityFilter: document.getElementById('city-filter'),
    typeFilter: document.getElementById('type-filter'),
    optionFilter: document.getElementById('option-filter'),
    sort: document.getElementById('sort'),
    grid: document.getElementById('grid'),
    count: document.getElementById('results-count'),
    clear: document.getElementById('clear-filters'),
    more: document.getElementById('show-more')
  };



  function renderStats() {
    var minPrice = Math.min.apply(null, ROOMS.map(function (r) { return r.price; }));
    var set = function (k, v) { var el = document.querySelector('[data-stat="' + k + '"]'); if (el) el.textContent = v; };
    set('rooms', String(ROOMS.length));
    set('hotels', String(Data.HOTELS_COUNT));
    set('from', Core.formatINR(minPrice));
  }

  function renderAreaChips() {
    els.areaChips.innerHTML = AREAS.map(function (a) {
      return '<button type="button" class="chip" data-area="' + esc(a) + '" aria-pressed="false">' + I.pin + esc(a) + '</button>';
    }).join('');
  }

  var OPTIONS = [
    { value: 'free', label: 'Free cancellation' },
    { value: 'breakfast', label: Data.AMENITIES.breakfast },
    { value: 'pool', label: Data.AMENITIES.pool },
    { value: 'parking', label: Data.AMENITIES.parking }
  ];

  function renderOptionFilters() {
    var html = OPTIONS.map(function (o) {
      return '<label class="check-pill"><input type="checkbox" value="' + o.value + '" name="option">' +
        '<span class="tick">' + I.check + '</span>' + esc(o.label) + '</label>';
    }).join('');
    els.optionFilter.insertAdjacentHTML('beforeend', html);
  }

  function syncCustomSort(val) {
    var labelEl = document.getElementById('sort-label');
    if (labelEl) labelEl.textContent = 'Sort by';
    var options = document.querySelectorAll('.dropdown-option');
    options.forEach(function (opt) {
      var isMatch = Boolean(val && opt.dataset.value === val);
      opt.setAttribute('aria-selected', String(isMatch));
      opt.classList.toggle('is-selected', isMatch);
    });
  }

  function syncControls() {
    els.q.value = state.query;
    els.sort.value = state.sort;
    syncCustomSort(state.sort);
    els.cityFilter.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.city === state.city));
    });
    els.typeFilter.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.type === state.type));
    });
    els.optionFilter.querySelectorAll('input').forEach(function (i) {
      i.checked = i.value === 'free' ? state.freeCancellation : state.amenities.indexOf(i.value) !== -1;
    });
    var q = state.query.trim().toLowerCase();
    els.areaChips.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(q === b.dataset.area.toLowerCase()));
    });
  }

  function isFiltered() {
    return !!(state.query || state.city !== 'all' || state.type !== 'all' || state.freeCancellation ||
      state.amenities.length || (state.sort && state.sort !== 'recommended'));
  }

  var prefDebounceTimer;
  function saveUserPreferences() {
    clearTimeout(prefDebounceTimer);
    prefDebounceTimer = setTimeout(function () {
      if (window.MyShelterAuth && window.MyShelterAuth.isLoggedIn()) {
        window.MyShelterAuth.authFetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: state.city,
            type: state.type,
            query: state.query,
            freeCancellation: state.freeCancellation,
            amenities: state.amenities,
            sort: state.sort
          })
        }).catch(function () {});
      }
    }, 700);
  }

  function update(patch) {
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    var url = window.location.pathname + Core.writeFilters(state) + window.location.hash;
    try { window.history.replaceState(null, '', url); } catch (e) {  }
    syncControls();
    render();
    saveUserPreferences();
  }



  var AMENITY_ICON = { breakfast: I.food, pool: I.pool, parking: I.parking };

  function cardHTML(room, position) {
    var n = room.images.length;
    var eager = position < 3;
    var label = room.hotel + ', ' + room.type + ' room';
    var imgs = room.images.map(function (src, k) {
      return '<img src="' + esc(src) + '" alt="' + esc(label) + ' — photo ' + (k + 1) + ' of ' + n + '"' +
        ' loading="' + (eager && k === 0 ? 'eager' : 'lazy') + '" decoding="async" width="900" height="675"' +
        (k === 0 ? '' : ' aria-hidden="true"') + '>';
    }).join('');
    var dots = room.images.map(function (_, k) {
      return '<button type="button" data-dot="' + k + '" aria-label="Show photo ' + (k + 1) + '"' + (k === 0 ? ' aria-current="true"' : '') + '></button>';
    }).join('');
    var amenities = room.amenities.filter(function (a) { return AMENITY_ICON[a]; }).map(function (a) {
      return '<span class="meta">' + AMENITY_ICON[a] + esc(Data.AMENITIES[a]) + '</span>';
    }).join('');

    return '' +
      '<article class="card glass glow" data-room-id="' + esc(room.id) + '" aria-labelledby="t-' + esc(room.id) + '">' +
        '<div class="carousel" role="group" aria-roledescription="carousel" aria-label="Photos of ' + esc(label) + '" tabindex="0">' +
          '<div class="carousel-track">' + imgs + '</div>' +
          '<div class="tag-row"><span class="tag tag--stars">' + I.star + room.stars + '-star</span>' +
            (room.freeCancellation ? '<span class="tag tag--free">' + I.check + 'Free cancellation</span>' : '') + '</div>' +
          (n > 1 ?
            '<button type="button" class="icon-btn icon-btn--clear nav-arrow prev" data-step="-1" aria-label="Previous photo">' + I.chevL + '</button>' +
            '<button type="button" class="icon-btn icon-btn--clear nav-arrow next" data-step="1" aria-label="Next photo">' + I.chevR + '</button>' +
            '<div class="dots">' + dots + '</div>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<div>' +
            '<h3 class="card-title" id="t-' + esc(room.id) + '">' + esc(room.hotel) + '</h3>' +
            '<p class="card-sub">' + esc(room.type) + ' Room · ' + esc(room.bed) + '</p>' +
          '</div>' +
          '<p class="card-loc">' + I.pin + '<span>' + esc(room.area) + ', ' + esc(room.city) + '</span></p>' +
          '<div class="meta-row"><span class="meta meta--type">' + I.bed + esc(room.type) + '</span>' +
            '<span class="meta">' + I.users + room.guests + ' guests</span>' +
            '<span class="meta">' + I.size + room.size + ' m²</span>' + amenities + '</div>' +
          '<div class="card-foot">' +
            '<div class="price"><strong>' + Core.formatINR(room.price) + '</strong><span>/night</span>' +
              '<small>+ ' + Core.formatINR(room.taxes) + ' taxes</small></div>' +
            '<button type="button" class="btn btn--violet btn--sm" data-index="' + (position + 1) + '">Book now</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function emptyHTML() {
    return '<div class="empty glass" role="status">' +
      '<span class="orb">' + I.search + '</span>' +
      '<h3>No rooms match these filters</h3>' +
      '<p>Change the city, room type or options.</p>' +
      '<div class="actions"><button type="button" class="btn btn--violet btn--sm" data-action="reset">Clear filters</button></div>' +
      '</div>';
  }

  function describeCount(n) {
    var text = n + (n === 1 ? ' room' : ' rooms');
    if (state.query) text += ' for “' + state.query + '”';
    return text;
  }

  function appendCards(count) {
    var start = shown;
    var slice = currentList.slice(start, start + count);
    els.grid.insertAdjacentHTML('beforeend', slice.map(function (room, k) { return cardHTML(room, start + k); }).join(''));
    var cards = els.grid.querySelectorAll('.card');
    for (var i = start; i < cards.length; i++) {
      cards[i].style.setProperty('--i', String(Math.min(i - start, 8)));
      wireCard(cards[i]);
    }
    shown = start + slice.length;
    var left = currentList.length - shown;
    els.more.hidden = left <= 0;
    els.more.textContent = 'Show more rooms (' + left + ')';
  }

  function render() {
    currentList = Core.sortRooms(Core.filterRooms(ROOMS, state), state.sort);
    shown = 0;
    els.count.textContent = describeCount(currentList.length);
    els.clear.hidden = !isFiltered();
    els.grid.innerHTML = '';
    if (!currentList.length) {
      els.grid.innerHTML = emptyHTML();
      els.more.hidden = true;
      return;
    }
    appendCards(PAGE_SIZE);
  }



  function showSlide(card, index) {
    var imgs = card.querySelectorAll('.carousel-track img');
    var i = ((index % imgs.length) + imgs.length) % imgs.length;
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
    var len = card.querySelectorAll('.carousel-track img').length;
    currentSlide = ((currentSlide + delta) % len + len) % len;
    els.grid.querySelectorAll('.card').forEach(function (c) {
      showSlide(c, currentSlide);
    });
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
    showSlide(card, currentSlide);


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



  els.grid.addEventListener('click', function (e) {
    var target = e.target.closest('button, a');
    if (!target) return;
    var card = target.closest('.card');

    if (target.dataset.action === 'reset') { resetFilters(); return; }
    if (!card) return;

    if (target.dataset.step) { step(card, Number(target.dataset.step)); return; }
    if (target.dataset.dot) { step(card, Number(target.dataset.dot) - currentSlide); return; }

    if (target.dataset.index) {
      bookRoom(currentList[Number(target.dataset.index)]);
    }
  });

  function bookRoom(room) {
    if (!room) return;
    window.location.href = 'checkout.html?room=' + encodeURIComponent(room.id);
  }

  els.more.addEventListener('click', function () { appendCards(PAGE_SIZE); });

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

  els.areaChips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-area]');
    if (!b) return;
    var on = b.getAttribute('aria-pressed') === 'true';
    update({ query: on ? '' : b.dataset.area });
  });

  els.cityFilter.addEventListener('click', function (e) {
    var b = e.target.closest('[data-city]');
    if (b) update({ city: b.dataset.city });
  });

  els.typeFilter.addEventListener('click', function (e) {
    var b = e.target.closest('[data-type]');
    if (b) update({ type: b.dataset.type });
  });

  els.optionFilter.addEventListener('change', function () {
    var picked = Array.prototype.map.call(els.optionFilter.querySelectorAll('input:checked'), function (i) { return i.value; });
    update({
      freeCancellation: picked.indexOf('free') !== -1,
      amenities: picked.filter(function (v) { return v !== 'free'; })
    });
  });

  els.sort.addEventListener('change', function () { update({ sort: els.sort.value }); });

  function resetFilters() {
    update({ query: '', city: 'all', type: 'all', freeCancellation: false, amenities: [], sort: '' });
    UI.toast('Filters cleared');
  }

  function wireCustomSort() {
    var wrap = document.getElementById('sort-dropdown-wrap');
    var trigger = document.getElementById('sort-trigger');
    var menu = document.getElementById('sort-menu');
    if (!wrap || !trigger || !menu) return;

    var options = Array.from(menu.querySelectorAll('.dropdown-option'));

    function openDropdown() {
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      var selected = menu.querySelector('.dropdown-option.is-selected') || options[0];
      if (selected) selected.focus();
    }

    function closeDropdown(returnFocus) {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) trigger.focus();
    }

    function selectOption(option) {
      var val = option.dataset.value;
      if (els.sort.value === val) {

        els.sort.value = '';
        syncCustomSort('');
        update({ sort: '' });
      } else {
        els.sort.value = val;
        syncCustomSort(val);
        update({ sort: val });
      }
      closeDropdown(true);
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = wrap.classList.contains('is-open');
      if (isOpen) closeDropdown();
      else openDropdown();
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
    });

    options.forEach(function (opt, idx) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        selectOption(opt);
      });

      opt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption(opt);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          var next = options[(idx + 1) % options.length];
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          var prev = options[(idx - 1 + options.length) % options.length];
          if (prev) prev.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeDropdown(true);
        } else if (e.key === 'Tab') {
          closeDropdown(false);
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        closeDropdown(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
        closeDropdown(true);
      }
    });
  }

  window.addEventListener('popstate', function () {
    state = Core.readFilters(window.location.search);
    syncControls();
    render();
  });

  els.clear.addEventListener('click', resetFilters);


  renderStats();
  renderAreaChips();
  renderOptionFilters();
  wireCustomSort();
  syncControls();
  render();
  UI.storageNotice(document.querySelector('.results'));
})();
