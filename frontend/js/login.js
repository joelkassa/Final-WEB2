document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const user = await AuthClient.login(email, password);
    if (user.role === 'client') window.location.href = 'dashboard-client.html';
    else if (user.role === 'worker') window.location.href = 'dashboard-worker.html';
    else if (user.role === 'admin') window.location.href = 'dashboard-admin.html';
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed. Check your credentials.';
  }
});







