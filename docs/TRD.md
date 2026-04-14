# TRD (Technical Requirements Document)
# My D-day

> **상태:** 프로덕션 배포 중 (2026-04-15 기준)
> - 프론트: https://my-dday.vercel.app
> - 백엔드: https://my-dday-production.up.railway.app

## 1. 아키텍처

```
[iPhone/Android/Browser]
         ↕ HTTPS
[Vercel (Static Hosting)]          ← HTML + CSS + Vanilla JS + PWA
  - manifest.json, sw.js, icons/
         ↕ REST API (CORS)
[Railway (Node.js)]                ← Express + JWT 인증
  - helmet / cors / rate-limit
  - routes: /api/auth, /api/ddays, /api/share
         ↕ TCP/SSL
[Railway PostgreSQL]               ← users, ddays, milestones
```

---

## 2. 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| 런타임 | Node.js | v24.14.0 |
| 프론트엔드 | HTML + CSS + Vanilla JS (빌드 없음) | — |
| 백엔드 | Express | ^5.2.1 |
| DB | PostgreSQL (Railway) | — |
| DB 드라이버 | pg | ^8.20 |
| 인증 | JWT + bcrypt(cost 12) | jsonwebtoken, bcrypt |
| 보안 | helmet, cors, express-rate-limit | — |
| 검증 | express-validator | — |
| 공유 토큰 | crypto.randomBytes(12).toString('base64url') | — |
| 배포 (프론트) | Vercel (GitHub 연동 자동 배포) | — |
| 배포 (백엔드) | Railway (GitHub 연동 자동 배포) | — |
| PWA | manifest.json + Service Worker (캐시) | — |
| 아이콘 생성 | sharp (SVG → PNG) | devDep |

---

## 3. 폴더 구조

```
my-dday/
├── backend/
│   ├── src/
│   │   ├── app.js              ← Express 앱, 미들웨어 등록
│   │   ├── server.js           ← 실행 진입점 (DB 연결 확인 후 listen)
│   │   ├── db.js               ← pg Pool (SSL 설정)
│   │   ├── middleware/
│   │   │   ├── auth.js         ← JWT 검증
│   │   │   └── validate.js     ← express-validator 에러 통합
│   │   ├── routes/
│   │   │   ├── auth.js         ← 회원가입/로그인 + authLimiter
│   │   │   ├── ddays.js        ← CRUD + 공유 + 마일스톤
│   │   │   └── share.js        ← 공개 조회
│   │   └── migrations/
│   │       ├── 001_init.sql    ← users, ddays
│   │       └── 002_milestones.sql ← start_date, dday_type, milestones 테이블
│   ├── .env                    ← (git 제외)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── index.html              ← D-day 목록
│   ├── login.html, signup.html
│   ├── form.html               ← 추가/수정 (fixed + milestone 토글)
│   ├── share.html              ← 공유 수신자
│   ├── manifest.json           ← PWA 매니페스트
│   ├── sw.js                   ← Service Worker
│   ├── icons/                  ← 192/512/maskable/apple-touch
│   ├── css/
│   │   ├── reset.css
│   │   ├── main.css            ← CSS 변수 + 마일스톤 UI 스타일
│   │   └── themes.css          ← 공유 테마 4종
│   └── js/
│       ├── api.js              ← fetch 래퍼 + SW 등록
│       ├── auth.js, ddays.js, form.js, share.js
│
└── docs/
    ├── PRD.md
    ├── TRD.md (이 파일)
    ├── context.md
    ├── DEVPLAN.md
    └── CHANGELOG.md
```

---

## 4. DB 스키마 (현재)

```sql
-- users
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,   -- bcrypt(cost 12) 해시
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ddays (Phase 11에서 start_date/dday_type 추가)
CREATE TABLE ddays (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  category    VARCHAR(50)  NOT NULL,        -- birthday/anniversary/couple/exam
  target_date DATE,                         -- fixed 모드에서만 사용 (nullable)
  start_date  DATE,                         -- milestone 모드에서만 사용
  dday_type   VARCHAR(20) DEFAULT 'fixed',  -- 'fixed' | 'milestone'
  is_public   BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(21) UNIQUE,
  share_theme VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- milestones (Phase 11 신규)
CREATE TABLE milestones (
  id            SERIAL PRIMARY KEY,
  dday_id       INTEGER REFERENCES ddays(id) ON DELETE CASCADE,
  days          INTEGER NOT NULL,             -- 100, 200, 365 ...
  target_date   DATE NOT NULL,                -- start_date + days
  notified      BOOLEAN DEFAULT FALSE,
  gcal_event_id VARCHAR(255),                 -- v2 Google Calendar 이벤트 ID
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dday_id, days)
);
CREATE INDEX idx_milestones_dday_id ON milestones(dday_id);
CREATE INDEX idx_milestones_target_date ON milestones(target_date);
```

---

## 5. API 스펙

### 공통
- Content-Type: `application/json`
- 인증 필요: `Authorization: Bearer <JWT>`
- 성공: `{ "data": ... }` 또는 `{ "message": "ok" }`
- 실패: `{ "error": "메시지", "details"?: [...] }`

### 인증 (rate limit: 15분/10회)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 (email, password 최소 8자) |
| POST | `/api/auth/login`  | 로그인 → JWT 반환 (만료: 7d) |

### D-day (인증 필수, rate limit: 15분/300회)
| Method | Path | 설명 |
|--------|------|------|
| GET    | `/api/ddays` | 본인 D-day 목록 + 각 마일스톤 배열 포함 |
| POST   | `/api/ddays` | 생성 (dday_type에 따라 target_date 또는 start_date+milestone_days) |
| PUT    | `/api/ddays/:id` | 수정 (타입 변경 포함, 마일스톤 재생성) |
| DELETE | `/api/ddays/:id` | 삭제 (마일스톤 CASCADE) |
| POST   | `/api/ddays/:id/share` | 공유 링크 생성 (share_theme 지정) |
| DELETE | `/api/ddays/:id/share` | 공유 해제 |

### 공유 (비로그인)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/share/:token` | 공유된 D-day 조회 + `days_diff` 계산 포함 |

### 기타
| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | DB ping 포함 헬스체크 |

---

## 6. 요청/응답 예시

### 마일스톤 생성
```http
POST /api/ddays
Authorization: Bearer <token>

{
  "title": "우리 사이",
  "category": "couple",
  "dday_type": "milestone",
  "start_date": "2026-02-17",
  "milestone_days": [100, 200, 300, 365, 500, 1000]
}

201 Created
{
  "data": {
    "id": 8, "title": "우리 사이", "dday_type": "milestone",
    "start_date": "2026-02-17", "target_date": null,
    "milestones": [
      { "days": 100, "target_date": "2026-05-28", ... },
      { "days": 200, "target_date": "2026-09-05", ... },
      ...
    ]
  }
}
```

### 공유 조회 (비로그인)
```http
GET /api/share/abc123xyz

200 OK
{
  "data": {
    "title": "철수의 생일",
    "target_date": "2026-05-15",
    "category": "birthday",
    "share_theme": "birthday",
    "days_diff": 14      ← 양수=남은 날, 음수=지난 날, 0=오늘
  }
}
```

---

## 7. 보안

| 영역 | 조치 |
|---|---|
| 비밀번호 | bcrypt (cost 12) 해시, 평문 저장 금지 |
| 인증 | JWT (HS256, 7일 만료) |
| 권한 | 모든 ddays 쿼리에 `WHERE user_id = $req.user.userId` 적용 |
| CORS | 화이트리스트 (localhost:5500, 127.0.0.1:5500, FRONTEND_URL) |
| Brute force | 인증 엔드포인트 전용 rate limit (15분/10회) |
| 전역 | 15분/300회 rate limit |
| Proxy | `app.set('trust proxy', true)` — Railway edge 뒤 per-IP 정확 식별 |
| 헤더 | helmet (CSP는 프론트와 교차 출처라 현재 미적용) |
| SQL injection | 모든 쿼리 파라미터화 (`$1, $2, ...`) |
| XSS | 프론트에서 사용자 입력 `escapeHtml()` 적용 |
| 비밀값 | `.env` 분리, `.gitignore` 포함, Railway Variables로 주입 |

---

## 8. 타임존 정책

- **DB**: `DATE` 타입 (시간 정보 없음)
- **백엔드 계산**: UTC 기준 (`addDays`는 `setUTCDate` 사용)
- **프론트 파싱**: `parseDbDate(isoString)` 헬퍼로 YYYY-MM-DD만 추출 → 로컬 자정 Date
  - `new Date("2026-02-17T00:00Z")` 방식은 브라우저 타임존에 따라 ±1일 밀릴 수 있어 금지

---

## 9. PWA 구성

| 파일 | 역할 |
|---|---|
| `manifest.json` | 앱 이름, 테마 색상, 아이콘 정의 (display: standalone) |
| `sw.js` | Service Worker. 정적 자원 cache-first, API 요청은 캐시 제외 |
| `icons/icon-192.png` | Android 권장 |
| `icons/icon-512.png` | 스플래시 |
| `icons/icon-maskable.png` | Android maskable (안전 영역 80%) |
| `icons/apple-touch-icon.png` | iOS (180x180) |

### 캐시 전략
```
동일 출처 GET 요청:
  → 캐시 있으면 즉시 반환
  → 없으면 네트워크 요청 → 성공 시 캐시 저장
  → 오프라인 + 캐시 미스: index.html 폴백

교차 출처 (API): 캐시 미사용 → 항상 네트워크
POST/PUT/DELETE: 캐시 미사용
```

---

## 10. 배포 & 환경변수

### Railway (백엔드)
| 변수 | 값 |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (내부 참조) |
| `JWT_SECRET` | 랜덤 32자 이상 |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://my-dday.vercel.app` |

### Vercel (프론트)
- Root Directory: `frontend`
- Framework Preset: Other
- 환경변수 없음 (api.js가 hostname 감지로 BASE_URL 분기)

### CI/CD
- GitHub `main` 브랜치에 push → Railway + Vercel 자동 배포
- 빌드 없음 (프론트는 정적, 백엔드는 `npm start`)

---

## 11. 향후 개발 순서 (v2)

```
Phase 10   Web Push 알림 (Service Worker + VAPID + Railway cron)
Phase 11-C Google OAuth + Calendar API 연동
Phase 14   자동 테스트 (Jest + supertest) + GitHub Actions CI
Phase 15   HttpOnly Cookie 기반 세션 (localStorage → 쿠키 전환)
```
