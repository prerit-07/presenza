document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('badge1').innerHTML = psIcon('shield', 15) + '<span>Free to start</span>';
  document.getElementById('badge2').innerHTML = psIcon('zap', 15) + '<span>No credit card needed</span>';
  document.getElementById('badge3').innerHTML = psIcon('layout', 15) + '<span>Ready in minutes</span>';

  const tabs = document.querySelectorAll('.signup-tab');
  const panels = document.querySelectorAll('.signup-panel');
  const errorBox = document.getElementById('formError');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('visible');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('visible');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      clearError();
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  function redirectForRole(role) {
    if (role === 'manager') window.location.href = 'manager.html';
    else if (role === 'employee') window.location.href = 'employee.html';
    else window.location.href = 'organization.html';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------- create organization ----------
  document.getElementById('panelOrg').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const organizationName = document.getElementById('orgName').value.trim();
    const domain = document.getElementById('orgDomain').value.trim();
    const adminName = document.getElementById('orgAdminName').value.trim();
    const email = document.getElementById('orgEmail').value.trim();
    const password = document.getElementById('orgPassword').value;

    if (!organizationName) { showError('Organization name is required.'); return; }
    if (!adminName) { showError('Enter your full name.'); return; }
    if (!emailPattern.test(email)) { showError('Enter a valid work email.'); return; }
    if (!password || password.length < 4) { showError('Password must be at least 4 characters.'); return; }

    try {
      const session = await Store.signupOrganization({ organizationName, domain, adminName, email, password });
      redirectForRole(session.role);
    } catch (err) {
      showError(err.message || 'Could not create your organization. Please try again.');
    }
  });

  // ---------- join with code ----------
  document.getElementById('panelJoin').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const joinCode = document.getElementById('joinCode').value.trim().toUpperCase();
    const name = document.getElementById('joinName').value.trim();
    const email = document.getElementById('joinEmail').value.trim();
    const password = document.getElementById('joinPassword').value;

    if (!joinCode) { showError('Enter the join code from your admin.'); return; }
    if (!name) { showError('Enter your full name.'); return; }
    if (!emailPattern.test(email)) { showError('Enter a valid email address.'); return; }
    if (!password || password.length < 4) { showError('Password must be at least 4 characters.'); return; }

    try {
      const session = await Store.joinWithCode({ name, email, password, joinCode });
      redirectForRole(session.role);
    } catch (err) {
      showError(err.message || 'Could not join with that code. Please check it and try again.');
    }
  });

  document.getElementById('googleBtn')?.addEventListener('click', () => alert('Google sign-up clicked'));
});
