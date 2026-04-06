const express = require('express');
const { body } = require('express-validator');
const crypto = require('crypto');
const pool = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// 모든 라우트에 인증 필수
router.use(auth);

const CATEGORIES = ['birthday', 'anniversary', 'couple', 'exam'];

const ddayValidation = [
  body('title').trim().notEmpty().withMessage('제목을 입력해주세요.'),
  body('category').isIn(CATEGORIES).withMessage('카테고리는 birthday, anniversary, couple, exam 중 하나여야 합니다.'),
  body('target_date').isDate().withMessage('올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)'),
];

// GET /api/ddays — 목록 조회
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ddays WHERE user_id = $1 ORDER BY target_date ASC',
      [req.user.userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('ddays list error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/ddays — 추가
router.post('/', ddayValidation, validate, async (req, res) => {
  try {
    const { title, category, target_date } = req.body;
    const result = await pool.query(
      'INSERT INTO ddays (user_id, title, category, target_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, title, category, target_date]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('ddays create error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/ddays/:id — 수정
router.put('/:id', ddayValidation, validate, async (req, res) => {
  try {
    const { title, category, target_date } = req.body;
    const result = await pool.query(
      'UPDATE ddays SET title = $1, category = $2, target_date = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [title, category, target_date, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '해당 D-day를 찾을 수 없습니다.' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('ddays update error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/ddays/:id — 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ddays WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '해당 D-day를 찾을 수 없습니다.' });
    }
    res.json({ message: 'ok' });
  } catch (err) {
    console.error('ddays delete error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/ddays/:id/share — 공유 링크 생성
router.post('/:id/share', async (req, res) => {
  try {
    const { share_theme } = req.body;
    const token = crypto.randomBytes(12).toString('base64url');

    const result = await pool.query(
      'UPDATE ddays SET is_public = true, share_token = $1, share_theme = $2 WHERE id = $3 AND user_id = $4 RETURNING share_token',
      [token, share_theme || 'birthday', req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '해당 D-day를 찾을 수 없습니다.' });
    }

    const shareUrl = `${process.env.FRONTEND_URL}/share.html?token=${token}`;
    res.json({ data: { share_token: token, share_url: shareUrl } });
  } catch (err) {
    console.error('share create error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/ddays/:id/share — 공유 해제
router.delete('/:id/share', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE ddays SET is_public = false, share_token = NULL, share_theme = NULL WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '해당 D-day를 찾을 수 없습니다.' });
    }

    res.json({ message: 'ok' });
  } catch (err) {
    console.error('share delete error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
