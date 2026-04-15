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

// DB DATE(ISO) → 로컬 자정 Date 객체 (타임존 무관)
// 예: "2026-02-16T15:00:00.000Z" 또는 "2026-02-17" → 2026-02-17 00:00 로컬
function parseDbDate(dateStr) {
  if (!dateStr) return null;
  const ymd = String(dateStr).slice(0, 10);
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

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
    const isMilestone = d.dday_type === 'milestone';

    let countText, countClass, dateStr, milestoneHtml = '';

    if (isMilestone) {
      // 시작일 기준: 시작일 = 0일째, 100일째 = 시작일 + 100일
      const start = parseDbDate(d.start_date);
      const elapsed = Math.round((today - start) / (1000 * 60 * 60 * 24));

      if (elapsed >= 0) {
        countText = `D + ${elapsed}`;
        countClass = elapsed === 0 ? 'today' : 'future';
      } else {
        countText = `D - ${Math.abs(elapsed)}`;
        countClass = 'future';
      }

      dateStr = start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) + ' 시작';

      // 다음 마일스톤 찾기
      const milestones = (d.milestones || []).slice().sort((a, b) => a.days - b.days);
      const next = milestones.find(m => m.days > elapsed);

      let nextHtml = '';
      if (next) {
        const remaining = next.days - elapsed;
        const targetDate = parseDbDate(next.target_date);
        nextHtml = `
          <div class="milestone-next">
            <span>다음: <strong>${next.days}일</strong> (${targetDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })})</span>
            <strong>D - ${remaining}</strong>
          </div>
        `;
      } else {
        nextHtml = `<div class="milestone-next text-muted">모든 마일스톤이 지났습니다</div>`;
      }

      const listHtml = milestones.map(m => {
        const isPast = m.days <= elapsed;
        const md = parseDbDate(m.target_date);
        const ds = md.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
        const gcalBtn = !isPast
          ? `<button class="milestone-gcal-btn gcal-btn" data-title="${escapeHtml(d.title)} ${m.days}일" data-date="${m.target_date}" data-memo="${escapeHtml(d.memo || '')}" title="Google 캘린더에 추가">📅</button>`
          : '';
        return `<li class="${isPast ? 'passed' : 'upcoming'}"><span>${m.days}일</span><span>${ds} ${gcalBtn}</span></li>`;
      }).join('');

      milestoneHtml = `
        <div class="milestone-summary">
          ${nextHtml}
          <div class="milestone-toggle" onclick="toggleMilestones(this)">▼ 전체 보기</div>
          <ul class="milestone-list" style="display:none;">${listHtml}</ul>
        </div>
      `;
    } else {
      const target = parseDbDate(d.target_date);
      const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));

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

      dateStr = target.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }

    const memoHtml = d.memo
      ? `<div class="dday-memo">${escapeHtml(d.memo).replace(/\n/g, '<br>')}</div>`
      : '';

    // 카드 메인 GCal 대상 (fixed는 target_date, milestone은 다음 마일스톤)
    let mainGcalDate = null;
    let mainGcalTitle = d.title;
    if (isMilestone) {
      const ms = (d.milestones || []).slice().sort((a, b) => a.days - b.days);
      const today2 = new Date(); today2.setHours(0, 0, 0, 0);
      const start2 = parseDbDate(d.start_date);
      const elapsed2 = Math.round((today2 - start2) / 86400000);
      const next = ms.find(m => m.days > elapsed2);
      if (next) {
        mainGcalDate = next.target_date;
        mainGcalTitle = `${d.title} ${next.days}일`;
      }
    } else {
      mainGcalDate = d.target_date;
    }
    const gcalMainBtn = mainGcalDate
      ? `<button class="btn btn-outline btn-sm gcal-btn" data-title="${escapeHtml(mainGcalTitle)}" data-date="${mainGcalDate}" data-memo="${escapeHtml(d.memo || '')}">📅 캘린더</button>`
      : '';

    return `
      <div class="dday-card">
        <div class="dday-card-header">
          <span class="dday-category">${CATEGORY_EMOJI[d.category] || ''}</span>
          <span class="dday-title">${escapeHtml(d.title)}</span>
        </div>
        <div class="dday-count ${countClass}">${countText === 'D-DAY' ? '&#127881; ' : ''}${countText}</div>
        <div class="dday-date">${dateStr}</div>
        ${memoHtml}
        ${milestoneHtml}
        <div class="dday-actions">
          <a href="form.html?id=${d.id}" class="btn btn-outline btn-sm">수정</a>
          ${gcalMainBtn}
          <button class="btn btn-outline btn-sm" onclick="openShareModal(${d.id})">공유</button>
          <button class="btn btn-outline btn-sm" onclick="deleteDday(${d.id})" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.gcal-btn');
  if (!btn) return;
  openGcal(btn.dataset.title, btn.dataset.date, btn.dataset.memo);
});

function toggleMilestones(el) {
  const list = el.nextElementSibling;
  if (list.style.display === 'none') {
    list.style.display = 'block';
    el.textContent = '▲ 접기';
  } else {
    list.style.display = 'none';
    el.textContent = '▼ 전체 보기';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// YYYY-MM-DD → YYYYMMDD
function toGcalDate(dateStr) {
  return String(dateStr).slice(0, 10).replace(/-/g, '');
}

// Date(로컬) → YYYYMMDD
function dateToGcal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Google Calendar 이벤트 생성 URL (all-day, OAuth 불필요)
function gcalUrl({ title, dateStr, details }) {
  const start = parseDbDate(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 1); // all-day end는 exclusive
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dateToGcal(start)}/${dateToGcal(end)}`,
  });
  if (details) params.set('details', details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function openGcal(title, dateStr, details) {
  window.open(gcalUrl({ title, dateStr, details }), '_blank', 'noopener');
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
