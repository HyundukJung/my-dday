-- Phase 14 — 메모 컬럼 + 비밀번호 재설정 테이블

-- 1) ddays.memo (nullable, 1000자 제한은 앱 레벨에서 처리)
ALTER TABLE ddays ADD COLUMN IF NOT EXISTS memo TEXT;

-- 2) password_resets — 비밀번호 재설정 토큰
CREATE TABLE IF NOT EXISTS password_resets (
  token       VARCHAR(64) PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
