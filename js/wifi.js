document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('wifiTableBody');

  async function renderRouters() {
    const data = await Store.get();
    tbody.innerHTML = data.routers.map((r, idx) => `
      <tr data-index="${idx}">
        <td>${r.zone}</td>
        <td>${r.ssid}</td>
        <td>${r.bssid}</td>
        <td>${r.registeredBy}</td>
        <td><span class="ps-chip ps-chip-success">${r.status}</span></td>
        <td>
          <span class="ps-icon-action icon-edit">${psIcon('edit', 14)}</span>
          <span class="ps-icon-action icon-delete">${psIcon('trash', 14)}</span>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="6" class="ps-empty">No routers registered yet.</td></tr>`;
  }

  renderRouters();

  tbody.addEventListener('click', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const idx = Number(row.dataset.index);

    if (e.target.closest('.icon-delete')) {
      const data = await Store.get();
      await Store.deleteRouter(data.routers[idx].id);
      renderRouters();
    }
    if (e.target.closest('.icon-edit')) {
      const data = await Store.get();
      const router = data.routers[idx];
      PSModal.open({
        title: 'Edit router',
        subtitle: `Update the SSID registered for "${router.zone}".`,
        submitLabel: 'Save changes',
        fields: [
          { name: 'ssid', label: 'SSID', placeholder: 'e.g. Campus 5G', value: router.ssid }
        ],
        onSubmit: async ({ ssid }) => {
          await Store.updateRouter(router.id, { zone: router.zone, ssid, bssid: router.bssid });
          renderRouters();
        }
      });
    }
  });

  document.getElementById('addRouterBtn')?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add router',
      subtitle: 'Register a WiFi access point for BSSID verification.',
      submitLabel: 'Add router',
      fields: [
        { name: 'zone', label: 'Zone name', placeholder: 'e.g. Room 101' },
        { name: 'ssid', label: 'SSID', placeholder: 'e.g. Campus 5G' }
      ],
      onSubmit: async ({ zone, ssid }) => {
        const session = (await Store.get()).session;
        await Store.addRouter({ zone, ssid, bssid: '00:00:00:00:00:00', registeredBy: session?.name || 'Admin', status: 'Active' });
        renderRouters();
      }
    });
  });
});