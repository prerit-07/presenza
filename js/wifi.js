document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('wifiTableBody');
  const banner = document.getElementById('appConnBanner');
  const addBtn = document.getElementById('addRouterBtn');

  let geofences = [];
  let networks = []; // flattened, each tagged with geofenceId + buildingName

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    tbody.innerHTML = `<tr><td colspan="5" class="ps-empty">Couldn't connect to the app.</td></tr>`;
    return;
  }

  function geofenceOptions() {
    return geofences.map(g => ({ value: String(g.geofenceId), label: g.buildingName || ('Zone #' + g.geofenceId) }));
  }

  async function loadNetworks() {
    try { geofences = await AppStore.getGeofences(); } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="ps-empty">Couldn't load zones (${escapeAppHtml(err.message)}).</td></tr>`;
      return;
    }

    networks = [];
    for (const g of geofences) {
      try {
        const nets = await AppStore.getWifiNetworksForGeofence(g.geofenceId);
        nets.forEach(n => networks.push(Object.assign({}, n, { buildingName: g.buildingName || ('Zone #' + g.geofenceId) })));
      } catch { /* skip zones we can't read */ }
    }

    tbody.innerHTML = networks.length ? networks.map(n => `
      <tr data-wifi-id="${n.wifiId}">
        <td>${escapeAppHtml(n.buildingName)}</td>
        <td>${escapeAppHtml(n.ssid)}</td>
        <td>${escapeAppHtml(n.bssid)}</td>
        <td>${n.addedAt ? new Date(n.addedAt).toLocaleDateString() : '—'}</td>
        <td><span class="ps-chip ${n.active === false ? 'ps-chip-danger' : 'ps-chip-success'}">${n.active === false ? 'Inactive' : 'Active'}</span></td>
        <td><button class="ps-btn ps-btn-ghost ps-btn-sm btn-edit-wifi">Edit</button></td>
      </tr>
    `).join('') : `<tr><td colspan="6" class="ps-empty">No routers registered yet.</td></tr>`;
  }

  await loadNetworks();

  addBtn?.addEventListener('click', () => {
    if (!geofences.length) {
      alert('Add a geofence zone first (Geofencing page) before registering a WiFi network.');
      return;
    }
    PSModal.open({
      title: 'Add router',
      subtitle: 'Register a real WiFi access point on the app for BSSID verification.',
      submitLabel: 'Add router',
      fields: [
        { name: 'geofenceId', label: 'Zone', type: 'select', options: geofenceOptions() },
        { name: 'ssid', label: 'SSID', placeholder: 'e.g. Campus 5G' },
        { name: 'bssid', label: 'BSSID', placeholder: 'e.g. 00:1A:2B:3C:4D:5E' },
      ],
      onSubmit: async (values) => {
        await AppStore.createWifiNetwork(Number(values.geofenceId), values.ssid, values.bssid);
        await loadNetworks();
      },
    });
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-wifi');
    if (!btn) return;
    const row = btn.closest('tr');
    const wifiId = Number(row.dataset.wifiId);
    const n = networks.find(x => x.wifiId === wifiId);
    if (!n) return;

    PSModal.open({
      title: 'Edit router',
      subtitle: `Update the SSID/BSSID registered for "${n.buildingName}".`,
      submitLabel: 'Save changes',
      fields: [
        { name: 'geofenceId', label: 'Zone', type: 'select', options: geofenceOptions(), value: String(n.geofenceId) },
        { name: 'ssid', label: 'SSID', value: n.ssid },
        { name: 'bssid', label: 'BSSID', value: n.bssid },
      ],
      onSubmit: async (values) => {
        await AppStore.updateWifiNetwork(wifiId, Number(values.geofenceId), values.ssid, values.bssid);
        await loadNetworks();
      },
    });
  });
});
