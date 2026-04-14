const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { sendMail } = require('../lib/mailer');

const router = express.Router();

// 인증 엔드포인트 전용 엄격한 제한 (브루트포스 방지)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15분당 10회
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 비밀번호 찾기는 더 엄격 (스팸/남용 방지)
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5, // 1시간당 5회
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// 회원가입
router.post(
  '/signup',
  authLimiter,
  [
    body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.'),
    body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다.'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
      }

      const hashed = await bcrypt.hash(password, 12);

      const result = await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
        [email, hashed]
      );
      const user = result.rows[0];
      const token = signToken(user);

      res.status(201).json({ data: { token, user: { id: user.id, email: user.email } } });
    } catch (err) {
      console.error('signup error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
);

// 로그인
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.'),
    body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }

      const token = signToken(user);
      res.json({ data: { token, user: { id: user.id, email: user.email } } });
    } catch (err) {
      console.error('login error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
);

// 비밀번호 찾기 — 토큰 발급 + 이메일 전송
// 이메일 존재 여부를 드러내지 않기 위해 항상 성공 응답
router.post(
  '/forgot-password',
  forgotLimiter,
  [body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.')],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30분

        await pool.query(
          'INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1, $2, $3)',
          [token, user.id, expiresAt]
        );

        const frontend = process.env.FRONTEND_URL || 'http://localhost:5500';
        const resetUrl = `${frontend}/reset-password.html?token=${token}`;

        try {
          await sendMail({
            to: user.email,
            subject: '[My D-day] 비밀번호 재설정',
            text: `비밀번호 재설정 링크입니다 (30분 유효):\n\n${resetUrl}\n\n본인이 요청하지 않았다면 이 메일을 무시해주세요.`,
            html: `<p>비밀번호 재설정 링크입니다 <b>(30분 유효)</b>.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>`,
          });
        } catch (mailErr) {
          console.error('forgot-password mail error:', mailErr.message);
        }
      }

      res.json({ message: '해당 이메일로 재설정 링크를 전송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      console.error('forgot-password error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
);

// 비밀번호 재설정 — 토큰 검증 후 변경
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').isLength({ min: 20 }).withMessage('유효하지 않은 토큰입니다.'),
    body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다.'),
  ],
  validate,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { token, password } = req.body;

      const pr = await client.query(
        'SELECT user_id, expires_at, used FROM password_resets WHERE token = $1',
        [token]
      );
      if (pr.rows.length === 0) {
        return res.status(400).json({ error: '유효하지 않거나 만료된 링크입니다.' });
      }
      const { user_id, expires_at, used } = pr.rows[0];
      if (used) {
        return res.status(400).json({ error: '이미 사용된 링크입니다.' });
      }
      if (new Date(expires_at) < new Date()) {
        return res.status(400).json({ error: '만료된 링크입니다. 다시 요청해주세요.' });
      }

      const hashed = await bcrypt.hash(password, 12);

      await client.query('BEGIN');
      await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user_id]);
      await client.query('UPDATE password_resets SET used = TRUE WHERE token = $1', [token]);
      // 해당 유저의 다른 미사용 토큰도 만료 처리
      await client.query(
        'UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE',
        [user_id]
      );
      await client.query('COMMIT');

      res.json({ message: '비밀번호가 변경되었습니다.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('reset-password error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    } finally {
      client.release();
    }
  }
);

// 로그인 상태에서 비밀번호 변경
router.put(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('현재 비밀번호를 입력해주세요.'),
    body('newPassword').isLength({ min: 8 }).withMessage('새 비밀번호는 최소 8자 이상이어야 합니다.'),
  ],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }

      const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
      if (!valid) {
        return res.status(400).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ error: '새 비밀번호는 기존과 달라야 합니다.' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.userId]);

      res.json({ message: '비밀번호가 변경되었습니다.' });
    } catch (err) {
      console.error('change-password error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
);

module.exports = router;
