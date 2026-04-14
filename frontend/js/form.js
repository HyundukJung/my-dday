requireAuth();

const form = document.getElementById('dday-form');
const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');
const pageTitle = document.getElementById('page-title');
const fixedFields = document.getElementById('fixed-fields');
const milestoneFields = document.getElementById('milestone-fields');
const typeRadios = document.querySelectorAll('input[name="dday_type"]');

// 유형 토글
function updateTypeFields() {
  const type = document.querySelector('input[name="dday_type"]:checked').value;
  if (type === 'milestone') {
    fixedFields.style.display = 'none';
    milestoneFields.style.display = 'block';
    document.getElementById('target_date').required = false;
    document.getElementById('start_date').required = true;
  } else {
    fixedFields.style.display = 'block';
    milestoneFields.style.display = 'none';
    document.getElementById('target_date').required = true;
    document.getElementById('start_date').required = false;
  }
}
typeRadios.forEach(r => r.addEventListener('change', updateTypeFields));

// 수정 모드
const params = new URLSearchParams(window.location.search);
const editId = params.get('id');
const isEdit = !!editId;

if (isEdit) {
  pageTitle.textContent = 'D-day 수정';
  submitBtn.textContent = '수정';
  loadDday();
}

function toDateInput(dateStr) {
  if (!dateStr) return '';
  // ISO timestamp → YYYY-MM-DD (UTC 기준)
  return dateStr.slice(0, 10);
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

    // 유형 설정
    const type = dday.dday_type || 'fixed';
    document.querySelector(`input[name="dday_type"][value="${type}"]`).checked = true;
    updateTypeFields();

    if (type === 'milestone') {
      document.getElementById('start_date').value = toDateInput(dday.start_date);
      // 기존 마일스톤 days로 체크박스 갱신
      const existingDays = (dday.milestones || []).map(m => m.days);
      const presetValues = Array.from(document.querySelectorAll('#milestone-presets input[type=checkbox]')).map(cb => Number(cb.value));
      document.querySelectorAll('#milestone-presets input[type=checkbox]').forEach(cb => {
        cb.checked = existingDays.includes(Number(cb.value));
      });
      const customDays = existingDays.filter(d => !presetValues.includes(d));
      document.getElementById('custom-days').value = customDays.join(', ');
    } else {
      document.getElementById('target_date').value = toDateInput(dday.target_date);
    }
  } catch (err) {
    alert('데이터를 불러오는데 실패했습니다.');
    window.location.href = 'index.html';
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('show');
}

function collectMilestoneDays() {
  const checked = Array.from(document.querySelectorAll('#milestone-presets input[type=checkbox]:checked'))
    .map(cb => Number(cb.value));
  const custom = document.getElementById('custom-days').value
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isInteger(n) && n > 0);
  return [...new Set([...checked, ...custom])].sort((a, b) => a - b);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.remove('show');

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value;
  const dday_type = document.querySelector('input[name="dday_type"]:checked').value;

  if (!title) return showError('제목을 입력해주세요.');

  const payload = { title, category, dday_type };

  if (dday_type === 'milestone') {
    const start_date = document.getElementById('start_date').value;
    if (!start_date) return showError('시작일을 선택해주세요.');
    const milestone_days = collectMilestoneDays();
    if (milestone_days.length === 0) return showError('마일스톤을 1개 이상 선택해주세요.');
    payload.start_date = start_date;
    payload.milestone_days = milestone_days;
  } else {
    const target_date = document.getElementById('target_date').value;
    if (!target_date) return showError('날짜를 선택해주세요.');
    payload.target_date = target_date;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '저장 중...';

  try {
    if (isEdit) {
      await api.ddays.update(editId, payload);
    } else {
      await api.ddays.create(payload);
    }
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.error || '저장에 실패했습니다.');
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? '수정' : '저장';
  }
});
