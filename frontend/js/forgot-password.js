document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  errorEl.textContent = '';
  try {
    await ApiClient.post('/auth/forgot-password', { email: document.getElementById('email').value });
    successEl.classList.remove('hidden');
  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong.';
  }
});





