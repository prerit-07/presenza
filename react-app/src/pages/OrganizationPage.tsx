import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Icon from '../components/Icon';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { AttendanceRequest, DeviceChangeRequest, Employee, Ticket } from '../types/entities';
import '../styles/pages/organization.css';

function isToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

export default function OrganizationPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [greetName, setGreetName] = useState('there');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [zonesCount, setZonesCount] = useState(0);
  const [wifiCount, setWifiCount] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [lateToday, setLateToday] = useState(0);
  const [attendanceRateToday, setAttendanceRateToday] = useState(0);
  const [orgTickets, setOrgTickets] = useState<Ticket[]>([]);
  const [pendingAttendanceRequests, setPendingAttendanceRequests] = useState<AttendanceRequest[]>([]);
  const [pendingDeviceRequests, setPendingDeviceRequests] = useState<DeviceChangeRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!appHasPersonalLogin()) await appEnsureToken();
        const me = await AppStore.getMe();
        if (cancelled) return;
        setGreetName(me.username || 'there');
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || "Couldn't connect to the app.");
        return;
      }

      const [employeesRes, geofencesRes, attendanceRes, pendingAttRes, pendingDevRes, ticketsRes] = await Promise.all([
        AppStore.getAllEmployees().catch(() => []),
        AppStore.getGeofences().catch(() => []),
        AppStore.getAttendanceList().catch(() => []),
        AppStore.getPendingAttendanceRequests().catch(() => []),
        AppStore.getPendingDeviceChangeRequests().catch(() => []),
        AppStore.getOrganizationTickets().catch(() => []),
      ]);
      if (cancelled) return;

      let wifi = 0;
      for (const g of geofencesRes) {
        try { wifi += (await AppStore.getWifiNetworksForGeofence(g.geofenceId)).length; } catch { /* skip */ }
      }
      if (cancelled) return;

      const todaysRecords = attendanceRes.filter((r) => isToday(r.checkinTime));
      const present = todaysRecords.filter((r) => (r.status || '').toUpperCase() === 'PRESENT').length;
      const late = todaysRecords.filter((r) => (r.status || '').toUpperCase() === 'LATE').length;
      const employeesWithShift = employeesRes.filter((e) => e.shiftId != null).length;
      const rate = employeesWithShift ? Math.round(((present + late) / employeesWithShift) * 100) : 0;

      setEmployees(employeesRes);
      setZonesCount(geofencesRes.length);
      setWifiCount(wifi);
      setPresentToday(present);
      setLateToday(late);
      setAttendanceRateToday(rate);
      setOrgTickets(ticketsRes);
      setPendingAttendanceRequests(pendingAttRes);
      setPendingDeviceRequests(pendingDevRes);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const employeesWithShift = employees.filter((e) => e.shiftId != null).length;
  const absentToday = Math.max(0, employeesWithShift - presentToday - lateToday);
  const openTickets = orgTickets.filter((t) => ['OPEN', 'REOPENED'].includes((t.status || '').toUpperCase()));
  const employeeByUserId: Record<number, string> = {};
  employees.forEach((e) => { employeeByUserId[e.userId] = e.employeeName; });

  async function approveAttendance(requestId: number) {
    await AppStore.reviewAttendanceRequest(requestId, true, 'Approved from Overview');
    setPendingAttendanceRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }
  async function rejectAttendance(requestId: number) {
    await AppStore.reviewAttendanceRequest(requestId, false, 'Rejected from Overview');
    setPendingAttendanceRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }
  async function approveDevice(requestId: number) {
    await AppStore.reviewDeviceChangeRequest(requestId, true);
    setPendingDeviceRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }
  async function rejectDevice(requestId: number) {
    await AppStore.reviewDeviceChangeRequest(requestId, false);
    setPendingDeviceRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }

  function pickIcon(kind: 'attendance' | 'device' | 'ticket') {
    if (kind === 'device') return 'wifi' as const;
    if (kind === 'ticket') return 'ticket' as const;
    return 'fileText' as const;
  }

  const activityItems = [
    ...pendingAttendanceRequests.map((r) => ({ kind: 'attendance' as const, time: r.requestedAt, text: `${employeeByUserId[r.userId] || 'Employee #' + r.userId} requested ${r.requestType || 'leave'}` })),
    ...pendingDeviceRequests.map((r) => ({ kind: 'device' as const, time: r.requestedAt, text: `${employeeByUserId[r.userId] || 'User #' + r.userId} requested a device change` })),
    ...orgTickets.map((t) => ({ kind: 'ticket' as const, time: t.createdAt, text: `Ticket raised: ${t.subject || '#' + t.ticketId}` })),
  ].filter((a) => a.time).sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime()).slice(0, 8);

  return (
    <Layout title="Overview" subtitle="Welcome back — here's what's happening across your organization today">
      <h2 className="ov-greeting">Hey <span>{greetName}</span>!</h2>

      {loadError ? (
        <div className="ps-empty">Couldn't connect to the app ({loadError}).</div>
      ) : (
        <>
          <div className="ps-stat-grid ov-stat-grid">
            <div className="ps-stat-card ov-stat-card">
              <div className="ps-stat-icon"><Icon name="users" size={20} /></div>
              <div className="ps-stat-value">{loaded ? employees.length : '—'}</div>
              <div className="ps-stat-label">Total members</div>
            </div>
            <div className="ps-stat-card ov-stat-card">
              <div className="ps-stat-icon"><Icon name="barChart" size={20} /></div>
              <div className="ps-stat-value">{loaded ? `${attendanceRateToday}%` : '—'}</div>
              <div className="ps-stat-label">Attendance rate today</div>
            </div>
            <div className="ps-stat-card ov-stat-card">
              <div className="ps-stat-icon"><Icon name="fileText" size={20} /></div>
              <div className="ps-stat-value">{loaded ? pendingAttendanceRequests.length : '—'}</div>
              <div className="ps-stat-label">Pending leave requests</div>
            </div>
            <div className="ps-stat-card ov-stat-card">
              <div className="ps-stat-icon"><Icon name="ticket" size={20} /></div>
              <div className="ps-stat-value">{loaded ? openTickets.length : '—'}</div>
              <div className="ps-stat-label">Pending tickets</div>
            </div>
          </div>

          <div className="ps-stat-grid ov-stat-grid ov-stat-grid-secondary">
            <div className="ps-stat-card ov-stat-card-light">
              <div className="ps-stat-icon"><Icon name="checkSquare" size={20} /></div>
              <div className="ps-stat-value">{loaded ? presentToday : '—'}</div>
              <div className="ps-stat-label">Present today</div>
            </div>
            <div className="ps-stat-card ov-stat-card-light">
              <div className="ps-stat-icon"><Icon name="clock" size={20} /></div>
              <div className="ps-stat-value">{loaded ? lateToday : '—'}</div>
              <div className="ps-stat-label">Late today</div>
            </div>
            <div className="ps-stat-card ov-stat-card-light">
              <div className="ps-stat-icon"><Icon name="fileText" size={20} /></div>
              <div className="ps-stat-value">{loaded ? absentToday : '—'}</div>
              <div className="ps-stat-label">Absent today</div>
            </div>
            <div className="ps-stat-card ov-stat-card-light">
              <div className="ps-stat-icon"><Icon name="mapPin" size={20} /></div>
              <div className="ps-stat-value">{loaded ? zonesCount : '—'}</div>
              <div className="ps-stat-label">Active zones</div>
            </div>
            <div className="ps-stat-card ov-stat-card-light">
              <div className="ps-stat-icon"><Icon name="wifi" size={20} /></div>
              <div className="ps-stat-value">{loaded ? wifiCount : '—'}</div>
              <div className="ps-stat-label">Wifi routers</div>
            </div>
            <div className="ps-stat-card ov-stat-card-light">
              <div className="ps-stat-icon"><Icon name="ticket" size={20} /></div>
              <div className="ps-stat-value">{loaded ? pendingDeviceRequests.length : '—'}</div>
              <div className="ps-stat-label">Pending device requests</div>
            </div>
          </div>

          <div className="ps-section-head"><div className="ps-section-title">Quick actions</div></div>
          <div className="ov-quicklinks">
            <Link to="/members" className="quick-link-card"><div className="quick-link-icon"><Icon name="users" size={20} /></div><div>Add Member</div></Link>
            <Link to="/geofencing" className="quick-link-card"><div className="quick-link-icon"><Icon name="mapPin" size={20} /></div><div>Create Zone</div></Link>
            <Link to="/wifi" className="quick-link-card"><div className="quick-link-icon"><Icon name="wifi" size={20} /></div><div>Register Router</div></Link>
            <Link to="/team" className="quick-link-card"><div className="quick-link-icon"><Icon name="usersGroup" size={20} /></div><div>Manage Team</div></Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '22px 0', alignItems: 'start' }}>
            <div className="ps-card">
              <div className="ps-section-head"><div className="ps-section-title">Needs attention</div></div>
              <div>
                {openTickets.length === 0 ? (
                  <div className="ps-empty">Nothing needs attention right now.</div>
                ) : openTickets.slice(0, 5).map((t) => (
                  <div className="alert-row" key={t.ticketId}>
                    <div>
                      <div className="alert-name">{t.subject || 'Ticket #' + t.ticketId}</div>
                      <div className="alert-detail">{t.description || ''}</div>
                    </div>
                    <span className="ps-chip ps-chip-warn">{t.status || 'OPEN'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ps-card">
              <div className="ps-section-head"><div className="ps-section-title">Pending approvals</div></div>
              <div>
                {!pendingAttendanceRequests.length && !pendingDeviceRequests.length ? (
                  <div className="ps-empty">Nothing pending — you're all caught up.</div>
                ) : (
                  <>
                    {pendingAttendanceRequests.slice(0, 5).map((r) => (
                      <div className="approval-row" key={'att-' + r.requestId}>
                        <div className="approval-info">
                          <div><b>{employeeByUserId[r.userId] || 'Employee #' + r.userId}</b> requested {r.requestType || 'leave'}</div>
                          <div className="approval-sub">{r.startDate || ''} → {r.endDate || ''} · {r.reason || 'No reason given'}</div>
                        </div>
                        <div className="approval-actions">
                          <button className="ps-btn ps-btn-primary ps-btn-sm" onClick={() => approveAttendance(r.requestId)}>Approve</button>
                          <button className="ps-btn ps-btn-danger ps-btn-sm" onClick={() => rejectAttendance(r.requestId)}>Reject</button>
                        </div>
                      </div>
                    ))}
                    {pendingDeviceRequests.slice(0, 5).map((r) => (
                      <div className="approval-row" key={'dev-' + r.requestId}>
                        <div className="approval-info">
                          <div><b>{employeeByUserId[r.userId] || 'User #' + r.userId}</b> requested a device change</div>
                          <div className="approval-sub">{r.oldDeviceId || '—'} → {r.newDeviceId || '—'}</div>
                        </div>
                        <div className="approval-actions">
                          <button className="ps-btn ps-btn-primary ps-btn-sm" onClick={() => approveDevice(r.requestId)}>Approve</button>
                          <button className="ps-btn ps-btn-danger ps-btn-sm" onClick={() => rejectDevice(r.requestId)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="ps-card ov-activity-card">
            <div className="ps-section-head"><div className="ps-section-title">Recent activity</div></div>
            <div>
              {activityItems.length === 0 ? (
                <div className="ps-empty">No recent activity yet.</div>
              ) : activityItems.map((item, i) => (
                <div className="activity-row" key={i}>
                  <div className="activity-row-left">
                    <div className="activity-icon"><Icon name={pickIcon(item.kind)} size={16} /></div>
                    <div className="activity-text">{item.text}</div>
                  </div>
                  <div className="activity-time">{new Date(item.time!).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
