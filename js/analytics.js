document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();
  const activeCount = data.members.filter(m => m.status === 'Active').length;
  const inactiveCount = data.members.length - activeCount;

  const brand = '#6d3fd6';
  const accent = '#22d3c9';
  const warn = '#f59e0b';
  const danger = '#ef4444';

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Attendance %',
        data: [88, 91, 85, 93, 89, 76, 60],
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
      labels: ['Active', 'Inactive'],
      datasets: [{
        data: [activeCount, inactiveCount],
        backgroundColor: [accent, '#e3ddf5'],
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
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [{
        label: 'Late arrivals',
        data: [3, 5, 2, 6, 4, 1],
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
    const alerts = await Store.getAlerts();
    const labelFor = (type) => type === 'FREQUENT_LATE' ? 'ps-chip-warn' : 'ps-chip-danger';
    alertsList.innerHTML = alerts.map(a => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--surface-200);">
        <div>
          <div style="font-weight:600;">${a.name} <span style="color:var(--text-500); font-weight:400;">(${a.title})</span></div>
          <div style="font-size:12.5px; color:var(--text-500);">${a.detail}</div>
        </div>
        <span class="ps-chip ${labelFor(a.type)}">${a.type === 'FREQUENT_LATE' ? 'Frequent late' : 'Absence streak'}</span>
      </div>
    `).join('') || `<div class="ps-empty">Nothing needs attention right now.</div>`;
  }
});