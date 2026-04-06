const BASE_URL = (window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.protocol === 'file:')
  ? 'http://localhost:3000'
  : 'https://my-dday-production.up.railway.app';

// --- 토큰 관리 ---
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function isLoggedIn() {
  return !!getToken();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// --- fetch 래퍼 ---
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    // 토큰 만료 시 자동 로그아웃
    if (res.status === 401) {
      removeToken();
      window.location.href = 'login.html';
    }
    throw { status: res.status, ...data };
  }

  return data;
}

// --- API 메서드 ---
const api = {
  auth: {
    signup: (email, password) => request('POST', '/api/auth/signup', { email, password }),
    login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  },
  ddays: {
    list: () => request('GET', '/api/ddays'),
    create: (title, category, target_date) => request('POST', '/api/ddays', { title, category, target_date }),
    update: (id, title, category, target_date) => request('PUT', `/api/ddays/${id}`, { title, category, target_date }),
    remove: (id) => request('DELETE', `/api/ddays/${id}`),
    createShare: (id, share_theme) => request('POST', `/api/ddays/${id}/share`, { share_theme }),
    removeShare: (id) => request('DELETE', `/api/ddays/${id}/share`),
  },
  share: {
    get: (token) => request('GET', `/api/share/${token}`),
  },
};
