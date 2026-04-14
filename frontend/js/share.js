const THEME_EMOJI = {
  birthday: '&#127874;',
  anniversary: '&#128149;',
  couple: '&#128145;',
  exam: '&#128218;',
};

const THEME_MESSAGE = {
  birthday: (diff) => diff > 0 ? `${diff}일 후에 생일이에요!` : diff === 0 ? '오늘이 생일이에요!' : `생일이 ${Math.abs(diff)}일 지났어요`,
  anniversary: (diff) => diff > 0 ? `${diff}일 남았어요` : diff === 0 ? '오늘이 기념일이에요!' : `${Math.abs(diff)}일이 지났어요`,
  couple: (diff) => diff > 0 ? `${diff}일 남았어요` : diff === 0 ? '바로 오늘이에요!' : `${Math.abs(diff)}일째 함께하고 있어요`,
  exam: (diff) => diff > 0 ? `시험까지 ${diff}일 남았어요` : diff === 0 ? '오늘이 시험일이에요!' : `시험이 ${Math.abs(diff)}일 전에 끝났어요`,
};

async function loadShare() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const content = document.getElementById('share-content');

  if (!token) {
    content.innerHTML = '<div class="share-error"><h2>유효하지 않은 링크입니다.</h2><p>올바른 공유 링크인지 확인해주세요.</p></div>';
    return;
  }

  try {
    const res = await api.share.get(token);
    const d = res.data;
    const theme = d.share_theme || d.category;

    // DB DATE → 로컬 자정 (타임존 무관)
    const ymd = String(d.target_date).slice(0, 10);
    const [y, m, day] = ymd.split('-').map(Number);
    const target = new Date(y, m - 1, day);
    const dateStr = target.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    let countText;
    if (d.days_diff === 0) countText = 'D-DAY';
    else if (d.days_diff > 0) countText = `D - ${d.days_diff}`;
    else countText = `D + ${Math.abs(d.days_diff)}`;

    const getMessage = THEME_MESSAGE[theme] || THEME_MESSAGE.anniversary;
    const message = getMessage(d.days_diff);

    content.innerHTML = `
      <div class="share-page">
        <div class="share-card theme-${theme}">
          <div class="share-emoji">${THEME_EMOJI[theme] || ''}</div>
          <div class="share-title">${escapeHtml(d.title)}</div>
          <div class="share-count">${countText}</div>
          <div class="share-date">${dateStr}</div>
          <div class="share-message">${message}</div>
        </div>
      </div>
    `;

    document.title = `${d.title} - My D-day`;
  } catch (err) {
    content.innerHTML = '<div class="share-error"><h2>유효하지 않은 링크입니다.</h2><p>올바른 공유 링크인지 확인해주세요.</p></div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadShare();
