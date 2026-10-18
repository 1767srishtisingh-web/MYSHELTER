/*
 * MYSHELTER — Admin Dashboard Controller (admin.html)
 */
document.addEventListener('DOMContentLoaded', function () {
  var gate = document.getElementById('admin-gate');
  var dashboard = document.getElementById('admin-dashboard');
  var loginForm = document.getElementById('admin-login-form');
  var passInput = document.getElementById('admin-pass');
  var passError = document.getElementById('admin-pass-error');
  var logoutBtn = document.getElementById('admin-logout-btn');
  var refreshBtn = document.getElementById('admin-refresh-btn');
  var searchInput = document.getElementById('admin-search-input');

  var ADMIN_TOKEN_KEY = 'myshelter:admin_token';
  var state = {
    users: [],
    bookings: [],
    preferences: [],
    searchQuery: ''
  };

  function getAdminToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  }

  function setAdminToken(t) {
    if (t) sessionStorage.setItem(ADMIN_TOKEN_KEY, t);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  function showDashboard() {
    if (gate) gate.hidden = true;
    if (dashboard) dashboard.hidden = false;
    if (logoutBtn) logoutBtn.hidden = false;
    loadAdminData();
  }

  function showGate() {
    if (gate) gate.hidden = false;
    if (dashboard) dashboard.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    if (passInput) passInput.value = '';
  }

  if (getAdminToken()) {
    showDashboard();
  } else {
    showGate();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (passError) passError.textContent = '';
      var password = passInput ? passInput.value : '';
      if (!password) {
        if (passError) passError.textContent = 'Please enter the admin password.';
        return;
      }

      try {
        var res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password })
        });
        var data = await res.json();
        if (data.ok && data.token) {
          setAdminToken(data.token);
          showDashboard();
        } else {
          if (passError) passError.textContent = data.error || 'Incorrect admin password.';
        }
      } catch (err) {
        if (passError) passError.textContent = 'Failed to connect to authentication server.';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      setAdminToken(null);
      showGate();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      loadAdminData();
    });
  }

  // Tab switcher
  var tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      var targetId = tab.dataset.target;
      document.querySelectorAll('.admin-section').forEach(function (sec) {
        sec.hidden = sec.id !== targetId;
      });
    });
  });

  async function loadAdminData() {
    var token = getAdminToken();
    if (!token) return;

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Fetching…';
    }

    try {
      var res = await fetch('/api/admin/data', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (res.status === 401) {
        setAdminToken(null);
        showGate();
        return;
      }

      var json = await res.json();
      if (json.ok) {
        state.users = json.users || [];
        state.bookings = json.bookings || [];
        state.preferences = json.preferences || [];
        renderAll();
      } else {
        alert('Error loading admin data: ' + (json.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Network error fetching admin data: ' + e.message);
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refresh Data';
      }
    }
  }

  function filterList(list, fields) {
    var q = (state.searchQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(function (item) {
      return fields.some(function (f) {
        var val = item[f];
        if (val == null) return false;
        return String(val).toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  function renderAll() {
    var kpiU = document.getElementById('kpi-users');
    var kpiB = document.getElementById('kpi-bookings');
    var kpiP = document.getElementById('kpi-preferences');
    if (kpiU) kpiU.textContent = state.users.length;
    if (kpiB) kpiB.textContent = state.bookings.length;
    if (kpiP) kpiP.textContent = state.preferences.length;

    var cU = document.getElementById('count-users');
    var cB = document.getElementById('count-bookings');
    var cP = document.getElementById('count-preferences');
    if (cU) cU.textContent = state.users.length;
    if (cB) cB.textContent = state.bookings.length;
    if (cP) cP.textContent = state.preferences.length;

    renderUsers();
    renderBookings();
    renderPreferences();
  }

  function renderUsers() {
    var tbody = document.getElementById('tbody-users');
    if (!tbody) return;
    var filtered = filterList(state.users, ['name', 'email', 'phone', 'id']);
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(function (u) {
      var regDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      return '<tr>' +
        '<td><strong>' + escapeHTML(u.name) + '</strong></td>' +
        '<td>' + escapeHTML(u.email) + '</td>' +
        '<td>+91 ' + escapeHTML(u.phone) + '</td>' +
        '<td>' + regDate + '</td>' +
        '<td><code>' + escapeHTML(u.id ? u.id.slice(0, 8) + '…' : '—') + '</code></td>' +
      '</tr>';
    }).join('');
  }

  function renderBookings() {
    var tbody = document.getElementById('tbody-bookings');
    if (!tbody) return;
    var filtered = filterList(state.bookings, ['booking_id', 'hotel', 'guest_name', 'guest_phone', 'city', 'room_type', 'coupon', 'status']);
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="12" class="table-empty">No bookings found.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(function (b) {
      var bookedDate = b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      var statusCls = b.status === 'cancelled' ? 'status--cancelled' : 'status--confirmed';
      return '<tr>' +
        '<td><strong><code>' + escapeHTML(b.booking_id) + '</code></strong></td>' +
        '<td>' + escapeHTML(b.guest_name) + '</td>' +
        '<td>+91 ' + escapeHTML(b.guest_phone) + '</td>' +
        '<td>' + escapeHTML(b.hotel) + '</td>' +
        '<td>' + escapeHTML(b.room_type) + '</td>' +
        '<td>' + escapeHTML(b.city) + '</td>' +
        '<td>' + escapeHTML(b.check_in) + '</td>' +
        '<td>' + escapeHTML(b.nights) + '</td>' +
        '<td><strong>₹' + Number(b.total || 0).toLocaleString('en-IN') + '</strong></td>' +
        '<td>' + (b.coupon ? '<code>' + escapeHTML(b.coupon) + '</code>' : '—') + '</td>' +
        '<td><span class="status ' + statusCls + '">' + escapeHTML(b.status) + '</span></td>' +
        '<td>' + bookedDate + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderPreferences() {
    var tbody = document.getElementById('tbody-preferences');
    if (!tbody) return;
    var q = (state.searchQuery || '').trim().toLowerCase();
    var filtered = state.preferences.filter(function (p) {
      if (!q) return true;
      var uName = (p.users && p.users.name) || '';
      var uEmail = (p.users && p.users.email) || '';
      var str = [uName, uEmail, p.preferred_city, p.preferred_type, p.query, p.sort].join(' ').toLowerCase();
      return str.indexOf(q) !== -1;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="table-empty">No preferences recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function (p) {
      var userDesc = (p.users && p.users.name) ? p.users.name + ' (' + p.users.email + ')' : (p.user_id ? p.user_id.slice(0, 8) + '…' : '—');
      var updated = p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      return '<tr>' +
        '<td>' + escapeHTML(userDesc) + '</td>' +
        '<td>' + escapeHTML(p.preferred_city || 'All') + '</td>' +
        '<td>' + escapeHTML(p.preferred_type || 'All') + '</td>' +
        '<td>' + (p.query ? '“' + escapeHTML(p.query) + '”' : '—') + '</td>' +
        '<td>' + (p.free_cancellation ? 'Yes' : 'No') + '</td>' +
        '<td>' + (p.breakfast ? 'Yes' : 'No') + '</td>' +
        '<td>' + (p.pool ? 'Yes' : 'No') + '</td>' +
        '<td>' + (p.parking ? 'Yes' : 'No') + '</td>' +
        '<td>' + escapeHTML(p.sort || 'default') + '</td>' +
        '<td>' + updated + '</td>' +
      '</tr>';
    }).join('');
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.searchQuery = searchInput.value;
      renderAll();
    });
  }

  function exportToCSV(filename, rows) {
    if (!rows || !rows.length) {
      alert('No data to export.');
      return;
    }
    var keys = Object.keys(rows[0]);
    var csvContent = keys.map(escapeCSV).join(',') + '\r\n';

    rows.forEach(function (row) {
      var line = keys.map(function (k) {
        var val = row[k];
        if (val != null && typeof val === 'object') val = JSON.stringify(val);
        return escapeCSV(val);
      }).join(',');
      csvContent += line + '\r\n';
    });

    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename + '_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function escapeCSV(field) {
    var str = String(field == null ? '' : field);
    if (str.search(/("|,|\n)/g) >= 0) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  var expUsers = document.getElementById('export-users-btn');
  if (expUsers) {
    expUsers.addEventListener('click', function () {
      var exportData = state.users.map(function (u) {
        return {
          'User ID': u.id,
          'Name': u.name,
          'Email': u.email,
          'Mobile Phone': u.phone,
          'Registered Date': u.created_at
        };
      });
      exportToCSV('myshelter_users', exportData);
    });
  }

  var expBookings = document.getElementById('export-bookings-btn');
  if (expBookings) {
    expBookings.addEventListener('click', function () {
      var exportData = state.bookings.map(function (b) {
        return {
          'Booking ID': b.booking_id,
          'Hotel': b.hotel,
          'Room Type': b.room_type,
          'City': b.city,
          'Check In': b.check_in,
          'Nights': b.nights,
          'Guest Name': b.guest_name,
          'Guest Phone': b.guest_phone,
          'Total': b.total,
          'Coupon': b.coupon,
          'Status': b.status,
          'Created At': b.created_at
        };
      });
      exportToCSV('myshelter_bookings', exportData);
    });
  }

  var expPrefs = document.getElementById('export-preferences-btn');
  if (expPrefs) {
    expPrefs.addEventListener('click', function () {
      var exportData = state.preferences.map(function (p) {
        return {
          'User ID': p.user_id,
          'User Name': (p.users && p.users.name) || '',
          'User Email': (p.users && p.users.email) || '',
          'Preferred City': p.preferred_city,
          'Preferred Room Type': p.preferred_type,
          'Query': p.query,
          'Free Cancellation': p.free_cancellation ? 'Yes' : 'No',
          'Breakfast': p.breakfast ? 'Yes' : 'No',
          'Pool': p.pool ? 'Yes' : 'No',
          'Parking': p.parking ? 'Yes' : 'No',
          'Sort': p.sort,
          'Updated At': p.updated_at
        };
      });
      exportToCSV('myshelter_room_preferences', exportData);
    });
  }

  function escapeHTML(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
