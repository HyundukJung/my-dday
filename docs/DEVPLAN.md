# DEVPLAN — My D-day
> Claude가 이 파일을 읽고 단계별로 자율 개발하는 가이드입니다.
> 각 Phase 완료 후 ✅ 표시하고 다음 Phase로 이동합니다.

---

## 개발 원칙

- **보안 우선:** helmet, bcrypt, input validation, rate-limit 기본 적용
- **단순함 유지:** 과도한 추상화 없이 기능 중심으로 작성
- **모바일 퍼스트:** CSS는 모바일 기준으로 작성 후 데스크톱 확장
- **검증 주도:** 각 Phase 완료 시 검증 항목 모두 통과 후 다음 Phase 진행
- **환경 분리:** `.env`로 모든 비밀값 관리, 코드에 하드코딩 금지

---

## 폴더 구조 (최종 목표)

```
my-dday/
├── backend/
│   ├── src/
│   │   ├── app.js             ← Express 앱 설정 (미들웨어 등록)
│   │   ├── server.js          ← 서버 실행 진입점
│   │   ├── db.js              ← PostgreSQL 연결 풀
│   │   ├── middleware/
│   │   │   ├── auth.js        ← JWT 검증 미들웨어
│   │   │   └── validate.js    ← 입력값 검증 미들웨어
│   │   ├── routes/
│   │   │   ├── auth.js        ← /api/auth/*
│   │   │   ├── ddays.js       ← /api/ddays/*
│   │   │   └── share.js       ← /api/share/*
│   │   └── migrations/
│   │       └── 001_init.sql   ← 테이블 생성 SQL
│   ├── .env                   ← 로컬 환경변수 (git 제외)
│   ├── .env.example           ← 환경변수 템플릿 (git 포함)
│   └── package.json
│
├── frontend/
│   ├── index.html             ← D-day 목록 (로그인 후 메인)
│   ├── login.html             ← 로그인
│   ├── signup.html            ← 회원가입
│   ├── form.html              ← D-day 추가/수정
│   ├── share.html             ← 공유 수신자 페이지
│   ├── css/
│   │   ├── reset.css          ← 브라우저 기본 스타일 초기화
│   │   ├── main.css           ← 공통 스타일 + CSS 변수
│   │   └── themes.css         ← 공유 테마 4종
│   └── js/
│       ├── api.js             ← fetch 래퍼 (Authorization 헤더 자동 첨부)
│       ├── auth.js            ← 로그인/회원가입 로직
│       ├── ddays.js           ← D-day 목록/CRUD 로직
│       ├── form.js            ← D-day 추가/수정 폼 로직
│       └── share.js           ← 공유 페이지 로직
│
└── docs/
    ├── PRD.md
    ├── TRD.md
    ├── context.md
    └── DEVPLAN.md             ← 이 파일
```

---

## Phase 0 — 프로젝트 초기화 [✅]

### 작업
- [x] `backend/`, `frontend/`, `docs/` 폴더 생성
- [x] `backend/package.json` 초기화 (`npm init -y`)
- [x] `.gitignore` 작성 (node_modules, .env, .DS_Store)
- [x] `backend/.env.example` 작성
- [x] git 초기화 + 첫 커밋

### 설치할 패키지 (backend)
```bash
# 프로덕션 의존성
npm install express pg bcrypt jsonwebtoken helmet cors express-rate-limit nanoid dotenv express-validator

# 개발 의존성
npm install -D nodemon
```

### 패키지 역할
| 패키지 | 역할 |
|--------|------|
| express | 웹 프레임워크 |
| pg | PostgreSQL 클라이언트 |
| bcrypt | 비밀번호 해시 |
| jsonwebtoken | JWT 생성/검증 |
| helmet | HTTP 보안 헤더 자동 설정 |
| cors | CORS 설정 |
| express-rate-limit | API 요청 제한 (브루트포스 방지) |
| nanoid | 공유 토큰 생성 (짧고 고유한 ID) |
| dotenv | .env 파일 로드 |
| express-validator | 요청 바디 입력값 검증 |
| nodemon | 개발 중 자동 재시작 |

### .env.example 내용
```
DATABASE_URL=postgresql://user:password@localhost:5432/mydday
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:5500
```

### 검증
- [x] `node -e "console.log('ok')"` 정상 실행
- [x] 폴더 구조 생성 확인
- [x] `.gitignore`에 `.env` 포함 확인

---

## Phase 1 — 백엔드 서버 + DB 연결 [✅]

### 작업
- [x] `backend/src/db.js` — PostgreSQL 연결 풀 설정
- [x] `backend/src/app.js` — Express 앱 + 미들웨어 등록
- [x] `backend/src/server.js` — 포트 리슨
- [x] `backend/src/migrations/001_init.sql` — 테이블 생성
- [x] DB 마이그레이션 실행 (psql 또는 Node 스크립트)

### DB 스키마 상세
```sql
-- users 테이블
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,        -- bcrypt 해시
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ddays 테이블
CREATE TABLE ddays (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  category    VARCHAR(50) NOT NULL,         -- birthday/anniversary/couple/exam
  target_date DATE NOT NULL,
  is_public   BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(21) UNIQUE,           -- nanoid (공개 시 생성)
  share_theme VARCHAR(50),                  -- birthday/anniversary/couple/exam
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### app.js 미들웨어 등록 순서
```
helmet()               ← 보안 헤더
cors()                 ← CORS 허용
express.json()         ← JSON 파싱
rateLimiter()          ← 요청 제한 (15분당 100회)
router 등록
에러 핸들러
```

### 에러 응답 포맷 (통일)
```json
{ "error": "메시지" }
{ "error": "메시지", "details": [...] }
```

### 성공 응답 포맷 (통일)
```json
{ "data": {...} }
{ "data": [...] }
{ "message": "ok" }
```

### 검증
- [x] `npm run dev` 실행 시 `Server running on port 3000` 출력
- [x] `curl http://localhost:3000/health` → `{ "status": "ok" }` 응답
- [x] DB 연결 성공 로그 확인 (`db.js`에서 `pool.connect()` 테스트)

---

## Phase 2 — 인증 API (회원가입 / 로그인) [✅]

### 작업
- [x] `backend/src/middleware/auth.js` — JWT 검증 미들웨어
- [x] `backend/src/middleware/validate.js` — 에러 응답 헬퍼
- [x] `backend/src/routes/auth.js` — 회원가입 + 로그인 라우터
- [x] `app.js`에 `/api/auth` 라우터 등록

### API 스펙

#### POST /api/auth/signup
```
Request:  { "email": "user@example.com", "password": "password123" }
Response: { "data": { "token": "jwt...", "user": { "id": 1, "email": "..." } } }
Error:    400 이메일 형식 오류 | 409 이미 가입된 이메일
```
- 비밀번호 최소 8자 검증 (express-validator)
- bcrypt.hash(password, 12) 로 저장

#### POST /api/auth/login
```
Request:  { "email": "user@example.com", "password": "password123" }
Response: { "data": { "token": "jwt...", "user": { "id": 1, "email": "..." } } }
Error:    400 입력값 오류 | 401 이메일/비밀번호 불일치
```
- bcrypt.compare 로 검증
- JWT payload: { userId, email }

### 검증 (curl)
```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → 201 + token 반환

# 중복 가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → 409 에러

# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → 200 + token 반환

# 틀린 비밀번호
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# → 401 에러
```

---

## Phase 3 — D-day CRUD API [✅]

### 작업
- [x] `backend/src/routes/ddays.js` — CRUD 라우터
- [x] 모든 라우트에 `auth` 미들웨어 적용 (JWT 필수)
- [x] `app.js`에 `/api/ddays` 라우터 등록

### API 스펙

#### GET /api/ddays
```
Header:   Authorization: Bearer <token>
Response: { "data": [ { dday 목록 } ] }
```
- 본인 D-day만 반환 (user_id 필터)
- 정렬: target_date ASC

#### POST /api/ddays
```
Request:  { "title": "수능", "category": "exam", "target_date": "2025-11-13" }
Response: { "data": { 생성된 dday } }
```
- 검증: title 필수, category 4가지 중 하나, target_date 날짜 형식

#### PUT /api/ddays/:id
```
Request:  { "title": "...", "category": "...", "target_date": "..." }
Response: { "data": { 수정된 dday } }
```
- 본인 소유 확인 후 수정 (user_id 체크)

#### DELETE /api/ddays/:id
```
Response: { "message": "ok" }
```
- 본인 소유 확인 후 삭제

### 검증 (curl)
```bash
TOKEN="여기에_로그인_토큰"

# 목록 조회
curl http://localhost:3000/api/ddays \
  -H "Authorization: Bearer $TOKEN"
# → 200 + 배열

# 추가
curl -X POST http://localhost:3000/api/ddays \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"수능","category":"exam","target_date":"2025-11-13"}'
# → 201 + 생성된 데이터

# 수정
curl -X PUT http://localhost:3000/api/ddays/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"수능 D-day","category":"exam","target_date":"2025-11-13"}'
# → 200

# 삭제
curl -X DELETE http://localhost:3000/api/ddays/1 \
  -H "Authorization: Bearer $TOKEN"
# → 200

# 인증 없이 접근
curl http://localhost:3000/api/ddays
# → 401
```

---

## Phase 4 — 공유 API [✅]

### 작업
- [x] `backend/src/routes/share.js` — 공유 라우터
- [x] `ddays.js` 라우트에 공유 토큰 생성 엔드포인트 추가
- [x] `app.js`에 `/api/share` 라우터 등록

### API 스펙

#### POST /api/ddays/:id/share (로그인 필요)
```
Request:  { "share_theme": "birthday" }
Response: { "data": { "share_token": "abc123xyz", "share_url": "https://..." } }
```
- nanoid(21)로 share_token 생성
- is_public = true, share_theme 저장

#### DELETE /api/ddays/:id/share (로그인 필요)
```
Response: { "message": "ok" }
```
- is_public = false, share_token = null

#### GET /api/share/:token (로그인 불필요)
```
Response: {
  "data": {
    "title": "철수의 생일",
    "target_date": "2025-03-20",
    "category": "birthday",
    "share_theme": "birthday",
    "days_diff": 14      ← 양수=남은날, 음수=지난날, 0=오늘
  }
}
```
- share_token으로 dday 조회
- is_public = false면 404

### 검증
```bash
# 공유 링크 생성
curl -X POST http://localhost:3000/api/ddays/1/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"share_theme":"birthday"}'
# → share_token 반환

# 공유 링크 조회 (토큰 필요 없음)
curl http://localhost:3000/api/share/abc123xyz
# → D-day 정보 + days_diff 반환
```

---

## Phase 5 — 프론트엔드 기반 설정 [✅]

### 작업
- [x] `frontend/css/reset.css` — 브라우저 기본 초기화
- [x] `frontend/css/main.css` — CSS 변수 + 공통 스타일
- [x] `frontend/js/api.js` — fetch 래퍼 유틸리티

### CSS 변수 정의 (main.css)
```css
:root {
  --color-primary: #5B6EE1;
  --color-bg: #F8F9FA;
  --color-surface: #FFFFFF;
  --color-text: #1A1A2E;
  --color-text-muted: #6B7280;
  --color-danger: #EF4444;
  --radius: 12px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
  --font: 'Pretendard', -apple-system, sans-serif;
}
```

### api.js 구조
```javascript
const BASE_URL = 'http://localhost:3000';

// 로컬스토리지에서 토큰 가져오기
function getToken() { ... }
function setToken(token) { ... }
function removeToken() { ... }
function isLoggedIn() { ... }
function requireAuth() { ... }  // 미로그인 시 login.html로 리다이렉트

// fetch 래퍼 — Authorization 헤더 자동 첨부
async function request(method, path, body) { ... }

export const api = {
  auth: { signup, login },
  ddays: { list, create, update, remove, createShare, removeShare },
  share: { get }
};
```

### 검증
- [ ] `frontend/css/main.css` 브라우저에서 정상 로드 확인
- [ ] `api.js`에서 `import { api } from './api.js'` 가능한지 확인 (ES Module)

---

## Phase 6 — 인증 UI (로그인 / 회원가입) [✅]

### 작업
- [x] `frontend/login.html`
- [x] `frontend/signup.html`
- [x] `frontend/js/auth.js`

### 화면 흐름
```
접속
  ↓
로그인 여부 확인 (localStorage)
  ├─ 로그인됨 → index.html 리다이렉트
  └─ 미로그인 → login.html 표시

로그인 성공
  → JWT를 localStorage에 저장
  → index.html로 이동

회원가입 성공
  → 자동 로그인 처리
  → index.html로 이동
```

### UI 컴포넌트
- 이메일 + 비밀번호 입력
- 에러 메시지 인라인 표시 (API 에러, 클라이언트 검증)
- 로딩 상태 (버튼 비활성화)

### 검증
- [ ] 로그인 화면 렌더링
- [ ] 회원가입 → 자동 로그인 → 메인 이동
- [ ] 잘못된 비밀번호 → 에러 메시지 표시
- [ ] 미로그인 상태에서 index.html 접근 → login.html 리다이렉트

---

## Phase 7 — D-day 목록 + CRUD UI [✅]

### 작업
- [x] `frontend/index.html` — 메인 목록 화면
- [x] `frontend/form.html` — 추가/수정 폼
- [x] `frontend/js/ddays.js`
- [x] `frontend/js/form.js`

### 목록 화면 구성
```
┌─────────────────────┐
│  My D-day     [+ 추가]│
├─────────────────────┤
│ [카테고리 필터 탭]     │
│  전체 / 생일 / 기념일... │
├─────────────────────┤
│ ┌───────────────┐  │
│ │ 🎂 철수 생일   │  │
│ │  D - 14       │  │
│ │  2025.03.20   │  │
│ │  [수정] [공유] [삭제]│ │
│ └───────────────┘  │
│ ...                 │
└─────────────────────┘
```

### D-day 카드 표시 규칙
- 오늘: `🎉 D-DAY` (강조)
- 남은 날: `D - 14` (파란색)
- 지난 날: `D + 3` (회색, 흐리게)

### 폼 화면 구성
- 제목 입력
- 카테고리 선택 (select 또는 버튼 그룹)
- 날짜 선택 (input type="date")
- 저장 / 취소

### 검증
- [ ] 로그인 후 목록 정상 렌더링
- [ ] D-day 추가 → 목록에 즉시 반영
- [ ] 수정 → form.html?id=1 로 이동 후 수정 저장
- [ ] 삭제 → 확인 후 목록에서 제거
- [ ] 카테고리 필터 탭 동작

---

## Phase 8 — 공유 기능 UI [✅]

### 작업
- [x] `frontend/share.html` — 공유 수신자 페이지
- [x] `frontend/js/share.js`
- [x] `frontend/css/themes.css` — 4가지 테마

### 공유 링크 생성 흐름 (index.html 내)
```
[공유] 버튼 클릭
  ↓
테마 선택 모달
  ↓
API 호출 → share_token 반환
  ↓
링크 클립보드 복사 + 완료 메시지
```

### share.html 구성
```
URL: /share.html?token=abc123xyz

┌─────────────────────┐
│  [테마 배경/이미지]   │
│                     │
│    철수의 생일        │
│                     │
│       D - 14        │
│   2025년 3월 20일   │
│                     │
│ "14일 후에 생일이에요" │
└─────────────────────┘
```

### 테마 CSS 구성 (themes.css)
```
.theme-birthday   → 분홍/노랑 파스텔, 🎂 이모지 배경
.theme-anniversary → 빨강/분홍, 💕 하트 애니메이션
.theme-couple     → 피치/코랄, 💑 따뜻한 톤
.theme-exam       → 네이비/흰색, 📚 깔끔한 라인
```

### 검증
- [ ] 공유 링크 생성 + 클립보드 복사
- [ ] 새 시크릿 탭에서 share.html?token=... 접근 (로그인 없이)
- [ ] 각 테마 4종 시각 확인
- [ ] 잘못된 토큰 → "유효하지 않은 링크" 에러 메시지

---

## Phase 9 — 배포 [✅]

### Railway (백엔드 + DB)
- [ ] Railway 프로젝트 생성
- [ ] PostgreSQL 서비스 추가
- [ ] `DATABASE_URL` 환경변수 확인
- [ ] 백엔드 GitHub 연동 + 자동 배포 설정
- [ ] `JWT_SECRET`, `FRONTEND_URL` 환경변수 설정
- [ ] 마이그레이션 실행 (Railway Shell)

### Vercel (프론트엔드)
- [ ] Vercel 프로젝트 생성
- [ ] `frontend/` 폴더를 루트로 배포
- [ ] `api.js`의 `BASE_URL`을 Railway URL로 변경 (환경 분기 처리)

### 환경 분기 처리 (api.js)
```javascript
const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://my-dday-api.railway.app';
```

### 검증
- [ ] Railway 배포 URL로 health check
- [ ] Vercel 배포 URL에서 로그인 → D-day 추가 → 공유 전체 흐름
- [ ] 모바일 브라우저에서 UI 확인

---

## Phase 10 — v2 푸시 알림 [ ] (선택)

### 작업
- [ ] Service Worker 등록 (`frontend/sw.js`)
- [ ] Web Push API 구독 저장 (DB에 push_subscriptions 테이블 추가)
- [ ] 매일 자정 D-day 체크 + 알림 발송 (cron-job.org 또는 Railway cron)

### DB 추가
```sql
CREATE TABLE push_subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 검증
- [ ] 알림 구독 허용 후 DB에 저장 확인
- [ ] 테스트 발송 API로 알림 수신 확인

---

## 현재 진행 상황

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 프로젝트 초기화 | ✅ 완료 |
| 1 | 백엔드 서버 + DB | ✅ 완료 |
| 2 | 인증 API | ✅ 완료 |
| 3 | D-day CRUD API | ✅ 완료 |
| 4 | 공유 API | ✅ 완료 |
| 5 | 프론트 기반 설정 | ✅ 완료 |
| 6 | 인증 UI | ✅ 완료 |
| 7 | D-day 목록 + CRUD UI | ✅ 완료 |
| 8 | 공유 기능 UI | ✅ 완료 |
| 9 | 배포 | ✅ 완료 |
| 10 | v2 푸시 알림 | ⬜ 선택 |
| 11-A | 마일스톤 API | ✅ 완료 |
| 11-B | 마일스톤 UI | ✅ 완료 |
| 11-C | Google Calendar 연동 | ⬜ 선택 |
| 12 | PWA (홈 화면 설치, SW 오프라인) | ✅ 완료 |
| 13 | 품질 개선 (보안/타임존/검증) | ✅ 완료 |
| 14 | 계정(비밀번호) + 메모 + GCal | ✅ 완료 (2026-04-16 검증 완료) |

---

## Phase 14 — 계정 관리 + 메모 + Google Calendar [🟡]

### 목표
사용자가 비밀번호를 잊었을 때 복구할 수 있고, 로그인 후에도 비밀번호를 변경할 수 있으며, 각 D-day 카드에 메모를 남기고 Google 캘린더에 간편 등록할 수 있도록 한다.

### 14-A 비밀번호 찾기 (이메일 재설정)
- **DB:** `password_resets(token PK, user_id FK, expires_at, used)` 신설
- **Backend:**
  - `POST /api/auth/forgot-password { email }` — 토큰 발급 + 이메일 전송 (또는 콘솔 로그)
  - `POST /api/auth/reset-password { token, password }` — 토큰 검증 후 해시 갱신
- **메일 전송:** `nodemailer` + SMTP 환경변수. 미설정 시 서버 로그에 링크 출력 (개발/임시 운영용 fallback)
- **Frontend:** `forgot-password.html`, `reset-password.html?token=xxx`

### 14-B 로그인 후 비밀번호 변경
- **Backend:** `PUT /api/auth/password { currentPassword, newPassword }` (인증 필수)
- **Frontend:** `account.html` (현재 비밀번호 + 새 비밀번호 + 확인)

### 14-C 카드 메모
- **DB:** `ALTER TABLE ddays ADD COLUMN memo TEXT` (nullable, 1000자 제한은 앱 레벨)
- **Backend:** POST/PUT에 `memo` 필드 지원
- **Frontend:** form.html에 textarea 추가, index.html 카드에 메모 표시

### 14-D Google Calendar 링크
- OAuth 없이 `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=YYYYMMDD/YYYYMMDD&details=...`
- 카드에 "📅 캘린더에 추가" 버튼 → 새 탭 이동
- 마일스톤은 각 마일스톤별로 추가 가능 (전체 펼치기에서 버튼 노출)

### 환경변수 추가
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=example@gmail.com
SMTP_PASS=app_password_here
SMTP_FROM="My D-day <no-reply@mydday.app>"
```
모두 미설정 시 → 콘솔 로그 fallback.

### 검증 (2026-04-16 완료)
- [x] 존재하지 않는 이메일로 비밀번호 찾기 요청 → 보안상 동일한 성공 응답 반환
- [x] 발급된 토큰으로 재설정 성공 → 로그인 가능
- [x] 만료된/사용된 토큰 → 400
- [x] 로그인 후 비밀번호 변경 → 새 비밀번호로 로그인 가능
- [x] D-day 추가 시 메모 입력 → 카드에 표시
- [x] GCal 버튼 클릭 → 이벤트 생성 페이지로 이동, 제목/날짜/메모 채워짐
- [x] 프로덕션 E2E (https://my-dday-production.up.railway.app) 전 시나리오 통과

### 후속 Hotfix (2026-04-16)
- `chore`: `validate: { trustProxy: false }` — Railway 환경에서 `ERR_ERL_PERMISSIVE_TRUST_PROXY` 경고 억제
- `fix`: Service Worker HTML 요청을 **network-first** 로 변경 — Phase 14 배포 후 구버전 `index.html` 이 캐시에서 반환되던 문제 해결, `CACHE_NAME` v1→v2, 신규 HTML 3종 pre-cache 등록
