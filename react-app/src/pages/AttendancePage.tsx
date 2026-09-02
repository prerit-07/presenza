import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { Attendance, CurrentUser, Employee } from '../types/entities';
import '../styles/pages/attendance.css';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
];
const CHIP_CLASS: Record<string, string> = { PRESENT: 'ps-chip-success', LATE: 'ps-chip-warn', PENDING: 'ps-chip-warn', ABSENT: 'ps-chip-danger', REJECTED: 'ps-chip-danger' };

function fmtTime(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

export default function AttendancePage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<Attendance[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [correctRec, setCorrectRec] = useState<Attendance | null>(null);

  const employeeByUserId: Record<number, string> = {};
  employees.forEach((e) => { employeeByUserId[e.userId] = e.employeeName; });
  function employeeOptions() { return employees.map((e) => ({ value: String(e.employeeId), label: e.employeeName })); }

  async function loadRecords() {
    try {
      setRecords((await AppStore.getAttendanceList()) || []);
      setLoadErr(null);
    } catch (err: any) {
      setLoadErr(err?.status === 403 ? 'Needs a manager/org-admin account on their side to view this.' : (err?.message || "Couldn't load attendance."));
    }
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
      try { setEmployees(await AppStore.getAllEmployees()); } catch { /* non-fatal */ }
      await loadRecords();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
const filterKey = statusFilter.toUpperCase().replace(' ', '_');
const rows = (records || []).filter((r) => statusFilter === '' || (r.status || 'ABSENT').toUpperCase() === statusFilter);

  const addFields: ModalField[] = [
    { name: 'employeeId', label: 'Employee', type: 'select', options: employeeOptions() },
    { name: 'attendanceDate', label: 'Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
    { name: 'remarks', label: 'Remarks', required: false },
  ];
  const correctFields: ModalField[] = correctRec ? [
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, value: correctRec.status },
    { name: 'remarks', label: 'Remarks', value: correctRec.remarks || '', required: false },
  ] : [];

  function exportCsv() {
    const header = 'Name,Check-In,Effective Check-In,Status';
    const lines = (records || []).map((r) => `${employeeByUserId[r.userId] || ''},${fmtTime(r.checkinTime)},${fmtTime(r.effectiveCheckinTime)},${r.status || ''}`);
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Attendance Record" subtitle="Live from the app — add manual entries and corrections">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-card attendance-filter-bar">
            <select className="attendance-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="">All status</option>
  <option value="PRESENT">Present</option>
  <option value="ABSENT">Absent</option>
  <option value="LATE">Late</option>
  <option value="PENDING">Pending</option>
  <option value="REJECTED">Rejected</option>
</select>
            <button className="ps-btn ps-btn-primary" onClick={() => setAddOpen(true)}>Add manual entry</button>
            <button className="ps-btn ps-btn-primary attendance-export-btn" onClick={exportCsv}>Export CSV</button>
          </div>

          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead><tr><th>Name</th><th>Check-In</th><th>Effective Check-In</th><th>WiFi</th><th>Status</th><th /></tr></thead>
              <tbody>
                {loadErr ? <tr><td colSpan={6} className="ps-empty">{loadErr}</td></tr>
                  : records === null ? <tr><td colSpan={6} className="ps-empty">Loading…</td></tr>
                  : rows.length === 0 ? <tr><td colSpan={6} className="ps-empty">{records.length ? 'No records match this filter.' : 'No attendance records yet.'}</td></tr>
                  : rows.map((r) => {
                    const status = (r.status || 'ABSENT').toUpperCase();
                    return (
                      <tr key={r.attendanceId}>
                        <td>{employeeByUserId[r.userId] || ('User #' + r.userId)}</td>
                        <td>{fmtTime(r.checkinTime)}</td>
                        <td>{fmtTime(r.effectiveCheckinTime)}</td>
                        <td>{r.wifiVerified ? 'WiFi verified' : '—'}</td>
                        <td><span className={'ps-chip ' + (CHIP_CLASS[status] || 'ps-chip-danger')}>{status}</span></td>
                        <td><button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setCorrectRec(r)}>Correct</button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={addOpen} title="Add manual attendance" submitLabel="Add record" fields={addFields} onClose={() => setAddOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createManualAttendance(
            Number(values.employeeId), values.attendanceDate, values.status,
            new Date(values.attendanceDate).toISOString(), values.remarks || '',
          );
          await loadRecords();
        }} />

      <Modal open={!!correctRec} title="Correct attendance" submitLabel="Save" fields={correctFields} onClose={() => setCorrectRec(null)}
        onSubmit={async (values) => {
          if (!correctRec) return;
          await AppStore.correctAttendance(correctRec.attendanceId, values.status, correctRec.effectiveCheckinTime ?? null, values.remarks || '');
          await loadRecords();
        }} />
    </Layout>
  );
}
