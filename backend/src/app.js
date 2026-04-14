require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pool = require('./db');

const app = express();

// Railway는 edge(Fastly) + 내부 proxy 등 다단계 프록시를 거침.
// 'true'는 모든 X-Forwarded-For를 신뢰 — Railway 내부에서만 도달 가능하므로 안전.
// 이렇게 해야 per-IP rate limit이 실사용자 단위로 정확히 동작함.
app.set('trust proxy', true);

// --- 미들웨어 등록 순서 ---
// 1. 보안 헤더 (API 서버에는 CSP 불필요 — 프론트와 교차 출처라 효과 없음)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS 허용
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// 3. JSON 파싱
app.use(express.json());

// 4. 전역 요청 제한 (15분당 300회 — 로그인/회원가입은 별도로 더 엄격)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
}));

// --- 라우트 ---
// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/ddays', require('./routes/ddays'));
app.use('/api/share', require('./routes/share'));

// --- 에러 핸들러 ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

module.exports = app;
