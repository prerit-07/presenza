document.addEventListener('DOMContentLoaded', async () => {
  const data = await Store.get();
  const members = data.members || [];

  document.getElementById('iconTeamSize').innerHTML = psIcon('usersGroup', 20);
  document.getElementById('iconTeamActive').innerHTML = psIcon('checkSquare', 20);
  document.getElementById('iconTeamAvg').innerHTML = psIcon('barChart', 20);

  const activeCount = members.filter(m => m.status === 'Active').length;
  const avgAttendance = members.length
    ? Math.round(members.reduce((sum, m) => sum + (m.attendance || 0), 0) / members.length)
    : 0;

  document.getElementById('statTeamSize').textContent = members.length;
  document.getElementById('statTeamActive').textContent = activeCount;
  document.getElementById('statTeamAvg').textContent = `${avgAttendance}%`;

  const sorted = [...members].sort((a, b) => (b.attendance || 0) - (a.attendance || 0));

  document.getElementById('teamRoster').innerHTML = sorted.map(m => `
    <div class="team-roster-card">
      <div class="team-roster-top">
        <div class="team-roster-avatar">${m.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="team-roster-name">${m.name}</div>
          <div class="team-roster-role">${m.role}</div>
        </div>
      </div>
      <div class="team-roster-bar-track"><div class="team-roster-bar-fill" style="width:${m.attendance || 0}%"></div></div>
      <div class="team-roster-bottom">
        <span class="ps-chip ${m.status === 'Active' ? 'ps-chip-success' : 'ps-chip-neutral'}">${m.status}</span>
        <span>${m.attendance || 0}% attendance</span>
      </div>
    </div>
  `).join('') || '<div class="ps-empty">No team members yet.</div>';
});
