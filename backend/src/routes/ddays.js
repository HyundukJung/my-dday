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
const DEFAULT_MILESTONE_DAYS = [100, 200, 300, 365, 500, 1000];

// 시작일 + N일 → 날짜 계산 (UTC 기준, 시작일 당일 = 1일째)
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 마일스톤 일괄 삽입
async function insertMilestones(client, ddayId, startDate, daysList) {
  if (!daysList || daysList.length === 0) return;
  const values = [];
  const params = [];
  daysList.forEach((days, i) => {
    const idx = i * 3;
    values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3})`);
    params.push(ddayId, days, addDays(startDate, days));
  });
  await client.query(
    `INSERT INTO milestones (dday_id, days, target_date) VALUES ${values.join(', ')} ON CONFLICT (dday_id, days) DO NOTHING`,
    params
  );
}

const ddayValidation = [
  body('title').trim().notEmpty().withMessage('제목을 입력해주세요.').isLength({ max: 100 }).withMessage('제목은 100자 이하여야 합니다.'),
  body('category').isIn(CATEGORIES).withMessage('카테고리는 birthday, anniversary, couple, exam 중 하나여야 합니다.'),
  body('dday_type').optional().isIn(['fixed', 'milestone']).withMessage('dday_type은 fixed 또는 milestone이어야 합니다.'),
  body('target_date').optional({ nullable: true }).isDate().withMessage('올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)'),
  body('start_date').optional({ nullable: true }).isDate().withMessage('올바른 시작일 형식이 아닙니다. (YYYY-MM-DD)'),
  body('milestone_days').optional().isArray().withMessage('milestone_days는 배열이어야 합니다.'),
  body('memo').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('메모는 1000자 이하여야 합니다.'),
];

// 타입별 필수 필드 검증 (POST/PUT 공통)
function validateTypeFields(body) {
  const type = body.dday_type || 'fixed';
  if (type === 'milestone') {
    if (!body.start_date) {
      return '시작일(start_date)을 입력해주세요.';
    }
  } else {
    if (!body.target_date) {
      return '목표 날짜(target_date)를 입력해주세요.';
    }
  }
  return null;
}

// GET /api/ddays — 목록 조회 (마일스톤 포함)
router.get('/', async (req, res) => {
  try {
    const ddaysResult = await pool.query(
      `SELECT * FROM ddays WHERE user_id = $1
       ORDER BY COALESCE(target_date, start_date) ASC`,
      [req.user.userId]
    );
    const ddays = ddaysResult.rows;

    if (ddays.length === 0) return res.json({ data: [] });

    const milestonesResult = await pool.query(
      `SELECT * FROM milestones
       WHERE dday_id = ANY($1::int[])
       ORDER BY days ASC`,
      [ddays.map(d => d.id)]
    );

    const milestonesByDday = {};
    for (const m of milestonesResult.rows) {
      (milestonesByDday[m.dday_id] = milestonesByDday[m.dday_id] || []).push(m);
    }

    const data = ddays.map(d => ({ ...d, milestones: milestonesByDday[d.id] || [] }));
    res.json({ data });
  } catch (err) {
    console.error('ddays list error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/ddays — 추가 (fixed 또는 milestone)
router.post('/', ddayValidation, validate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, category, dday_type = 'fixed', target_date, start_date, milestone_days, memo } = req.body;

    const typeError = validateTypeFields(req.body);
    if (typeError) return res.status(400).json({ error: typeError });

    await client.query('BEGIN');

    const ddayResult = await client.query(
      `INSERT INTO ddays (user_id, title, category, target_date, start_date, dday_type, memo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.userId,
        title,
        category,
        dday_type === 'milestone' ? null : target_date,
        dday_type === 'milestone' ? start_date : null,
        dday_type,
        memo || null,
      ]
    );
    const dday = ddayResult.rows[0];

    if (dday_type === 'milestone') {
      const days = (milestone_days && milestone_days.length > 0) ? milestone_days : DEFAULT_MILESTONE_DAYS;
      await insertMilestones(client, dday.id, start_date, days);
    }

    await client.query('COMMIT');

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE dday_id = $1 ORDER BY days ASC',
      [dday.id]
    );
    res.status(201).json({ data: { ...dday, milestones: milestonesResult.rows } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ddays create error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// PUT /api/ddays/:id — 수정
router.put('/:id', ddayValidation, validate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, category, dday_type = 'fixed', target_date, start_date, milestone_days, memo } = req.body;

    const typeError = validateTypeFields(req.body);
    if (typeError) return res.status(400).json({ error: typeError });

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE ddays
       SET title = $1, category = $2, target_date = $3, start_date = $4, dday_type = $5, memo = $6
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        title,
        category,
        dday_type === 'milestone' ? null : target_date,
        dday_type === 'milestone' ? start_date : null,
        dday_type,
        memo || null,
        req.params.id,
        req.user.userId,
      ]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '해당 D-day를 찾을 수 없습니다.' });
    }

    if (dday_type === 'milestone') {
      // 기존 마일스톤 모두 삭제 후 재생성 (시작일 변경 시 날짜 재계산)
      await client.query('DELETE FROM milestones WHERE dday_id = $1', [req.params.id]);
      const days = (milestone_days && milestone_days.length > 0) ? milestone_days : DEFAULT_MILESTONE_DAYS;
      await insertMilestones(client, req.params.id, start_date, days);
    }

    await client.query('COMMIT');

    const milestonesResult = await pool.query(
      'SELECT * FROM milestones WHERE dday_id = $1 ORDER BY days ASC',
      [req.params.id]
    );
    res.json({ data: { ...result.rows[0], milestones: milestonesResult.rows } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ddays update error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
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
