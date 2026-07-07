const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { upload } = require('../middleware/upload');

router.get('/', workerController.browseWorkers);
router.get('/me', authenticate, authorize('worker'), workerController.getMyProfile);
router.get('/:id/availability', workerController.getAvailability);
router.get('/:id/reviews', workerController.getReviews);
router.get('/:id', workerController.getWorkerById);

router.post('/', authenticate, authorize('worker'), workerController.createProfile);
router.patch('/:id', authenticate, authorize('worker'), workerController.updateProfile);
router.post('/:id/skills', authenticate, authorize('worker'), workerController.addSkill);
router.post('/:id/portfolio', authenticate, authorize('worker'), upload.single('image'), workerController.uploadPortfolio);
router.post('/:id/availability', authenticate, authorize('worker'), workerController.addAvailability);

module.exports = router;







