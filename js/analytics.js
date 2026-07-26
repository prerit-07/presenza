document.addEventListener('DOMContentLoaded', async () => {
  const brand = '#6d3fd6';
  const accent = '#22d3c9';
  const warn = '#f59e0b';
  const danger = '#ef4444';

  let employees = [], attendance = [], orgTickets = [];
  try {
    await appEnsureToken();
  } catch (err) {
    document.getElementById('alertsList').innerHTML = `<div class="ps-empty">Couldn't connect to the app (${escapeAppHtml(err.message)}).</div>`;
    return;
  }

  try { employees = await AppStore.getAllEmployees(); } catch { /* non-fatal */ }
  try { attendance = await AppStore.getAttendanceList(); } catch { /* non-fatal */ }
  try { orgTickets = await AppStore.getOrganizationTickets(); } catch { /* non-fatal */ }

  const employeesWithShift = employees.filter(e => e.shiftId != null).length;

  function dayKey(d) { return d.toDateString(); }
  function statusOn(dateObj) {
    const key = dayKey(dateObj);
    const records = attendance.filter(r => r.checkinTime && dayKey(new Date(r.checkinTime)) === key);
    const present = records.filter(r => (r.status || '').toUpperCase() === 'PRESENT').length;
    const late = records.filter(r => (r.status || '').toUpperCase() === 'LATE').length;
    return { present, late };
  }

  // Last 7 calendar days, oldest first.
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const dayLabels = days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }));
  const attendancePctByDay = days.map(d => {
    const { present, late } = statusOn(d);
    return employeesWithShift ? Math.round(((present + late) / employeesWithShift) * 100) : 0;
  });
  const lateByDay = days.slice(1).map(d => statusOn(d).late); // last 6 days, matches original chart's 6-day window

  const todayStatus = statusOn(new Date());
  const absentToday = Math.max(0, employeesWithShift - todayStatus.present - todayStatus.late);

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        label: 'Attendance %',
        data: attendancePctByDay,
        borderColor: brand,
        backgroundColor: 'rgba(109,63,214,0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: brand,
        pointRadius: 4
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100, grid: { color: '#eee6ff' } }, x: { grid: { display: false } } }
    }
  });

  new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
      labels: ['Present today', 'Late today', 'Absent today'],
      datasets: [{
        data: [todayStatus.present, todayStatus.late, absentToday],
        backgroundColor: [accent, warn, danger],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }
    }
  });

  new Chart(document.getElementById('lateChart'), {
    type: 'bar',
    data: {
      labels: dayLabels.slice(1),
      datasets: [{
        label: 'Late arrivals',
        data: lateByDay,
        backgroundColor: warn,
        borderRadius: 6,
        maxBarThickness: 40
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#eee6ff' } }, x: { grid: { display: false } } }
    }
  });

  const alertsList = document.getElementById('alertsList');
  if (alertsList) {
    const openTickets = orgTickets.filter(t => ['OPEN', 'REOPENED'].includes((t.status || '').toUpperCase()));
    alertsList.innerHTML = openTickets.map(t => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--surface-200);">
        <div>
          <div style="font-weight:600;">${escapeAppHtml(t.subject || 'Ticket #' + t.ticketId)}</div>
          <div style="font-size:12.5px; color:var(--text-500);">${escapeAppHtml(t.description || '')}</div>
        </div>
        <span class="ps-chip ps-chip-warn">${escapeAppHtml(t.status || 'OPEN')}</span>
      </div>
    `).join('') || `<div class="ps-empty">Nothing needs attention right now.</div>`;
  }
});
