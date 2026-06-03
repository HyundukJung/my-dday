-- ============================================================
-- My D-day — 전체 스키마 (신규 DB 초기화용 통합 파일)
-- 001 + 002 + 003 마이그레이션을 하나로 합친 것.
-- 새 DB(예: Neon)의 SQL 에디터에 통째로 붙여넣어 실행하면 됨.
-- 모두 IF NOT EXISTS 기반 → 여러 번 실행해도 안전(idempotent).
-- ============================================================

-- users 테이블
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  is_admin   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ddays 테이블 (fixed + milestone 모드 + 메모 포함)
CREATE TABLE IF NOT EXISTS ddays (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  category    VARCHAR(50) NOT NULL,
  target_date DATE,                              -- milestone 모드는 NULL 가능
  start_date  DATE,                              -- milestone 모드 시작일
  dday_type   VARCHAR(20) DEFAULT 'fixed',       -- 'fixed' | 'milestone'
  is_public   BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(21) UNIQUE,
  share_theme VARCHAR(50),
  memo        TEXT,
  created_tz  VARCHAR(64),                     -- 등록 시점 타임존 (Phase 16)
  display_tz  VARCHAR(64),                     -- 사용자가 선택한 세계시 (Phase 16)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- milestones 테이블
CREATE TABLE IF NOT EXISTS milestones (
  id            SERIAL PRIMARY KEY,
  dday_id       INTEGER REFERENCES ddays(id) ON DELETE CASCADE,
  days          INTEGER NOT NULL,
  target_date   DATE NOT NULL,
  notified      BOOLEAN DEFAULT FALSE,
  gcal_event_id VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dday_id, days)
);

CREATE INDEX IF NOT EXISTS idx_milestones_dday_id ON milestones(dday_id);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);

-- password_resets — 비밀번호 재설정 토큰
CREATE TABLE IF NOT EXISTS password_resets (
  token       VARCHAR(64) PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- login_logs — 접속(로그인) 로그 (접속량 통계용, Phase 15)
CREATE TABLE IF NOT EXISTS login_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
