import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { AppStore, appEnsureToken, appHasPersonalLogin } from '../lib/appStore';
import type { CurrentUser, Organization, PresenceSettings } from '../types/entities';

const ORG_TYPE_OPTIONS = [
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NON_PROFIT', label: 'Non-profit' },
];

const YES_NO_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export default function ProfilePage() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  const [org, setOrg] = useState<Organization | null>(null);
  const [orgErr, setOrgErr] = useState<string | null>(null);
  const [plan, setPlan] = useState<Organization | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceSettings | null>(null);
  const [presenceErr, setPresenceErr] = useState<string | null>(null);

  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [editPresenceOpen, setEditPresenceOpen] = useState(false);

  async function loadOrgProfile() {
    try {
      const o = await AppStore.getOrganization();
      setOrg(o);
      setOrgErr(null);
    } catch (err: any) {
      setOrgErr(err?.message || "Couldn't load this.");
    }
  }

  async function loadPlan() {
    try {
      const o = await AppStore.getOrganization();
      setPlan(o);
      setPlanErr(null);
    } catch (err: any) {
      setPlanErr(err?.message || "Couldn't load this.");
    }
  }

  async function loadPresenceSettings() {
    try {
      const p = await AppStore.getPresenceSettings();
      setPresence(p);
      setPresenceErr(null);
    } catch (err: any) {
      setPresenceErr(err?.message || "Couldn't load this.");
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
      await loadOrgProfile();
      await loadPlan();
      await loadPresenceSettings();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEditOrg(values: Record<string, string>) {
    await AppStore.updateOrganization(values.orgName, values.orgType);
    await loadOrgProfile();
  }

  async function handleEditPresence(values: Record<string, string>) {
    await AppStore.updatePresenceSettings(
      values.presenceMonitoringEnabled === 'true',
      Number(values.presenceUpdateIntervalSeconds),
      values.requireTrustedWifi === 'true'
    );
    await loadPresenceSettings();
  }

  return (
    <Layout title="Organisation Setup" subtitle="Live organization profile and subscription">
      <div className="ps-card" style={{ marginBottom: 18, fontSize: 13.5, fontWeight: 600 }}>
        {connError ? <><span className="ps-chip ps-chip-danger">Not connected</span> {connError}</>
          : me ? <><span className="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>{me.username}</b> ({me.role})</>
          : 'Connecting…'}
      </div>

      {!connError && (
        <>
          <div className="ps-section-head"><div className="ps-section-title">Organization Profile</div></div>
          <div className="ps-card" style={{ marginBottom: 22 }}>
            {orgErr ? <div className="ps-empty">Couldn't load this ({orgErr}).</div>
              : !org ? 'Loading…'
              : (
                <>
                  <div className="ps-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', marginBottom: 16 }}>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{org.orgName || '—'}</div><div className="ps-stat-label">Organization Name</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{org.orgType || '—'}</div><div className="ps-stat-label">Type</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{org.companyCode || '—'}</div><div className="ps-stat-label">Company Code</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{org.orgId ?? '—'}</div><div className="ps-stat-label">Org ID</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}</div><div className="ps-stat-label">Created</div></div>
                  </div>
                  <button className="ps-btn ps-btn-primary" onClick={() => setEditOrgOpen(true)}>Edit organization</button>
                </>
              )}
          </div>

          <div className="ps-section-head"><div className="ps-section-title">Subscription Plan</div></div>
          <div className="ps-card" style={{ marginBottom: 22 }}>
            {planErr ? <div className="ps-empty">Couldn't load this ({planErr}).</div>
              : !plan ? 'Loading…'
              : (
                <div className="ps-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))' }}>
                  <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{plan.planName || '—'}</div><div className="ps-stat-label">Current Plan</div></div>
                  <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{plan.maxAllowedEmployee ?? '—'}</div><div className="ps-stat-label">Max Employees</div></div>
                </div>
              )}
          </div>

          <div className="ps-section-head"><div className="ps-section-title">Presence Settings</div></div>
          <div className="ps-card" style={{ marginBottom: 22 }}>
            {presenceErr ? <div className="ps-empty">Couldn't load this ({presenceErr}).</div>
              : !presence ? 'Loading…'
              : (
                <>
                  <div className="ps-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', marginBottom: 16 }}>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{presence.presenceMonitoringEnabled ? 'Yes' : 'No'}</div><div className="ps-stat-label">Presence Monitoring Enabled</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{presence.presenceUpdateIntervalSeconds ?? '—'}s</div><div className="ps-stat-label">Update Interval</div></div>
                    <div className="ps-stat-card"><div className="ps-stat-value" style={{ fontSize: 16 }}>{presence.requireTrustedWifi ? 'Yes' : 'No'}</div><div className="ps-stat-label">Require Trusted WiFi</div></div>
                  </div>
                  <button className="ps-btn ps-btn-primary" onClick={() => setEditPresenceOpen(true)}>Edit presence settings</button>
                </>
              )}
          </div>
        </>
      )}

      <Modal
        open={editOrgOpen}
        title="Edit organization"
        submitLabel="Save changes"
        fields={[
          { name: 'orgName', label: 'Organization name', value: org?.orgName || '' },
          { name: 'orgType', label: 'Organization type', type: 'select', options: ORG_TYPE_OPTIONS, value: org?.orgType || 'CORPORATE' },
        ]}
        onSubmit={handleEditOrg}
        onClose={() => setEditOrgOpen(false)}
      />

      <Modal
        open={editPresenceOpen}
        title="Edit presence settings"
        submitLabel="Save changes"
        fields={[
          { name: 'presenceMonitoringEnabled', label: 'Presence monitoring enabled', type: 'select', options: YES_NO_OPTIONS, value: String(!!presence?.presenceMonitoringEnabled) },
          { name: 'presenceUpdateIntervalSeconds', label: 'Update interval (seconds)', type: 'number', value: String(presence?.presenceUpdateIntervalSeconds ?? 300) },
          { name: 'requireTrustedWifi', label: 'Require trusted WiFi', type: 'select', options: YES_NO_OPTIONS, value: String(!!presence?.requireTrustedWifi) },
        ]}
        onSubmit={handleEditPresence}
        onClose={() => setEditPresenceOpen(false)}
      />
    </Layout>
  );
}
