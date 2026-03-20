# TRD (Technical Requirements Document)
# My D-day

## 1. 아키텍처

```
[폰/브라우저]
     ↕
[프론트엔드 - Vercel]
  HTML + CSS + JavaScript
     ↕ API 호출
[백엔드 - Railway]
  Node.js + Express
     ↕
[데이터베이스 - Railway]
  PostgreSQL
```

---

## 2. 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| 프론트엔드 | HTML + CSS + Vanilla JS | 입문자에게 가장 단순 |
| 백엔드 | Node.js + Express | JS 하나로 통일, 쉬움 |
| DB | PostgreSQL | Railway에서 무료 제공 |
| 인증 | JWT | 가장 널리 쓰이는 방식 |
| 배포 (프론트) | Vercel | 무료, GitHub 연동 간편 |
| 배포 (백엔드) | Railway | 무료, DB까지 한번에 |
| 알림 | Web Push API | 별도 앱 설치 불필요 |

---

## 3. DB 테이블 설계

```
users
├── id
├── email
├── password (암호화)
└── created_at

ddays
├── id
├── user_id        ← users 참조
├── title          ← "수능"
├── category       ← "시험"
├── target_date    ← "2025-11-13"
├── is_public      ← 공유 여부
├── share_token    ← 공유 링크용 고유값
├── share_theme    ← 선택한 테마 (birthday/anniversary/exam 등)
└── created_at
```

---

## 4. API 설계

```
[인증]
POST   /api/auth/signup        ← 회원가입
POST   /api/auth/login         ← 로그인

[D-day 관리]
GET    /api/ddays              ← 내 D-day 목록
POST   /api/ddays              ← D-day 추가
PUT    /api/ddays/:id          ← D-day 수정
DELETE /api/ddays/:id          ← D-day 삭제

[공유]
GET    /api/share/:token       ← 테마 + 날짜 정보 반환 (로그인 불필요)
```

---

## 5. 공유 페이지 테마 구현

| 구성요소 | 방식 |
|----------|------|
| 배경 이미지 | 카테고리별 미리 준비된 이미지 |
| 색상 팔레트 | 테마별 CSS 클래스 전환 |
| 애니메이션 | 생일=색종이 효과, 기념일=하트 등 |
| 텍스트 | D-day 남은/지난 날수 자동 계산 |

---

## 6. 개발 순서

```
1주차  환경세팅 + DB + 로그인/회원가입
2주차  D-day CRUD API + 프론트 화면
3주차  공유 기능 + 테마 구현
4주차  푸시 알림 + 배포 + 테스트
```
