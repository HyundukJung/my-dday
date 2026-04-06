const app = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB 연결 성공:', res.rows[0].now);
  } catch (err) {
    console.error('DB 연결 실패:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
