document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('zoneGrid');
  const captionEl = document.querySelector('.geo-map-caption');

  const CENTER = [30.7413, 76.7684];
  // Small lat/lng offsets so zones without saved coordinates fan out around the center
  const latLngOffsets = [
    [0.0060, -0.0100], [0.0090, 0.0060], [-0.0040, 0.0140],
    [-0.0080, -0.0040], [0.0020, 0.0010], [-0.0100, -0.0120],
    [0.0070, 0.0160], [-0.0130, 0.0030]
  ];

  function parseCoords(str, idx) {
    // Try to parse "30.7413°N, 76.7684°E" style strings; fall back to a fanned-out offset
    if (str) {
      const m = str.match(/(-?\d+(\.\d+)?)\D+(-?\d+(\.\d+)?)/);
      if (m) return [parseFloat(m[1]), parseFloat(m[3])];
    }
    const off = latLngOffsets[idx % latLngOffsets.length];
    return [CENTER[0] + off[0], CENTER[1] + off[1]];
  }

  function formatCoords(lat, lng) {
    return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
  }

  let map = null;
  let pinLayer = null;
  const liveIcon = window.L ? L.divIcon({
    className: '',
    html: '<div class="geo-live-pin"><span class="geo-live-pin-ring"></span><span class="geo-live-pin-core"></span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }) : null;

  async function renderLeafletPins() {
    if (!map || !pinLayer) return;
    const data = await Store.get();
    pinLayer.clearLayers();
    data.zones.forEach((z, idx) => {
      const latlng = parseCoords(z.coords, idx);
      const marker = L.marker(latlng, { icon: liveIcon, draggable: true, autoPan: false });
      marker.bindTooltip(`${z.name} · drag to reposition`, { direction: 'top', offset: [0, -14] });
      marker.on('dragstart', () => { captionEl && (captionEl.textContent = `Repositioning ${z.name}…`); });
      marker.on('drag', (e) => {
        const p = e.target.getLatLng();
        captionEl && (captionEl.textContent = `${z.name} → ${formatCoords(p.lat, p.lng)}`);
      });
      marker.on('dragend', async (e) => {
        const p = e.target.getLatLng();
        await Store.updateZone(z.id, { latitude: p.lat, longitude: p.lng });
        captionEl && (captionEl.textContent = 'Live geofence overview — drag a pin to reposition its zone');
        renderZones();
      });
      marker.addTo(pinLayer);
    });
  }

  async function renderZones() {
    const data = await Store.get();
    document.getElementById('zoneCount').textContent = `${data.zones.length} zones configured`;
    grid.innerHTML = data.zones.map((z, idx) => `
      <div class="ps-stat-card zone-card" data-index="${idx}">
        <div class="zone-card-top">
          <div class="zone-map-icon">${psIcon('mapPin', 20)}</div>
          <div class="zone-name">${z.name}</div>
        </div>
        <div class="zone-detail-row"><span>Coordinates</span><b>${z.coords}</b></div>
        <div class="zone-detail-row"><span>Radius</span><b>${z.radius}</b></div>
        <div class="zone-detail-row"><span>Location</span><b>${z.floor}</b></div>
        <div class="zone-detail-row"><span>Verification</span><b>${z.verification}</b></div>
      </div>
    `).join('') || '<div class="ps-empty">No zones configured yet.</div>';
    renderLeafletPins();
  }

  // Real OpenStreetMap tile layer, with real draggable zone markers on top
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

  renderZones();

  // Mouse-tracked 3D tilt on the whole map card
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

  document.getElementById('addZoneBtn')?.addEventListener('click', () => {
    PSModal.open({
      title: 'Add geofence zone',
      subtitle: 'New zones appear on the map and can be dragged into place.',
      submitLabel: 'Add zone',
      fields: [
        { name: 'name', label: 'Zone name', placeholder: 'e.g. Room 204' },
        { name: 'radius', label: 'Radius', placeholder: 'e.g. 25m', value: '25m' },
        { name: 'floor', label: 'Location', placeholder: 'e.g. Floor 2 - Main Campus', value: 'Floor - Main Campus' },
        { name: 'verification', label: 'Verification', type: 'select', options: [
            { value: 'WiFi BSSID + GPS', label: 'WiFi BSSID + GPS' },
            { value: 'GPS only', label: 'GPS only' },
            { value: 'WiFi BSSID only', label: 'WiFi BSSID only' }
          ] }
      ],
      onSubmit: async ({ name, radius, floor, verification }) => {
        const data = await Store.get();
        const off = latLngOffsets[data.zones.length % latLngOffsets.length];
        const latitude = CENTER[0] + off[0];
        const longitude = CENTER[1] + off[1];
        await Store.addZone({ name, latitude, longitude, radius, floor, verification });
        renderZones();
      }
    });
  });
});