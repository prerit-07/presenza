document.addEventListener('DOMContentLoaded', () => {
  const card = document.getElementById('teamCard');

  async function renderTeam() {
    const data = await Store.get();
    card.innerHTML = data.team.map(t => `
      <div class="team-member-row">
        <div class="team-avatar">${t.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="team-name">${t.name}</div>
          <div class="team-role">${t.role}</div>
        </div>
      </div>
    `).join('') || '<div class="ps-empty">No team members added yet.</div>';
  }

  renderTeam();

  document.getElementById('addMemberBtn')?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add team member',
      subtitle: 'Give someone admin or manager access to your organization.',
      submitLabel: 'Add team member',
      fields: [
        { name: 'name', label: 'Full name', placeholder: 'e.g. Priya Sharma' },
        { name: 'role', label: 'Role', type: 'select', options: [
            { value: 'Admin', label: 'Admin' }, { value: 'Manager', label: 'Manager' }, { value: 'Member', label: 'Member' }
          ] }
      ],
      onSubmit: async ({ name, role }) => {
        await Store.addTeamMember({ name, title: role });
        renderTeam();
      }
    });
  });
});