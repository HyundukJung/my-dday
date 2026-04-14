-- ddays에 마일스톤 모드 지원 컬럼 추가
ALTER TABLE ddays
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS dday_type VARCHAR(20) DEFAULT 'fixed';
  -- dday_type: 'fixed' (고정 미래 날짜) | 'milestone' (시작일 + N일째)

-- 마일스톤 모드는 target_date가 null일 수 있음
ALTER TABLE ddays ALTER COLUMN target_date DROP NOT NULL;

-- milestones 테이블
CREATE TABLE IF NOT EXISTS milestones (
  id            SERIAL PRIMARY KEY,
  dday_id       INTEGER REFERENCES ddays(id) ON DELETE CASCADE,
  days          INTEGER NOT NULL,             -- 100, 200, 365 등
  target_date   DATE NOT NULL,                -- 시작일 + days
  notified      BOOLEAN DEFAULT FALSE,
  gcal_event_id VARCHAR(255),                 -- Google Calendar 이벤트 ID (Phase 11-C)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dday_id, days)
);

CREATE INDEX IF NOT EXISTS idx_milestones_dday_id ON milestones(dday_id);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);
