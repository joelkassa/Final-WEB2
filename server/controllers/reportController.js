const Report = require('../models/Report');
const Booking = require('../models/Booking');

async function createReport(req, res) {
  try {
    const { bookingId, reason, description } = req.body;
    if (!bookingId || !reason || !description) {
      return res.status(400).json({ message: 'Booking, reason, and description are required.' });
    }

    const booking = await Booking.getBookingRaw(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const isClient = req.user.role === 'client' && booking.client_id === req.user.userId;
    const isWorker = req.user.role === 'worker' && booking.worker_user_id === req.user.userId;
    if (!isClient && !isWorker) {
      return res.status(403).json({ message: 'You are not part of this booking.' });
    }

    const reportedAgainst = isClient ? booking.worker_user_id : booking.client_id;
    await Report.createReport(bookingId, req.user.userId, reportedAgainst, reason, description);
    res.status(201).json({ message: 'Report submitted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not submit report.' });
  }
}

module.exports = { createReport };












