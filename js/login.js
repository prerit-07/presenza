document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('badge1').innerHTML = psIcon('shield', 15) + '<span>Spoof-proof</span>';
  document.getElementById('badge2').innerHTML = psIcon('zap', 15) + '<span>Instant check-in</span>';
  document.getElementById('badge3').innerHTML = psIcon('layout', 15) + '<span>Role-based access</span>';

  const loginBtn = document.getElementById('loginSubmitBtn');
  const googleBtn = document.getElementById('googleBtn');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const errorBox = document.getElementById('formError');

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

    let session;
    try {
      session = await Store.loginWithPassword(email, password);
    } catch (e) {
      showError(e.message || 'Login failed. Check your email and password.');
      return;
    }

    if (session.role === 'manager') {
      window.location.href = 'manager.html';
    } else if (session.role === 'employee') {
      window.location.href = 'employee.html';
    } else {
      window.location.href = 'organization.html';
    }
  });

  googleBtn?.addEventListener('click', () => alert('Google login clicked'));
});