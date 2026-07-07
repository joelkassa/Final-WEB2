const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.delete('/:slotId', authenticate, authorize('worker'), workerController.removeAvailability);

module.exports = router;


