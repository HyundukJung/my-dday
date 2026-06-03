# CHANGELOG — My D-day

날짜 형식: YYYY-MM-DD (배포 기준)

## [Fix] 2026-06-03 — 서비스 워커 stale 캐시로 구버전 JS가 반환되던 문제

### 문제
- 마일스톤 D-day 편집 시 기존 마일스톤이 체크박스에 반영되지 않는 현상 신고
- 원인 분석: 라이브 배포본(`form.js`)과 DB/API는 정상 — **사용자 브라우저(특히 iOS PWA)가
  cache-first 전략으로 캐시된 구버전 `form.js`를 계속 사용**한 것이 원인 (코드 버그 아님)

### Fix
- `sw.js` 정적 자원(JS/CSS/이미지) 전략을 **cache-first → stale-while-revalidate** 로 변경
  - 캐시를 즉시 제공하되 백그라운드로 항상 새 버전을 받아 갱신 → JS/CSS 수정이 다음 방문에 자동 반영
- `CACHE_NAME` v7 → v8 (활성화 시 구버전 캐시 일괄 삭제)
- 사용자 조치: 새 SW 적용을 위해 앱 완전 종료 후 재실행(또는 강력 새로고침) 1회 필요

### Features
- **관리자 대시보드** (`admin.html`) — Chart.js 기반
  - KPI: 총 회원 / 총 카드 / 오늘 가입 / 오늘 접속
  - 차트: 14일 추이(라인), 카테고리 분포(도넛), 카드 유형(파이)
  - 회원 관리 테이블: 이메일/가입일/카드수/마지막 접속 + 관리자 권한 토글
- **관리자 권한 모델**
  - `users.is_admin` 컬럼, 첫 계정(MIN id) 자동 관리자
  - 관리자가 다른 회원에게 권한 부여/회수 (마지막 관리자는 회수 불가)
  - `account.html`에서 관리자에게만 진입 버튼 노출
- **접속 로그** (`login_logs`) — 로그인 시 기록(fire-and-forget), 접속량 통계용

### API (신규)
- `GET /api/auth/me` — 현재 사용자(`is_admin` 포함)
- `GET /api/admin/summary` / `GET /api/admin/users` / `PUT /api/admin/users/:id/role` / `GET /api/admin/analytics` (모두 관리자 전용)

### Security
- `middleware/admin.js` — 매 요청 DB에서 `is_admin` 확인 (JWT 클레임 미신뢰, 권한 변경 즉시 반영)
- 일반 사용자 admin API 접근 → 403, 마지막 관리자 권한 회수 → 400

### DB
- 마이그레이션 `004_admin.sql` (+ `000_full_schema.sql` 반영)
- `CACHE_NAME` v6 → v7, `admin.html` pre-cache 등록

### 검증
- 로컬(Neon 연결) 백엔드 E2E + 미리보기 브라우저 렌더링 확인 (KPI/차트/권한 토글/403/마지막 관리자 보호)

---

## [Infra] 2026-06-03 — 호스팅 이전: Railway → Render + Neon

### Changes
- Railway 무료 체험 만료로 백엔드+DB 다운 → 무료 스택으로 이전
  - 백엔드: **Render** (`https://my-dday-backend.onrender.com`)
  - DB: **Neon** Postgres (`000_full_schema.sql`로 스키마 초기화)
  - 프론트: Vercel 유지
- `frontend/js/api.js` — `BASE_URL`을 Railway → Render 주소로 교체
- `backend/src/app.js` — 전역 rate limiter에 `validate: { trustProxy: false }` 추가
  - Render 프록시 뒤(`trust proxy=true`)에서 뜨던 `ERR_ERL_PERMISSIVE_TRUST_PROXY` 경고 제거
- `CACHE_NAME` v5 → v6
- 검증: `/health` 200, `/api/ddays` 401, DB 연결/메일 설정 정상 (배포 로그 확인)

---

## [Fix] 2026-06-03 — 마일스톤 D-day 공유 시 날짜 깨짐 수정

### Bug Fixes
- 마일스톤 타입 D-day를 공유하면 공유 페이지에 "Invalid Date" / 잘못된 D값이 표시되던 버그 수정
  - 원인: 마일스톤 모드는 `target_date`가 NULL인데 [share.js](../backend/src/routes/share.js)가 `target_date`만 읽어 `days_diff`를 계산했음
  - 수정: 마일스톤이면 `start_date`를 기준 날짜로 사용 → `days_diff`가 음수가 되어 프론트에서 "D + 경과일"("N일째")로 자연스럽게 표시됨 (프론트 수정 불필요)
- ⚠️ 백엔드 재배포 후 실제 공유 링크로 E2E 검증 필요 (현재 프로덕션 다운 상태라 로컬 로직 검증만 완료)

---

## [Refactor] 2026-06-03 — 프론트 ddays.js 정리

### Changes
- 사용되지 않는 죽은 함수 `toGcalDate` 제거
- 마일스톤 경과일(`elapsed`) 중복 계산(카드 본문 + 캘린더 버튼에서 2회) → 1회 계산으로 통합
- `CACHE_NAME` v4 → v5 bump (변경된 JS 즉시 반영)

---

## [Chore] 2026-06-03 — 비밀번호 재설정 메일 발송(SMTP) 활성화 준비

### Changes
- `backend/.env.example` — Gmail 앱 비밀번호 발급 안내 및 **From 주소 강제 규칙** 주석 보강
  - Gmail은 From 주소를 인증 계정(SMTP_USER)으로 강제하므로 `SMTP_FROM` 주소는 Gmail 주소와 동일해야 함
- `backend/src/server.js` — 기동 검증 강화
  - `checkMailConfig`: `SMTP_*` 미설정 시 메일이 콘솔 fallback으로만 동작함을 경고
  - `checkRequiredEnv`: `JWT_SECRET`/`DATABASE_URL` 누락 시 기동 즉시 중단 (인증 토큰이 런타임에 조용히 깨지는 사고 방지)
- `backend/src/migrations/000_full_schema.sql` 신규 — 001+002+003을 합친 통합 스키마. 신규 DB(Neon 등) 초기화 시 한 번에 실행용

### 운영 적용 (코드 외 — 직접 설정)
- 메일 발송 수단: Gmail SMTP + 앱 비밀번호 (2단계 인증 필요). 로컬 `.env`에서 실제 발송 검증 완료 ✅
- 호스팅 이전 예정: Railway 체험 만료로 백엔드+DB 다운 → **Neon(DB) + Render(백엔드)** 무료 스택으로 이전 (진행 중)

---

## [UX] 2026-04-16 — 날짜 표시에 요일 추가

### Changes
- D-day 카드/공유 페이지의 날짜 옆에 **요일 약식** 표시 (예: `2026년 5월 15일 금`)
- 영향 파일: `frontend/js/ddays.js`, `frontend/js/share.js`
- `CACHE_NAME` v2 → v3 bump — 캐시된 JS 즉시 교체

---

## [Hotfix] 2026-04-16 — Service Worker 캐시 전략 수정

### Bug Fixes
- `sw.js` HTML 요청을 **network-first** 로 변경 (기존은 cache-first)
  - Phase 14 배포 후에도 구버전 `index.html`이 캐시에서 반환되던 문제 해결
- `CACHE_NAME` `v1` → `v2` bump — 활성화 시 옛 캐시 자동 삭제
- Phase 14 신규 HTML(`account.html`, `forgot-password.html`, `reset-password.html`)을 pre-cache 목록에 추가

### 영향
- API 요청은 기존처럼 SW 간섭 없음 (교차 출처)
- 기타 정적 자원(CSS/JS/이미지)은 기존처럼 cache-first 유지 (속도 이점)

---

## [Hotfix] 2026-04-16 — rate limiter 경고 억제

### Chore
- `authLimiter` / `forgotLimiter` 에 `validate: { trustProxy: false }` 추가
  - Railway `trust proxy=true` 환경에서 뜨던 `ERR_ERL_PERMISSIVE_TRUST_PROXY` 경고 제거
  - 동작 변화 없음 (trust proxy 설정은 그대로 의도된 구성)

---

## [Hotfix] 2026-04-16 — iOS PWA date input 오버플로우 수정

### Bug Fixes
- iOS PWA 전체화면 모드에서 `input[type="date"]` 필드가 우측으로 밀리는 문제 수정
- date input에 `display:block`, `box-sizing:border-box`, `overflow:hidden` 적용
- SW 캐시 v3 → v4 (CSS 변경 즉시 반영)

---

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
