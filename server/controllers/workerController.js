const WorkerProfile = require('../models/WorkerProfile');

function mapProfile(full) {
  const p = full.profile;
  return {
    id: p.id,
    userId: p.user_id,
    name: p.user_name,
    bio: p.bio,
    categoryId: p.category_id,
    categoryName: p.category_name,
    customCategory: p.custom_category,
    priceMin: p.price_min,
    priceMax: p.price_max,
    serviceArea: p.service_area,
    availabilityStatus: p.availability_status,
    photoUrl: p.photo_url,
    isApproved: p.is_approved,
    avgRating: p.avg_rating,
    reviewCount: p.review_count,
    createdAt: p.created_at,
    skills: full.skills.map(s => ({ id: s.id, skillName: s.skill_name })),
    portfolioImages: full.portfolio.map(img => ({ id: img.id, imageUrl: img.image_url })),
    availabilitySlots: full.slots.map(s => ({
      id: s.id,
      slotDate: s.slot_date,
      startTime: s.start_time,
      endTime: s.end_time,
      isBooked: s.is_booked
    }))
  };
}

function mapListItem(row) {
  return {
    id: row.id,
    name: row.user_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    customCategory: row.custom_category,
    availabilityStatus: row.availability_status,
    photoUrl: row.photo_url,
    priceMin: row.price_min,
    priceMax: row.price_max,
    serviceArea: row.service_area,
    avgRating: row.avg_rating,
    reviewCount: row.review_count
  };
}

async function browseWorkers(req, res) {
  try {
    const filters = {
      category: req.query.category || null,
      name: req.query.name || null,
      location: req.query.location || null,
      minRating: req.query.minRating || null
    };
    const rows = await WorkerProfile.listWorkers(filters);
    res.json(rows.map(mapListItem));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load professionals.' });
  }
}

async function getMyProfile(req, res) {
  try {
    const profileId = await WorkerProfile.getIdByUserId(req.user.userId);
    if (!profileId) {
      return res.status(404).json({ message: 'No profile created yet.' });
    }
    const full = await WorkerProfile.getFullProfile(profileId, true);
    res.json(mapProfile(full));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load your profile.' });
  }
}

async function getWorkerById(req, res) {
  try {
    const full = await WorkerProfile.getFullProfile(req.params.id, false);
    if (!full || !full.profile.is_approved) {
      return res.status(404).json({ message: 'Profile not found.' });
    }
    res.json(mapProfile(full));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load profile.' });
  }
}

async function createProfile(req, res) {
  try {
    const existingId = await WorkerProfile.getIdByUserId(req.user.userId);
    if (existingId) {
      return res.status(409).json({ message: 'You already have a profile. Use edit instead.' });
    }

    const { categoryId, customCategory } = req.body;
    if (!categoryId && !customCategory) {
      return res.status(400).json({ message: 'Choose a category or enter a custom one.' });
    }

    const newId = await WorkerProfile.createProfile(req.user.userId, req.body);
    const full = await WorkerProfile.getFullProfile(newId, true);
    res.status(201).json(mapProfile(full));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const raw = await WorkerProfile.getRawById(req.params.id);
    if (!raw) return res.status(404).json({ message: 'Profile not found.' });
    if (raw.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }

    await WorkerProfile.updateProfile(req.params.id, req.body);
    const full = await WorkerProfile.getFullProfile(req.params.id, true);
    res.json(mapProfile(full));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update profile.' });
  }
}

async function addSkill(req, res) {
  try {
    const raw = await WorkerProfile.getRawById(req.params.id);
    if (!raw) return res.status(404).json({ message: 'Profile not found.' });
    if (raw.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }
    if (!req.body.skillName || !req.body.skillName.trim()) {
      return res.status(400).json({ message: 'Skill name is required.' });
    }

    await WorkerProfile.addSkill(req.params.id, req.body.skillName.trim());
    res.status(201).json({ message: 'Skill added.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add skill.' });
  }
}

async function removeSkill(req, res) {
  try {
    const ownerId = await WorkerProfile.getSkillOwnerId(req.params.skillId);
    if (!ownerId) return res.status(404).json({ message: 'Skill not found.' });
    if (ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }
    await WorkerProfile.removeSkill(req.params.skillId);
    res.json({ message: 'Skill removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not remove skill.' });
  }
}

async function uploadPortfolio(req, res) {
  try {
    const raw = await WorkerProfile.getRawById(req.params.id);
    if (!raw) return res.status(404).json({ message: 'Profile not found.' });
    if (raw.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded.' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/portfolio/${req.file.filename}`;
    await WorkerProfile.addPortfolioImage(req.params.id, imageUrl);
    res.status(201).json({ message: 'Image uploaded.', imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not upload image.' });
  }
}

async function addAvailability(req, res) {
  try {
    const raw = await WorkerProfile.getRawById(req.params.id);
    if (!raw) return res.status(404).json({ message: 'Profile not found.' });
    if (raw.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }
    const { slotDate, startTime, endTime } = req.body;
    if (!slotDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, start time, and end time are required.' });
    }
    if (endTime <= startTime) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    await WorkerProfile.addAvailabilitySlot(req.params.id, req.body);
    res.status(201).json({ message: 'Slot added.' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That exact slot already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Could not add slot.' });
  }
}

async function removeAvailability(req, res) {
  try {
    const slot = await WorkerProfile.getSlotOwnerAndStatus(req.params.slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found.' });
    if (slot.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }
    if (slot.is_booked) {
      return res.status(409).json({ message: 'Cannot remove a slot that has already been booked.' });
    }
    await WorkerProfile.removeAvailabilitySlot(req.params.slotId);
    res.json({ message: 'Slot removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not remove slot.' });
  }
}

async function getAvailability(req, res) {
  try {
    const slots = await WorkerProfile.getOpenAvailability(req.params.id);
    res.json(slots.map(s => ({
      id: s.id,
      slotDate: s.slot_date,
      startTime: s.start_time,
      endTime: s.end_time
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load availability.' });
  }
}

async function getReviews(req, res) {
  try {
    const reviews = await WorkerProfile.getReviewsForWorker(req.params.id);
    res.json(reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load reviews.' });
  }
}

module.exports = {
  browseWorkers,
  getMyProfile,
  getWorkerById,
  createProfile,
  updateProfile,
  addSkill,
  removeSkill,
  uploadPortfolio,
  addAvailability,
  removeAvailability,
  getAvailability,
  getReviews
};








