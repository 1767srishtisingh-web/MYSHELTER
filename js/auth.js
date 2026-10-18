/*
 * MYSHELTER — Client-Side Authentication & Session Manager
 * Handles user sessions, login/register API calls, and syncs the navigation bar.
 */
(function (root) {
  'use strict';

  var TOKEN_KEY = 'myshelter:auth_token';
  var USER_KEY = 'myshelter:auth_user';

  function safeStorage(kind) {
    try {
      var s = root[kind];
      var k = '__probe__';
      s.setItem(k, '1');
      s.removeItem(k);
      return s;
    } catch (e) {
      return null;
    }
  }

  var storage = safeStorage('localStorage');

  var Auth = {
    getToken: function () {
      if (!storage) return null;
      try { return storage.getItem(TOKEN_KEY); } catch (e) { return null; }
    },

    getUser: function () {
      if (!storage) return null;
      try {
        var raw = storage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    isLoggedIn: function () {
      return Boolean(Auth.getToken() && Auth.getUser());
    },

    setSession: function (user, token) {
      if (!storage) return;
      try {
        if (token) storage.setItem(TOKEN_KEY, token);
        if (user) storage.setItem(USER_KEY, JSON.stringify(user));
        Auth.updateNav();
      } catch (e) {
        console.warn('Storage error saving session:', e);
      }
    },

    logout: function () {
      if (!storage) return;
      try {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
      } catch (e) { /* ignore */ }
      root.location.replace('auth.html');
    },

    enforceAuth: function () {
      var page = document.body ? document.body.dataset.page : '';
      if (page === 'admin') return;
      var loggedIn = Auth.isLoggedIn();
      if (page === 'auth') {
        if (loggedIn) root.location.replace('index.html');
      } else {
        if (!loggedIn) root.location.replace('auth.html');
      }
    },

    authFetch: function (url, options) {
      options = options || {};
      options.headers = options.headers || {};
      var token = Auth.getToken();
      if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
      }
      return fetch(url, options);
    },

    register: async function (data) {
      var res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      var json = await res.json();
      if (json.ok && json.user && json.token) {
        Auth.setSession(json.user, json.token);
      }
      return json;
    },

    login: async function (email, password) {
      var res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var json = await res.json();
      if (json.ok && json.user && json.token) {
        Auth.setSession(json.user, json.token);
      }
      return json;
    },

    checkSession: async function () {
      var token = Auth.getToken();
      if (!token) {
        Auth.updateNav();
        return null;
      }
      try {
        var res = await Auth.authFetch('/api/auth/me');
        var json = await res.json();
        if (json.ok && json.user) {
          Auth.setSession(json.user, token);
          return json.user;
        } else if (res.status === 401) {
          Auth.logout();
        }
      } catch (e) {
        // Network offline or local dev without serverless functions
      }
      Auth.updateNav();
      return Auth.getUser();
    },

    updateNav: function () {
      var user = Auth.getUser();
      var navLinks = document.querySelector('.nav-links');
      if (!navLinks) return;

      var existingAuth = document.getElementById('nav-auth-item');
      if (existingAuth) existingAuth.remove();

      var authContainer = document.createElement('div');
      authContainer.id = 'nav-auth-item';
      authContainer.className = 'nav-auth-wrapper';

      if (user && user.name) {
        var firstName = user.name.split(' ')[0];
        authContainer.innerHTML = '' +
          '<div class="user-pill desktop-only">' +
            '<span class="user-greeting">Hi, ' + escapeHTML(firstName) + '</span>' +
            '<button type="button" class="btn-signout" id="nav-signout-btn" title="Sign out" aria-label="Sign out">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>' +
              '<span>Sign out</span>' +
            '</button>' +
          '</div>' +
          '<div class="mobile-user-menu mobile-only">' +
            '<button type="button" class="mobile-user-trigger" id="mobile-user-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">' +
              '<span class="mobile-user-avatar">' + escapeHTML(firstName.charAt(0).toUpperCase()) + '</span>' +
              '<span class="mobile-user-name">' + escapeHTML(firstName) + '</span>' +
              '<svg class="mobile-user-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
            '</button>' +
            '<div class="mobile-user-dropdown" id="mobile-user-dropdown" role="menu" hidden>' +
              '<div class="mobile-menu-profile">' +
                '<strong class="mobile-menu-fullname">' + escapeHTML(user.name) + '</strong>' +
                '<span class="mobile-menu-email">' + escapeHTML(user.email) + '</span>' +
              '</div>' +
              '<button type="button" class="mobile-menu-signout" id="mobile-signout-btn" role="menuitem">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>' +
                '<span>Sign out</span>' +
              '</button>' +
            '</div>' +
          '</div>';

        navLinks.appendChild(authContainer);

        var signoutBtn = document.getElementById('nav-signout-btn');
        if (signoutBtn) {
          signoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            Auth.logout();
          });
        }

        var mobileTrigger = document.getElementById('mobile-user-trigger');
        var mobileDropdown = document.getElementById('mobile-user-dropdown');
        var mobileSignout = document.getElementById('mobile-signout-btn');

        if (mobileTrigger && mobileDropdown) {
          mobileTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = !mobileDropdown.hidden;
            mobileDropdown.hidden = isOpen;
            mobileTrigger.setAttribute('aria-expanded', String(!isOpen));
          });

          document.addEventListener('click', function (e) {
            if (!authContainer.contains(e.target)) {
              mobileDropdown.hidden = true;
              mobileTrigger.setAttribute('aria-expanded', 'false');
            }
          });
        }

        if (mobileSignout) {
          mobileSignout.addEventListener('click', function (e) {
            e.preventDefault();
            Auth.logout();
          });
        }
      } else {
        var isAuthPage = document.body.dataset.page === 'auth';
        authContainer.innerHTML = '' +
          '<a class="nav-link nav-link--auth' + (isAuthPage ? ' is-active' : '') + '" href="auth.html">' +
            '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>' +
            '<span>Sign In</span>' +
          '</a>';
        navLinks.appendChild(authContainer);
      }
    }
  };

  function escapeHTML(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', function () {
    Auth.enforceAuth();
    Auth.updateNav();
    if (Auth.isLoggedIn()) {
      Auth.checkSession();
    }
  });

  root.MyShelterAuth = Auth;
})(typeof window !== 'undefined' ? window : globalThis);

