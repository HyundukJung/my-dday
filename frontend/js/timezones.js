// 세계시(타임존) 공용 데이터/유틸 — 카드 기준 시점 표시 + 세계시 선택용

// #4 드롭다운에 쓰는 주요 세계시 목록
const WORLD_TIMEZONES = [
  { tz: 'Asia/Seoul', flag: '🇰🇷', label: '서울 (한국)' },
  { tz: 'Asia/Tokyo', flag: '🇯🇵', label: '도쿄 (일본)' },
  { tz: 'Asia/Shanghai', flag: '🇨🇳', label: '베이징·상하이 (중국)' },
  { tz: 'Asia/Bangkok', flag: '🇹🇭', label: '방콕 (태국)' },
  { tz: 'Asia/Kolkata', flag: '🇮🇳', label: '뉴델리 (인도)' },
  { tz: 'Asia/Dubai', flag: '🇦🇪', label: '두바이 (UAE)' },
  { tz: 'Europe/London', flag: '🇬🇧', label: '런던 (영국)' },
  { tz: 'Europe/Paris', flag: '🇫🇷', label: '파리 (프랑스)' },
  { tz: 'Europe/Berlin', flag: '🇩🇪', label: '베를린 (독일)' },
  { tz: 'Europe/Moscow', flag: '🇷🇺', label: '모스크바 (러시아)' },
  { tz: 'America/New_York', flag: '🇺🇸', label: '뉴욕 (미 동부)' },
  { tz: 'America/Chicago', flag: '🇺🇸', label: '시카고 (미 중부)' },
  { tz: 'America/Los_Angeles', flag: '🇺🇸', label: 'LA (미 서부)' },
  { tz: 'America/Sao_Paulo', flag: '🇧🇷', label: '상파울루 (브라질)' },
  { tz: 'Australia/Sydney', flag: '🇦🇺', label: '시드니 (호주)' },
  { tz: 'Pacific/Auckland', flag: '🇳🇿', label: '오클랜드 (뉴질랜드)' },
];

// IANA 타임존 → 국기 (목록에 있으면 그 국기, 없으면 지역 대표값/기본값)
const TZ_FLAG_FALLBACK = {
  'Asia/Seoul': '🇰🇷', 'Asia/Tokyo': '🇯🇵', 'Asia/Shanghai': '🇨🇳', 'Asia/Hong_Kong': '🇭🇰',
  'Asia/Singapore': '🇸🇬', 'Asia/Bangkok': '🇹🇭', 'Asia/Kolkata': '🇮🇳', 'Asia/Dubai': '🇦🇪',
  'Europe/London': '🇬🇧', 'Europe/Paris': '🇫🇷', 'Europe/Berlin': '🇩🇪', 'Europe/Madrid': '🇪🇸',
  'Europe/Rome': '🇮🇹', 'Europe/Moscow': '🇷🇺', 'America/New_York': '🇺🇸', 'America/Chicago': '🇺🇸',
  'America/Los_Angeles': '🇺🇸', 'America/Toronto': '🇨🇦', 'America/Sao_Paulo': '🇧🇷',
  'Australia/Sydney': '🇦🇺', 'Pacific/Auckland': '🇳🇿', 'UTC': '🌐',
};

function tzFlag(tz) {
  if (!tz) return '🌐';
  const found = WORLD_TIMEZONES.find((t) => t.tz === tz);
  if (found) return found.flag;
  if (TZ_FLAG_FALLBACK[tz]) return TZ_FLAG_FALLBACK[tz];
  return '🌐';
}

function tzShortLabel(tz) {
  const found = WORLD_TIMEZONES.find((t) => t.tz === tz);
  if (found) return found.label.replace(/\s*\(.*\)/, ''); // 괄호 제거: '서울'
  if (!tz) return 'UTC';
  return tz.split('/').pop().replace(/_/g, ' '); // 'America/New_York' → 'New York'
}

// UTC 시각(ISO)을 특정 타임존의 'YYYY-MM-DD HH:mm' 으로 포맷
function formatInTz(isoUtc, tz) {
  try {
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(isoUtc));
    const p = {};
    parts.forEach((x) => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  } catch (e) {
    return new Date(isoUtc).toISOString().slice(0, 16).replace('T', ' ');
  }
}

// 'YYYY-MM-DD' 를 특정 타임존의 그날 00:00 에 해당하는 UTC 순간(Date)으로 변환
// 예: ('2026-02-12', 'Asia/Seoul') → 2026-02-11T15:00:00Z (한국 자정 = UTC 전날 15시)
function zonedDateToInstant(ymd, tz) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  const utcGuess = Date.UTC(y, (m - 1), d, 0, 0, 0);
  try {
    const asTz = new Date(new Date(utcGuess).toLocaleString('en-US', { timeZone: tz || 'UTC' }));
    const asUtc = new Date(new Date(utcGuess).toLocaleString('en-US', { timeZone: 'UTC' }));
    const offset = asUtc.getTime() - asTz.getTime();
    return new Date(utcGuess + offset);
  } catch (e) {
    return new Date(utcGuess);
  }
}

// 현재 브라우저의 타임존 (카드 생성 시 등록 기준으로 저장)
function browserTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}
