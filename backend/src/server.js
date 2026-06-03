const app = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;

// SMTP 미설정 시 비밀번호 재설정 메일이 콘솔 fallback으로만 동작하므로
// 실제 사용자에게 메일이 발송되지 않음 — 기동 시 명확히 경고한다.
function checkMailConfig() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '⚠️  [SMTP 미설정] 비밀번호 재설정 메일이 콘솔 로그로만 출력됩니다. ' +
      '실제 발송하려면 SMTP_HOST/SMTP_USER/SMTP_PASS 를 설정하세요. (.env.example 참조)'
    );
  } else {
    console.log('메일 발송 설정 확인됨:', SMTP_HOST);
  }
}

// 필수 환경변수 검증 — 미설정 시 인증 토큰 발급/검증이 런타임에 조용히 실패하므로
// 기동 단계에서 즉시 중단해 배포 사고를 막는다.
function checkRequiredEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`❌ 필수 환경변수 누락: ${missing.join(', ')} — 서버를 시작할 수 없습니다.`);
    process.exit(1);
  }
}

async function start() {
  checkRequiredEnv();

  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB 연결 성공:', res.rows[0].now);
  } catch (err) {
    console.error('DB 연결 실패:', err.message);
    process.exit(1);
  }

  checkMailConfig();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
