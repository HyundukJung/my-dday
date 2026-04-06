const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// 회원가입
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.'),
    body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다.'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // 중복 이메일 확인
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
      }

      // 비밀번호 해시
      const hashed = await bcrypt.hash(password, 12);

      // 사용자 생성
      const result = await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
        [email, hashed]
      );
      const user = result.rows[0];

      // JWT 생성
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

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
  [
    body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.'),
    body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // 사용자 조회
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }

      const user = result.rows[0];

      // 비밀번호 검증
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
      }

      // JWT 생성
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({ data: { token, user: { id: user.id, email: user.email } } });
    } catch (err) {
      console.error('login error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
);

module.exports = router;
