import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Icon from '../components/Icon';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Geofence } from '../types/entities';
import '../styles/pages/geofencing.css';

const CENTER: [number, number] = [30.7413, 76.7684];
const LAT_LNG_OFFSETS: [number, number][] = [
  [0.0060, -0.0100], [0.0090, 0.0060], [-0.0040, 0.0140],
  [-0.0080, -0.0040], [0.0020, 0.0010], [-0.0100, -0.0120],
  [0.0070, 0.0160], [-0.0130, 0.0030],
];

function formatCoords(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
}

export default function GeofencingPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [zones, setZones] = useState<Geofence[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesErr, setZonesErr] = useState<string | null>(null);
  const [wifiCounts, setWifiCounts] = useState<Record<number, string>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [editZone, setEditZone] = useState<Geofence | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pinLayerRef = useRef<any>(null);

  async function loadZones() {
    let res: Geofence[];
    try {
      res = await AppStore.getGeofences();
    } catch (err: any) {
      setZonesErr(err?.message || "Couldn't load geofences.");
      return;
    }
    setZones(res);
    setZonesErr(null);
    setZonesLoaded(true);

    res.forEach(async (z) => {
      try {
        const nets = await AppStore.getWifiNetworksForGeofence(z.geofenceId);
        setWifiCounts((prev) => ({ ...prev, [z.geofenceId]: nets.length ? `${nets.length} registered` : 'None registered' }));
      } catch {
        setWifiCounts((prev) => ({ ...prev, [z.geofenceId]: '—' }));
      }
    });
  }

  // init/teardown the Leaflet map once
  useEffect(() => {
    if (window.L && mapDivRef.current && !mapRef.current) {
      const map = window.L.map(mapDivRef.current, {
        center: CENTER, zoom: 16, zoomControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
        keyboard: false, touchZoom: false, attributionControl: true,
      });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(map);
      mapRef.current = map;
      pinLayerRef.current = window.L.layerGroup().addTo(map);
      setTimeout(() => map.invalidateSize(), 200);
    }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; pinLayerRef.current = null; }
    };
  }, []);

  // re-render pins whenever zones change
  useEffect(() => {
    const map = mapRef.current;
    const pinLayer = pinLayerRef.current;
    if (!map || !pinLayer || !window.L) return;
    pinLayer.clearLayers();
    const liveIcon = window.L.divIcon({
      className: '',
      html: '<div class="geo-live-pin"><span class="geo-live-pin-ring"></span><span class="geo-live-pin-core"></span></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    zones.forEach((z, idx) => {
      const off = LAT_LNG_OFFSETS[idx % LAT_LNG_OFFSETS.length];
      const lat = z.latitude != null ? Number(z.latitude) : CENTER[0] + off[0];
      const lng = z.longitude != null ? Number(z.longitude) : CENTER[1] + off[1];
      const marker = window.L.marker([lat, lng], { icon: liveIcon, draggable: false, autoPan: false });
      marker.bindTooltip(z.buildingName || 'Zone ' + z.geofenceId, { direction: 'top', offset: [0, -14] });
      marker.addTo(pinLayer);
    });
  }, [zones]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!appHasPersonalLogin()) await appEnsureToken();
        const meRes = await AppStore.getMe();
        if (cancelled) return;
        setMe(meRes);
      } catch (err: any) {
        if (!cancelled) setConnError(err?.message || 'Could not connect.');
        return;
      }
      try { setOrgId((await AppStore.getOrganization()).orgId); } catch { /* non-fatal */ }
      await loadZones();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMapMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    wrap.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  }
  function handleMapMouseLeave() {
    if (mapWrapRef.current) mapWrapRef.current.style.transform = '';
  }

  async function handleDelete(z: Geofence) {
    if (!confirm(`Delete "${z.buildingName || 'Zone ' + z.geofenceId}"? This can't be undone.`)) return;
    try {
      await AppStore.deleteGeofence(z.geofenceId);
      await loadZones();
    } catch (err: any) {
      alert('Could not delete this zone: ' + err.message);
    }
  }

  const addFields: ModalField[] = [
    { name: 'buildingName', label: 'Building / zone name', placeholder: 'e.g. HQ - Main Building' },
    { name: 'latitude', label: 'Latitude', type: 'number', placeholder: 'e.g. 30.7413' },
    { name: 'longitude', label: 'Longitude', type: 'number', placeholder: 'e.g. 76.7684' },
    { name: 'radius', label: 'Radius (meters)', type: 'number', value: '100' },
  ];

  const editFields: ModalField[] = editZone ? [
    { name: 'buildingName', label: 'Building / zone name', value: editZone.buildingName || '' },
    { name: 'latitude', label: 'Latitude', type: 'number', value: String(editZone.latitude) },
    { name: 'longitude', label: 'Longitude', type: 'number', value: String(editZone.longitude) },
    { name: 'radius', label: 'Radius (meters)', type: 'number', value: String(editZone.radius) },
  ] : [];

  return (
    <Layout title="Geofence Zones" subtitle="Live geofences from the app">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head">
            <div className="ps-section-title">{zonesErr ? "Couldn't load zones" : `${zones.length} zone${zones.length === 1 ? '' : 's'} configured`}</div>
            <button className="ps-btn ps-btn-primary" onClick={() => setAddOpen(true)}>Add zone</button>
          </div>

          <div className="geo-map-card ps-card">
            <div className="geo-map-wrap" ref={mapWrapRef} onMouseMove={handleMapMouseMove} onMouseLeave={handleMapMouseLeave}>
              <div ref={mapDivRef} className="geo-map-img" />
              <div className="geo-map-tint" />
              <div className="geo-map-glow" />
              <div className="geo-map-radar" />
            </div>
            <div className="geo-map-caption">Live geofence overview from the app</div>
          </div>

          <div className="ps-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {zonesErr ? <div className="ps-empty">Couldn't load geofences ({zonesErr}).</div>
              : !zonesLoaded ? 'Loading…'
              : zones.length === 0 ? <div className="ps-empty">No zones configured yet.</div>
              : zones.map((z) => (
                <div className="ps-stat-card zone-card" key={z.geofenceId}>
                  <div className="zone-card-top">
                    <div className="zone-map-icon"><Icon name="mapPin" size={20} /></div>
                    <div className="zone-name">{z.buildingName || 'Zone ' + z.geofenceId}</div>
                  </div>
                  <div className="zone-detail-row"><span>Coordinates</span><b>{formatCoords(Number(z.latitude), Number(z.longitude))}</b></div>
                  <div className="zone-detail-row"><span>Radius</span><b>{z.radius} m</b></div>
                  <div className="zone-detail-row"><span>WiFi networks</span><b>{wifiCounts[z.geofenceId] ?? 'Checking…'}</b></div>
                  <div className="zone-card-actions">
                    <button className="ps-btn ps-btn-ghost ps-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditZone(z)}>Edit</button>
                    <button className="ps-btn ps-btn-danger ps-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleDelete(z)}>Delete</button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      <Modal
        open={addOpen}
        title="Add geofence zone"
        submitLabel="Add zone"
        fields={addFields}
        onClose={() => setAddOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createGeofence(orgId as number, Number(values.latitude), Number(values.longitude), Number(values.radius), values.buildingName, []);
          await loadZones();
        }}
      />

      <Modal
        open={!!editZone}
        title="Edit geofence zone"
        submitLabel="Save changes"
        fields={editFields}
        onClose={() => setEditZone(null)}
        onSubmit={async (values) => {
          if (!editZone) return;
          await AppStore.updateGeofence(editZone.geofenceId, editZone.orgId || (orgId as number), Number(values.latitude), Number(values.longitude), Number(values.radius), values.buildingName);
          await loadZones();
        }}
      />
    </Layout>
  );
}
