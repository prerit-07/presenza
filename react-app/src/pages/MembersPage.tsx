import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Department, Employee, Shift, Team } from '../types/entities';

export default function MembersPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  function deptOptions() { return departments.map((d) => ({ value: String(d.departmentId), label: d.departmentName })); }
  function teamOptions() { return teams.map((t) => ({ value: String(t.teamId), label: t.teamName })); }
  function shiftOptions() { return shifts.map((s) => ({ value: String(s.shiftId), label: s.shiftName })); }

  async function loadEmployees() {
    try {
      setEmployees(await AppStore.getAllEmployees());
      setLoadErr(null);
    } catch (err: any) {
      setLoadErr(err?.status === 403 ? 'Needs a manager/org-admin account on their side to view this.' : (err?.message || "Couldn't load members."));
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
      try { setDepartments(await AppStore.getDepartments()); } catch { /* non-fatal */ }
      try { setTeams(await AppStore.getTeams()); } catch { /* non-fatal */ }
      try { setShifts(await AppStore.getShifts()); } catch { /* non-fatal */ }
      await loadEmployees();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deptById: Record<number, string> = {}; departments.forEach((d) => { deptById[d.departmentId] = d.departmentName; });
  const teamById: Record<number, string> = {}; teams.forEach((t) => { teamById[t.teamId] = t.teamName; });
  const shiftById: Record<number, string> = {}; shifts.forEach((s) => { shiftById[s.shiftId] = s.shiftName; });

  const addFields: ModalField[] = [
    { name: 'username', label: 'Username' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'employeeName', label: 'Full name' },
    { name: 'dateOfJoining', label: 'Date of joining', type: 'date' },
    { name: 'departmentId', label: 'Department', type: 'select', options: deptOptions(), required: false },
    { name: 'shiftId', label: 'Shift', type: 'select', options: shiftOptions(), required: false },
    { name: 'teamId', label: 'Team', type: 'select', options: teamOptions(), required: false },
  ];

  const editFields: ModalField[] = editEmp ? [
    { name: 'employeeName', label: 'Full name', value: editEmp.employeeName },
    { name: 'dateOfJoining', label: 'Date of joining', type: 'date', value: editEmp.dateOfJoining || '' },
    { name: 'departmentId', label: 'Department', type: 'select', options: deptOptions(), required: false, value: editEmp.departmentId != null ? String(editEmp.departmentId) : '' },
    { name: 'shiftId', label: 'Shift', type: 'select', options: shiftOptions(), required: false, value: editEmp.shiftId != null ? String(editEmp.shiftId) : '' },
    { name: 'teamId', label: 'Team', type: 'select', options: teamOptions(), required: false, value: editEmp.teamId != null ? String(editEmp.teamId) : '' },
  ] : [];

  return (
    <Layout title="Members" subtitle="Live employee list from the app">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head">
            <div className="ps-section-title">Employees</div>
            <button className="ps-btn ps-btn-primary" onClick={() => setAddOpen(true)}>Add employee</button>
          </div>

          <div className="ps-table-wrap" style={{ marginBottom: 20 }}>
            <table className="ps-table">
              <thead><tr><th>Name</th><th>Employee ID</th><th>Date of Joining</th><th>Department</th><th>Shift</th><th>Team</th><th /></tr></thead>
              <tbody>
                {loadErr ? <tr><td colSpan={7} className="ps-empty">{loadErr}</td></tr>
                  : employees === null ? <tr><td colSpan={7} className="ps-empty">Loading…</td></tr>
                  : employees.length === 0 ? <tr><td colSpan={7} className="ps-empty">No members yet.</td></tr>
                  : employees.map((e) => (
                    <tr key={e.employeeId}>
                      <td>{e.employeeName}</td>
                      <td>{e.employeeId}</td>
                      <td>{e.dateOfJoining || '—'}</td>
                      <td>{e.departmentId != null ? (deptById[e.departmentId] || ('#' + e.departmentId)) : '—'}</td>
                      <td>{e.shiftId != null ? (shiftById[e.shiftId] || ('#' + e.shiftId)) : '—'}</td>
                      <td>{e.teamId != null ? (teamById[e.teamId] || ('#' + e.teamId)) : '—'}</td>
                      <td><button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setEditEmp(e)}>Edit</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={addOpen}
        title="Add employee"
        subtitle="Creates a real employee on the app — they can log in with this email once they set a password via Forgot Password."
        submitLabel="Add employee"
        fields={addFields}
        onClose={() => setAddOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createEmployee(
            values.username, values.email, values.employeeName, values.dateOfJoining,
            values.departmentId ? Number(values.departmentId) : null,
            values.shiftId ? Number(values.shiftId) : null,
            values.teamId ? Number(values.teamId) : null,
          );
          await loadEmployees();
        }}
      />

      <Modal
        open={!!editEmp}
        title="Edit employee"
        submitLabel="Save changes"
        fields={editFields}
        onClose={() => setEditEmp(null)}
        onSubmit={async (values) => {
          if (!editEmp) return;
          await AppStore.updateEmployee(editEmp.employeeId, {
            orgId: editEmp.orgId,
            userId: editEmp.userId,
            employeeName: values.employeeName,
            dateOfJoining: values.dateOfJoining,
            departmentId: values.departmentId ? Number(values.departmentId) : null,
            shiftId: values.shiftId ? Number(values.shiftId) : null,
            teamId: values.teamId ? Number(values.teamId) : null,
          });
          await loadEmployees();
        }}
      />
    </Layout>
  );
}
