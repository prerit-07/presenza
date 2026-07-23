document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('zoneGrid');
  const banner = document.getElementById('appConnBanner');
  const addBtn = document.getElementById('addZoneBtn');

  const CENTER = [30.7413, 76.7684];
  const latLngOffsets = [
    [0.0060, -0.0100], [0.0090, 0.0060], [-0.0040, 0.0140],
    [-0.0080, -0.0040], [0.0020, 0.0010], [-0.0100, -0.0120],
    [0.0070, 0.0160], [-0.0130, 0.0030]
  ];

  function formatCoords(lat, lng) {
    return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
  }

  let orgId = null;

  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    grid.innerHTML = `<div class="ps-empty">Couldn't connect to the app.</div>`;
    return;
  }

  try {
    const org = await AppStore.getOrganization();
    orgId = org.orgId;
  } catch { /* non-fatal, create/edit will just fail with a clear error */ }

  let map = null;
  let pinLayer = null;
  const liveIcon = window.L ? L.divIcon({
    className: '',
    html: '<div class="geo-live-pin"><span class="geo-live-pin-ring"></span><span class="geo-live-pin-core"></span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }) : null;

  function renderLeafletPins(zones) {
    if (!map || !pinLayer) return;
    pinLayer.clearLayers();
    zones.forEach((z, idx) => {
      const off = latLngOffsets[idx % latLngOffsets.length];
      const lat = z.latitude != null ? Number(z.latitude) : CENTER[0] + off[0];
      const lng = z.longitude != null ? Number(z.longitude) : CENTER[1] + off[1];
      const marker = L.marker([lat, lng], { icon: liveIcon, draggable: false, autoPan: false });
      marker.bindTooltip(`${z.buildingName || 'Zone ' + z.geofenceId}`, { direction: 'top', offset: [0, -14] });
      marker.addTo(pinLayer);
    });
  }

  if (window.L && document.getElementById('geoMainMap')) {
    map = L.map('geoMainMap', {
      center: CENTER,
      zoom: 16,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    pinLayer = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }

  let zones = [];

  async function loadZones() {
    try {
      zones = await AppStore.getGeofences();
    } catch (err) {
      document.getElementById('zoneCount').textContent = 'Couldn\'t load zones';
      grid.innerHTML = `<div class="ps-empty">Couldn't load geofences (${escapeAppHtml(err.message)}).</div>`;
      return;
    }

    document.getElementById('zoneCount').textContent = `${zones.length} zone${zones.length === 1 ? '' : 's'} configured`;

    grid.innerHTML = zones.length ? zones.map((z) => `
      <div class="ps-stat-card zone-card" data-geofence="${z.geofenceId}">
        <div class="zone-card-top">
          <div class="zone-map-icon">${psIcon('mapPin', 20)}</div>
          <div class="zone-name">${escapeAppHtml(z.buildingName || 'Zone ' + z.geofenceId)}</div>
        </div>
        <div class="zone-detail-row"><span>Coordinates</span><b>${formatCoords(Number(z.latitude), Number(z.longitude))}</b></div>
        <div class="zone-detail-row"><span>Radius</span><b>${z.radius} m</b></div>
        <div class="zone-detail-row"><span>WiFi networks</span><b class="wifi-count-${z.geofenceId}">Checking…</b></div>
        <div class="zone-card-actions">
          <button class="ps-btn ps-btn-ghost ps-btn-sm btn-edit-zone" style="flex:1; justify-content:center;">Edit</button>
          <button class="ps-btn ps-btn-danger ps-btn-sm btn-delete-zone" style="flex:1; justify-content:center;">Delete</button>
        </div>
      </div>
    `).join('') : '<div class="ps-empty">No zones configured yet.</div>';

    renderLeafletPins(zones);

    zones.forEach(async (z) => {
      const el = grid.querySelector(`.wifi-count-${z.geofenceId}`);
      if (!el) return;
      try {
        const nets = await AppStore.getWifiNetworksForGeofence(z.geofenceId);
        el.textContent = nets.length ? `${nets.length} registered` : 'None registered';
      } catch {
        el.textContent = '—';
      }
    });
  }

  await loadZones();

  addBtn?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add geofence zone',
      submitLabel: 'Add zone',
      fields: [
        { name: 'buildingName', label: 'Building / zone name', placeholder: 'e.g. HQ - Main Building' },
        { name: 'latitude', label: 'Latitude', type: 'number', placeholder: 'e.g. 30.7413' },
        { name: 'longitude', label: 'Longitude', type: 'number', placeholder: 'e.g. 76.7684' },
        { name: 'radius', label: 'Radius (meters)', type: 'number', value: '100' },
      ],
      onSubmit: async (values) => {
        await AppStore.createGeofence(orgId, Number(values.latitude), Number(values.longitude), Number(values.radius), values.buildingName, []);
        await loadZones();
      },
    });
  });

  grid.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit-zone');
    const deleteBtn = e.target.closest('.btn-delete-zone');
    if (!editBtn && !deleteBtn) return;

    const card = (editBtn || deleteBtn).closest('[data-geofence]');
    const geofenceId = Number(card.dataset.geofence);
    const z = zones.find(x => x.geofenceId === geofenceId);
    if (!z) return;

    if (deleteBtn) {
      if (!confirm(`Delete "${z.buildingName || 'Zone ' + z.geofenceId}"? This can't be undone.`)) return;
      try {
        await AppStore.deleteGeofence(geofenceId);
        await loadZones();
      } catch (err) {
        alert('Could not delete this zone: ' + err.message);
      }
      return;
    }

    PSModal.open({
      title: 'Edit geofence zone',
      submitLabel: 'Save changes',
      fields: [
        { name: 'buildingName', label: 'Building / zone name', value: z.buildingName || '' },
        { name: 'latitude', label: 'Latitude', type: 'number', value: String(z.latitude) },
        { name: 'longitude', label: 'Longitude', type: 'number', value: String(z.longitude) },
        { name: 'radius', label: 'Radius (meters)', type: 'number', value: String(z.radius) },
      ],
      onSubmit: async (values) => {
        await AppStore.updateGeofence(geofenceId, z.orgId || orgId, Number(values.latitude), Number(values.longitude), Number(values.radius), values.buildingName);
        await loadZones();
      },
    });
  });

  const mapWrap = document.getElementById('geoMapWrap');
  mapWrap?.addEventListener('mousemove', (e) => {
    const rect = mapWrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mapWrap.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  });
  mapWrap?.addEventListener('mouseleave', () => {
    mapWrap.style.transform = '';
  });
});
