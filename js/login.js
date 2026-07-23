document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('badge1').innerHTML = psIcon('shield', 15) + '<span>Spoof-proof</span>';
  document.getElementById('badge2').innerHTML = psIcon('zap', 15) + '<span>Instant check-in</span>';
  document.getElementById('badge3').innerHTML = psIcon('layout', 15) + '<span>Role-based access</span>';

  const loginBtn = document.getElementById('loginSubmitBtn');
  const googleBtn = document.getElementById('googleBtn');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const errorBox = document.getElementById('formError');
  const forgotLink = document.getElementById('forgotLink');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('visible');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('visible');
  }

  function isValidEmailOrId(value) {
    if (!value) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value) || value.trim().length >= 3;
  }

  loginBtn?.addEventListener('click', async () => {
    clearError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!isValidEmailOrId(email)) {
      showError('Enter a valid UserId or Email Address.');
      emailInput.focus();
      return;
    }
    if (!password || password.length < 4) {
      showError('Password must be at least 4 characters.');
      passwordInput.focus();
      return;
    }

    loginBtn.disabled = true;
    let session;
    try {
      session = await Store.loginWithApp(email, password);
    } catch (e) {
      showError(e.message || 'Login failed. Check your email and password.');
      loginBtn.disabled = false;
      return;
    }
    loginBtn.disabled = false;

    if (session.role === 'manager') {
      window.location.href = 'manager.html';
    } else if (session.role === 'employee') {
      window.location.href = 'employee.html';
    } else {
      window.location.href = 'organization.html';
    }
  });

  googleBtn?.addEventListener('click', () => alert('Google login clicked'));

  /* ============================================================
     Forgot password — talks directly to the app's real
     forgot-password flow (3 steps on their backend):
       1. POST /auth/forgot-password  { email }            -> sends OTP
       2. POST /verification/verify-otp { email, otp, purpose } -> verifies it
       3. PUT  /auth/reset-password   { email, newPassword } -> sets it
     This is a small self-contained modal (login.html doesn't load
     shell.js, so it doesn't use PSModal — it reuses the same
     .ps-modal-overlay / .ps-modal CSS classes from theme.css). */
  let fpOverlay = null;

  function closeForgotModal() {
    if (!fpOverlay) return;
    fpOverlay.classList.remove('open');
    setTimeout(() => { fpOverlay?.remove(); fpOverlay = null; }, 200);
    document.removeEventListener('keydown', onFpKeydown);
  }

  function onFpKeydown(e) {
    if (e.key === 'Escape') closeForgotModal();
  }

  function renderFpStepEmail(prefillEmail) {
    fpOverlay.querySelector('.ps-modal-title').textContent = 'Reset your password';
    fpOverlay.querySelector('.ps-modal-subtitle').textContent = "We'll email you a one-time code.";
    const body = fpOverlay.querySelector('.ps-modal-body');
    body.innerHTML = `
      <div class="ps-modal-error"></div>
      <div class="ps-field">
        <label>Email address</label>
        <input type="email" id="fpEmail" placeholder="you@company.com" value="${prefillEmail || ''}">
      </div>
      <div class="ps-modal-actions">
        <button type="button" class="ps-btn ps-btn-ghost" id="fpCancel">Cancel</button>
        <button type="button" class="ps-btn ps-btn-primary" id="fpSendBtn">Send Code</button>
      </div>`;

    const errBox = body.querySelector('.ps-modal-error');
    body.querySelector('#fpCancel').addEventListener('click', closeForgotModal);
    body.querySelector('#fpSendBtn').addEventListener('click', async () => {
      const email = body.querySelector('#fpEmail').value.trim();
      errBox.textContent = '';
      errBox.classList.remove('visible');
      if (!email) {
        errBox.textContent = 'Enter your email address.';
        errBox.classList.add('visible');
        return;
      }
      const btn = body.querySelector('#fpSendBtn');
      btn.disabled = true;
      try {
        await AppStore.forgotPassword(email);
        renderFpStepReset(email);
      } catch (e) {
        errBox.textContent = e.message || 'Could not send the code. Try again.';
        errBox.classList.add('visible');
      }
      btn.disabled = false;
    });
  }

  function renderFpStepReset(email) {
    fpOverlay.querySelector('.ps-modal-title').textContent = 'Enter the code';
    fpOverlay.querySelector('.ps-modal-subtitle').textContent = 'Sent to ' + email + ' — check your inbox.';
    const body = fpOverlay.querySelector('.ps-modal-body');
    body.innerHTML = `
      <div class="ps-modal-error"></div>
      <div class="ps-modal-success" style="display:none; background:rgba(34,197,94,0.12); color:#16a34a; font-size:12.5px; font-weight:600; padding:10px 14px; border-radius:10px; margin-bottom:14px;">Password reset — you can log in now.</div>
      <div class="ps-field">
        <label>One-time code</label>
        <input type="text" id="fpOtp" placeholder="6-digit code">
      </div>
      <div class="ps-field">
        <label>New password</label>
        <input type="password" id="fpNewPass" placeholder="At least 8 characters">
      </div>
      <div class="ps-modal-actions">
        <button type="button" class="ps-btn ps-btn-ghost" id="fpResend">Resend code</button>
        <button type="button" class="ps-btn ps-btn-primary" id="fpResetBtn">Reset Password</button>
      </div>`;

    const errBox = body.querySelector('.ps-modal-error');
    const successBox = body.querySelector('.ps-modal-success');

    body.querySelector('#fpResend').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await AppStore.forgotPassword(email);
        errBox.textContent = '';
        errBox.classList.remove('visible');
      } catch (err) {
        errBox.textContent = err.message || 'Could not resend the code.';
        errBox.classList.add('visible');
      }
      e.target.disabled = false;
    });

    body.querySelector('#fpResetBtn').addEventListener('click', async () => {
      const otp = body.querySelector('#fpOtp').value.trim();
      const newPass = body.querySelector('#fpNewPass').value;
      errBox.textContent = '';
      errBox.classList.remove('visible');

      if (!otp) {
        errBox.textContent = 'Enter the code we emailed you.';
        errBox.classList.add('visible');
        return;
      }
      if (!newPass || newPass.length < 8) {
        errBox.textContent = 'New password must be at least 8 characters.';
        errBox.classList.add('visible');
        return;
      }

      const btn = body.querySelector('#fpResetBtn');
      btn.disabled = true;
      try {
        await AppStore.verifyPasswordResetOtp(email, otp);
        await AppStore.resetPassword(email, newPass);
        successBox.style.display = 'block';
        body.querySelector('#fpOtp').disabled = true;
        body.querySelector('#fpNewPass').disabled = true;
        btn.style.display = 'none';
        body.querySelector('#fpResend').textContent = 'Close';
        body.querySelector('#fpResend').addEventListener('click', () => {
          closeForgotModal();
          emailInput.value = email;
          passwordInput.value = '';
          passwordInput.focus();
        });
      } catch (e) {
        errBox.textContent = e.message || 'Could not reset the password. Check the code and try again.';
        errBox.classList.add('visible');
      }
      btn.disabled = false;
    });
  }

  function openForgotModal() {
    closeForgotModal();
    fpOverlay = document.createElement('div');
    fpOverlay.className = 'ps-modal-overlay';
    fpOverlay.innerHTML = `
      <div class="ps-modal" role="dialog" aria-modal="true">
        <div class="ps-modal-header">
          <div>
            <div class="ps-modal-title"></div>
            <div class="ps-modal-subtitle"></div>
          </div>
          <button type="button" class="ps-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="ps-modal-body"></div>
      </div>`;
    document.body.appendChild(fpOverlay);
    fpOverlay.querySelector('.ps-modal-close').addEventListener('click', closeForgotModal);
    fpOverlay.addEventListener('click', (e) => { if (e.target === fpOverlay) closeForgotModal(); });
    document.addEventListener('keydown', onFpKeydown);
    renderFpStepEmail(emailInput.value.trim());
    requestAnimationFrame(() => fpOverlay.classList.add('open'));
  }

  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openForgotModal();
  });
});
