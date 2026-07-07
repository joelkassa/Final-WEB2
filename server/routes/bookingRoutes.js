const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/me', authenticate, bookingController.getMyBookings);
router.patch('/:id/status', authenticate, bookingController.updateBookingStatus);
router.patch('/:id/complete', authenticate, bookingController.completeBooking);

module.exports = router;





