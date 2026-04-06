// 이미 로그인된 상태면 메인으로 이동
if (isLoggedIn()) {
  window.location.href = 'index.html';
}

const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('show');
}

function hideError() {
  errorMsg.classList.remove('show');
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading
    ? '처리 중...'
    : (document.getElementById('login-form') ? '로그인' : '회원가입');
}

// 로그인 폼
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      return showError('이메일과 비밀번호를 입력해주세요.');
    }

    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setToken(res.data.token);
      window.location.href = 'index.html';
    } catch (err) {
      showError(err.error || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  });
}

// 회원가입 폼
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    if (!email || !password) {
      return showError('이메일과 비밀번호를 입력해주세요.');
    }

    if (password.length < 8) {
      return showError('비밀번호는 최소 8자 이상이어야 합니다.');
    }

    if (password !== passwordConfirm) {
      return showError('비밀번호가 일치하지 않습니다.');
    }

    setLoading(true);
    try {
      const res = await api.auth.signup(email, password);
      setToken(res.data.token);
      window.location.href = 'index.html';
    } catch (err) {
      showError(err.error || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  });
}
