# 호스팅 이전 가이드 — Railway → Neon(DB) + Render(백엔드)

> 배경: Railway 무료 체험 만료로 백엔드+DB가 모두 다운됨(2026-06-03).
> 무료 스택 **Vercel(프론트, 유지) + Render(백엔드) + Neon(Postgres)** 으로 이전한다.
> 기존 프로덕션 DB는 접속 불가 → **새 DB로 깨끗하게 시작**(계정/D-day 재생성 필요).

---

## ✅ 어젯밤까지 완료된 것 (코드/문서)
- 마일스톤 공유 버그 수정 (커밋 `c53a8f0`) — *백엔드 재배포 후 검증 필요*
- 프론트 ddays.js 리팩토링, SW v5
- server.js 기동 검증(JWT_SECRET/DATABASE_URL/SMTP)
- 신규 DB 통합 스키마: `backend/src/migrations/000_full_schema.sql`
- 로컬 SMTP(Gmail) 메일 발송 검증 완료
- ⚠️ 위 커밋은 **로컬에만 있음(push 안 함)** — 아래 3단계에서 api.js 수정 후 함께 push

---

## 1단계: Neon DB 생성 (DB 먼저)
1. https://neon.tech → Sign up (GitHub 계정 추천)
2. **Create project** — name: `my-dday`, Region: Asia(Singapore)
3. **연결 문자열 복사** — "Connection string" 박스, ⚠️ **"Pooled connection" 토글 켠 값**으로
   - 형태: `postgresql://...-pooler.../neondb?sslmode=require`
   - 채팅에 붙여넣지 말 것 (비밀값)
4. 왼쪽 **SQL Editor** → `backend/src/migrations/000_full_schema.sql` 내용 전체 붙여넣고 **Run**
5. 확인: `SELECT tablename FROM pg_tables WHERE schemaname='public';`
   → users, ddays, milestones, password_resets 4개 보이면 성공

## 2단계: Render 백엔드 생성
1. https://render.com → Sign up (GitHub 계정)
2. **New + → Web Service** → GitHub 리포 `HyundukJung/my-dday` 연결
3. 설정:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: Free
4. **Environment Variables** 추가:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | (Neon pooled 연결 문자열) |
   | `JWT_SECRET` | (기존 값 또는 새 32자+ 랜덤 문자열) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | `https://my-dday.vercel.app` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_SECURE` | `false` |
   | `SMTP_USER` | `royalabarum@gmail.com` |
   | `SMTP_PASS` | (Gmail 앱 비밀번호 — 노출됐으니 **새로 발급 권장**) |
   | `SMTP_FROM` | `My D-day <royalabarum@gmail.com>` |
5. **Create Web Service** → 배포 완료까지 대기 → **서비스 URL 확보** (예: `https://my-dday-backend.onrender.com`)
6. 로그에 `DB 연결 성공` + `메일 발송 설정 확인됨` 보이면 정상
7. health check: 브라우저로 `https://<render-url>/health` → `{"status":"ok"}`

## 3단계: 프론트 API 주소 변경 (코드 — Claude가 처리)
- `frontend/js/api.js`의 `BASE_URL`을 Railway 주소 → **Render URL**로 교체
- 어젯밤 로컬 커밋(`c53a8f0`)과 함께 `git push origin main`
- → Vercel 자동 재배포

## 4단계: 프로덕션 E2E 검증
1. https://my-dday.vercel.app → 회원가입(새 계정) → 로그인
2. D-day 생성(고정형 + 마일스톤) → 목록 표시 확인
3. **마일스톤 공유** → 링크 열어 "D + N일째" 정상 표시 확인 (어젯밤 버그 수정 검증)
4. 비밀번호 찾기 → 메일 수신 → 재설정 → 로그인 확인
5. CHANGELOG/context에 "Render+Neon 이전 완료" 기록

---

## 비용/주의
- Render 무료: 15분 무요청 시 슬립 → 첫 접속 ~50초(콜드 스타트). 정상.
- Neon 무료: 5분 무쿼리 시 자동 슬립(0.5초 복귀), 월 100 CU-h. 개인용 충분.
- 앱 비밀번호가 채팅에 노출됨 → 이전 완료 후 **기존 앱 비밀번호 폐기 + 새로 발급**
