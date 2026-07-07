document.addEventListener('DOMContentLoaded', () => {
  const user = AuthClient.getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('nav-logout').addEventListener('click', AuthClient.logout);

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.panel));
  });

  loadStats();
  loadPendingApprovals();
  loadReports();
});

function switchTab(panelId) {
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
  document.querySelector(`.admin-tab[data-panel="${panelId}"]`).classList.add('active');
  document.querySelectorAll('.admin-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(panelId).classList.remove('hidden');
}

async function loadStats() {
  const grid = document.getElementById('stat-grid');
  try {
    const stats = await ApiClient.get('/admin/dashboard');
    grid.innerHTML = '';
    const entries = [
      ['Total users', stats.totalUsers],
      ['Active workers', stats.approvedWorkers],
      ['Pending approvals', stats.pendingWorkers],
      ['Total bookings', stats.totalBookings],
      ['Open reports', stats.openReports]
    ];
    entries.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = value ?? 0;
      card.appendChild(val);
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = label;
      card.appendChild(lbl);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Could not load stats:', err.message);
  }
}

// ---- Pending worker approvals ----
async function loadPendingApprovals() {
  const panel = document.getElementById('panel-approvals');
  try {
    const workers = await ApiClient.get('/admin/workers/pending');
    panel.innerHTML = '';

    if (workers.length === 0) {
      panel.appendChild(makeNote('No workers awaiting approval.'));
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Category</th><th>Service area</th><th>Signed up</th><th></th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    workers.forEach((worker) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = worker.name;
      row.appendChild(nameCell);

      const catCell = document.createElement('td');
      catCell.textContent = worker.categoryName || worker.customCategory || '—';
      row.appendChild(catCell);

      const areaCell = document.createElement('td');
      areaCell.textContent = worker.serviceArea || '—';
      row.appendChild(areaCell);

      const dateCell = document.createElement('td');
      dateCell.textContent = new Date(worker.createdAt).toLocaleDateString();
      row.appendChild(dateCell);

      const actionCell = document.createElement('td');
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn btn-sm btn-primary';
      approveBtn.textContent = 'Approve';
      approveBtn.addEventListener('click', () => approveWorker(worker.id));
      actionCell.appendChild(approveBtn);
      row.appendChild(actionCell);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    panel.appendChild(table);
  } catch (err) {
    panel.innerHTML = '';
    panel.appendChild(makeNote('Could not load pending approvals.'));
  }
}

async function approveWorker(workerId) {
  try {
    await ApiClient.patch(`/admin/workers/${workerId}/approve`);
    await loadPendingApprovals();
    await loadStats();
  } catch (err) {
    alert(err.message || 'Could not approve worker.');
  }
}

// ---- Reports ----
async function loadReports() {
  const panel = document.getElementById('panel-reports');
  try {
    const reports = await ApiClient.get('/admin/reports');
    panel.innerHTML = '';

    if (reports.length === 0) {
      panel.appendChild(makeNote('No reports filed.'));
      return;
    }

    reports.forEach((report) => panel.appendChild(buildReportCard(report)));
  } catch (err) {
    panel.innerHTML = '';
    panel.appendChild(makeNote('Could not load reports.'));
  }
}

function buildReportCard(report) {
  const card = document.createElement('div');
  card.className = 'booking-card';

  const top = document.createElement('div');
  top.className = 'booking-card-top';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'booking-card-title';
  title.textContent = `${report.reportedByName} reported ${report.reportedAgainstName}`;
  titleBlock.appendChild(title);
  const sub = document.createElement('div');
  sub.className = 'booking-card-sub';
  sub.textContent = `${report.reason} · Booking on ${report.slotDate}`;
  titleBlock.appendChild(sub);
  top.appendChild(titleBlock);

  const badge = document.createElement('span');
  badge.className = `status-badge report-status-${report.status}`;
  badge.textContent = report.status.charAt(0).toUpperCase() + report.status.slice(1);
  top.appendChild(badge);
  card.appendChild(top);

  const detail = document.createElement('p');
  detail.className = 'booking-card-detail';
  detail.textContent = report.description;
  card.appendChild(detail);

  if (report.status === 'open') {
    const actions = document.createElement('div');
    actions.className = 'action-row';

    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'btn btn-sm btn-primary';
    resolveBtn.textContent = 'Mark resolved';
    resolveBtn.addEventListener('click', () => updateReport(report.id, 'resolved'));
    actions.appendChild(resolveBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn-sm btn-ghost';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => updateReport(report.id, 'dismissed'));
    actions.appendChild(dismissBtn);

    const banBtn = document.createElement('button');
    banBtn.className = 'btn btn-sm btn-danger';
    banBtn.textContent = `Ban ${report.reportedAgainstName}`;
    banBtn.addEventListener('click', () => banUser(report.reportedAgainstId, report.id));
    actions.appendChild(banBtn);

    card.appendChild(actions);
  }

  return card;
}

async function updateReport(reportId, status) {
  try {
    await ApiClient.patch(`/admin/reports/${reportId}`, { status });
    await loadReports();
    await loadStats();
  } catch (err) {
    alert(err.message || 'Could not update report.');
  }
}

async function banUser(userId, reportId) {
  if (!confirm('This will ban the user from the platform. Continue?')) return;
  try {
    await ApiClient.patch(`/admin/users/${userId}/ban`);
    await updateReport(reportId, 'resolved');
  } catch (err) {
    alert(err.message || 'Could not ban user.');
  }
}

function makeNote(text) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}

















