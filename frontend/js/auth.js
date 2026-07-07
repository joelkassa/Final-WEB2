const AuthClient = (() => {
  function getCurrentUser() {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  }

  function setCurrentUser(user) {
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    else localStorage.removeItem('currentUser');
  }

  async function login(email, password) {
    const data = await ApiClient.post('/auth/login', { email, password });
    ApiClient.setAccessToken(data.accessToken);
    setCurrentUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await ApiClient.post('/auth/register', payload);
    ApiClient.setAccessToken(data.accessToken);
    setCurrentUser(data.user);
    return data.user;
  }

  async function logout() {
    try { await ApiClient.post('/auth/logout'); } catch (_) { /* ignore */ }
    ApiClient.setAccessToken(null);
    setCurrentUser(null);
    window.location.href = 'index.html';
  }

  function renderNav() {
    const user = getCurrentUser();
    const loginLink = document.getElementById('nav-login');
    const registerLink = document.getElementById('nav-register');
    const dashLink = document.getElementById('nav-dash');
    const logoutBtn = document.getElementById('nav-logout');
    if (!loginLink) return; 

    if (user) {
      loginLink.style.display = 'none';
      registerLink.style.display = 'none';
      if (dashLink) {
        dashLink.classList.remove('hidden');
        dashLink.href = user.role === 'client' ? 'dashboard-client.html'
          : user.role === 'worker' ? 'dashboard-worker.html'
          : 'dashboard-admin.html';
      }
      if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
        logoutBtn.addEventListener('click', logout);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', renderNav);

  return { login, register, logout, getCurrentUser };
})();











