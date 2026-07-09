document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();
  const tbody = document.getElementById('mmTableBody');

  tbody.innerHTML = data.members.map(m => `
    <tr>
      <td>${m.name}</td>
      <td>${m.email}</td>
      <td>${m.joinedVia}</td>
      <td><span class="ps-chip ${m.status === 'Active' ? 'ps-chip-success' : 'ps-chip-neutral'}">${m.status}</span></td>
      <td>
        <div class="attendance-bar-wrap">
          <div class="attendance-bar-track"><div class="attendance-bar-fill" style="width:${m.attendance}%"></div></div>
          <span>${m.attendance}%</span>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="ps-empty">No members yet.</td></tr>`;

  document.getElementById('pendingBtn')?.addEventListener('click', () => {
    window.location.href = 'tickets.html';
  });
});