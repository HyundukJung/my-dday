# CHANGELOG — My D-day

날짜 형식: YYYY-MM-DD (배포 기준)

## [Phase 13] 2026-04-14 — 품질 개선

### Security
- 배포 DB에서 테스트 계정 전량 삭제 (`test@test.com`, `debug@test.com`, `newuser@test.com`)
- 로그인/회원가입에 엄격한 rate limit 적용 (15분당 10회)
  - 전역 rate limit은 100 → 300회로 완화 (일반 사용 방해 방지)

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
