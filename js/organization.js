document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();

  const greetName = document.getElementById('ovGreetName');
  if (greetName) greetName.textContent = data.session?.name || 'there';

  document.getElementById('iconMembers').innerHTML = psIcon('users', 20);
  document.getElementById('iconRate').innerHTML = psIcon('barChart', 20);
  document.getElementById('iconPendingLeave').innerHTML = psIcon('fileText', 20);
  document.getElementById('iconPendingTickets').innerHTML = psIcon('ticket', 20);
  document.getElementById('iconPresent').innerHTML = psIcon('checkSquare', 20);
  document.getElementById('iconLate').innerHTML = psIcon('clock', 20);
  document.getElementById('iconAbsent').innerHTML = psIcon('fileText', 20);
  document.getElementById('iconZones').innerHTML = psIcon('mapPin', 20);
  document.getElementById('iconRouters').innerHTML = psIcon('wifi', 20);
  document.getElementById('iconCodes').innerHTML = psIcon('key', 20);
  document.getElementById('qlMembers').innerHTML = psIcon('users', 20);
  document.getElementById('qlZone').innerHTML = psIcon('mapPin', 20);
  document.getElementById('qlRouter').innerHTML = psIcon('wifi', 20);
  document.getElementById('qlCodes').innerHTML = psIcon('key', 20);
  document.getElementById('qlTeam').innerHTML = psIcon('usersGroup', 20);

  // ---------- real overview stats (from /api/analytics/overview, not client-computed) ----------
  const overview = await Store.getOverview();

  document.getElementById('statMembers').textContent = data.members.length;
  document.getElementById('statRate').textContent = `${overview.attendanceRateToday}%`;
  document.getElementById('statPendingLeave').textContent = overview.pendingLeaveRequests;
  document.getElementById('statPendingTickets').textContent = overview.pendingTickets;
  document.getElementById('statPresentToday').textContent = overview.presentToday;
  document.getElementById('statLateToday').textContent = overview.lateToday;
  document.getElementById('statAbsentToday').textContent = overview.absentToday;
  document.getElementById('statZones').textContent = overview.zonesCount;
  document.getElementById('statRouters').textContent = overview.routersCount;

  const activeCodesCount = [data.codes.manager, data.codes.employee].filter(Boolean).length;
  document.getElementById('statCodes').textContent = activeCodesCount;

  // ---------- needs attention (reuse the same alerts backend feeds analytics.html) ----------
  const alertsList = document.getElementById('alertsList');
  const alerts = await Store.getAlerts();
  const alertChip = (type) => type === 'FREQUENT_LATE' ? 'ps-chip-warn' : 'ps-chip-danger';
  alertsList.innerHTML = alerts.slice(0, 5).map(a => `
    <div class="alert-row">
      <div>
        <div class="alert-name">${a.name} <span style="color:var(--text-500); font-weight:400;">(${a.title})</span></div>
        <div class="alert-detail">${a.detail}</div>
      </div>
      <span class="ps-chip ${alertChip(a.type)}">${a.type === 'FREQUENT_LATE' ? 'Frequent late' : 'Absence streak'}</span>
    </div>
  `).join('') || '<div class="ps-empty">Nothing needs attention right now.</div>';

  // ---------- pending approvals (leave requests + tickets, inline approve/reject) ----------
  const approvalsList = document.getElementById('approvalsList');

  async function renderApprovals() {
    const fresh = await Store.get();
    const pendingLeave = (fresh.leaveRequests || []).filter(r => r.status === 'Pending').slice(0, 5);
    const pendingTickets = (fresh.tickets || []).filter(t => t.status === 'Pending').slice(0, 5);

    if (!pendingLeave.length && !pendingTickets.length) {
      approvalsList.innerHTML = '<div class="ps-empty">Nothing pending — you\'re all caught up.</div>';
      return;
    }

    approvalsList.innerHTML = [
      ...pendingLeave.map(r => `
        <div class="approval-row" data-leave-id="${r.id}">
          <div class="approval-info">
            <div><b>${r.name}</b> requested leave</div>
            <div class="approval-sub">${r.from} → ${r.to} · ${r.reason || 'No reason given'}</div>
          </div>
          <div class="approval-actions">
            <button class="ps-btn ps-btn-primary ps-btn-sm" data-approve-leave="${r.id}">Approve</button>
            <button class="ps-btn ps-btn-danger ps-btn-sm" data-reject-leave="${r.id}">Reject</button>
          </div>
        </div>
      `),
      ...pendingTickets.map(t => `
        <div class="approval-row" data-ticket-id="${t.id}">
          <div class="approval-info">
            <div><b>${t.name}</b> requested a device change</div>
            <div class="approval-sub">${t.oldDevice} → ${t.newDevice}</div>
          </div>
          <div class="approval-actions">
            <button class="ps-btn ps-btn-primary ps-btn-sm" data-accept-ticket="${t.id}">Accept</button>
            <button class="ps-btn ps-btn-danger ps-btn-sm" data-reject-ticket="${t.id}">Reject</button>
          </div>
        </div>
      `)
    ].join('');

    approvalsList.querySelectorAll('[data-approve-leave]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Store.updateLeaveStatus(btn.dataset.approveLeave, 'APPROVED');
        renderApprovals();
      });
    });
    approvalsList.querySelectorAll('[data-reject-leave]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Store.updateLeaveStatus(btn.dataset.rejectLeave, 'REJECTED');
        renderApprovals();
      });
    });
    approvalsList.querySelectorAll('[data-accept-ticket]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Store.updateTicketStatus(btn.dataset.acceptTicket, 'ACCEPTED');
        renderApprovals();
      });
    });
    approvalsList.querySelectorAll('[data-reject-ticket]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Store.updateTicketStatus(btn.dataset.rejectTicket, 'REJECTED');
        renderApprovals();
      });
    });
  }

  await renderApprovals();

  // ---------- recent activity ----------
  function pickIcon(text) {
    if (/wifi|router|bssid/i.test(text)) return 'wifi';
    if (/geofence|zone/i.test(text)) return 'mapPin';
    if (/code/i.test(text)) return 'key';
    if (/shift/i.test(text)) return 'calendar';
    return 'users';
  }

  const list = document.getElementById('activityList');
  list.innerHTML = data.activity.map(item => `
    <div class="activity-row">
      <div class="activity-row-left">
        <div class="activity-icon">${psIcon(pickIcon(item.text), 16)}</div>
        <div class="activity-text">${item.text}</div>
      </div>
      <div class="activity-time">${item.time}</div>
    </div>
  `).join('') || '<div class="ps-empty">No recent activity yet.</div>';
});
