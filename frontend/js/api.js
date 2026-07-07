const ApiClient = (() => {
  const BASE_URL = 'http://localhost:5000/api';

  function getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  function setAccessToken(token) {
    if (token) localStorage.setItem('accessToken', token);
    else localStorage.removeItem('accessToken');
  }

  async function refreshAccessToken() {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include' 
    });
    if (!res.ok) {
      setAccessToken(null);
      return null;
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    return data.accessToken;
  }

  async function request(method, path, body, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined
    });


    if (res.status === 401 && !isRetry) {
      const newToken = await refreshAccessToken();
      if (newToken) return request(method, path, body, true);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  }

  async function upload(path, formData) {
    const headers = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Upload failed (${res.status})`);
    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
    upload,
    setAccessToken,
    getAccessToken
  };
})();













