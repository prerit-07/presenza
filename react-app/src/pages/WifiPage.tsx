import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Geofence, WifiNetwork } from '../types/entities';

export default function WifiPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editNet, setEditNet] = useState<WifiNetwork | null>(null);

  function geofenceOptions() {
    return geofences.map((g) => ({ value: String(g.geofenceId), label: g.buildingName || ('Zone #' + g.geofenceId) }));
  }

  async function loadNetworks() {
    let gs: Geofence[];
    try {
      gs = await AppStore.getGeofences();
    } catch (err: any) {
      setLoadErr(err?.message || "Couldn't load zones.");
      return;
    }
    setGeofences(gs);

    const all: WifiNetwork[] = [];
    for (const g of gs) {
      try {
        const nets = await AppStore.getWifiNetworksForGeofence(g.geofenceId);
        nets.forEach((n) => all.push({ ...n, buildingName: g.buildingName || ('Zone #' + g.geofenceId) }));
      } catch { /* skip zones we can't read */ }
    }
    setNetworks(all);
    setLoadErr(null);
    setLoaded(true);
  }

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
      await loadNetworks();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    if (!geofences.length) {
      alert('Add a geofence zone first (Geofencing page) before registering a WiFi network.');
      return;
    }
    setAddOpen(true);
  }

  const addFields: ModalField[] = [
    { name: 'geofenceId', label: 'Zone', type: 'select', options: geofenceOptions() },
    { name: 'ssid', label: 'SSID', placeholder: 'e.g. Campus 5G' },
    { name: 'bssid', label: 'BSSID', placeholder: 'e.g. 00:1A:2B:3C:4D:5E' },
  ];

  const editFields: ModalField[] = editNet ? [
    { name: 'geofenceId', label: 'Zone', type: 'select', options: geofenceOptions(), value: String(editNet.geofenceId) },
    { name: 'ssid', label: 'SSID', value: editNet.ssid },
    { name: 'bssid', label: 'BSSID', value: editNet.bssid },
  ] : [];

  return (
    <Layout title="Wifi / BSSID Management" subtitle="Live registered access points from the app">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-table-wrap" style={{ marginBottom: 20 }}>
            <table className="ps-table">
              <thead><tr><th>Zone</th><th>SSID</th><th>BSSID</th><th>Added</th><th>Status</th><th /></tr></thead>
              <tbody>
                {loadErr ? <tr><td colSpan={6} className="ps-empty">Couldn't load zones ({loadErr}).</td></tr>
                  : !loaded ? <tr><td colSpan={6} className="ps-empty">Loading…</td></tr>
                  : networks.length === 0 ? <tr><td colSpan={6} className="ps-empty">No routers registered yet.</td></tr>
                  : networks.map((n) => (
                    <tr key={n.wifiId}>
                      <td>{n.buildingName}</td>
                      <td>{n.ssid}</td>
                      <td>{n.bssid}</td>
                      <td>{n.addedAt ? new Date(n.addedAt).toLocaleDateString() : '—'}</td>
                      <td><span className={'ps-chip ' + (n.active === false ? 'ps-chip-danger' : 'ps-chip-success')}>{n.active === false ? 'Inactive' : 'Active'}</span></td>
                      <td><button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setEditNet(n)}>Edit</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ps-btn ps-btn-primary" onClick={openAdd}>Add router</button>
          </div>
        </>
      )}

      <Modal
        open={addOpen}
        title="Add router"
        subtitle="Register a real WiFi access point on the app for BSSID verification."
        submitLabel="Add router"
        fields={addFields}
        onClose={() => setAddOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createWifiNetwork(Number(values.geofenceId), values.ssid, values.bssid);
          await loadNetworks();
        }}
      />

      <Modal
        open={!!editNet}
        title="Edit router"
        subtitle={editNet ? `Update the SSID/BSSID registered for "${editNet.buildingName}".` : ''}
        submitLabel="Save changes"
        fields={editFields}
        onClose={() => setEditNet(null)}
        onSubmit={async (values) => {
          if (!editNet) return;
          await AppStore.updateWifiNetwork(editNet.wifiId, Number(values.geofenceId), values.ssid, values.bssid);
          await loadNetworks();
        }}
      />
    </Layout>
  );
}
