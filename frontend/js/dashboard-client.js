document.addEventListener('DOMContentLoaded', () => {
  const user = AuthClient.getCurrentUser();
  if (!user || user.role !== 'client') {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('nav-logout').addEventListener('click', AuthClient.logout);
  loadBookings();
});

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  try {
    const bookings = await ApiClient.get('/bookings/me');
    container.innerHTML = '';

    if (bookings.length === 0) {
      container.appendChild(makeNote('You have no bookings yet. Browse professionals to get started.'));
      return;
    }

    bookings.forEach((booking) => container.appendChild(buildBookingCard(booking)));
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(makeNote('Could not load your bookings. Please refresh.'));
    console.error(err);
  }
}

function buildBookingCard(booking) {
  const card = document.createElement('div');
  card.className = 'booking-card';

  const top = document.createElement('div');
  top.className = 'booking-card-top';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'booking-card-title';
  title.textContent = booking.workerName;
  titleBlock.appendChild(title);
  const sub = document.createElement('div');
  sub.className = 'booking-card-sub';
  sub.textContent = `${booking.slotDate} · ${booking.startTime}–${booking.endTime}`;
  titleBlock.appendChild(sub);
  top.appendChild(titleBlock);

  const badge = document.createElement('span');
  badge.className = `status-badge status-${booking.status}`;
  badge.textContent = capitalize(booking.status);
  top.appendChild(badge);

  card.appendChild(top);

  const detail = document.createElement('p');
  detail.className = 'booking-card-detail';
  detail.textContent = booking.description;
  card.appendChild(detail);

  const actions = document.createElement('div');
  actions.className = 'action-row';

  if (booking.status === 'pending') {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sm btn-danger';
    cancelBtn.textContent = 'Cancel request';
    cancelBtn.addEventListener('click', () => cancelBooking(booking.id, card));
    actions.appendChild(cancelBtn);
  }

  if (booking.status === 'accepted') {
    const completeBtn = document.createElement('button');
    completeBtn.className = 'btn btn-sm btn-primary';
    completeBtn.textContent = 'Mark job as completed';
    completeBtn.addEventListener('click', () => completeBooking(booking.id));
    actions.appendChild(completeBtn);
  }

  if (booking.status === 'completed' && !booking.hasReview) {
    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'btn btn-sm btn-primary';
    reviewBtn.textContent = 'Leave a review';
    reviewBtn.addEventListener('click', () => toggleReviewForm(card, booking.id));
    actions.appendChild(reviewBtn);
  }

  if (booking.status === 'accepted' || booking.status === 'completed') {
    const reportBtn = document.createElement('button');
    reportBtn.className = 'btn btn-sm btn-ghost';
    reportBtn.textContent = 'Report an issue';
    reportBtn.addEventListener('click', () => toggleReportForm(card, booking.id));
    actions.appendChild(reportBtn);
  }

  card.appendChild(actions);
  return card;
}

async function cancelBooking(bookingId, card) {
  try {
    await ApiClient.patch(`/bookings/${bookingId}/status`, { status: 'cancelled' });
    loadBookings();
  } catch (err) {
    alert(err.message || 'Could not cancel this booking.');
  }
}

async function completeBooking(bookingId) {
  if (!confirm('Confirm the job is finished? You will be able to leave a review after this.')) return;
  try {
    await ApiClient.patch(`/bookings/${bookingId}/complete`);
    loadBookings();
  } catch (err) {
    alert(err.message || 'Could not mark booking as completed.');
  }
}

function toggleReviewForm(card, bookingId) {
  const existing = card.querySelector('.review-inline-form');
  if (existing) { existing.remove(); return; }

  const form = document.createElement('form');
  form.className = 'inline-form review-inline-form';

  const label = document.createElement('label');
  label.textContent = 'Rating';
  form.appendChild(label);

  const starRow = document.createElement('div');
  starRow.className = 'star-select';
  form.dataset.rating = '0';
  for (let i = 1; i <= 5; i++) {
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.className = 'star-btn';
    starBtn.dataset.value = i;
    starBtn.textContent = '★';
    starBtn.addEventListener('click', () => setStarRating(form, i));
    starRow.appendChild(starBtn);
  }
  form.appendChild(starRow);

  form.appendChild(makeLabel('review-comment-' + bookingId, 'Comment'));
  const textarea = document.createElement('textarea');
  textarea.id = 'review-comment-' + bookingId;
  textarea.rows = 3;
  form.appendChild(textarea);

  const errorP = document.createElement('p');
  errorP.className = 'form-error';
  form.appendChild(errorP);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-sm';
  submitBtn.textContent = 'Submit review';
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rating = parseInt(form.dataset.rating, 10);
    errorP.textContent = '';
    if (!rating) { errorP.textContent = 'Please select a star rating.'; return; }
    try {
      await ApiClient.post(`/bookings/${bookingId}/review`, {
        rating,
        comment: textarea.value
      });
      loadBookings();
    } catch (err) {
      errorP.textContent = err.message || 'Could not submit review.';
    }
  });

  card.appendChild(form);
}

function setStarRating(form, value) {
  form.dataset.rating = value;
  form.querySelectorAll('.star-btn').forEach((btn) => {
    btn.classList.toggle('filled', parseInt(btn.dataset.value, 10) <= value);
  });
}

function toggleReportForm(card, bookingId) {
  const existing = card.querySelector('.report-inline-form');
  if (existing) { existing.remove(); return; }

  const form = document.createElement('form');
  form.className = 'inline-form report-inline-form';

  form.appendChild(makeLabel('report-reason-' + bookingId, 'What happened?'));
  const select = document.createElement('select');
  select.id = 'report-reason-' + bookingId;
  ['No show', 'Late arrival', 'Poor quality of work', 'Payment dispute', 'Other'].forEach((reason) => {
    const opt = document.createElement('option');
    opt.value = reason;
    opt.textContent = reason;
    select.appendChild(opt);
  });
  form.appendChild(select);

  form.appendChild(makeLabel('report-desc-' + bookingId, 'Details'));
  const textarea = document.createElement('textarea');
  textarea.id = 'report-desc-' + bookingId;
  textarea.rows = 3;
  textarea.required = true;
  form.appendChild(textarea);

  const errorP = document.createElement('p');
  errorP.className = 'form-error';
  form.appendChild(errorP);

  const successP = document.createElement('p');
  successP.className = 'success-text hidden';
  successP.textContent = 'Report submitted. Admin will review it.';
  form.appendChild(successP);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-sm btn-danger';
  submitBtn.textContent = 'Submit report';
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorP.textContent = '';
    try {
      await ApiClient.post('/reports', {
        bookingId,
        reason: select.value,
        description: textarea.value
      });
      successP.classList.remove('hidden');
      submitBtn.disabled = true;
    } catch (err) {
      errorP.textContent = err.message || 'Could not submit report.';
    }
  });

  card.appendChild(form);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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








