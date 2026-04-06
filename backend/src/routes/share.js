const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/share/:token — 공유 링크 조회 (로그인 불필요)
router.get('/:token', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT title, target_date, category, share_theme FROM ddays WHERE share_token = $1 AND is_public = true',
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 공유 링크입니다.' });
    }

    const dday = result.rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dday.target_date);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const days_diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    res.json({
      data: {
        title: dday.title,
        target_date: dday.target_date,
        category: dday.category,
        share_theme: dday.share_theme,
        days_diff,
      },
    });
  } catch (err) {
    console.error('share get error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
