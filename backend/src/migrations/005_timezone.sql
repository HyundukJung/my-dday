-- Phase 16 — 카드 타임존(기준 시점) 표시

-- created_tz: 카드를 만든 시점의 브라우저 타임존(IANA, 예 'Asia/Seoul') — 등록 국가/시간 기준
-- display_tz: 사용자가 추가로 보고 싶은 세계시(IANA), nullable
ALTER TABLE ddays ADD COLUMN IF NOT EXISTS created_tz VARCHAR(64);
ALTER TABLE ddays ADD COLUMN IF NOT EXISTS display_tz VARCHAR(64);
