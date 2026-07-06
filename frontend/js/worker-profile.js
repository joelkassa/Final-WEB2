document.addEventListener('DOMContentLoaded', () => {
  const workerId = new URLSearchParams(window.location.search).get('id');
  if (!workerId) {
    showError('No worker specified.');
    return;
  }
  loadProfile(workerId);
});

let selectedSlotId = null;

async function loadProfile(workerId) {
  const root = document.getElementById('profile-root');
  try {
    const [worker, slots, reviews] = await Promise.all([
      ApiClient.get(`/workers/${workerId}`),
      ApiClient.get(`/workers/${workerId}/availability`),
      ApiClient.get(`/workers/${workerId}/reviews`)
    ]);
    root.innerHTML = '';
    root.appendChild(buildHeader(worker));
    root.appendChild(buildBioSection(worker));
    root.appendChild(buildSkillsSection(worker));
    root.appendChild(buildPortfolioSection(worker));
    root.appendChild(buildBookingSection(worker, slots));
    root.appendChild(buildReviewsSection(reviews));
  } catch (err) {
    showError('Could not load this profile. It may not exist or is pending approval.');
    console.error(err);
  }
}

function showError(message) {
  const root = document.getElementById('profile-root');
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = message;
  root.appendChild(p);
}

function buildHeader(worker) {
  const section = document.createElement('section');
  section.className = 'profile-header';

  const img = document.createElement('img');
  img.className = 'profile-photo';
  img.src = worker.photoUrl || 'assets/placeholder.png';
  img.alt = worker.name;
  section.appendChild(img);

  const info = document.createElement('div');
  info.className = 'profile-info';

  const h1 = document.createElement('h1');
  h1.textContent = worker.name;
  info.appendChild(h1);

  const meta = document.createElement('p');
  meta.className = 'profile-meta';
  meta.textContent = `${worker.categoryName || worker.customCategory || 'General services'} · ${worker.serviceArea || 'Location not specified'}`;
  info.appendChild(meta);

  const ratingPill = document.createElement('span');
  ratingPill.className = 'rating-pill';
  ratingPill.textContent = worker.avgRating
    ? `★ ${worker.avgRating.toFixed(1)} (${worker.reviewCount} reviews)`
    : 'No reviews yet';
  info.appendChild(ratingPill);

  const statusPill = document.createElement('span');
  statusPill.className = 'status-pill';
  statusPill.textContent = worker.availabilityStatus === 'available' ? 'Available' : 'Busy';
  info.appendChild(statusPill);

  const price = document.createElement('p');
  price.className = 'profile-price';
  price.textContent = (worker.priceMin && worker.priceMax)
    ? `Typical range: ${worker.priceMin} - ${worker.priceMax} ETB`
    : 'Price on request';
  info.appendChild(price);

  section.appendChild(info);
  return section;
}

function buildBioSection(worker) {
  const section = document.createElement('section');
  section.className = 'profile-section';
  const h2 = document.createElement('h2');
  h2.textContent = 'About';
  section.appendChild(h2);
  const p = document.createElement('p');
  p.textContent = worker.bio || 'This professional has not added a bio yet.';
  section.appendChild(p);
  return section;
}

function buildSkillsSection(worker) {
  const section = document.createElement('section');
  section.className = 'profile-section';
  const h2 = document.createElement('h2');
  h2.textContent = 'Skills & qualifications';
  section.appendChild(h2);

  const list = document.createElement('div');
  list.className = 'skill-list';
  if (worker.skills && worker.skills.length > 0) {
    worker.skills.forEach((skill) => {
      const pill = document.createElement('span');
      pill.className = 'skill-pill';
      pill.textContent = skill.skillName;
      list.appendChild(pill);
    });
  } else {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'No skills listed yet.';
    list.appendChild(p);
  }
  section.appendChild(list);
  return section;
}

function buildPortfolioSection(worker) {
  const section = document.createElement('section');
  section.className = 'profile-section';
  const h2 = document.createElement('h2');
  h2.textContent = 'Portfolio';
  section.appendChild(h2);

  const grid = document.createElement('div');
  grid.className = 'portfolio-grid';
  if (worker.portfolioImages && worker.portfolioImages.length > 0) {
    worker.portfolioImages.forEach((img) => {
      const el = document.createElement('img');
      el.src = img.imageUrl;
      el.alt = `${worker.name} portfolio item`;
      grid.appendChild(el);
    });
  } else {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'No portfolio images yet.';
    grid.appendChild(p);
  }
  section.appendChild(grid);
  return section;
}

function buildBookingSection(worker, slots) {
  const section = document.createElement('section');
  section.className = 'profile-section';
  const h2 = document.createElement('h2');
  h2.textContent = 'Request a booking';
  section.appendChild(h2);

  const user = AuthClient.getCurrentUser();

  if (!user) {
    section.appendChild(makeNote('Log in as a client to request a booking with this professional.'));
    return section;
  }
  if (user.role !== 'client') {
    section.appendChild(makeNote('Only client accounts can request bookings.'));
    return section;
  }
  if (!slots || slots.length === 0) {
    section.appendChild(makeNote('This professional has no open time slots right now.'));
    return section;
  }

  const slotList = document.createElement('div');
  slotList.className = 'slot-list';
  slots.forEach((slot) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.dataset.slotId = slot.id;
    btn.textContent = `${slot.slotDate} · ${slot.startTime}–${slot.endTime}`;
    btn.addEventListener('click', () => selectSlot(btn));
    slotList.appendChild(btn);
  });
  section.appendChild(slotList);

  const form = document.createElement('form');
  form.className = 'booking-form hidden';
  form.id = 'booking-form';

  form.appendChild(makeLabel('description', 'Describe what you need'));
  form.appendChild(makeTextarea('description'));

  form.appendChild(makeLabel('budget', 'Your budget (ETB)'));
  form.appendChild(makeInput('budget', 'number'));

  form.appendChild(makeLabel('agreement', 'Any agreements or notes'));
  form.appendChild(makeTextarea('agreement'));

  const errorP = document.createElement('p');
  errorP.className = 'form-error';
  errorP.id = 'booking-error';
  form.appendChild(errorP);

  const successP = document.createElement('p');
  successP.className = 'success-text hidden';
  successP.id = 'booking-success';
  successP.textContent = 'Booking request sent. The professional will accept or decline it soon.';
  form.appendChild(successP);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = 'Send booking request';
  form.appendChild(submitBtn);

  form.addEventListener('submit', (e) => submitBooking(e, worker.id));
  section.appendChild(form);

  return section;
}

function selectSlot(button) {
  document.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
  button.classList.add('selected');
  selectedSlotId = button.dataset.slotId;
  document.getElementById('booking-form').classList.remove('hidden');
}

async function submitBooking(e, workerId) {
  e.preventDefault();
  const errorEl = document.getElementById('booking-error');
  const successEl = document.getElementById('booking-success');
  errorEl.textContent = '';

  if (!selectedSlotId) {
    errorEl.textContent = 'Please select a time slot first.';
    return;
  }

  try {
    await ApiClient.post('/bookings', {
      workerProfileId: workerId,
      slotId: selectedSlotId,
      description: document.getElementById('description').value,
      budget: document.getElementById('budget').value,
      agreementNotes: document.getElementById('agreement').value
    });
    successEl.classList.remove('hidden');
    document.getElementById('booking-form').reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not send booking request.';
  }
}

function buildReviewsSection(reviews) {
  const section = document.createElement('section');
  section.className = 'profile-section';
  const h2 = document.createElement('h2');
  h2.textContent = 'Reviews';
  section.appendChild(h2);

  if (!reviews || reviews.length === 0) {
    section.appendChild(makeNote('No reviews yet.'));
    return section;
  }

  reviews.forEach((review) => {
    const card = document.createElement('div');
    card.className = 'review-card';

    const meta = document.createElement('div');
    meta.className = 'review-meta';
    const stars = document.createElement('span');
    stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    meta.appendChild(stars);
    const date = document.createElement('span');
    date.textContent = new Date(review.createdAt).toLocaleDateString();
    meta.appendChild(date);
    card.appendChild(meta);

    const comment = document.createElement('p');
    comment.textContent = review.comment || '';
    card.appendChild(comment);

    section.appendChild(card);
  });

  return section;
}

// Small DOM helpers to keep the builder functions above readable
function makeNote(text) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}
function makeLabel(forId, text) {
  const label = document.createElement('label');
  label.setAttribute('for', forId);
  label.textContent = text;
  return label;
}
function makeInput(id, type) {
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.required = true;
  return input;
}
function makeTextarea(id) {
  const textarea = document.createElement('textarea');
  textarea.id = id;
  textarea.rows = 3;
  textarea.required = true;
  return textarea;
}










