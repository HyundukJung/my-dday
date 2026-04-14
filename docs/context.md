# Project Context: My D-day

## 한 줄 요약
중요한 날짜(D-day)와 시작일 기준 마일스톤(100/200/300일…)을 관리하고, 테마가 적용된 링크로 지인과 공유하는 PWA.

---

## 현재 상태 (2026-04-15)
- **MVP + 확장 기능 배포 완료**
  - 프론트: https://my-dday.vercel.app
  - 백엔드: https://my-dday-production.up.railway.app
- iPhone/Android에 **홈 화면 설치 가능 (PWA)**
- 총 12개 커밋, Phase 0~13 완료

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

### v2 예정
- Web Push 알림 (D-day 당일 + 마일스톤 도달일)
- Google Calendar 자동 등록
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
users        id, email, password(bcrypt), created_at

ddays        id, user_id, title, category,
             target_date (fixed 모드), start_date (milestone 모드),
             dday_type ('fixed'|'milestone'),
             is_public, share_token, share_theme, created_at

milestones   id, dday_id, days, target_date,
             notified, gcal_event_id (v2용), created_at
```

---

## API 엔드포인트 요약

```
# 인증 (rate limit 15분/10회)
POST  /api/auth/signup
POST  /api/auth/login

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

---

## 디자인 방향
- **모바일 우선** (mobile-first) — 폰에서 우선 보기 좋게
- **미니멀 UI** — Pretendard 폰트, 파스텔 컬러 (#5B6EE1 포인트)
- **PWA 친화** — 전체화면 모드, 홈 화면 아이콘

---

## 참고 문서
- `PRD.md` — 제품 요구사항
- `TRD.md` — 기술 스펙 (상세)
- `DEVPLAN.md` — 단계별 개발 계획
- `CHANGELOG.md` — 배포별 변경 이력
