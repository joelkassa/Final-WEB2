const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/workers/pending', adminController.listPendingWorkers);
router.patch('/workers/:id/approve', adminController.approveWorker);
router.get('/reports', adminController.listReports);
router.patch('/reports/:id', adminController.updateReport);
router.patch('/users/:id/ban', adminController.banUser);

module.exports = router;






