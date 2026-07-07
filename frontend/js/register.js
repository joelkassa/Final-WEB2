document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('role').value = btn.dataset.role;
  });
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';

  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  try {
    const payload = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      password,
      role: document.getElementById('role').value
    };
    const user = await AuthClient.register(payload);
    if (user.role === 'worker') window.location.href = 'dashboard-worker.html';
    else window.location.href = 'dashboard-client.html';
  } catch (err) {
    errorEl.textContent = err.message || 'Registration failed.';
  }
});










