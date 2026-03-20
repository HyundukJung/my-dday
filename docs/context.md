# Project Context: My D-day

## 한 줄 요약
중요한 날짜(D-day)를 관리하고, 테마가 적용된 링크로 지인에게 공유할 수 있는 웹앱

---

## 프로젝트 목적 & 대상
- **목적:** 개인 D-day 관리 + 감성적인 공유 경험 제공
- **사용자:** 본인 + 링크 공유받은 지인 (공유 수신자는 로그인 불필요)

---

## 핵심 기능 (MVP)
1. **회원가입 / 로그인** — JWT 기반 인증
2. **D-day CRUD** — 생성/조회/수정/삭제
3. **카테고리** — 기념일, 시험, 사귀기 시작한 날, 생일
4. **목록 화면** — 남은 날 / 지난 날 구분 표시
5. **공유 링크** — 테마 선택 → 고유 토큰 링크 생성 → 수신자 전용 페이지

## 추가 기능 (v2)
- 푸시 알림 (D-day 당일, Web Push API)
- 테마 커스터마이징 확장

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | HTML + CSS + Vanilla JS (Vercel 배포) |
| 백엔드 | Node.js + Express (Railway 배포) |
| DB | PostgreSQL (Railway) |
| 인증 | JWT |
| 알림 | Web Push API |

> 무료 호스팅, 입문자 친화적 스택 선택

---

## DB 스키마 요약

```
users         id, email, password(암호화), created_at
ddays         id, user_id, title, category, target_date,
              is_public, share_token, share_theme, created_at
```

---

## API 엔드포인트 요약

```
POST  /api/auth/signup
POST  /api/auth/login

GET    /api/ddays
POST   /api/ddays
PUT    /api/ddays/:id
DELETE /api/ddays/:id

GET    /api/share/:token   ← 공개, 로그인 불필요
```

---

## 공유 테마

| 카테고리 | 테마 | 효과 |
|----------|------|------|
| 생일 | birthday | 케이크, 풍선, 색종이 |
| 기념일 | anniversary | 하트, 로맨틱 |
| 사귀기 시작한 날 | couple | 달달한 느낌 |
| 시험 | exam | 깔끔, 진지 |

---

## 개발 로드맵

| 주차 | 내용 |
|------|------|
| 1주차 | 환경세팅 + DB + 로그인/회원가입 |
| 2주차 | D-day CRUD API + 프론트 화면 |
| 3주차 | 공유 기능 + 테마 구현 |
| 4주차 | 푸시 알림 + 배포 + 테스트 |

---

## 디자인 방향
- 모바일 우선 (mobile-first)
- 미니멀한 UI
