# CHANGELOG — My D-day

날짜 형식: YYYY-MM-DD (배포 기준)

## [Phase 14] 2026-04-15 — 계정 관리 + 메모 + Google Calendar

### Features
- **비밀번호 찾기 (14-A):** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
  - 30분 유효 토큰, 1회용 (사용 시 해당 유저의 미사용 토큰 일괄 만료)
  - 보안상 존재하지 않는 이메일이어도 동일한 성공 응답
  - 프론트: `forgot-password.html`, `reset-password.html?token=xxx`
- **비밀번호 변경 (14-B):** `PUT /api/auth/password` (인증 필수)
  - 프론트: `account.html` (index.html 헤더에 "계정" 링크)
- **카드 메모 (14-C):** `ddays.memo` 컬럼 (TEXT, nullable, 1000자 제한)
  - form.html textarea + index.html 카드 내 메모 표시 (개행 유지)
- **Google Calendar 추가 (14-D):** OAuth 없이 `calendar.google.com/calendar/render` 링크 방식
  - 카드에 "📅 캘린더" 버튼 → all-day 이벤트 생성 페이지
  - 마일스톤은 각 마일스톤마다 📅 버튼 제공 (지난 건 제외)

### Infra
- `nodemailer` 추가 — SMTP 환경변수 미설정 시 콘솔 로그 fallback (개발/임시 운영)
- 마이그레이션 `003_memo_and_password_reset.sql`
  - `ddays.memo TEXT` 추가
  - `password_resets(token, user_id, expires_at, used)` 신설

### Security
- 비밀번호 찾기 별도 rate limit (1시간/5회) — 스팸/남용 방지
- 재설정 토큰 32바이트 random hex, 사용 즉시 일괄 만료

---

## [Governance] 2026-04-15 — 개발 정책 수립

### Docs
- `docs/DEV_POLICY.md` 신설 — 커밋 전 문서 동기화 필수화
- `CLAUDE.md` 신설 (프로젝트 루트) — AI 에이전트 개발 지침 자동 로드
- 정책 요지: 코드 변경 시 관련 문서(PRD/TRD/DEVPLAN/CHANGELOG/context) 동기화 필수
- 커밋 메시지 컨벤션 정립 (Phase/feat/fix/docs/security/refactor/chore/test/hotfix)

---

## [Phase 13] 2026-04-14 — 품질 개선

### Security
- 배포 DB에서 테스트 계정 전량 삭제 (`test@test.com`, `debug@test.com`, `newuser@test.com`)
- 로그인/회원가입에 엄격한 rate limit 적용 (15분당 10회)
  - 전역 rate limit은 100 → 300회로 완화 (일반 사용 방해 방지)
- `app.set('trust proxy', 1)` 설정 — Railway reverse proxy 뒤에서 per-IP rate limit 정상 동작

### Bug Fixes
- `PUT /api/ddays/:id` 에서 `dday_type`만 바꾸고 날짜 누락 시 통과하던 버그 수정
  - 공통 헬퍼 `validateTypeFields()` 도입, POST/PUT 동일 검증
- 프론트엔드 날짜 파싱이 브라우저 타임존에 따라 ±1일 밀리던 문제 수정
  - `parseDbDate(isoString)` 도입 → YYYY-MM-DD만 추출해 로컬 자정 Date 생성
  - `ddays.js`, `share.js` 전면 적용

### Validation
- `title` 100자 초과 시 400 응답 (DB 에러로 500 반환되던 것 개선)

### Docs
- `CHANGELOG.md` 신설
- `DEVPLAN.md` 에 Phase 11/12/13 항목 반영

---

## [Phase 12] 2026-04-14 — PWA 지원

### Features
- `manifest.json` 추가 (앱 이름, 테마 색상, 아이콘 3종)
- 아이콘 생성: 192/512/maskable/apple-touch (SVG → PNG via sharp)
- Service Worker (`sw.js`) — 정적 자원 cache-first, API는 캐시 제외
- 모든 HTML에 PWA 메타 태그 + iOS 전체화면 모드
- `api.js`에서 Service Worker 자동 등록 (localhost 제외)

### UX
- 예시 문구 "민지" → "철수"로 통일 (form.html placeholder, 문서)

---

## [Phase 11-A/B] 2026-04-14 — 마일스톤 기능

### DB
- `ddays` 테이블에 `start_date`, `dday_type` 컬럼 추가
- `dday_type`: `fixed`(기존) | `milestone`(신규)
- `milestones` 테이블 신설 (`dday_id`, `days`, `target_date`, `notified`, `gcal_event_id`)
- `target_date`를 nullable로 변경 (마일스톤 모드는 시작일만 사용)

### Backend
- 시작일 + N일 자동 계산 (UTC 기준, 프리셋: 100/200/300/365/500/1000)
- 커스텀 일수 배열 지원 (`milestone_days: [777, 1234]`)
- 생성/수정 시 트랜잭션 처리 (ROLLBACK 안전)
- 수정 시 기존 마일스톤 전체 삭제 후 재생성 (시작일 변경 대응)
- 목록 조회 시 `milestones` 배열 포함

### Frontend
- `form.html` — 유형 토글(일반/마일스톤), 프리셋 체크박스, 커스텀 입력
- `index.html` 카드 — 경과일, 다음 마일스톤, 전체 펼치기
- `form.js` — 수정 모드에서 기존 마일스톤 체크 상태 복원

---

## [Phase 9] 2026-03-22 — 배포

- GitHub 리포지토리 생성 + push (`HyundukJung/my-dday`)
- Railway에 백엔드 배포 (`my-dday-production.up.railway.app`)
  - 환경변수: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `FRONTEND_URL`
- Vercel에 프론트엔드 배포 (`my-dday.vercel.app`)
- CORS에 Vercel origin 추가
- `api.js`의 `BASE_URL`을 환경 분기 처리

---

## [Phase 1-8] 2026-03-20 — MVP 구현

### Backend
- Express 서버 + PostgreSQL 연결 풀
- JWT 기반 회원가입/로그인 (bcrypt cost 12)
- D-day CRUD (본인 소유만 수정/삭제)
- 공유 토큰 생성 + 비로그인 조회 API
- 미들웨어: helmet, cors, express-rate-limit, express-validator

### Frontend
- Vanilla HTML/CSS/JS (빌드 없음)
- 모바일 퍼스트 반응형
- 4가지 카테고리 필터
- 4가지 공유 테마 (생일/기념일/커플/시험)

---

## [Phase 0] 2026-03-19 — 초기 환경

- 폴더 구조 생성 (backend/src, frontend/css, frontend/js, docs)
- npm 패키지 설치: express, pg, bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, express-validator, dotenv
- `.gitignore`, `.env.example` 작성
- Railway PostgreSQL 프로비저닝
- git 초기화 + 첫 커밋
