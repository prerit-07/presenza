import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal, { type ModalField } from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Department, Employee, Team } from '../types/entities';
import '../styles/pages/team.css';

export default function TeamPage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamsErr, setTeamsErr] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [deptErr, setDeptErr] = useState<string | null>(null);

  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);

  const employeeById: Record<number, string> = {};
  employees.forEach((e) => { employeeById[e.employeeId] = e.employeeName; });

  function employeeOptions() {
    return employees.map((e) => ({ value: String(e.employeeId), label: e.employeeName }));
  }

  async function loadTeams() {
    try {
      setTeams(await AppStore.getTeams());
      setTeamsErr(null);
    } catch (err: any) {
      setTeamsErr(err?.status === 403 ? 'Needs a manager/org-admin account on their side to view this.' : (err?.message || "Couldn't load teams."));
    }
  }

  async function loadDepartments() {
    try {
      setDepartments(await AppStore.getDepartments());
      setDeptErr(null);
    } catch (err: any) {
      setDeptErr(err?.message || "Couldn't load departments.");
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
      try { setOrgId((await AppStore.getOrganization()).orgId); } catch { /* non-fatal */ }
      await loadTeams();
      await loadDepartments();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTeamFields: ModalField[] = [
    { name: 'teamName', label: 'Team name', placeholder: 'e.g. Field Ops' },
    { name: 'managerEmployeeId', label: 'Manager', type: 'select', options: employeeOptions(), required: false },
  ];
  const editTeamFields: ModalField[] = editTeam ? [
    { name: 'teamName', label: 'Team name', value: editTeam.teamName },
    { name: 'managerEmployeeId', label: 'Manager', type: 'select', options: employeeOptions(), required: false, value: editTeam.managerEmployeeId != null ? String(editTeam.managerEmployeeId) : '' },
  ] : [];
  const addDeptFields: ModalField[] = [{ name: 'departmentName', label: 'Department name', placeholder: 'e.g. Engineering' }];
  const editDeptFields: ModalField[] = editDept ? [{ name: 'departmentName', label: 'Department name', value: editDept.departmentName }] : [];

  return (
    <Layout title="Team Management" subtitle="Live teams & departments from the app">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head">
            <div className="ps-section-title">Teams</div>
            <button className="ps-btn ps-btn-primary" onClick={() => setAddTeamOpen(true)}>Add team</button>
          </div>
          <div className="ps-card ps-card-accent" style={{ marginBottom: 24, minHeight: 120 }}>
            {teamsErr ? <div className="ps-empty">{teamsErr}</div>
              : teams === null ? 'Loading…'
              : teams.length === 0 ? <div className="ps-empty">No teams configured yet.</div>
              : teams.map((t) => {
                const memberCount = employees.filter((e) => e.teamId === t.teamId).length;
                const managerName = t.managerEmployeeId != null ? (employeeById[t.managerEmployeeId] || `#${t.managerEmployeeId}`) : 'Unassigned';
                return (
                  <div className="team-member-row" key={t.teamId}>
                    <div className="team-avatar">{(t.teamName || 'T').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="team-name">{t.teamName || 'Team #' + t.teamId}</div>
                      <div className="team-role">Manager: {managerName} · {memberCount} member{memberCount === 1 ? '' : 's'}</div>
                    </div>
                    <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setEditTeam(t)}>Edit</button>
                  </div>
                );
              })}
          </div>

          <div className="ps-section-head">
            <div className="ps-section-title">Departments</div>
            <button className="ps-btn ps-btn-primary" onClick={() => setAddDeptOpen(true)}>Add department</button>
          </div>
          <div className="ps-card ps-card-accent" style={{ marginBottom: 20, minHeight: 120 }}>
            {deptErr ? <div className="ps-empty">{deptErr}</div>
              : departments === null ? 'Loading…'
              : departments.length === 0 ? <div className="ps-empty">No departments configured yet.</div>
              : departments.map((d) => {
                const memberCount = employees.filter((e) => e.departmentId === d.departmentId).length;
                return (
                  <div className="team-member-row" key={d.departmentId}>
                    <div className="team-avatar">{(d.departmentName || 'D').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="team-name">{d.departmentName || 'Department #' + d.departmentId}</div>
                      <div className="team-role">{memberCount} member{memberCount === 1 ? '' : 's'}</div>
                    </div>
                    <button className="ps-btn ps-btn-ghost ps-btn-sm" onClick={() => setEditDept(d)}>Edit</button>
                  </div>
                );
              })}
          </div>
        </>
      )}

      <Modal open={addTeamOpen} title="Add team" submitLabel="Add team" fields={addTeamFields} onClose={() => setAddTeamOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createTeam(orgId as number, values.teamName, values.managerEmployeeId ? Number(values.managerEmployeeId) : null);
          await loadTeams();
        }} />

      <Modal open={!!editTeam} title="Edit team" submitLabel="Save changes" fields={editTeamFields} onClose={() => setEditTeam(null)}
        onSubmit={async (values) => {
          if (!editTeam) return;
          await AppStore.updateTeam(editTeam.teamId, orgId as number, values.teamName, values.managerEmployeeId ? Number(values.managerEmployeeId) : null);
          await loadTeams();
        }} />

      <Modal open={addDeptOpen} title="Add department" submitLabel="Add department" fields={addDeptFields} onClose={() => setAddDeptOpen(false)}
        onSubmit={async (values) => {
          await AppStore.createDepartment(orgId as number, values.departmentName);
          await loadDepartments();
        }} />

      <Modal open={!!editDept} title="Edit department" submitLabel="Save changes" fields={editDeptFields} onClose={() => setEditDept(null)}
        onSubmit={async (values) => {
          if (!editDept) return;
          await AppStore.updateDepartment(editDept.departmentId, orgId as number, values.departmentName);
          await loadDepartments();
        }} />
    </Layout>
  );
}
