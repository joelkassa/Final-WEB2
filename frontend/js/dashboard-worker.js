let currentProfile = null;
let allCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = AuthClient.getCurrentUser();
  if (!user || user.role !== 'worker') {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('nav-logout').addEventListener('click', AuthClient.logout);

  allCategories = await ApiClient.get('/categories').catch(() => []);
  await loadProfile();
  await loadBookings();

  document.getElementById('add-skill-btn').addEventListener('click', addSkill);
  document.getElementById('upload-portfolio-btn').addEventListener('click', uploadPortfolioImage);
  document.getElementById('add-slot-btn').addEventListener('click', addSlot);
});

async function loadProfile() {
  const section = document.getElementById('profile-section');
  try {
    currentProfile = await ApiClient.get('/workers/me');
    renderApprovalBanner(currentProfile.isApproved);
    renderProfileForm(section, currentProfile);
    renderSkills(currentProfile.skills || []);
    renderPortfolio(currentProfile.portfolioImages || []);
    renderSlots(currentProfile.availabilitySlots || []);
  } catch (err) {
    currentProfile = null;
    renderProfileForm(section, null);
  }
}

function renderApprovalBanner(isApproved) {
  const banner = document.getElementById('approval-banner');
  if (currentProfile === null) { banner.innerHTML = ''; return; }
  const div = document.createElement('div');
  div.className = 'approval-banner ' + (isApproved ? 'approval-approved' : 'approval-pending');
  div.textContent = isApproved
    ? 'Your profile is approved and visible to clients.'
    : 'Your profile is awaiting admin approval and is not yet visible to clients.';
  banner.innerHTML = '';
  banner.appendChild(div);
}

function renderProfileForm(section, profile) {
  section.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = profile ? 'My profile' : 'Complete your profile to get listed';
  section.appendChild(h2);

  const form = document.createElement('form');
  form.id = 'profile-form';

  form.appendChild(makeLabel('bio', 'Bio'));
  const bio = document.createElement('textarea');
  bio.id = 'bio'; bio.rows = 3;
  bio.value = profile ? profile.bio || '' : '';
  form.appendChild(bio);

  const row1 = document.createElement('div');
  row1.className = 'field-row';

  const catCol = document.createElement('div');
  catCol.appendChild(makeLabel('category', 'Category'));
  const catSelect = document.createElement('select');
  catSelect.id = 'category';
  const blankOpt = document.createElement('option');
  blankOpt.value = ''; blankOpt.textContent = 'Other (type below)';
  catSelect.appendChild(blankOpt);
  allCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id; opt.textContent = cat.name;
    if (profile && profile.categoryId === cat.id) opt.selected = true;
    catSelect.appendChild(opt);
  });
  catCol.appendChild(catSelect);
  row1.appendChild(catCol);

  const customCatCol = document.createElement('div');
  customCatCol.appendChild(makeLabel('custom-category', 'Custom category (if "Other")'));
  const customCat = document.createElement('input');
  customCat.id = 'custom-category'; customCat.type = 'text';
  customCat.value = profile ? profile.customCategory || '' : '';
  customCatCol.appendChild(customCat);
  row1.appendChild(customCatCol);

  form.appendChild(row1);

  const row2 = document.createElement('div');
  row2.className = 'field-row';

  const minCol = document.createElement('div');
  minCol.appendChild(makeLabel('price-min', 'Minimum price (ETB)'));
  const priceMin = document.createElement('input');
  priceMin.id = 'price-min'; priceMin.type = 'number';
  priceMin.value = profile ? profile.priceMin || '' : '';
  minCol.appendChild(priceMin);
  row2.appendChild(minCol);

  const maxCol = document.createElement('div');
  maxCol.appendChild(makeLabel('price-max', 'Maximum price (ETB)'));
  const priceMax = document.createElement('input');
  priceMax.id = 'price-max'; priceMax.type = 'number';
  priceMax.value = profile ? profile.priceMax || '' : '';
  maxCol.appendChild(priceMax);
  row2.appendChild(maxCol);

  form.appendChild(row2);

  form.appendChild(makeLabel('service-area', 'Service area / address'));
  const serviceArea = document.createElement('input');
  serviceArea.id = 'service-area'; serviceArea.type = 'text';
  serviceArea.value = profile ? profile.serviceArea || '' : '';
  form.appendChild(serviceArea);

  form.appendChild(makeLabel('', 'Availability status'));
  const toggle = document.createElement('div');
  toggle.className = 'availability-toggle';
  ['available', 'unavailable'].forEach((status) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn availability-btn' + ((profile && profile.availabilityStatus === status) || (!profile && status === 'available') ? ' selected' : '');
    btn.dataset.status = status;
    btn.textContent = status === 'available' ? 'Available now' : 'Not available';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.availability-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    toggle.appendChild(btn);
  });
  form.appendChild(toggle);

  const errorP = document.createElement('p');
  errorP.className = 'form-error'; errorP.id = 'profile-error';
  form.appendChild(errorP);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-block';
  submitBtn.textContent = profile ? 'Save changes' : 'Create profile';
  form.appendChild(submitBtn);

  form.addEventListener('submit', saveProfile);
  section.appendChild(form);
}

async function saveProfile(e) {
  e.preventDefault();
  const errorEl = document.getElementById('profile-error');
  errorEl.textContent = '';

  const selectedStatus = document.querySelector('.availability-btn.selected');
  const payload = {
    bio: document.getElementById('bio').value,
    categoryId: document.getElementById('category').value || null,
    customCategory: document.getElementById('custom-category').value || null,
    priceMin: document.getElementById('price-min').value || null,
    priceMax: document.getElementById('price-max').value || null,
    serviceArea: document.getElementById('service-area').value,
    availabilityStatus: selectedStatus ? selectedStatus.dataset.status : 'available'
  };

  try {
    if (currentProfile) {
      await ApiClient.patch(`/workers/${currentProfile.id}`, payload);
    } else {
      await ApiClient.post('/workers', payload);
    }
    await loadProfile();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not save profile.';
  }
}

function renderSkills(skills) {
  const list = document.getElementById('skills-list');
  list.innerHTML = '';
  skills.forEach((skill) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const text = document.createElement('span');
    text.textContent = skill.skillName;
    chip.appendChild(text);
    const remove = document.createElement('span');
    remove.className = 'chip-remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => removeSkill(skill.id));
    chip.appendChild(remove);
    list.appendChild(chip);
  });
}

async function addSkill() {
  if (!currentProfile) { alert('Save your profile first.'); return; }
  const input = document.getElementById('new-skill-input');
  const value = input.value.trim();
  if (!value) return;
  try {
    await ApiClient.post(`/workers/${currentProfile.id}/skills`, { skillName: value });
    input.value = '';
    await loadProfile();
  } catch (err) {
    alert(err.message || 'Could not add skill.');
  }
}

async function removeSkill(skillId) {
  try {
    await ApiClient.delete(`/skills/${skillId}`);
    await loadProfile();
  } catch (err) {
    alert(err.message || 'Could not remove skill.');
  }
}

function renderPortfolio(images) {
  const list = document.getElementById('portfolio-list');
  list.innerHTML = '';
  images.forEach((img) => {
    const wrapper = document.createElement('div');
    const el = document.createElement('img');
    el.src = img.imageUrl;
    el.alt = 'Portfolio item';
    wrapper.appendChild(el);
    list.appendChild(wrapper);
  });
}

async function uploadPortfolioImage() {
  if (!currentProfile) { alert('Save your profile first.'); return; }
  const errorEl = document.getElementById('portfolio-error');
  errorEl.textContent = '';
  const fileInput = document.getElementById('portfolio-file-input');
  if (!fileInput.files[0]) { errorEl.textContent = 'Choose an image first.'; return; }

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  try {
    await ApiClient.upload(`/workers/${currentProfile.id}/portfolio`, formData);
    fileInput.value = '';
    await loadProfile();
  } catch (err) {
    errorEl.textContent = err.message || 'Upload failed.';
  }
}

function renderSlots(slots) {
  const list = document.getElementById('slot-list');
  list.innerHTML = '';
  if (slots.length === 0) {
    list.appendChild(makeNote('No availability slots added yet.'));
    return;
  }
  slots.forEach((slot) => {
    const row = document.createElement('div');
    row.className = 'slot-row';
    const text = document.createElement('span');
    text.textContent = `${slot.slotDate} · ${slot.startTime}–${slot.endTime}` + (slot.isBooked ? ' (booked)' : '');
    row.appendChild(text);
    if (!slot.isBooked) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-ghost';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeSlot(slot.id));
      row.appendChild(removeBtn);
    }
    list.appendChild(row);
  });
}

async function addSlot() {
  if (!currentProfile) { alert('Save your profile first.'); return; }
  const errorEl = document.getElementById('slot-error');
  errorEl.textContent = '';

  const date = document.getElementById('slot-date').value;
  const start = document.getElementById('slot-start').value;
  const end = document.getElementById('slot-end').value;
  if (!date || !start || !end) { errorEl.textContent = 'Fill in date, start, and end time.'; return; }

  try {
    await ApiClient.post(`/workers/${currentProfile.id}/availability`, {
      slotDate: date, startTime: start, endTime: end
    });
    await loadProfile();
  } catch (err) {
    errorEl.textContent = err.message || 'Could not add slot.';
  }
}

async function removeSlot(slotId) {
  try {
    await ApiClient.delete(`/availability/${slotId}`);
    await loadProfile();
  } catch (err) {
    alert(err.message || 'Could not remove slot.');
  }
}

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  try {
    const bookings = await ApiClient.get('/bookings/me');
    container.innerHTML = '';
    if (bookings.length === 0) {
      container.appendChild(makeNote('No bookings yet.'));
      return;
    }
    bookings.forEach((booking) => container.appendChild(buildBookingCard(booking)));
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(makeNote('Could not load bookings.'));
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
  title.textContent = booking.clientName;
  titleBlock.appendChild(title);
  const sub = document.createElement('div');
  sub.className = 'booking-card-sub';
  sub.textContent = `${booking.slotDate} · ${booking.startTime}–${booking.endTime}`;
  titleBlock.appendChild(sub);
  top.appendChild(titleBlock);

  const badge = document.createElement('span');
  badge.className = `status-badge status-${booking.status}`;
  badge.textContent = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  top.appendChild(badge);
  card.appendChild(top);

  const detail = document.createElement('p');
  detail.className = 'booking-card-detail';
  detail.textContent = `${booking.description} — Budget: ${booking.budget || 'not specified'} ETB`;
  card.appendChild(detail);

  const actions = document.createElement('div');
  actions.className = 'action-row';

  if (booking.status === 'pending') {
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn btn-sm btn-primary';
    acceptBtn.textContent = 'Accept';
    acceptBtn.addEventListener('click', () => updateBookingStatus(booking.id, 'accepted'));
    actions.appendChild(acceptBtn);

    const declineBtn = document.createElement('button');
    declineBtn.className = 'btn btn-sm btn-danger';
    declineBtn.textContent = 'Decline';
    declineBtn.addEventListener('click', () => updateBookingStatus(booking.id, 'declined'));
    actions.appendChild(declineBtn);
  }

  card.appendChild(actions);
  return card;
}

async function updateBookingStatus(bookingId, status) {
  try {
    await ApiClient.patch(`/bookings/${bookingId}/status`, { status });
    await loadBookings();
  } catch (err) {
    alert(err.message || 'Could not update booking.');
  }
}

function makeNote(text) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}
function makeLabel(forId, text) {
  const label = document.createElement('label');
  if (forId) label.setAttribute('for', forId);
  label.textContent = text;
  return label;
}





