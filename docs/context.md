# Project Context: My D-day

## 한 줄 요약
중요한 날짜(D-day)와 시작일 기준 마일스톤(100/200/300일…)을 관리하고, 테마가 적용된 링크로 지인과 공유하는 PWA.

---

## 현재 상태 (2026-06-03)
- **MVP + 확장 기능 배포 완료**
  - 프론트: https://my-dday.vercel.app (Vercel)
  - 백엔드: https://my-dday-backend.onrender.com (Render — Railway에서 이전)
  - DB: Neon Postgres (Railway에서 이전)
  - ⚠️ Render 무료 인스턴스는 15분 무요청 시 슬립 → 첫 접속 ~50초 콜드 스타트
- iPhone/Android에 **홈 화면 설치 가능 (PWA)**
- Phase 0~16 완료 (비밀번호 찾기/변경, 메모, GCal 링크, 관리자 페이지, 카드 타임존 표시 포함)
- SW는 HTML network-first — 새 배포 즉시 반영

### 🟡 운영 주의사항
- 비밀번호 찾기 메일 발송은 **SMTP 환경변수 미설정 시 서버 로그 fallback**. 실제 발송 원하면 Railway Variables 에 `SMTP_*` 설정 필요 (README/TRD 10장 참조)
  - 발송 수단: **Gmail SMTP + 앱 비밀번호**(2단계 인증 필요). `SMTP_FROM` 주소는 반드시 `SMTP_USER`(Gmail 주소)와 동일해야 함 — Gmail이 From을 강제하기 때문
  - 서버 기동 시 SMTP 미설정이면 `⚠️ [SMTP 미설정]` 경고가 로그에 출력됨 ([server.js](../backend/src/server.js) `checkMailConfig`)

---

## 프로젝트 목적 & 대상
- **목적:** 개인 D-day 관리 + 감성적인 공유 경험 + 커플/기념일 마일스톤 자동화
- **사용자:** 본인 + 링크 공유받은 지인 (공유 수신자는 로그인 불필요)

---

## 핵심 기능

### MVP (완료)
1. **회원가입 / 로그인** — JWT 기반 인증
2. **D-day CRUD** — 생성/조회/수정/삭제
3. **카테고리** — 기념일 / 시험 / 커플 / 생일
4. **목록 화면** — 남은 날 / 지난 날 구분 표시 + 카테고리 필터
5. **공유 링크** — 테마 선택 → 고유 토큰 링크 생성 → 수신자 전용 페이지

### 확장 기능 (완료)
6. **마일스톤 모드** — 시작일 + 100/200/300/365/500/1000일 자동 계산
   - 프리셋 체크박스 + 커스텀 일수 입력 지원
7. **PWA** — 홈 화면 설치, 전체화면 모드, 오프라인 캐시
8. **비밀번호 찾기/변경** — 이메일 재설정 링크(30분 유효) + 로그인 후 변경
9. **카드 메모** — 각 D-day에 1000자 이내 메모
10. **Google Calendar 추가** — OAuth 없이 `calendar.google.com/render` 링크로 all-day 이벤트 생성
    - 마일스톤은 체크박스로 여러 개 선택 → 1개는 GCal 링크, 여러 개는 .ics 파일로 일괄 추가
11. **관리자 페이지** — 관리자 전용 대시보드(KPI/차트/회원 관리), 권한 부여/회수, 접속 로그 통계
12. **카드 기준 시점(타임존)** — 등록 지역 시간 / UTC / 선택한 세계시를 카드에 함께 표시 (DST 자동)

### v2 예정
- Web Push 알림 (D-day 당일 + 마일스톤 도달일)
- Google Calendar OAuth 자동 동기화
- 테마 커스터마이징 확장

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | HTML + CSS + Vanilla JS (빌드 없음, Vercel 배포) |
| 백엔드 | Node.js v24 + Express 5 (Railway 배포) |
| DB | PostgreSQL (Railway) |
| 인증 | JWT (HS256, 7일 만료) + bcrypt(cost 12) |
| 보안 | helmet, cors, express-rate-limit, express-validator |
| PWA | Service Worker + manifest.json + 아이콘 4종 |
| 알림 (v2) | Web Push API |

> 무료 호스팅, 입문자 친화 스택

---

## DB 스키마 요약

```
users        id, email, password(bcrypt), is_admin (Phase 15), created_at

ddays        id, user_id, title, category,
             target_date (fixed 모드), start_date (milestone 모드),
             dday_type ('fixed'|'milestone'),
             is_public, share_token, share_theme,
             memo (Phase 14),
             created_tz / display_tz (Phase 16 — 타임존), created_at

milestones   id, dday_id, days, target_date,
             notified, gcal_event_id (v2용), created_at

password_resets  token(PK), user_id, expires_at, used, created_at

login_logs   id, user_id, created_at  (Phase 15 — 접속량 통계)
```

---

## API 엔드포인트 요약

```
# 인증 (rate limit 15분/10회)
POST  /api/auth/signup
POST  /api/auth/login
POST  /api/auth/forgot-password    # 1시간/5회
POST  /api/auth/reset-password     # 토큰으로 재설정
PUT   /api/auth/password           # 인증 필수, 비밀번호 변경
GET   /api/auth/me                 # 현재 사용자(is_admin 포함)

# 관리자 (관리자 권한 필수)
GET   /api/admin/summary           # KPI
GET   /api/admin/users             # 회원 목록
PUT   /api/admin/users/:id/role    # 권한 부여/회수
GET   /api/admin/analytics         # 시계열/분포

# D-day (인증 필수)
GET    /api/ddays
POST   /api/ddays
PUT    /api/ddays/:id
DELETE /api/ddays/:id
POST   /api/ddays/:id/share
DELETE /api/ddays/:id/share

# 공유 (비로그인)
GET    /api/share/:token

# 시스템
GET    /health
```

---

## 공유 테마

| 카테고리 | 테마 | 분위기 |
|----------|------|------|
| 생일 | birthday | 🎂 케이크·풍선·색종이 |
| 기념일 | anniversary | 💕 하트·로맨틱 |
| 커플 | couple | 💑 달달함 |
| 시험 | exam | 📚 깔끔함·진지함 |

---

## 완료된 Phase

| Phase | 내용 |
|---|---|
| 0 | 환경설정 (Node.js, npm, Railway DB, git) |
| 1 | 백엔드 서버 + DB 연결 |
| 2 | 인증 API |
| 3 | D-day CRUD API |
| 4 | 공유 API |
| 5 | 프론트 기반 (CSS 변수, api.js 래퍼) |
| 6 | 인증 UI |
| 7 | D-day 목록 + CRUD UI |
| 8 | 공유 기능 UI + 4종 테마 |
| 9 | 배포 (Vercel + Railway + GitHub) |
| 11-A | 마일스톤 API (자동 계산, 트랜잭션) |
| 11-B | 마일스톤 UI (토글, 프리셋, 카드 표시) |
| 12 | PWA (manifest, SW, 아이콘) |
| 13 | 품질 개선 (보안, 타임존, 검증 버그) |
| 14 | 비밀번호 찾기/변경, 카드 메모, Google Calendar 추가 |
| 15 | 관리자 페이지 (대시보드, 권한 관리, 접속 로그) |

---

## 디자인 방향
- **모바일 우선** (mobile-first) — 폰에서 우선 보기 좋게
- **미니멀 UI** — Pretendard 폰트, 파스텔 컬러 (#5B6EE1 포인트)
- **PWA 친화** — 전체화면 모드, 홈 화면 아이콘

---

## 참고 문서
- `ARCHITECTURE.md` — **비개발자용 구조 안내** (레이어·역할·배포 흐름·용어 사전)
- `PRD.md` — 제품 요구사항
- `TRD.md` — 기술 스펙 (상세)
- `DEVPLAN.md` — 단계별 개발 계획
- `CHANGELOG.md` — 배포별 변경 이력
