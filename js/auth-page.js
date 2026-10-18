/*
 * MYSHELTER — Auth Page Controller (auth.html)
 */
document.addEventListener('DOMContentLoaded', function () {
  var tabLogin = document.getElementById('tab-login');
  var tabRegister = document.getElementById('tab-register');
  var panelLogin = document.getElementById('login-panel');
  var panelRegister = document.getElementById('register-panel');
  var signedInCard = document.getElementById('signed-in-card');
  var authFormCard = document.getElementById('auth-form-card');
  var signedInDetails = document.getElementById('signed-in-details');
  var signoutBtn = document.getElementById('auth-page-signout');

  function checkCurrentAuth() {
    if (window.MyShelterAuth && window.MyShelterAuth.isLoggedIn()) {
      var user = window.MyShelterAuth.getUser();
      if (signedInCard) signedInCard.hidden = false;
      if (authFormCard) authFormCard.hidden = true;
      if (signedInDetails && user) {
        signedInDetails.textContent = 'Signed in as ' + user.name + ' (' + user.email + ') · ' + (user.phone ? '+91 ' + user.phone : '');
      }
    } else {
      if (signedInCard) signedInCard.hidden = true;
      if (authFormCard) authFormCard.hidden = false;
    }
  }

  checkCurrentAuth();

  if (signoutBtn) {
    signoutBtn.addEventListener('click', function () {
      window.MyShelterAuth.logout();
      checkCurrentAuth();
    });
  }

  function switchTab(mode) {
    if (mode === 'register') {
      tabRegister.classList.add('is-active');
      tabRegister.setAttribute('aria-selected', 'true');
      tabLogin.classList.remove('is-active');
      tabLogin.setAttribute('aria-selected', 'false');
      panelRegister.hidden = false;
      panelLogin.hidden = true;
    } else {
      tabLogin.classList.add('is-active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabRegister.classList.remove('is-active');
      tabRegister.setAttribute('aria-selected', 'false');
      panelLogin.hidden = false;
      panelRegister.hidden = true;
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', function () { switchTab('login'); });
  if (tabRegister) tabRegister.addEventListener('click', function () { switchTab('register'); });

  var params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'register') switchTab('register');
  var redirectUrl = params.get('redirect') || 'index.html';

  // 1. Sign In submission
  var loginForm = document.getElementById('login-form');
  var loginBtn = document.getElementById('login-btn');
  var loginEmailErr = document.getElementById('login-email-error');
  var loginPassErr = document.getElementById('login-password-error');

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      loginEmailErr.textContent = '';
      loginPassErr.textContent = '';
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;

      if (!email) { loginEmailErr.textContent = 'Please enter your email.'; return; }
      if (!password) { loginPassErr.textContent = 'Please enter your password.'; return; }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in…';

      try {
        var res = await window.MyShelterAuth.login(email, password);
        if (res.ok) {
          window.MyShelterUI.toast('Welcome back, ' + res.user.name.split(' ')[0] + '!', 'success');
          setTimeout(function () { window.location.href = redirectUrl; }, 600);
        } else {
          loginPassErr.textContent = res.error || (res.errors && (res.errors.email || res.errors.password)) || 'Sign in failed.';
          window.MyShelterUI.toast(res.error || 'Sign in failed.', 'error');
        }
      } catch (err) {
        loginPassErr.textContent = 'Network or server error. Please try again.';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    });
  }

  // 2. Register submission
  var regForm = document.getElementById('register-form');
  var regBtn = document.getElementById('reg-btn');
  var regNameErr = document.getElementById('reg-name-error');
  var regEmailErr = document.getElementById('reg-email-error');
  var regPhoneErr = document.getElementById('reg-phone-error');
  var regPassErr = document.getElementById('reg-password-error');

  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      regNameErr.textContent = '';
      regEmailErr.textContent = '';
      regPhoneErr.textContent = '';
      regPassErr.textContent = '';

      var name = document.getElementById('reg-name').value.trim();
      var email = document.getElementById('reg-email').value.trim();
      var phone = document.getElementById('reg-phone').value.trim();
      var password = document.getElementById('reg-password').value;

      var hasError = false;
      if (!name || name.length < 2) { regNameErr.textContent = 'Full name must be at least 2 characters.'; hasError = true; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { regEmailErr.textContent = 'Please enter a valid email address.'; hasError = true; }
      var normPhone = phone.replace(/\D/g, '');
      if (normPhone.length === 12 && normPhone.indexOf('91') === 0) normPhone = normPhone.slice(2);
      if (normPhone.length === 11 && normPhone.charAt(0) === '0') normPhone = normPhone.slice(1);
      if (!normPhone || normPhone.length !== 10 || !/^[6-9]\d{9}$/.test(normPhone)) {
        regPhoneErr.textContent = 'Enter a valid 10-digit Indian mobile number.'; hasError = true;
      }
      if (!password || password.length < 6) { regPassErr.textContent = 'Password must be at least 6 characters.'; hasError = true; }

      if (hasError) return;

      regBtn.disabled = true;
      regBtn.textContent = 'Creating account…';

      try {
        var res = await window.MyShelterAuth.register({
          name: name,
          email: email,
          phone: normPhone,
          password: password
        });

        if (res.ok) {
          window.MyShelterUI.toast('Account created! Welcome, ' + res.user.name.split(' ')[0] + '.', 'success');
          setTimeout(function () { window.location.href = redirectUrl; }, 600);
        } else {
          if (res.errors) {
            if (res.errors.name) regNameErr.textContent = res.errors.name;
            if (res.errors.email) regEmailErr.textContent = res.errors.email;
            if (res.errors.phone) regPhoneErr.textContent = res.errors.phone;
            if (res.errors.password) regPassErr.textContent = res.errors.password;
          }
          window.MyShelterUI.toast(res.error || 'Please correct the form fields.', 'error');
        }
      } catch (err) {
        regPassErr.textContent = 'Server connection error. Please try again.';
      } finally {
        regBtn.disabled = false;
        regBtn.textContent = 'Create Account';
      }
    });
  }
});

