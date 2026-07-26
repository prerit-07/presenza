document.addEventListener('DOMContentLoaded', async () => {
  const main = document.getElementById('tixMain');
  const banner = document.getElementById('appConnBanner');

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = '<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>' + escapeAppHtml(me.username) + '</b> (' + escapeAppHtml(me.role) + ')';
  } catch (err) {
    banner.innerHTML = '<span class="ps-chip ps-chip-danger">Not connected</span> ' + escapeAppHtml(err.message);
    main.innerHTML = '<div class="ps-empty">Couldn\'t connect to the app.</div>';
    return;
  }

  let employees = [];
  try { employees = await AppStore.getAllEmployees(); } catch { /* used to resolve names, non-fatal */ }
  const employeeByUserId = {};
  employees.forEach((e) => { employeeByUserId[e.userId] = e.employeeName; });

  async function load() {
    let requests = [];
    try {
      requests = (await AppStore.getPendingDeviceChangeRequests()) || [];
    } catch (err) {
      main.innerHTML = err.status === 403
        ? '<div class="ps-empty">Needs an org-admin account on their side to review requests.</div>'
        : '<div class="ps-empty">Couldn\'t load device change requests (' + escapeAppHtml(err.message) + ').</div>';
      return;
    }

    if (!requests.length) {
      main.innerHTML = '<div class="ps-empty">No pending device change requests.</div>';
      return;
    }

    main.innerHTML = requests.map((r) => {
      const name = employeeByUserId[r.userId] || ('User #' + r.userId);
      return `
        <div class="tix-card" data-request-id="${r.requestId}">
          <div class="tix-top">
            <div class="tix-user">
              <div class="tix-avatar">${escapeAppHtml(String(name).slice(0, 2).toUpperCase())}</div>
              <div>
                <div class="tix-name">${escapeAppHtml(name)}</div>
                <div class="tix-section">Device change request</div>
              </div>
            </div>
            <span class="ps-chip ps-chip-warn">${escapeAppHtml(r.status || 'Pending')}</span>
          </div>
          <div class="tix-body">
            <div class="tix-devices">
              <div><b>OLD DEVICE:</b> ${escapeAppHtml(r.oldDeviceId || '—')}</div>
              <div><b>NEW DEVICE:</b> ${escapeAppHtml(r.newDeviceId || '—')}</div>
              <div><b>Reason:</b> ${escapeAppHtml(r.reason || '-')}</div>
            </div>
            <div class="tix-actions">
              <button class="ps-btn ps-btn-primary btn-approve">Approve</button>
              <button class="ps-btn ps-btn-danger btn-reject">Reject</button>
            </div>
          </div>
          <div class="tix-time">${r.requestedAt ? escapeAppHtml(new Date(r.requestedAt).toLocaleString()) : ''}</div>
        </div>`;
    }).join('');
  }

  await load();

  main.addEventListener('click', async (e) => {
    const card = e.target.closest('.tix-card');
    if (!card) return;
    const requestId = Number(card.dataset.requestId);
    const approved = !!e.target.closest('.btn-approve');
    const rejected = !!e.target.closest('.btn-reject');
    if (!approved && !rejected) return;

    if (!confirm((approved ? 'Approve' : 'Reject') + ' this device change request?')) return;

    try {
      await AppStore.reviewDeviceChangeRequest(requestId, approved);
      await load();
    } catch (err) {
      alert('Could not submit review: ' + err.message);
    }
  });
});
