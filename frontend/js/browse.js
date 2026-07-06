document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadWorkers();

  document.getElementById('filter-apply').addEventListener('click', () => {
    loadWorkers();
  });
});

async function loadCategories() {
  const select = document.getElementById('filter-category');
  try {
    const categories = await ApiClient.get('/categories');
    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  } catch (err) {
    // Non-fatal: browsing still works without the category filter populated.
    console.error('Could not load categories:', err.message);
  }
}

async function loadWorkers() {
  const grid = document.getElementById('worker-grid');
  grid.innerHTML = '';
  renderEmptyState(grid, 'Loading professionals...');

  const params = buildFilterParams();

  try {
    const workers = await ApiClient.get(`/workers${params ? '?' + params : ''}`);
    grid.innerHTML = '';

    if (workers.length === 0) {
      renderEmptyState(grid, 'No professionals match your search yet.');
      return;
    }

    workers.forEach((worker) => grid.appendChild(buildWorkerCard(worker)));
  } catch (err) {
    grid.innerHTML = '';
    renderEmptyState(grid, 'Could not load professionals. Please try again.');
    console.error(err);
  }
}

function buildFilterParams() {
  const category = document.getElementById('filter-category').value;
  const name = document.getElementById('filter-name').value.trim();
  const location = document.getElementById('filter-location').value.trim();
  const minRating = document.getElementById('filter-rating').value;

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (name) params.set('name', name);
  if (location) params.set('location', location);
  if (minRating) params.set('minRating', minRating);

  return params.toString();
}

function buildWorkerCard(worker) {
  const card = document.createElement('a');
  card.href = `worker-profile.html?id=${worker.id}`;
  card.className = 'worker-card' + (worker.availabilityStatus === 'available' ? ' available' : '');

  const img = document.createElement('img');
  img.src = worker.photoUrl || 'assets/placeholder.png';
  img.alt = worker.name;
  card.appendChild(img);

  const body = document.createElement('div');
  body.className = 'worker-card-body';

  const name = document.createElement('h3');
  name.textContent = worker.name;
  body.appendChild(name);

  const category = document.createElement('p');
  category.className = 'worker-card-cat';
  category.textContent = worker.categoryName || worker.customCategory || 'General services';
  body.appendChild(category);

  const ratingPill = document.createElement('span');
  ratingPill.className = 'rating-pill';
  ratingPill.textContent = worker.avgRating
    ? `★ ${worker.avgRating.toFixed(1)} (${worker.reviewCount})`
    : 'No reviews yet';
  body.appendChild(ratingPill);

  const statusPill = document.createElement('span');
  statusPill.className = 'status-pill';
  statusPill.textContent = worker.availabilityStatus === 'available' ? 'Available' : 'Busy';
  body.appendChild(statusPill);

  card.appendChild(body);
  return card;
}

function renderEmptyState(container, message) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = message;
  container.appendChild(p);
}











