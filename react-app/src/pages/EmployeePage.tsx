import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Icon from '../components/Icon';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { Attendance, AttendanceRequest, CurrentUser, DeviceChangeRequest, Employee, Shift, Ticket } from '../types/entities';
import '../styles/pages/employee.css';

function fmtTimeShort(t?: string | null) {
  if (!t) return '';
  const parts = t.split(':');
  const h = parts[0], m = parts[1];
  const hour = ((+h + 11) % 12) + 1;
  return hour + ':' + m + ' ' + (+h < 12 ? 'AM' : 'PM');
}

function chipClass(status?: string | null) {
  const s = (status || '').toUpperCase();
  if (s === 'PRESENT') return 'ps-chip-success';
  if (s === 'LATE') return 'ps-chip-warn';
  return 'ps-chip-danger';
}

function isToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem('presenzaAppDeviceId');
  if (!id) {
    id = 'website-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('presenzaAppDeviceId', id);
  }
  return id;
}

/** The backend requires a Device row to exist before it'll accept a
 *  check-in against that deviceId — register it once (ignore "already
 *  registered", that just means a previous check-in already did this). */
async function ensureDeviceRegistered(deviceId: string) {
  try {
    await AppStore.registerMyDevice(deviceId, 'web', navigator.userAgent.slice(0, 100), null);
  } catch (e: any) {
    if (!/already registered/i.test(e?.message || '')) throw e;
  }
}

export default function EmployeePage() {
  const [connError, setConnError] = useState<string | null>(null);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [myShift, setMyShift] = useState<Shift | null>(null);
  const [myRecords, setMyRecords] = useState<Attendance[]>([]);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinErr, setCheckinErr] = useState<string | null>(null);

  const [statAttendance, setStatAttendance] = useState('-');
  const [statStreak, setStatStreak] = useState<string | number>('-');
  const [statLeave, setStatLeave] = useState<string | number>('-');
  const [statVerif, setStatVerif] = useState('-');

  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  const [myEmployeeErr, setMyEmployeeErr] = useState<string | null>(null);
  const [teammates, setTeammates] = useState<Employee[] | null>(null);
  const [teammatesErr, setTeammatesErr] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[] | null>(null);
  const [ticketsErr, setTicketsErr] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<{ label: string; status: string }[] | null>(null);

  const [leaveType, setLeaveType] = useState('LEAVE');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState(false);

  const [deviceOldId, setDeviceOldId] = useState('');
  const [deviceNewId, setDeviceNewId] = useState('');
  const [deviceReason, setDeviceReason] = useState('');
  const [deviceReqError, setDeviceReqError] = useState('');
  const [deviceReqSuccess, setDeviceReqSuccess] = useState(false);

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const loadStats = useCallback(async (records: Attendance[]) => {
    const total = records.length;
    const goodCount = records.filter((r) => ['PRESENT', 'LATE'].includes((r.status || '').toUpperCase())).length;
    const rate = total ? Math.round((goodCount / total) * 100) : 0;
    setStatAttendance(rate + '%');

    const goodDates = new Set(
      records.filter((r) => ['PRESENT', 'LATE'].includes((r.status || '').toUpperCase()) && r.checkinTime)
        .map((r) => new Date(r.checkinTime).toDateString()),
    );
    let streak = 0;
    const cursor = new Date();
    while (goodDates.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStatStreak(streak);

    try {
      const [attendanceReqs, deviceReqs] = await Promise.all([
        AppStore.getMyAttendanceRequests().catch(() => []),
        AppStore.getMyDeviceChangeRequests().catch(() => []),
      ]);
      const pending = attendanceReqs.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length
        + deviceReqs.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length;
      setStatLeave(pending);
    } catch { /* non-fatal */ }

    try {
      const settings = await AppStore.getPresenceSettings();
      setStatVerif(settings.requireTrustedWifi ? 'GPS + WiFi' : 'GPS only');
    } catch {
      setStatVerif('—');
    }
  }, []);

  const renderMyRequests = useCallback(async () => {
    let attendanceReqs: AttendanceRequest[] = [];
    let deviceReqs: DeviceChangeRequest[] = [];
    try { attendanceReqs = (await AppStore.getMyAttendanceRequests()) || []; } catch { /* non-fatal */ }
    try { deviceReqs = (await AppStore.getMyDeviceChangeRequests()) || []; } catch { /* non-fatal */ }

    const rows = attendanceReqs.map((r) => ({ label: r.requestType || 'Attendance', status: r.status || 'Pending' }))
      .concat(deviceReqs.map((r) => ({ label: 'Device change', status: r.status || 'Pending' })));
    setMyRequests(rows);
  }, []);

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

      let employee: Employee | null = null;
      let shift: Shift | null = null;
      let records: Attendance[] = [];
      try { employee = await AppStore.getMyEmployee(); setMyEmployee(employee); } catch { setMyEmployeeErr("Couldn't load this."); }
      if (employee && employee.shiftId != null) {
        try { shift = await AppStore.getShiftById(employee.shiftId); } catch { /* non-fatal */ }
      }
      try { records = (await AppStore.getMyAttendance()) || []; } catch { /* non-fatal */ }
      if (cancelled) return;
      setMyShift(shift);
      setMyRecords(records);
      await loadStats(records);

      try { setTeammates((await AppStore.getMyTeammates()) || []); } catch { setTeammatesErr("Couldn't load this."); }
      try { setMyTickets((await AppStore.getMyTickets()) || []); } catch { setTicketsErr("Couldn't load this."); }
      await renderMyRequests();
    })();
    return () => { cancelled = true; };
  }, [loadStats, renderMyRequests]);

  const todayRecord = myRecords.find((r) => isToday(r.checkinTime)) || null;

  function handleCheckIn() {
    if (checkinBusy || !myShift) return;
    if (!navigator.geolocation) {
      setCheckinErr("Your browser doesn't support location — can't check in from here.");
      return;
    }
    setCheckinBusy(true);
    setCheckinErr(null);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const deviceId = getOrCreateDeviceId();
        await ensureDeviceRegistered(deviceId);
        await AppStore.employeeCheckIn(
          myShift.shiftId,
          deviceId,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
        );
        const records = (await AppStore.getMyAttendance()) || [];
        setMyRecords(records);
        await loadStats(records);
      } catch (e: any) {
        setCheckinErr(e?.message || 'Check-in failed.');
      } finally {
        setCheckinBusy(false);
      }
    }, () => {
      setCheckinErr('Location permission denied — GPS is needed to verify check-in.');
      setCheckinBusy(false);
    });
  }

  async function submitLeave() {
    setLeaveError(''); setLeaveSuccess(false);
    if (!leaveFrom || !leaveTo) { setLeaveError('Please select both from and to dates.'); return; }
    if (new Date(leaveTo) < new Date(leaveFrom)) { setLeaveError('"To" date cannot be before "From" date.'); return; }
    if (!leaveReason.trim()) { setLeaveError('Please enter a reason.'); return; }

    try {
      await AppStore.createAttendanceRequest(leaveType, leaveFrom, leaveTo, leaveReason.trim());
    } catch (e: any) {
      setLeaveError(e?.message || 'Could not submit request.');
      return;
    }
    setLeaveSuccess(true);
    setLeaveFrom(''); setLeaveTo(''); setLeaveReason('');
    await renderMyRequests();
    await loadStats(myRecords);
  }

  async function submitDeviceRequest() {
    setDeviceReqError(''); setDeviceReqSuccess(false);
    if (!deviceOldId.trim() || !deviceNewId.trim() || !deviceReason.trim()) {
      setDeviceReqError('Please fill in old device ID, new device ID, and reason.');
      return;
    }
    try {
      await AppStore.createDeviceChangeRequest(deviceOldId.trim(), deviceNewId.trim(), deviceReason.trim());
    } catch (e: any) {
      setDeviceReqError(e?.message || 'Could not submit request.');
      return;
    }
    setDeviceReqSuccess(true);
    setDeviceOldId(''); setDeviceNewId(''); setDeviceReason('');
    await renderMyRequests();
    await loadStats(myRecords);
  }

  async function submitTicket() {
    setTicketError(''); setTicketSuccess(false);
    if (!ticketSubject.trim()) { setTicketError('Please enter a subject.'); return; }
    try {
      await AppStore.createTicket(ticketSubject.trim(), ticketDescription.trim());
    } catch (e: any) {
      setTicketError(e?.message || 'Could not raise ticket.');
      return;
    }
    setTicketSuccess(true);
    setTicketSubject(''); setTicketDescription('');
    try { setMyTickets((await AppStore.getMyTickets()) || []); } catch { /* non-fatal */ }
  }

  return (
    <Layout title="My Dashboard" subtitle="Check in, track your attendance, and manage leave">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? (
          <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
        ) : me ? (
          <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
        ) : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="checkin-hero">
            <div>
              <div className="checkin-status">
                {checkinErr ? checkinErr
                  : todayRecord ? 'Checked in at ' + new Date(todayRecord.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : !myShift ? 'No shift assigned — ask your admin to assign one before checking in.'
                  : 'Not checked in yet'}
              </div>
              <div className="checkin-sub">
                {myShift
                  ? 'Shift: ' + (myShift.shiftName || ('#' + myShift.shiftId)) + ' · ' + fmtTimeShort(myShift.startTime) + ' – ' + fmtTimeShort(myShift.endTime)
                  : 'No shift assigned'}
              </div>
            </div>
            <button
              className={'ps-btn ps-btn-primary checkin-btn' + (todayRecord ? ' checked-in' : '')}
              disabled={!!todayRecord || checkinBusy || !myShift}
              onClick={handleCheckIn}
            >
              {todayRecord ? 'Checked In ✓' : checkinBusy ? 'Checking in…' : 'Check In'}
            </button>
          </div>

          <div className="ps-stat-grid">
            <div className="ps-stat-card">
              <div className="ps-stat-icon"><Icon name="barChart" size={20} /></div>
              <div className="ps-stat-value">{statAttendance}</div>
              <div className="ps-stat-label">Attendance rate</div>
            </div>
            <div className="ps-stat-card">
              <div className="ps-stat-icon"><Icon name="activity" size={20} /></div>
              <div className="ps-stat-value">{statStreak}</div>
              <div className="ps-stat-label">Day streak</div>
            </div>
            <div className="ps-stat-card">
              <div className="ps-stat-icon"><Icon name="fileText" size={20} /></div>
              <div className="ps-stat-value">{statLeave}</div>
              <div className="ps-stat-label">Pending requests</div>
            </div>
            <div className="ps-stat-card">
              <div className="ps-stat-icon"><Icon name="mapPin" size={20} /></div>
              <div className="ps-stat-value">{statVerif}</div>
              <div className="ps-stat-label">Verification mode</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead><tr><th>Date</th><th>Check-In</th><th>Effective Check-In</th><th>WiFi</th><th>Status</th></tr></thead>
                <tbody>
                  {myRecords.length === 0 ? (
                    <tr><td colSpan={5} className="ps-empty">No attendance records yet. Check in to get started!</td></tr>
                  ) : myRecords.slice(0, 10).map((r) => (
                    <tr key={r.attendanceId}>
                      <td>{r.checkinTime ? new Date(r.checkinTime).toLocaleDateString() : '-'}</td>
                      <td>{r.checkinTime ? new Date(r.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>{r.effectiveCheckinTime ? new Date(r.effectiveCheckinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td>{r.wifiVerified ? 'WiFi verified' : '—'}</td>
                      <td><span className={'ps-chip ' + chipClass(r.status)}>{r.status || 'Absent'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ps-card">
              <div className="ps-section-head"><div className="ps-section-title">Apply for Leave / WFH</div></div>
              {leaveError ? <div className="ps-alert ps-alert-error visible">{leaveError}</div> : <div className="ps-alert ps-alert-error" />}
              {leaveSuccess ? <div className="ps-alert ps-alert-success visible">Leave request submitted</div> : <div className="ps-alert ps-alert-success" />}
              <div className="ps-field">
                <label>Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option value="LEAVE">Leave</option>
                  <option value="WFH">Work From Home</option>
                </select>
              </div>
              <div className="ps-field"><label>From date</label><input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} /></div>
              <div className="ps-field"><label>To date</label><input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} /></div>
              <div className="ps-field"><label>Reason</label><input type="text" placeholder="e.g. Medical appointment" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} /></div>
              <button className="ps-btn ps-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={submitLeave}>Submit Request</button>
            </div>
          </div>

          <div className="ps-section-head" style={{ marginTop: 28 }}>
            <div className="ps-section-title">My Profile — live from the app</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <div>
              <div className="ps-section-head"><div className="ps-section-title">My Employee Info</div></div>
              <div className="ps-card" style={{ marginBottom: 20 }}>
                {myEmployeeErr ? <div className="ps-empty">{myEmployeeErr}</div> : !myEmployee ? 'Loading…' : (
                  <div className="ps-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))' }}>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 15 }}>{myEmployee.employeeName || '—'}</div><div className="ps-stat-label">Name</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 15 }}>{myEmployee.dateOfJoining || '—'}</div><div className="ps-stat-label">Joined</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 15 }}>{myEmployee.departmentId ?? '—'}</div><div className="ps-stat-label">Department ID</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 15 }}>{myEmployee.shiftId ?? '—'}</div><div className="ps-stat-label">Shift ID</div></div>
                  </div>
                )}
              </div>

              <div className="ps-section-head"><div className="ps-section-title">My Teammates</div></div>
              <div className="ps-card" style={{ marginBottom: 20 }}>
                {teammatesErr ? <div className="ps-empty">{teammatesErr}</div>
                  : teammates === null ? 'Loading…'
                  : teammates.length === 0 ? <div className="ps-empty">No teammates found.</div>
                  : teammates.map((t) => (
                    <div key={t.employeeId} style={{ padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: 13, fontWeight: 600 }}>
                      {t.employeeName || t.name || ('Employee #' + t.employeeId)}
                    </div>
                  ))}
              </div>

              <div className="ps-section-head"><div className="ps-section-title">Request Device Change</div></div>
              <div className="ps-card" style={{ marginBottom: 20 }}>
                {deviceReqError ? <div className="ps-alert ps-alert-error visible">{deviceReqError}</div> : <div className="ps-alert ps-alert-error" />}
                {deviceReqSuccess ? <div className="ps-alert ps-alert-success visible">Device change request submitted</div> : <div className="ps-alert ps-alert-success" />}
                <div className="ps-field"><label>Old device ID</label><input type="text" placeholder="e.g. device-abc123" value={deviceOldId} onChange={(e) => setDeviceOldId(e.target.value)} /></div>
                <div className="ps-field"><label>New device ID</label><input type="text" placeholder="e.g. device-xyz789" value={deviceNewId} onChange={(e) => setDeviceNewId(e.target.value)} /></div>
                <div className="ps-field"><label>Reason</label><input type="text" placeholder="e.g. Lost my old phone" value={deviceReason} onChange={(e) => setDeviceReason(e.target.value)} /></div>
                <button className="ps-btn ps-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={submitDeviceRequest}>Submit Request</button>
              </div>
            </div>

            <div>
              <div className="ps-section-head"><div className="ps-section-title">My Tickets</div></div>
              <div className="ps-card" style={{ marginBottom: 20 }}>
                {ticketsErr ? <div className="ps-empty">{ticketsErr}</div>
                  : myTickets === null ? 'Loading…'
                  : myTickets.length === 0 ? <div className="ps-empty">No tickets.</div>
                  : myTickets.map((t) => (
                    <div key={t.ticketId} style={{ padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: 13 }}>
                      <b>{t.subject || t.title || 'Ticket'}</b>
                      <span className="ps-chip ps-chip-warn" style={{ marginLeft: 8 }}>{t.status || 'Open'}</span>
                    </div>
                  ))}
              </div>

              <div className="ps-section-head"><div className="ps-section-title">Raise a Ticket</div></div>
              <div className="ps-card" style={{ marginBottom: 20 }}>
                {ticketError ? <div className="ps-alert ps-alert-error visible">{ticketError}</div> : <div className="ps-alert ps-alert-error" />}
                {ticketSuccess ? <div className="ps-alert ps-alert-success visible">Ticket raised successfully</div> : <div className="ps-alert ps-alert-success" />}
                <div className="ps-field"><label>Subject</label><input type="text" placeholder="e.g. Can't check in at the office" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} /></div>
                <div className="ps-field"><label>Description</label><input type="text" placeholder="Describe the issue" value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} /></div>
                <button className="ps-btn ps-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={submitTicket}>Raise Ticket</button>
              </div>

              <div className="ps-section-head"><div className="ps-section-title">My Attendance / Device Requests</div></div>
              <div className="ps-card" style={{ marginBottom: 20 }}>
                {myRequests === null ? 'Loading…' : myRequests.length === 0 ? <div className="ps-empty">No pending requests.</div> : myRequests.map((r, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: 13 }}>
                    {r.label} request
                    <span className="ps-chip ps-chip-warn" style={{ marginLeft: 8 }}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
