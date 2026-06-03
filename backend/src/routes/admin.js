const express = require('express');
const { body } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validate');

const router = express.Router();

// 모든 관리자 라우트: 인증 + 관리자 권한 필수
router.use(auth, admin);

// GET /api/admin/summary — 상단 KPI
router.get('/summary', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM ddays) AS total_ddays,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) AS today_signups,
        (SELECT COUNT(*) FROM login_logs WHERE created_at >= CURRENT_DATE) AS today_logins,
        (SELECT COUNT(*) FROM users WHERE is_admin) AS total_admins
    `);
    res.json({ data: q.rows[0] });
  } catch (err) {
    console.error('admin summary error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/admin/users — 회원 목록 (카드수, 마지막 접속 포함)
router.get('/users', async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT u.id, u.email, u.is_admin, u.created_at,
             COUNT(d.id) AS dday_count,
             (SELECT MAX(created_at) FROM login_logs WHERE user_id = u.id) AS last_login
      FROM users u
      LEFT JOIN ddays d ON d.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id
    `);
    res.json({ data: q.rows });
  } catch (err) {
    console.error('admin users error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/admin/users/:id/role — 관리자 권한 부여/회수
router.put(
  '/users/:id/role',
  [body('is_admin').isBoolean().withMessage('is_admin은 true/false여야 합니다.')],
  validate,
  async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const { is_admin } = req.body;

      // 권한 회수 시 안전장치: 마지막 관리자는 회수 불가 (최소 1명 보장)
      if (is_admin === false) {
        const target = await pool.query('SELECT is_admin FROM users WHERE id = $1', [targetId]);
        if (target.rows.length === 0) {
          return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        if (target.rows[0].is_admin) {
          const adminCount = await pool.query('SELECT COUNT(*) AS c FROM users WHERE is_admin = TRUE');
          if (Number(adminCount.rows[0].c) <= 1) {
            return res.status(400).json({ error: '마지막 관리자는 권한을 회수할 수 없습니다.' });
          }
        }
      }

      const result = await pool.query(
        'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, email, is_admin',
        [is_admin, targetId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
      res.json({ data: result.rows[0] });
    } catch (err) {
      console.error('admin role error:', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
);

// GET /api/admin/analytics — 시계열 + 분포 (대시보드 차트용)
router.get('/analytics', async (req, res) => {
  try {
    const dailyQuery = (table) => pool.query(`
      SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM ${table}
      WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY day ORDER BY day
    `);

    const [signups, logins, ddaysByDay, byCategory, byType] = await Promise.all([
      dailyQuery('users'),
      dailyQuery('login_logs'),
      dailyQuery('ddays'),
      pool.query("SELECT category, COUNT(*)::int AS count FROM ddays GROUP BY category ORDER BY count DESC"),
      pool.query("SELECT dday_type, COUNT(*)::int AS count FROM ddays GROUP BY dday_type"),
    ]);

    res.json({
      data: {
        signups: signups.rows,
        logins: logins.rows,
        ddays_by_day: ddaysByDay.rows,
        by_category: byCategory.rows,
        by_type: byType.rows,
      },
    });
  } catch (err) {
    console.error('admin analytics error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
