const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.delete('/:skillId', authenticate, authorize('worker'), workerController.removeSkill);

module.exports = router;



