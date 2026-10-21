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

  // Signed-in email verification elements
  var signedInVerifyContainer = document.getElementById('signed-in-verify-container');
  var signedInBadge = document.getElementById('signed-in-verified-badge');
  var signedInSendOtpBtn = document.getElementById('signed-in-send-otp-btn');
  var signedInOtpFlow = document.getElementById('signed-in-otp-flow');
  var signedInOtpInput = document.getElementById('signed-in-otp-code');
  var signedInOtpVerifyBtn = document.getElementById('signed-in-otp-verify-btn');
  var signedInOtpError = document.getElementById('signed-in-otp-error');

  function checkCurrentAuth() {
    if (window.MyShelterAuth && window.MyShelterAuth.isLoggedIn()) {
      var user = window.MyShelterAuth.getUser();
      if (signedInCard) signedInCard.hidden = false;
      if (authFormCard) authFormCard.hidden = true;
      if (signedInDetails && user) {
        signedInDetails.textContent = 'Signed in as ' + user.name + ' (' + user.email + ') · ' + (user.phone ? '+91 ' + user.phone : '');
      }

      if (signedInVerifyContainer && user) {
        signedInVerifyContainer.hidden = false;
        if (user.emailVerified) {
          if (signedInBadge) {
            signedInBadge.textContent = 'Verified';
            signedInBadge.style.background = '#e6f4ea';
            signedInBadge.style.color = '#137333';
          }
          if (signedInSendOtpBtn) signedInSendOtpBtn.style.display = 'none';
          if (signedInOtpFlow) signedInOtpFlow.style.display = 'none';
        } else {
          if (signedInBadge) {
            signedInBadge.textContent = 'Unverified';
            signedInBadge.style.background = '#fde8e8';
            signedInBadge.style.color = '#c53030';
          }
          if (signedInSendOtpBtn) signedInSendOtpBtn.style.display = 'block';
        }
      }
    } else {
      if (signedInCard) signedInCard.hidden = true;
      if (authFormCard) authFormCard.hidden = false;
      if (signedInVerifyContainer) signedInVerifyContainer.hidden = true;
    }
  }

  checkCurrentAuth();

  // Signed-in email OTP verification triggers
  if (signedInSendOtpBtn) {
    signedInSendOtpBtn.addEventListener('click', async function () {
      var user = window.MyShelterAuth.getUser();
      if (!user || !user.email) return;
      signedInSendOtpBtn.disabled = true;
      signedInSendOtpBtn.textContent = 'Sending code…';
      try {
        var res = await window.MyShelterAuth.sendOtp(user.email);
        if (res.ok) {
          if (window.MyShelterUI) window.MyShelterUI.toast('Verification code sent to ' + user.email, 'success');
          if (signedInOtpFlow) signedInOtpFlow.style.display = 'block';
          signedInSendOtpBtn.textContent = 'Resend Code';
        } else {
          if (window.MyShelterUI) window.MyShelterUI.toast(res.error || 'Failed to send verification code.', 'error');
          signedInSendOtpBtn.textContent = 'Send Verification Code';
        }
      } catch (err) {
        if (window.MyShelterUI) window.MyShelterUI.toast('Network error sending code.', 'error');
        signedInSendOtpBtn.textContent = 'Send Verification Code';
      } finally {
        signedInSendOtpBtn.disabled = false;
      }
    });
  }

  if (signedInOtpVerifyBtn) {
    signedInOtpVerifyBtn.addEventListener('click', async function () {
      var user = window.MyShelterAuth.getUser();
      if (!user || !user.email) return;
      var code = signedInOtpInput ? signedInOtpInput.value.trim() : '';
      if (!code) {
        if (signedInOtpError) signedInOtpError.textContent = 'Please enter the 6-digit code.';
        return;
      }
      if (signedInOtpError) signedInOtpError.textContent = '';
      signedInOtpVerifyBtn.disabled = true;
      signedInOtpVerifyBtn.textContent = 'Verifying…';

      try {
        var res = await window.MyShelterAuth.verifyOtp(user.email, code);
        if (res.ok && res.verified) {
          if (window.MyShelterUI) window.MyShelterUI.toast('Email verified successfully!', 'success');
          checkCurrentAuth();
        } else {
          if (signedInOtpError) signedInOtpError.textContent = res.error || 'Invalid or expired code.';
        }
      } catch (err) {
        if (signedInOtpError) signedInOtpError.textContent = 'Server error during verification.';
      } finally {
        signedInOtpVerifyBtn.disabled = false;
        signedInOtpVerifyBtn.textContent = 'Verify';
      }
    });
  }

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

      if (!email) { loginEmailErr.textContent = 'Please enter your email address.'; return; }
      if (!password) { loginPassErr.textContent = 'Please enter your password.'; return; }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in…';

      try {
        var res = await window.MyShelterAuth.login(email, password);
        if (res.ok) {
          window.MyShelterUI.toast('Welcome back, ' + res.user.name.split(' ')[0] + '!', 'success');
          setTimeout(function () { window.location.replace('index.html'); }, 400);
        } else {
          var err = res.error || (res.errors && (res.errors.email || res.errors.password)) || 'Sign in failed.';
          if (res.field === 'email' || /email/i.test(err)) {
            loginEmailErr.textContent = err;
          } else {
            loginPassErr.textContent = err;
          }
          window.MyShelterUI.toast(err, 'error');
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
          var registeredEmail = res.user.email;
          var regModal = document.getElementById('reg-success-dialog');
          var nameEl = document.getElementById('reg-modal-name');
          var emailEl = document.getElementById('reg-modal-email');
          var phoneEl = document.getElementById('reg-modal-phone');
          var continueBtn = document.getElementById('reg-modal-continue-btn');

          var otpCodeInput = document.getElementById('otp-code-input');
          var otpVerifyBtn = document.getElementById('otp-verify-btn');
          var otpCodeError = document.getElementById('otp-code-error');
          var otpVerifiedState = document.getElementById('otp-verified-state');
          var otpResendBtn = document.getElementById('otp-resend-btn');

          if (nameEl) nameEl.textContent = res.user.name;
          if (emailEl) emailEl.textContent = res.user.email;
          if (phoneEl) phoneEl.textContent = res.user.phone ? '+91 ' + res.user.phone : '—';

          // Request initial OTP for the new account
          try {
            await window.MyShelterAuth.sendOtp(registeredEmail);
          } catch (e) {
            console.warn('Initial OTP request note:', e);
          }

          // Setup OTP verify action
          if (otpVerifyBtn) {
            otpVerifyBtn.onclick = async function () {
              var code = otpCodeInput ? otpCodeInput.value.trim() : '';
              if (!code) {
                if (otpCodeError) otpCodeError.textContent = 'Please enter the 6-digit code.';
                return;
              }
              if (otpCodeError) otpCodeError.textContent = '';
              otpVerifyBtn.disabled = true;
              otpVerifyBtn.textContent = 'Verifying…';

              try {
                var verifyRes = await window.MyShelterAuth.verifyOtp(registeredEmail, code);
                if (verifyRes.ok && verifyRes.verified) {
                  if (otpVerifiedState) otpVerifiedState.style.display = 'block';
                  if (otpCodeInput) otpCodeInput.disabled = true;
                  otpVerifyBtn.style.display = 'none';
                  if (window.MyShelterUI) window.MyShelterUI.toast('Email verified successfully!', 'success');
                } else {
                  if (otpCodeError) otpCodeError.textContent = verifyRes.error || 'Invalid or expired code.';
                }
              } catch (err) {
                if (otpCodeError) otpCodeError.textContent = 'Verification error. Please try again.';
              } finally {
                otpVerifyBtn.disabled = false;
                if (otpVerifyBtn.style.display !== 'none') otpVerifyBtn.textContent = 'Verify';
              }
            };
          }

          // Setup OTP resend action
          if (otpResendBtn) {
            otpResendBtn.onclick = async function () {
              if (otpCodeError) otpCodeError.textContent = '';
              otpResendBtn.disabled = true;
              otpResendBtn.textContent = 'Sending…';
              try {
                var sendRes = await window.MyShelterAuth.sendOtp(registeredEmail);
                if (sendRes.ok) {
                  if (window.MyShelterUI) window.MyShelterUI.toast('Verification code sent to ' + registeredEmail, 'success');
                } else {
                  if (otpCodeError) otpCodeError.textContent = sendRes.error || 'Failed to resend code.';
                }
              } catch (e) {
                if (otpCodeError) otpCodeError.textContent = 'Network error resending code.';
              } finally {
                otpResendBtn.disabled = false;
                otpResendBtn.textContent = 'Resend OTP';
              }
            };
          }

          if (regModal && typeof regModal.showModal === 'function') {
            regModal.showModal();

            if (continueBtn) {
              continueBtn.onclick = function () {
                window.location.replace('index.html');
              };
            }

            regModal.onclick = function (e) {
              if (e.target === regModal) {
                regModal.close();
                window.location.replace('index.html');
              }
            };
          } else {
            window.MyShelterUI.toast('Account created! Welcome, ' + res.user.name.split(' ')[0] + '.', 'success');
            setTimeout(function () { window.location.replace('index.html'); }, 500);
          }
        } else {
          if (res.errors) {
            if (res.errors.name) regNameErr.textContent = res.errors.name;
            if (res.errors.email) regEmailErr.textContent = res.errors.email;
            if (res.errors.phone) regPhoneErr.textContent = res.errors.phone;
            if (res.errors.password) regPassErr.textContent = res.errors.password;
          }
          window.MyShelterUI.toast(res.error || (res.errors && res.errors.email) || 'Please correct the form fields.', 'error');
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
