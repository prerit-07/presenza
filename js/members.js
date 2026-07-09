document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('membersTableBody');

  async function renderMembers() {
    const data = await Store.get();
    tbody.innerHTML = data.members.map(m => `
      <tr>
        <td>${m.name}</td>
        <td>${m.email}</td>
        <td>${m.joinedVia}</td>
        <td><span class="ps-chip ${m.status === 'Active' ? 'ps-chip-success' : 'ps-chip-neutral'}">${m.status}</span></td>
        <td>${m.role}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="ps-empty">No members yet.</td></tr>`;
  }

  renderMembers();

  document.getElementById('addMemberBtn')?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add member',
      subtitle: 'Add a new member to your organization directly.',
      submitLabel: 'Add member',
      fields: [
        { name: 'name', label: 'Full name', placeholder: 'e.g. Rahul Sharma' },
        { name: 'email', label: 'Email address', type: 'email', placeholder: 'you@company.com', required: false },
        { name: 'role', label: 'Role', type: 'select', options: [
            { value: 'Student', label: 'Student' }, { value: 'Professor', label: 'Professor' }
          ] }
      ],
      onSubmit: async ({ name, email, role }) => {
        await Store.addMember({ name, email: email || undefined, title: role });
        renderMembers();
      }
    });
  });

  const importBtn = document.getElementById('importMembersBtn');
  const fileInput = document.getElementById('importFileInput');
  importBtn?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await Store.importMembers(reader.result);
        alert(`Imported ${result.created} member(s), skipped ${result.skipped}.` +
          (result.errors?.length ? `\n\n${result.errors.join('\n')}` : ''));
        renderMembers();
      } catch (e) {
        alert('Import failed: ' + e.message);
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });
});