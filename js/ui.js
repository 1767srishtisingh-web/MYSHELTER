/*
 * MYSHELTER — shared UI helpers: icons, toasts, cursor glow, header badge,
 * image fallback. Loaded on every page after store.js.
 */
(function (root) {
  'use strict';

  var svg = function (body, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + (extra || '') + '>' + body + '</svg>';
  };

  var ICONS = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', ' stroke-width="3"'),
    chevL: svg('<path d="m15 18-6-6 6-6"/>', ' stroke-width="2.5"'),
    chevR: svg('<path d="m9 18 6-6-6-6"/>', ' stroke-width="2.5"'),
    pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    wifi: svg('<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>'),
    ac: svg('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>'),
    food: svg('<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7v4h3"/>'),
    star: svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none"/>'),
    bed: svg('<path d="M3 18V6M3 13h18v5M21 13v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="10" r="2"/>'),
    shield: svg('<path d="M12 3 5 6v6c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    phone: svg('<path d="M6.5 3h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 4.5 5a2 2 0 0 1 2-2z"/>'),
    tag: svg('<path d="M20.5 13.5 13.5 20.5a2 2 0 0 1-2.8 0L3 12.8V3h9.8l7.7 7.7a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>', ' stroke-width="2.5"'),
    alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>'),
    home: svg('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/><circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/>'),
    sort: svg('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
    sparkle: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" stroke="none"/>'),
    venus: svg('<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>'),
    mars: svg('<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6M15 4h5v5"/>'),
    users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>'),
    sliders: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    pool: svg('<path d="M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M8 15V5a2 2 0 0 1 4 0M16 15V5a2 2 0 0 0-4 0M8 9h8"/>'),
    parking: svg('<rect x="4" y="3.5" width="16" height="17" rx="3.5"/><path d="M10 16.5v-9h3a2.8 2.8 0 0 1 0 5.6h-3"/>'),
    size: svg('<path d="M4 9V4h5M20 15v5h-5M4 4l6.5 6.5M20 20l-6.5-6.5"/>')
  };

  var PLACEHOLDER = 'assets/placeholder.svg';

  // Swap a failed photo for the local placeholder exactly once.
  function bindImageFallback(img) {
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      img.src = PLACEHOLDER;
      img.classList.add('is-fallback');
    });
  }

  /* ---------- Toasts ---------- */
  var toastHost;
  function toast(message, kind) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + (kind || 'info');
    var icon = kind === 'success' ? ICONS.check : kind === 'error' ? ICONS.alert : ICONS.info;
    el.innerHTML = '<span class="t-icon">' + icon + '</span><span class="t-msg"></span>';
    el.querySelector('.t-msg').textContent = message;
    toastHost.appendChild(el);
    while (toastHost.children.length > 3) toastHost.removeChild(toastHost.firstChild);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }, 3200);
  }

  /* ---------- Cursor glow on glass surfaces ---------- */
  var finePointer = root.matchMedia && root.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function enableGlow(scope) {
    if (!finePointer || reduceMotion) return;
    (scope || document).addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.glow');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Header ---------- */
  function refreshBookingBadge() {
    var n = root.MyShelterStore ? root.MyShelterStore.activeBookingCount() : 0;
    document.querySelectorAll('[data-booking-count]').forEach(function (b) {
      b.textContent = String(n);
      b.hidden = n === 0;
      b.setAttribute('aria-label', n + (n === 1 ? ' active booking' : ' active bookings'));
    });
  }

  function storageNotice(container) {
    if (!container || (root.MyShelterStore && root.MyShelterStore.isPersistent)) return;
    var n = document.createElement('div');
    n.className = 'notice';
    n.setAttribute('role', 'note');
    n.innerHTML = ICONS.alert + '<span>Your browser is blocking site storage (private mode or strict settings). You can still book, but your selection and bookings will be lost when you close this tab.</span>';
    container.prepend(n);
  }

  document.addEventListener('DOMContentLoaded', function () {
    refreshBookingBadge();
    enableGlow();
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
  });

  // Keep the badge in sync across tabs.
  root.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('myshelter:') === 0) refreshBookingBadge();
  });

  root.MyShelterUI = {
    ICONS: ICONS,
    PLACEHOLDER: PLACEHOLDER,
    toast: toast,
    bindImageFallback: bindImageFallback,
    refreshBookingBadge: refreshBookingBadge,
    storageNotice: storageNotice,
    reduceMotion: reduceMotion
  };
})(window);
