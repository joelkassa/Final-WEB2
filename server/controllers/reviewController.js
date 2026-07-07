const Review = require('../models/Review');
const Booking = require('../models/Booking');

async function createReview(req, res) {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can leave reviews.' });
    }

    const booking = await Booking.getBookingRaw(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.client_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only review your own bookings.' });
    }
    if (booking.status !== 'completed') {
      return res.status(409).json({ message: 'You can only review a completed booking.' });
    }

    const alreadyReviewed = await Review.reviewExistsForBooking(req.params.id);
    if (alreadyReviewed) {
      return res.status(409).json({ message: 'You have already reviewed this booking.' });
    }

    const { rating, comment } = req.body;
    const numericRating = parseInt(rating, 10);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    await Review.createReview(req.params.id, numericRating, comment);
    res.status(201).json({ message: 'Review submitted.' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'You have already reviewed this booking.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Could not submit review.' });
  }
}

module.exports = { createReview };




