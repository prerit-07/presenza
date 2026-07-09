document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();

  const greetName = document.getElementById('ovGreetName');
  if (greetName) greetName.textContent = data.session?.name || 'there';

  document.getElementById('iconPresent').innerHTML = psIcon('checkSquare', 20);
  document.getElementById('iconLate').innerHTML = psIcon('clock', 20);
  document.getElementById('iconAbsent').innerHTML = psIcon('fileText', 20);
  document.getElementById('iconTickets').innerHTML = psIcon('ticket', 20);
  document.getElementById('iconRate').innerHTML = psIcon('barChart', 20);
  document.getElementById('iconOnLeave').innerHTML = psIcon('fileText', 20);
  document.getElementById('iconPendingLeave').innerHTML = psIcon('fileText', 20);
  document.getElementById('qlShifts').innerHTML = psIcon('calendar', 18);
  document.getElementById('qlAttendance').innerHTML = psIcon('checkSquare', 18);
  document.getElementById('qlTickets').innerHTML = psIcon('ticket', 18);
  document.getElementById('qlMembers').innerHTML = psIcon('users', 18);

  // Real numbers from /api/analytics/overview — replaces the old client-side guess
  // (`activeMembers * 0.15`) that used to stand in for "late today".
  const overview = await Store.getOverview();

  document.getElementById('statPresent').textContent = overview.presentToday;
  document.getElementById('statLate').textContent = overview.lateToday;
  document.getElementById('statAbsent').textContent = overview.absentToday;
  document.getElementById('statTickets').textContent = overview.pendingTickets;
  document.getElementById('statRate').textContent = `${overview.attendanceRateToday}%`;
  document.getElementById('statOnLeave').textContent = overview.onLeaveToday;
  document.getElementById('statPendingLeave').textContent = overview.pendingLeaveRequests;

  // ---------- needs attention ----------
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
});
