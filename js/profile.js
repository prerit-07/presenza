document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('appConnBanner');
  try {
    await appEnsureToken();
    const me = await AppStore.getMe();
    banner.innerHTML = `<span class="ps-chip ps-chip-success">Connected</span> Live data from the app, logged in as <b>${escapeAppHtml(me.username)}</b> (${escapeAppHtml(me.role)})`;
  } catch (err) {
    banner.innerHTML = `<span class="ps-chip ps-chip-danger">Not connected</span> ${escapeAppHtml(err.message)}`;
    return;
  }

  const orgProfileBody = document.getElementById('orgProfileBody');
  const presenceBody = document.getElementById('presenceSettingsBody');

  let currentOrg = null;
  let currentPresence = null;

  async function loadOrgProfile() {
    try {
      currentOrg = await AppStore.getOrganization();
      orgProfileBody.innerHTML = `
        <div class="ps-stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); margin-bottom:16px;">
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${escapeAppHtml(currentOrg.orgName || '—')}</div><div class="ps-stat-label">Organization Name</div></div>
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${escapeAppHtml(currentOrg.orgType || '—')}</div><div class="ps-stat-label">Type</div></div>
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${escapeAppHtml(currentOrg.companyCode || '—')}</div><div class="ps-stat-label">Company Code</div></div>
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${currentOrg.orgId ?? '—'}</div><div class="ps-stat-label">Org ID</div></div>
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${currentOrg.createdAt ? new Date(currentOrg.createdAt).toLocaleDateString() : '—'}</div><div class="ps-stat-label">Created</div></div>
        </div>
        <button class="ps-btn ps-btn-primary" id="editOrgBtn">Edit organization</button>
      `;
      document.getElementById('editOrgBtn')?.addEventListener('click', () => {
        PSModal.open({
          title: 'Edit organization',
          submitLabel: 'Save changes',
          fields: [
            { name: 'orgName', label: 'Organization name', value: currentOrg.orgName || '' },
            { name: 'orgType', label: 'Organization type', type: 'select', options: [
              { value: 'CORPORATE', label: 'Corporate' },
              { value: 'EDUCATIONAL', label: 'Educational' },
              { value: 'GOVERNMENT', label: 'Government' },
              { value: 'NON_PROFIT', label: 'Non-profit' },
            ], value: currentOrg.orgType || 'CORPORATE' },
          ],
          onSubmit: async (values) => {
            await AppStore.updateOrganization(values.orgName, values.orgType);
            await loadOrgProfile();
          },
        });
      });
    } catch (err) {
      orgProfileBody.innerHTML = `<div class="ps-empty">Couldn't load this (${escapeAppHtml(err.message)}).</div>`;
    }
  }

  appRenderSection('orgPlanBody', AppStore.getOrganization, (org) => `
    <div class="ps-stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px,1fr));">
      <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${escapeAppHtml(org.planName || '—')}</div><div class="ps-stat-label">Current Plan</div></div>
      <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${org.maxAllowedEmployee ?? '—'}</div><div class="ps-stat-label">Max Employees</div></div>
    </div>
  `);

  async function loadPresenceSettings() {
    try {
      currentPresence = await AppStore.getPresenceSettings();
      presenceBody.innerHTML = `
        <div class="ps-stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); margin-bottom:16px;">
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${currentPresence.presenceMonitoringEnabled ? 'Yes' : 'No'}</div><div class="ps-stat-label">Presence Monitoring Enabled</div></div>
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${currentPresence.presenceUpdateIntervalSeconds ?? '—'}s</div><div class="ps-stat-label">Update Interval</div></div>
          <div class="ps-stat-card"><div class="ps-stat-value" style="font-size:16px;">${currentPresence.requireTrustedWifi ? 'Yes' : 'No'}</div><div class="ps-stat-label">Require Trusted WiFi</div></div>
        </div>
        <button class="ps-btn ps-btn-primary" id="editPresenceBtn">Edit presence settings</button>
      `;
      document.getElementById('editPresenceBtn')?.addEventListener('click', () => {
        PSModal.open({
          title: 'Edit presence settings',
          submitLabel: 'Save changes',
          fields: [
            { name: 'presenceMonitoringEnabled', label: 'Presence monitoring enabled', type: 'select', options: [
              { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' },
            ], value: String(!!currentPresence.presenceMonitoringEnabled) },
            { name: 'presenceUpdateIntervalSeconds', label: 'Update interval (seconds)', type: 'number', value: String(currentPresence.presenceUpdateIntervalSeconds ?? 300) },
            { name: 'requireTrustedWifi', label: 'Require trusted WiFi', type: 'select', options: [
              { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' },
            ], value: String(!!currentPresence.requireTrustedWifi) },
          ],
          onSubmit: async (values) => {
            await AppStore.updatePresenceSettings(values.presenceMonitoringEnabled === 'true', Number(values.presenceUpdateIntervalSeconds), values.requireTrustedWifi === 'true');
            await loadPresenceSettings();
          },
        });
      });
    } catch (err) {
      presenceBody.innerHTML = `<div class="ps-empty">Couldn't load this (${escapeAppHtml(err.message)}).</div>`;
    }
  }

  await loadOrgProfile();
  await loadPresenceSettings();
});
