const pool = require('../db');

// auth 미들웨어 이후에 사용한다 (req.user 필요).
// JWT 클레임을 믿지 않고 매 요청 DB에서 is_admin을 확인한다
// → 권한 변경이 즉시 반영되고, 토큰 위조로 우회할 수 없다.
async function admin(req, res, next) {
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  } catch (err) {
    console.error('admin middleware error:', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

module.exports = admin;
