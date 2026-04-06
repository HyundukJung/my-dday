requireAuth();

const form = document.getElementById('dday-form');
const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');
const pageTitle = document.getElementById('page-title');

// 수정 모드 확인 (URL에 id 파라미터 있으면 수정)
const params = new URLSearchParams(window.location.search);
const editId = params.get('id');
const isEdit = !!editId;

if (isEdit) {
  pageTitle.textContent = 'D-day 수정';
  submitBtn.textContent = '수정';
  loadDday();
}

async function loadDday() {
  try {
    const res = await api.ddays.list();
    const dday = res.data.find(d => d.id === Number(editId));
    if (!dday) {
      alert('해당 D-day를 찾을 수 없습니다.');
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('title').value = dday.title;
    document.getElementById('category').value = dday.category;
    // target_date를 YYYY-MM-DD 형식으로 변환
    const date = new Date(dday.target_date);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate() + 1).padStart(2, '0');
    document.getElementById('target_date').value = `${yyyy}-${mm}-${dd}`;
  } catch (err) {
    alert('데이터를 불러오는데 실패했습니다.');
    window.location.href = 'index.html';
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('show');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.remove('show');

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value;
  const target_date = document.getElementById('target_date').value;

  if (!title) return showError('제목을 입력해주세요.');
  if (!target_date) return showError('날짜를 선택해주세요.');

  submitBtn.disabled = true;
  submitBtn.textContent = '저장 중...';

  try {
    if (isEdit) {
      await api.ddays.update(editId, title, category, target_date);
    } else {
      await api.ddays.create(title, category, target_date);
    }
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.error || '저장에 실패했습니다.');
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? '수정' : '저장';
  }
});
