/* ============================================================
   PRESENZA — App shell
   Builds the sidebar + topbar for every dashboard page from
   document.body.dataset.role / .page / .title, guards auth,
   and wires the notification + logout controls.
   Requires: icons.js and data.js loaded first.
   ============================================================ */

const PS_NAV = {
  organization: [
    { key: 'overview', label: 'Overview', href: 'organization.html', icon: 'home' },
    { key: 'analytics', label: 'Analytics', href: 'analytics.html', icon: 'barChart' },
    { key: 'setup', label: 'Organisation Setup', href: 'profile.html', icon: 'settings' },
    { key: 'shifts', label: 'Shifts & Timetable', href: 'shifts.html', icon: 'calendar' },
    { key: 'codes', label: 'Join Codes', href: 'codes.html', icon: 'key' },
    { key: 'geofencing', label: 'Geofencing', href: 'geofencing.html', icon: 'mapPin' },
    { key: 'wifi', label: 'Wifi / BSSID', href: 'wifi.html', icon: 'wifi' },
    { key: 'members', label: 'Members', href: 'members.html', icon: 'users' },
    { key: 'team', label: 'Team Management', href: 'team.html', icon: 'usersGroup' }
  ],
  manager: [
    { key: 'overview', label: 'Overview', href: 'manager.html', icon: 'home' },
    { key: 'shifts', label: 'Shifts & Timetable', href: 'shifts.html', icon: 'calendar' },
    { key: 'attendance', label: 'Attendance', href: 'attendance.html', icon: 'checkSquare' },
    { key: 'leave', label: 'Leave Request', href: 'manager-leave.html', icon: 'fileText' },
    { key: 'tickets', label: 'Tickets', href: 'tickets.html', icon: 'ticket' },
    { key: 'members', label: 'Members', href: 'manager-members.html', icon: 'users' },
    { key: 'team', label: 'Team', href: 'manager-team.html', icon: 'usersGroup' }
  ],
  employee: [
    { key: 'home', label: 'Home', href: 'employee.html', icon: 'home' }
  ]
};

/* ============================================================
   PSModal — shared, styled replacement for prompt()/confirm().
   Usage:
     PSModal.open({
       title: 'Add member',
       subtitle: 'Optional helper text',
       submitLabel: 'Add member',
       fields: [
         { name: 'name', label: 'Full name', placeholder: 'e.g. Rahul Sharma' },
         { name: 'role', label: 'Role', type: 'select', options: [
             { value: 'Student', label: 'Student' }, { value: 'Professor', label: 'Professor' }
           ] }
       ],
       onSubmit: (values) => { ... }
     });
   ============================================================ */
window.PSModal = (() => {
  let overlayEl = null;

  function close() {
    if (!overlayEl) return;
    overlayEl.classList.remove('open');
    setTimeout(() => { overlayEl?.remove(); overlayEl = null; }, 200);
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function fieldHtml(f) {
    const val = f.value != null ? f.value : '';
    if (f.type === 'select') {
      return `
        <div class="ps-field">
          <label>${f.label}</label>
          <select name="${f.name}" ${f.required === false ? '' : 'required'}>
            ${(f.options || []).map(o => `<option value="${o.value}" ${o.value === val ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>`;
    }
    return `
      <div class="ps-field">
        <label>${f.label}</label>
        <input type="${f.type || 'text'}" name="${f.name}" placeholder="${f.placeholder || ''}" value="${val}" ${f.required === false ? '' : 'required'}>
      </div>`;
  }

  function open({ title, subtitle = '', fields = [], submitLabel = 'Save', cancelLabel = 'Cancel', onSubmit }) {
    close();

    overlayEl = document.createElement('div');
    overlayEl.className = 'ps-modal-overlay';
    overlayEl.innerHTML = `
      <div class="ps-modal" role="dialog" aria-modal="true">
        <div class="ps-modal-header">
          <div>
            <div class="ps-modal-title">${title}</div>
            ${subtitle ? `<div class="ps-modal-subtitle">${subtitle}</div>` : ''}
          </div>
          <button type="button" class="ps-modal-close" aria-label="Close">&times;</button>
        </div>
        <form class="ps-modal-body">
          <div class="ps-modal-error"></div>
          ${fields.map(fieldHtml).join('')}
          <div class="ps-modal-actions">
            <button type="button" class="ps-btn ps-btn-ghost ps-modal-cancel">${cancelLabel}</button>
            <button type="submit" class="ps-btn ps-btn-primary">${submitLabel}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlayEl);
    requestAnimationFrame(() => overlayEl.classList.add('open'));

    const form = overlayEl.querySelector('form');
    const errorBox = overlayEl.querySelector('.ps-modal-error');
    const firstInput = overlayEl.querySelector('input, select');
    setTimeout(() => firstInput?.focus(), 50);

    overlayEl.querySelector('.ps-modal-close').addEventListener('click', close);
    overlayEl.querySelector('.ps-modal-cancel').addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) close(); });
    document.addEventListener('keydown', onKeydown);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = {};
      fields.forEach(f => { values[f.name] = form.elements[f.name]?.value?.trim() ?? ''; });

      for (const f of fields) {
        if (f.required !== false && !values[f.name]) {
          errorBox.textContent = `${f.label} is required.`;
          errorBox.classList.add('visible');
          form.elements[f.name]?.focus();
          return;
        }
      }
      errorBox.classList.remove('visible');
      onSubmit?.(values);
      close();
    });
  }

  return { open, close };
})();

(async () => {
  const body = document.body;
  const declaredRole = body.dataset.role;
  // Some pages (e.g. Shifts & Timetable) are shared by more than one role. Those set
  // data-roles="organization,manager" (plural) listing everyone allowed on the page;
  // data-role stays as a sensible default/fallback for pages used by a single role.
  const rolesAttr = body.dataset.roles;
  const allowedRoles = rolesAttr ? rolesAttr.split(',').map(r => r.trim()) : (declaredRole ? [declaredRole] : null);
  const pageKey = body.dataset.page;
  const title = body.dataset.title || '';
  const subtitle = body.dataset.subtitle || '';

  let session = null;
  if (allowedRoles) {
    session = Store.requireAuth(allowedRoles); // sync — localStorage only, no network
    if (!session) return;
  } else {
    session = (await Store.get()).session;
  }

  // Always render the nav/sidebar for the user's ACTUAL role, not the page's declared
  // default — otherwise an organization user on a shared page would see the manager's nav.
  const role = session?.role || declaredRole;

  document.addEventListener('DOMContentLoaded', () => {
    const navItems = PS_NAV[role] || [];
    const initials = (session?.name || 'A').slice(0, 2).toUpperCase();

    const mockNotifications = [
      { icon: 'checkSquare', text: 'Rahul Sharma checked in at Room 101', time: '2 min ago' },
      { icon: 'mapPin', text: 'New geofence zone added', time: '15 min ago' },
      { icon: 'ticket', text: 'Device change request needs review', time: '1 hr ago' },
      { icon: 'fileText', text: 'Leave request approved for Priya', time: '3 hr ago' }
    ];

    const hero = document.createElement('header');
    hero.className = 'ps-hero';
    hero.innerHTML = `
      <div class="ps-hero-blobs" aria-hidden="true">
        <span class="b b1"></span><span class="b b2"></span><span class="b b3"></span>
        <span class="b b4"></span><span class="b b5"></span><span class="b b6"></span>
        <span class="b b7"></span><span class="b b8"></span>
      </div>
      <div class="ps-hero-inner">
        <a href="${role === 'organization' ? 'organization.html' : role === 'manager' ? 'manager.html' : 'employee.html'}" class="ps-hero-logo">
          <span class="mark"><img src="../images/presenza-logo.svg" alt="Presenza" class="ps-logo"></span>
          <span class="name">Presenza</span>
        </a>
        <div class="ps-hero-titlewrap">
          <h1 class="ps-hero-title">${title}</h1>
          ${subtitle ? `<p class="ps-hero-subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="ps-hero-actions">
          <button class="ps-icon-btn ps-icon-btn-ghost" id="psNotifBtn">
            ${psIcon('bell', 18)}
            <span class="ps-badge-dot"></span>
          </button>
          <div class="ps-notif-panel" id="psNotifPanel">
            <div class="ps-notif-header">Notifications</div>
            ${mockNotifications.map(n => `
              <div class="ps-notif-item">
                <div class="ps-notif-icon">${psIcon(n.icon, 15)}</div>
                <div>
                  <div class="ps-notif-text">${n.text}</div>
                  <div class="ps-notif-time">${n.time}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <button class="ps-hero-avatar" id="psAvatarBtn">${initials}</button>
          <div class="ps-account-panel" id="psAccountPanel">
            <div class="ps-account-name">${session?.name || 'Guest'}</div>
            <div class="ps-account-role">${session?.role || ''}</div>
            <button class="ps-btn ps-btn-ghost" id="psLogoutBtn" style="width:100%; justify-content:center; margin-top:10px;">
              ${psIcon('logout', 15)} Log out
            </button>
          </div>
        </div>
      </div>
    `;

    const navStrip = document.createElement('nav');
    navStrip.className = 'ps-nav-strip';
    navStrip.innerHTML = `
      <ul class="ps-nav">
        ${navItems.map(item => `
          <li>
            <a href="${item.href}" class="${item.key === pageKey ? 'active' : ''}">
              ${psIcon(item.icon, 17)}
              <span>${item.label}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    `;

    const mainArea = document.createElement('div');
    mainArea.className = 'ps-main-area';

    const existingMain = document.querySelector('main');
    if (existingMain) {
      existingMain.classList.add('ps-content');
      mainArea.appendChild(existingMain);
    }

    body.classList.add('app-shell');
    body.insertBefore(mainArea, body.firstChild);
    body.insertBefore(navStrip, body.firstChild);
    body.insertBefore(hero, body.firstChild);

    document.getElementById('psLogoutBtn')?.addEventListener('click', () => {
      Store.logout();
      window.location.href = 'login.html';
    });

    const notifBtn = document.getElementById('psNotifBtn');
    const notifPanel = document.getElementById('psNotifPanel');
    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      accountPanel?.classList.remove('open');
      notifPanel.classList.toggle('open');
    });

    const avatarBtn = document.getElementById('psAvatarBtn');
    const accountPanel = document.getElementById('psAccountPanel');
    avatarBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel?.classList.remove('open');
      accountPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (notifPanel && !notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.classList.remove('open');
      }
      if (accountPanel && !accountPanel.contains(e.target) && e.target !== avatarBtn) {
        accountPanel.classList.remove('open');
      }
    });
  });
})();