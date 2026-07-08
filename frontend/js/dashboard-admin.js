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

  document.getElementById('user-filter-apply').addEventListener('click', loadUsers);
  document.getElementById('booking-filter-apply').addEventListener('click', loadBookings);

  loadStats();
  loadPendingApprovals();
  loadCategoryFilterOptions();
  loadUsers();
  loadBookings();
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

async function loadCategoryFilterOptions() {
  const select = document.getElementById('user-category-filter');
  try {
    const categories = await ApiClient.get('/categories');
    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Could not load categories:', err.message);
  }
}

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
    await loadUsers();
  } catch (err) {
    alert(err.message || 'Could not approve worker.');
  }
}

function buildUserFilterParams() {
  const params = new URLSearchParams();
  const search = document.getElementById('user-search').value.trim();
  const role = document.getElementById('user-role-filter').value;
  const category = document.getElementById('user-category-filter').value;
  const banned = document.getElementById('user-banned-filter').value;
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (category) params.set('category', category);
  if (banned) params.set('isBanned', banned);
  return params.toString();
}

async function loadUsers() {
  const container = document.getElementById('users-container');
  container.innerHTML = '';
  try {
    const query = buildUserFilterParams();
    const users = await ApiClient.get(`/admin/users${query ? '?' + query : ''}`);

    if (users.length === 0) {
      container.appendChild(makeNote('No users match this filter.'));
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>Email</th><th>Role</th><th>Category</th><th>Status</th><th>Joined</th><th></th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    users.forEach((u) => tbody.appendChild(buildUserRow(u)));
    table.appendChild(tbody);
    container.appendChild(table);
  } catch (err) {
    container.appendChild(makeNote('Could not load users.'));
  }
}

function buildUserRow(u) {
  const row = document.createElement('tr');

  const nameCell = document.createElement('td');
  nameCell.textContent = u.name;
  row.appendChild(nameCell);

  const emailCell = document.createElement('td');
  emailCell.textContent = u.email;
  row.appendChild(emailCell);

  const roleCell = document.createElement('td');
  const roleBadge = document.createElement('span');
  roleBadge.className = `role-badge role-badge-${u.role}`;
  roleBadge.textContent = u.role;
  roleCell.appendChild(roleBadge);
  row.appendChild(roleCell);

  const catCell = document.createElement('td');
  catCell.textContent = u.categoryName || u.customCategory || '—';
  row.appendChild(catCell);

  const statusCell = document.createElement('td');
  if (u.isBanned) {
    const badge = document.createElement('span');
    badge.className = 'banned-badge';
    badge.textContent = 'Banned';
    statusCell.appendChild(badge);
  } else if (u.role === 'worker') {
    const badge = document.createElement('span');
    badge.className = 'status-pill';
    badge.textContent = u.isApproved ? 'Approved' : 'Pending';
    statusCell.appendChild(badge);
  } else {
    statusCell.textContent = 'Active';
  }
  row.appendChild(statusCell);

  const joinedCell = document.createElement('td');
  joinedCell.textContent = new Date(u.createdAt).toLocaleDateString();
  row.appendChild(joinedCell);

  const actionCell = document.createElement('td');
  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';

  if (u.role !== 'admin') {
    if (u.isBanned) {
      const unbanBtn = document.createElement('button');
      unbanBtn.className = 'btn btn-sm btn-primary';
      unbanBtn.textContent = 'Unban';
      unbanBtn.addEventListener('click', () => unbanUser(u.id));
      actionRow.appendChild(unbanBtn);
    } else {
      const banBtn = document.createElement('button');
      banBtn.className = 'btn btn-sm btn-danger';
      banBtn.textContent = 'Ban';
      banBtn.addEventListener('click', () => banUser(u.id));
      actionRow.appendChild(banBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-ghost';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteUser(u.id, u.name));
    actionRow.appendChild(deleteBtn);
  }

  actionCell.appendChild(actionRow);
  row.appendChild(actionCell);

  return row;
}

async function banUser(userId) {
  if (!confirm('Ban this user from the platform?')) return;
  try {
    await ApiClient.patch(`/admin/users/${userId}/ban`);
    await loadUsers();
    await loadStats();
  } catch (err) {
    alert(err.message || 'Could not ban user.');
  }
}

async function unbanUser(userId) {
  try {
    await ApiClient.patch(`/admin/users/${userId}/unban`);
    await loadUsers();
    await loadStats();
  } catch (err) {
    alert(err.message || 'Could not unban user.');
  }
}

async function deleteUser(userId, name) {
  if (!confirm(`Permanently delete ${name}'s account? This cannot be undone.`)) return;
  try {
    await ApiClient.delete(`/admin/users/${userId}`);
    await loadUsers();
    await loadStats();
    await loadPendingApprovals();
  } catch (err) {
    alert(err.message || 'Could not delete user.');
  }
}

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  container.innerHTML = '';
  try {
    const status = document.getElementById('booking-status-filter').value;
    const query = status ? `?status=${status}` : '';
    const bookings = await ApiClient.get(`/admin/bookings${query}`);

    if (bookings.length === 0) {
      container.appendChild(makeNote('No bookings match this filter.'));
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Client</th><th>Worker</th><th>Date</th><th>Status</th><th>Budget</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    bookings.forEach((b) => {
      const row = document.createElement('tr');
      row.className = 'table-row-clickable';

      const clientCell = document.createElement('td');
      clientCell.textContent = b.clientName;
      row.appendChild(clientCell);

      const workerCell = document.createElement('td');
      workerCell.textContent = b.workerName;
      row.appendChild(workerCell);

      const dateCell = document.createElement('td');
      dateCell.textContent = `${b.slotDate} ${b.startTime}-${b.endTime}`;
      row.appendChild(dateCell);

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `status-badge status-${b.status}`;
      badge.textContent = b.status;
      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      const budgetCell = document.createElement('td');
      budgetCell.textContent = b.budget ? `${b.budget} ETB` : '—';
      row.appendChild(budgetCell);

      row.addEventListener('click', () => toggleBookingDetail(row, b));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  } catch (err) {
    container.appendChild(makeNote('Could not load bookings.'));
  }
}

function toggleBookingDetail(row, booking) {
  const next = row.nextElementSibling;
  if (next && next.classList.contains('detail-row')) {
    next.remove();
    return;
  }

  document.querySelectorAll('.detail-row').forEach((el) => el.remove());

  const detailRow = document.createElement('tr');
  detailRow.className = 'detail-row';
  const cell = document.createElement('td');
  cell.colSpan = 5;

  const panel = document.createElement('div');
  panel.className = 'detail-panel';
  panel.appendChild(makeDetailLine('Client email', booking.clientEmail));
  panel.appendChild(makeDetailLine('Worker email', booking.workerEmail));
  panel.appendChild(makeDetailLine('Description', booking.description));
  panel.appendChild(makeDetailLine('Agreement notes', booking.agreementNotes || 'None'));
  panel.appendChild(makeDetailLine('Requested on', new Date(booking.createdAt).toLocaleString()));

  cell.appendChild(panel);
  detailRow.appendChild(cell);
  row.parentNode.insertBefore(detailRow, row.nextSibling);
}

function makeDetailLine(label, value) {
  const p = document.createElement('p');
  const span = document.createElement('span');
  span.className = 'detail-label';
  span.textContent = label + ':';
  p.appendChild(span);
  p.appendChild(document.createTextNode(value));
  return p;
}

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
    banBtn.addEventListener('click', () => banUserFromReport(report.reportedAgainstId, report.id));
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

async function banUserFromReport(userId, reportId) {
  if (!confirm('This will ban the user from the platform. Continue?')) return;
  try {
    await ApiClient.patch(`/admin/users/${userId}/ban`);
    await updateReport(reportId, 'resolved');
    await loadUsers();
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



