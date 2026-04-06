requireAuth();

const CATEGORY_EMOJI = {
  birthday: '&#127874;',
  anniversary: '&#128149;',
  couple: '&#128145;',
  exam: '&#128218;',
};

let allDdays = [];
let currentFilter = 'all';
let shareTargetId = null;
let selectedTheme = 'birthday';

// --- D-day 목록 로드 ---
async function loadDdays() {
  try {
    const res = await api.ddays.list();
    allDdays = res.data;
    renderDdays();
  } catch (err) {
    console.error('목록 로드 실패:', err);
  }
}

// --- D-day 카드 렌더링 ---
function renderDdays() {
  const list = document.getElementById('dday-list');
  const filtered = currentFilter === 'all'
    ? allDdays
    : allDdays.filter(d => d.category === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>등록된 D-day가 없습니다.</p><p><a href="form.html" class="link">+ 첫 D-day를 추가해보세요</a></p></div>';
    return;
  }

  list.innerHTML = filtered.map(d => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d.target_date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    let countText, countClass;
    if (diff === 0) {
      countText = 'D-DAY';
      countClass = 'today';
    } else if (diff > 0) {
      countText = `D - ${diff}`;
      countClass = 'future';
    } else {
      countText = `D + ${Math.abs(diff)}`;
      countClass = 'past';
    }

    const dateStr = target.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
      <div class="dday-card">
        <div class="dday-card-header">
          <span class="dday-category">${CATEGORY_EMOJI[d.category] || ''}</span>
          <span class="dday-title">${escapeHtml(d.title)}</span>
        </div>
        <div class="dday-count ${countClass}">${diff === 0 ? '&#127881; ' : ''}${countText}</div>
        <div class="dday-date">${dateStr}</div>
        <div class="dday-actions">
          <a href="form.html?id=${d.id}" class="btn btn-outline btn-sm">수정</a>
          <button class="btn btn-outline btn-sm" onclick="openShareModal(${d.id})">공유</button>
          <button class="btn btn-outline btn-sm" onclick="deleteDday(${d.id})" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- 삭제 ---
async function deleteDday(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    await api.ddays.remove(id);
    loadDdays();
  } catch (err) {
    alert(err.error || '삭제에 실패했습니다.');
  }
}

// --- 필터 탭 ---
document.getElementById('filter-tabs').addEventListener('click', (e) => {
  if (!e.target.classList.contains('filter-tab')) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  currentFilter = e.target.dataset.filter;
  renderDdays();
});

// --- 공유 모달 ---
function openShareModal(id) {
  shareTargetId = id;
  selectedTheme = 'birthday';
  document.querySelectorAll('.theme-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.theme === 'birthday');
  });
  document.getElementById('share-modal').classList.add('show');
}

document.getElementById('theme-options').addEventListener('click', (e) => {
  const option = e.target.closest('.theme-option');
  if (!option) return;
  selectedTheme = option.dataset.theme;
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
  option.classList.add('selected');
});

document.getElementById('share-confirm-btn').addEventListener('click', async () => {
  try {
    const res = await api.ddays.createShare(shareTargetId, selectedTheme);
    document.getElementById('share-modal').classList.remove('show');
    await navigator.clipboard.writeText(res.data.share_url);
    alert('공유 링크가 클립보드에 복사되었습니다!');
    loadDdays();
  } catch (err) {
    alert(err.error || '공유 링크 생성에 실패했습니다.');
  }
});

document.getElementById('share-cancel-btn').addEventListener('click', () => {
  document.getElementById('share-modal').classList.remove('show');
});

// --- 로그아웃 ---
document.getElementById('logout-btn').addEventListener('click', () => {
  removeToken();
  window.location.href = 'login.html';
});

// --- 초기 로드 ---
loadDdays();
