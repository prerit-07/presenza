import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Employee, Geofence, Shift } from '../types/entities';
import '../styles/pages/shifts.css';

function fmt(t?: string | null) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = ((+h + 11) % 12) + 1;
  return `${hour}:${m} ${+h < 12 ? 'AM' : 'PM'}`;
}

export default function ShiftsPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [timetableErr, setTimetableErr] = useState<string | null>(null);
  const [shiftsLoaded, setShiftsLoaded] = useState(false);
  const [shiftsErr, setShiftsErr] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);

  function geofenceOptions() {
    return geofences.map((g) => ({ value: String(g.geofenceId), label: g.buildingName || ('Geofence #' + g.geofenceId) }));
  }

  async function loadShifts() {
    try {
      const res = await AppStore.getShifts();
      setShifts(res);
      setShiftsErr(null);
    } catch (err: any) {
      setShiftsErr(err?.message || "Couldn't load shifts.");
      return;
    }
    try {
      setEmployees(await AppStore.getAllEmployees());
      setTimetableErr(null);
    } catch (err: any) {
      setTimetableErr(err?.status === 403 ? 'Needs a manager/org-admin account on their side to view this.' : (err?.message || "Couldn't load the timetable."));
    }
    setShiftsLoaded(true);
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
      try { setGeofences(await AppStore.getGeofences()); } catch { /* non-fatal */ }
      try { setOrgId((await AppStore.getOrganization()).orgId); } catch { /* non-fatal — create/edit will just fail with a clear error */ }
      await loadShifts();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shiftById: Record<number, Shift> = {};
  shifts.forEach((s) => { shiftById[s.shiftId] = s; });

  const addFields: ModalField[] = [
    { name: 'shiftName', label: 'Shift name', placeholder: 'e.g. General' },
    { name: 'startTime', label: 'Start time', type: 'time' },
    { name: 'endTime', label: 'End time', type: 'time' },
    { name: 'allowedLateMinutes', label: 'Allowed late minutes', type: 'number', value: '0' },
    { name: 'geofenceId', label: 'Geofence', type: 'select', options: geofenceOptions(), required: false },
  ];

  const editFields: ModalField[] = editShift ? [
    { name: 'shiftName', label: 'Shift name', value: editShift.shiftName },
    { name: 'startTime', label: 'Start time', type: 'time', value: editShift.startTime },
    { name: 'endTime', label: 'End time', type: 'time', value: editShift.endTime },
    { name: 'allowedLateMinutes', label: 'Allowed late minutes', type: 'number', value: String(editShift.allowedLateMinutes ?? 0) },
    { name: 'geofenceId', label: 'Geofence', type: 'select', options: geofenceOptions(), required: false, value: editShift.geofenceId != null ? String(editShift.geofenceId) : '' },
  ] : [];

  return (
    <Layout title="Shifts & Timetable" subtitle="Live shifts and assignments from the app">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head">
            <div className="ps-section-title">Shifts</div>
            <button className="ps-btn ps-btn-primary" onClick={() => setAddOpen(true)}>Add shift</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 30 }}>
            {shiftsErr ? <div className="ps-empty">{shiftsErr}</div>
              : !shiftsLoaded ? 'Loading…'
              : shifts.length === 0 ? <div className="ps-empty">No shifts configured yet.</div>
              : shifts.map((s) => (
                <div className="ps-stat-card" style={{ textAlign: 'center' }} key={s.shiftId}>
                  <div className="shift-time">{fmt(s.startTime)} – {fmt(s.endTime)}</div>
                  <div className="shift-name">{s.shiftName}</div>
                  <div className="shift-grace">Late allowance: {s.allowedLateMinutes ?? '—'} min</div>
                  <div className="shift-assigned">Geofence: {s.geofenceId ?? 'None'}</div>
                  <div className="shift-card-actions">
                    <button className="ps-btn ps-btn-ghost ps-btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setEditShift(s)}>Edit</button>
                  </div>
                </div>
              ))}
          </div>

          <div className="ps-section-head"><div className="ps-section-title">Timetable</div></div>
          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead><tr><th>Name</th><th>Assigned Shift</th><th>Timing</th></tr></thead>
              <tbody>
                {timetableErr ? <tr><td colSpan={3} className="ps-empty">{timetableErr}</td></tr>
                  : employees === null ? <tr><td colSpan={3} className="ps-empty">Loading…</td></tr>
                  : employees.length === 0 ? <tr><td colSpan={3} className="ps-empty">No members yet.</td></tr>
                  : employees.map((e) => {
                    const shift = e.shiftId != null ? shiftById[e.shiftId] : undefined;
                    return (
                      <tr key={e.employeeId}>
                        <td>{e.employeeName}</td>
                        <td>{shift ? shift.shiftName : '—'}</td>
                        <td>{shift ? `${fmt(shift.startTime)} – ${fmt(shift.endTime)}` : '-'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={addOpen}
        title="Add shift"
        submitLabel="Add shift"
        fields={addFields}
        onClose={() => setAddOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createShift(
            orgId as number, values.shiftName, values.startTime, values.endTime,
            Number(values.allowedLateMinutes || 0),
            values.geofenceId ? Number(values.geofenceId) : null,
          );
          await loadShifts();
        }}
      />

      <Modal
        open={!!editShift}
        title="Edit shift"
        submitLabel="Save changes"
        fields={editFields}
        onClose={() => setEditShift(null)}
        onSubmit={async (values) => {
          if (!editShift) return;
          await AppStore.updateShift(
            editShift.shiftId, orgId as number, values.shiftName, values.startTime, values.endTime,
            Number(values.allowedLateMinutes || 0),
            values.geofenceId ? Number(values.geofenceId) : null,
          );
          await loadShifts();
        }}
      />
    </Layout>
  );
}
