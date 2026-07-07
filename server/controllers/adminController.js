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
    const success = await Admin.banUserById(req.params.id);
    if (!success) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User banned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not ban user.' });
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
  listReports,
  updateReport
};