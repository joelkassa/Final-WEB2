const Booking = require('../models/Booking');

function mapClientBooking(row) {
  return {
    id: row.id,
    workerName: row.worker_name,
    description: row.description,
    budget: row.budget,
    agreementNotes: row.agreement_notes,
    status: row.status,
    slotDate: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
    hasReview: row.has_review,
    createdAt: row.created_at
  };
}

function mapWorkerBooking(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    description: row.description,
    budget: row.budget,
    agreementNotes: row.agreement_notes,
    status: row.status,
    slotDate: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
    createdAt: row.created_at
  };
}

async function createBooking(req, res) {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can request bookings.' });
    }
    const { workerProfileId, slotId, description, budget, agreementNotes } = req.body;
    if (!workerProfileId || !slotId || !description) {
      return res.status(400).json({ message: 'Worker, time slot, and description are required.' });
    }

    const id = await Booking.createBooking(req.user.userId, {
      workerProfileId, slotId, description, budget, agreementNotes
    });
    res.status(201).json({ id, message: 'Booking request sent.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Could not create booking.' });
  }
}

async function getMyBookings(req, res) {
  try {
    if (req.user.role === 'client') {
      const rows = await Booking.getBookingsForClient(req.user.userId);
      return res.json(rows.map(mapClientBooking));
    }
    if (req.user.role === 'worker') {
      const rows = await Booking.getBookingsForWorker(req.user.userId);
      return res.json(rows.map(mapWorkerBooking));
    }
    return res.status(403).json({ message: 'Not applicable for this role.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load bookings.' });
  }
}

async function updateBookingStatus(req, res) {
  try {
    const booking = await Booking.getBookingRaw(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const { status } = req.body;
    const isClient = req.user.role === 'client' && booking.client_id === req.user.userId;
    const isWorker = req.user.role === 'worker' && booking.worker_user_id === req.user.userId;

    if (!isClient && !isWorker) {
      return res.status(403).json({ message: 'You are not part of this booking.' });
    }

    if (status === 'cancelled') {
      if (!isClient) return res.status(403).json({ message: 'Only the client can cancel.' });
      if (booking.status !== 'pending') {
        return res.status(409).json({ message: 'Only pending bookings can be cancelled.' });
      }
    } else if (status === 'accepted' || status === 'declined') {
      if (!isWorker) return res.status(403).json({ message: 'Only the worker can accept or decline.' });
      if (booking.status !== 'pending') {
        return res.status(409).json({ message: 'This booking has already been responded to.' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid status transition.' });
    }

    await Booking.updateStatus(req.params.id, status);
    if (status === 'cancelled' || status === 'declined') {
      await Booking.freeSlot(booking.slot_id);
    }

    res.json({ message: 'Booking updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update booking.' });
  }
}

async function completeBooking(req, res) {
  try {
    const booking = await Booking.getBookingRaw(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const isClient = req.user.role === 'client' && booking.client_id === req.user.userId;
    const isWorker = req.user.role === 'worker' && booking.worker_user_id === req.user.userId;
    if (!isClient && !isWorker) {
      return res.status(403).json({ message: 'You are not part of this booking.' });
    }
    if (booking.status !== 'accepted') {
      return res.status(409).json({ message: 'Only accepted bookings can be marked complete.' });
    }

    await Booking.updateStatus(req.params.id, 'completed');
    res.json({ message: 'Booking marked complete.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not complete booking.' });
  }
}

module.exports = { createBooking, getMyBookings, updateBookingStatus, completeBooking };











