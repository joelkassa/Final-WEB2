const Admin = require('../models/Admin');
const Report = require('../models/Report');

async function getDashboard(req, res) {
  try {
    const stats = await Admin.getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load dashboard stats.' });
  }
}

async function listPendingWorkers(req, res) {
  try {
    const rows = await Admin.getPendingWorkers();
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      categoryName: r.category_name,
      customCategory: r.custom_category,
      serviceArea: r.service_area,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load pending workers.' });
  }
}

async function approveWorker(req, res) {
  try {
    const success = await Admin.approveWorkerProfile(req.params.id);
    if (!success) return res.status(404).json({ message: 'Worker profile not found.' });
    res.json({ message: 'Worker approved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not approve worker.' });
  }
}

async function banUser(req, res) {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot ban your own account.' });
    }
    const success = await Admin.banUserById(req.params.id);
    if (!success) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User banned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not ban user.' });
  }
}

async function unbanUser(req, res) {
  try {
    const success = await Admin.unbanUserById(req.params.id);
    if (!success) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User unbanned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not unban user.' });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }
    const success = await Admin.deleteUserById(req.params.id);
    if (!success) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete user.' });
  }
}

async function listUsers(req, res) {
  try {
    const filters = {
      role: req.query.role || null,
      category: req.query.category || null,
      isBanned: req.query.isBanned === 'true' ? true : req.query.isBanned === 'false' ? false : null,
      search: req.query.search || null
    };
    const rows = await Admin.getAllUsers(filters);
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      isBanned: r.is_banned,
      createdAt: r.created_at,
      workerProfileId: r.worker_profile_id,
      isApproved: r.is_approved,
      serviceArea: r.service_area,
      categoryName: r.category_name,
      customCategory: r.custom_category
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load users.' });
  }
}

async function listBookings(req, res) {
  try {
    const filters = { status: req.query.status || null };
    const rows = await Admin.getAllBookings(filters);
    res.json(rows.map(r => ({
      id: r.id,
      description: r.description,
      budget: r.budget,
      agreementNotes: r.agreement_notes,
      status: r.status,
      clientName: r.client_name,
      clientEmail: r.client_email,
      workerName: r.worker_name,
      workerEmail: r.worker_email,
      slotDate: r.slot_date,
      startTime: r.start_time,
      endTime: r.end_time,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load bookings.' });
  }
}

async function listReports(req, res) {
  try {
    const rows = await Report.getAllReports();
    res.json(rows.map(r => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      slotDate: r.slot_date,
      reportedByName: r.reported_by_name,
      reportedAgainstName: r.reported_against_name,
      reportedAgainstId: r.reported_against_id,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load reports.' });
  }
}

async function updateReport(req, res) {
  try {
    const { status } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be resolved or dismissed.' });
    }
    await Report.updateReportStatus(req.params.id, status, req.user.userId);
    res.json({ message: 'Report updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update report.' });
  }
}

module.exports = {
  getDashboard,
  listPendingWorkers,
  approveWorker,
  banUser,
  unbanUser,
  deleteUser,
  listUsers,
  listBookings,
  listReports,
  updateReport
};