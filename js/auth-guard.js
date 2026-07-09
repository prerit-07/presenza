/* ============================================================
   Shared auth guard + logout control for every dashboard page.
   Include AFTER data.js and BEFORE the page's own script.
   ============================================================ */
(async () => {
  const isManagerPage = !!document.querySelector('.mgr-tabs');
  const isOrgPage = !!document.querySelector('.org-tabs, .profile-tabs, .codes-tabs, .geo-tabs, .wifi-tabs, .members-tabs, .team-tabs');

  const allowedRoles = isManagerPage ? ['manager'] : isOrgPage ? ['organization'] : null;

  let session = null;
  if (allowedRoles) {
    session = Store.requireAuth(allowedRoles); // sync — localStorage only, no network
    if (!session) return; // requireAuth already redirected to login
  } else {
    session = (await Store.get()).session;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    if (!header) return;

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'auth-logout-btn';
    logoutBtn.textContent = session ? `Logout (${session.name})` : 'Logout';
    logoutBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 20px;
      z-index: 3;
      background: rgba(255,255,255,0.15);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.4);
      padding: 8px 16px;
      border-radius: 18px;
      font-family: 'Poppins', sans-serif;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    `;
    logoutBtn.addEventListener('click', () => {
      Store.logout();
      window.location.href = 'login.html';
    });
    header.style.position = header.style.position || 'relative';
    header.appendChild(logoutBtn);
  });
})();
