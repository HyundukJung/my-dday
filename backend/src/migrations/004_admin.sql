-- Phase 15 — 관리자 권한 + 접속 로그

-- 1) users.is_admin — 관리자 여부
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 첫 계정(가장 작은 id)을 관리자로 지정 (아직 관리자가 한 명도 없을 때만)
UPDATE users SET is_admin = TRUE
WHERE id = (SELECT MIN(id) FROM users)
  AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE);

-- 2) login_logs — 접속(로그인) 로그 (접속량 통계용)
CREATE TABLE IF NOT EXISTS login_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
