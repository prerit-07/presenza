document.addEventListener('DOMContentLoaded', async () => {
  const main = document.getElementById('leaveMain');
  const countEl = document.getElementById('leaveCount');
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

  function fmt(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function dateRange(r) {
    if (r.startDate && r.endDate && r.startDate !== r.endDate) return fmt(r.startDate) + ' – ' + fmt(r.endDate);
    return fmt(r.startDate || r.endDate);
  }

  async function load() {
    let requests = [];
    try {
      requests = (await AppStore.getPendingAttendanceRequests()) || [];
    } catch (err) {
      main.innerHTML = err.status === 403
        ? '<div class="ps-empty">Needs an org-admin account on their side to review requests.</div>'
        : '<div class="ps-empty">Couldn\'t load attendance requests (' + escapeAppHtml(err.message) + ').</div>';
      countEl.textContent = 'Pending requests';
      return;
    }

    countEl.textContent = requests.length + ' pending request' + (requests.length === 1 ? '' : 's');
    if (!requests.length) {
      main.innerHTML = '<div class="ps-empty">No pending attendance requests.</div>';
      return;
    }

    main.innerHTML = requests.map((r) => {
      const name = r.employeeName || ('Employee #' + r.employeeId);
      return `
        <div class="leave-card" data-request-id="${r.requestId}">
          <div class="leave-top">
            <div class="leave-user">
              <div class="leave-avatar">${escapeAppHtml(String(name).slice(0, 2).toUpperCase())}</div>
              <div>
                <div class="leave-name">${escapeAppHtml(name)}</div>
                <div class="leave-role">${escapeAppHtml(r.requestType || 'Attendance')} request</div>
              </div>
            </div>
            <span class="ps-chip ps-chip-warn">${escapeAppHtml(r.status || 'Pending')}</span>
          </div>
          <div class="leave-body">
            <div class="leave-detail">
              <div><b>Dates:</b> ${escapeAppHtml(dateRange(r))}</div>
              <div><b>Reason:</b> ${escapeAppHtml(r.reason || '-')}</div>
            </div>
            <div class="leave-actions">
              <button class="ps-btn ps-btn-primary btn-approve">Approve</button>
              <button class="ps-btn ps-btn-danger btn-reject">Reject</button>
            </div>
          </div>
          <div class="leave-time">${r.createdAt ? escapeAppHtml(new Date(r.createdAt).toLocaleString()) : ''}</div>
        </div>`;
    }).join('');
  }

  await load();

  main.addEventListener('click', (e) => {
    const card = e.target.closest('.leave-card');
    if (!card) return;
    const requestId = Number(card.dataset.requestId);
    const approved = !!e.target.closest('.btn-approve');
    const rejected = !!e.target.closest('.btn-reject');
    if (!approved && !rejected) return;

    PSModal.open({
      title: approved ? 'Approve attendance request' : 'Reject attendance request',
      subtitle: 'Their system requires a short remark with every review.',
      submitLabel: approved ? 'Approve' : 'Reject',
      fields: [
        { name: 'remarks', label: 'Remarks', placeholder: approved ? 'e.g. Approved, enjoy your leave.' : 'e.g. Insufficient leave balance.' },
      ],
      onSubmit: async (values) => {
        try {
          await AppStore.reviewAttendanceRequest(requestId, approved, values.remarks);
          await load();
        } catch (err) {
          alert('Could not submit review: ' + err.message);
        }
      },
    });
  });
});
