// SMTP 미설정 시 콘솔 로그로 fallback.
// Railway Variables에 SMTP_* 설정 시 실제 메일 전송.

const nodemailer = require('nodemailer');

let transporter = null;
let configured = false;

function getTransporter() {
  if (configured) return transporter;
  configured = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[mailer] SMTP 환경변수가 없어 콘솔 로그 모드로 동작합니다.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@mydday.app';

  if (!t) {
    // Fallback: 서버 로그로 출력 (개발/임시 운영)
    console.log('\n===== [mailer fallback] =====');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('=============================\n');
    return { fallback: true };
  }

  const info = await t.sendMail({ from, to, subject, html, text });
  return { messageId: info.messageId };
}

module.exports = { sendMail };
