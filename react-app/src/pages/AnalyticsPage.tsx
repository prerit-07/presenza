import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Layout from '../components/Layout';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { Attendance, Employee, Ticket } from '../types/entities';

const BRAND = '#6d3fd6';
const ACCENT = '#22d3c9';
const WARN = '#f59e0b';
const DANGER = '#ef4444';

function dayKey(d: Date) { return d.toDateString(); }

export default function AnalyticsPage() {
  const [connError, setConnError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [orgTickets, setOrgTickets] = useState<Ticket[]>([]);

  const trendRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLCanvasElement>(null);
  const lateRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<Chart<any, any, any>[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!appHasPersonalLogin()) await appEnsureToken();
      } catch (err: any) {
        if (!cancelled) setConnError(err?.message || "Couldn't connect to the app.");
        return;
      }
      let emp: Employee[] = [], att: Attendance[] = [], tix: Ticket[] = [];
      try { emp = await AppStore.getAllEmployees(); } catch { /* non-fatal */ }
      try { att = await AppStore.getAttendanceList(); } catch { /* non-fatal */ }
      try { tix = await AppStore.getOrganizationTickets(); } catch { /* non-fatal */ }
      if (cancelled) return;
      setEmployees(emp);
      setAttendance(att);
      setOrgTickets(tix);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || connError) return;

    const employeesWithShift = employees.filter((e) => e.shiftId != null).length;

    function statusOn(dateObj: Date) {
      const key = dayKey(dateObj);
      const records = attendance.filter((r) => r.checkinTime && dayKey(new Date(r.checkinTime)) === key);
      const present = records.filter((r) => (r.status || '').toUpperCase() === 'PRESENT').length;
      const late = records.filter((r) => (r.status || '').toUpperCase() === 'LATE').length;
      return { present, late };
    }

    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const dayLabels = days.map((d) => d.toLocaleDateString('en-US', { weekday: 'short' }));
    const attendancePctByDay = days.map((d) => {
      const { present, late } = statusOn(d);
      return employeesWithShift ? Math.round(((present + late) / employeesWithShift) * 100) : 0;
    });
    const lateByDay = days.slice(1).map((d) => statusOn(d).late);
    const todayStatus = statusOn(new Date());
    const absentToday = Math.max(0, employeesWithShift - todayStatus.present - todayStatus.late);

    chartsRef.current.forEach((c) => c.destroy());
    chartsRef.current = [];

    if (trendRef.current) {
      chartsRef.current.push(new Chart(trendRef.current, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Attendance %',
            data: attendancePctByDay,
            borderColor: BRAND,
            backgroundColor: 'rgba(109,63,214,0.12)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: BRAND,
            pointRadius: 4,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100, grid: { color: '#eee6ff' } }, x: { grid: { display: false } } },
        },
      }));
    }

    if (statusRef.current) {
      chartsRef.current.push(new Chart(statusRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Present today', 'Late today', 'Absent today'],
          datasets: [{
            data: [todayStatus.present, todayStatus.late, absentToday],
            backgroundColor: [ACCENT, WARN, DANGER],
            borderWidth: 0,
          }],
        },
        options: {
          cutout: '70%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        },
      }));
    }

    if (lateRef.current) {
      chartsRef.current.push(new Chart(lateRef.current, {
        type: 'bar',
        data: {
          labels: dayLabels.slice(1),
          datasets: [{
            label: 'Late arrivals',
            data: lateByDay,
            backgroundColor: WARN,
            borderRadius: 6,
            maxBarThickness: 40,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: '#eee6ff' } }, x: { grid: { display: false } } },
        },
      }));
    }

    return () => {
      chartsRef.current.forEach((c) => c.destroy());
      chartsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, connError, employees, attendance]);

  const openTickets = orgTickets.filter((t) => ['OPEN', 'REOPENED'].includes((t.status || '').toUpperCase()));

  return (
    <Layout title="Analytics" subtitle="Attendance trends and insights across your organization">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="ps-card">
          <div className="ps-section-head"><div className="ps-section-title">Weekly attendance trend</div></div>
          {connError ? <div className="ps-empty">Couldn't connect to the app ({connError}).</div> : <canvas ref={trendRef} height={140} />}
        </div>
        <div className="ps-card">
          <div className="ps-section-head"><div className="ps-section-title">Status breakdown</div></div>
          {!connError ? <canvas ref={statusRef} height={140} /> : null}
        </div>
      </div>

      <div className="ps-card" style={{ marginBottom: 20 }}>
        <div className="ps-section-head"><div className="ps-section-title">Late arrivals by day</div></div>
        {!connError ? <canvas ref={lateRef} height={90} /> : null}
      </div>

      <div className="ps-card">
        <div className="ps-section-head"><div className="ps-section-title">Needs attention</div></div>
        <div>
          {connError ? null : !ready ? 'Loading…'
            : openTickets.length === 0 ? <div className="ps-empty">Nothing needs attention right now.</div>
            : openTickets.map((t) => (
              <div key={t.ticketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--surface-200)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.subject || 'Ticket #' + t.ticketId}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-500)' }}>{t.description || ''}</div>
                </div>
                <span className="ps-chip ps-chip-warn">{t.status || 'OPEN'}</span>
              </div>
            ))}
        </div>
      </div>
    </Layout>
  );
}
