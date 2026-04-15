# CLAUDE.md — AI 에이전트 개발 지침

> 이 파일은 Claude Code 등 AI 에이전트가 이 프로젝트에서 작업할 때 **매 세션 자동 로드**됩니다.
> 세부 정책은 [docs/DEV_POLICY.md](docs/DEV_POLICY.md) 참조.

---

## 🔴 불변 규칙 (반드시 준수)

### R1. 커밋 전 문서 동기화
**모든 커밋 직전에** 다음을 확인하고 필요 시 업데이트한다:

| 변경 유형 | 업데이트 필수 문서 |
|---|---|
| 새 기능 | `PRD.md` + `TRD.md` + `DEVPLAN.md` + `CHANGELOG.md` + `context.md` |
| 버그 수정 | `CHANGELOG.md` (+ 관련 문서) |
| DB 스키마 변경 | `TRD.md` DB 섹션 + 새 마이그레이션 파일 + `CHANGELOG.md` |
| API 추가/변경 | `TRD.md` API 스펙 + `CHANGELOG.md` |
| 보안 변경 | `TRD.md` 보안 섹션 + `CHANGELOG.md` Security |
| 배포 설정 변경 | `TRD.md` 배포 섹션 + `.env.example` |
| 리팩토링 | `CHANGELOG.md` |
| 문서만 변경 | 해당 문서 자체 |

문서 업데이트를 생략할 경우 사용자에게 **명시적으로 보고하고 확인**을 받는다.

### R2. 커밋 메시지 컨벤션
```
<타입>: <한 줄 요약>

<본문>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

타입: `Phase N:` / `feat:` / `fix:` / `security:` / `refactor:` / `docs:` / `chore:` / `test:` / `hotfix:`

### R3. 비밀값 보호
- `.env`, API 키, 비밀번호, 토큰을 **절대** 커밋하지 않는다
- 새 환경변수 추가 시 `.env.example` 에 **키만** 반영

### R4. 작업 완료 기준
Phase/작업을 "완료"로 표시하려면 다음을 **모두** 만족해야 한다:
1. 로컬에서 검증됨 (curl/브라우저)
2. 필요한 문서 업데이트됨
3. 커밋되고 push됨
4. 배포된 경우 배포본에서도 검증됨

---

## 🟡 강력 권장

### 작업 시작 전
1. `docs/DEVPLAN.md` 로 현재 Phase 상태 확인
2. `docs/CHANGELOG.md` 로 최근 변경 확인
3. 관련 코드를 먼저 읽고 구조 파악

### 배포 후
1. health check 자동 수행 (`/health`)
2. 핵심 플로우 실행 (curl로 로그인 → CRUD 한 번)
3. 문제 발견 시 `hotfix:` 커밋으로 즉시 수정

---

## 📚 문서 네비게이션

| 문서 | 내용 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 사용자 관점 기능 요구사항 |
| [docs/TRD.md](docs/TRD.md) | 기술 스펙 (스키마, API, 보안, 배포) |
| [docs/DEVPLAN.md](docs/DEVPLAN.md) | Phase별 개발 계획 + 진행 상황 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 배포별 변경 이력 |
| [docs/context.md](docs/context.md) | 프로젝트 빠른 개요 |
| [docs/DEV_POLICY.md](docs/DEV_POLICY.md) | 개발 정책 (상세) |

---

## 🏗 프로젝트 요약

- **제품:** My D-day — 날짜 카운트다운 + 마일스톤 + 테마 공유 PWA
- **스택:** Node.js 24 + Express 5 + PostgreSQL / Vanilla JS + PWA
- **배포:** Vercel (프론트) + Railway (백엔드+DB)
- **주소:** https://my-dday.vercel.app
- **리포:** https://github.com/HyundukJung/my-dday
- **현재 Phase:** 14 완료 (비밀번호 찾기/변경, 메모, GCal 링크), v2 (Web Push / GCal OAuth 자동 동기화) 대기 중

## 🔧 자주 쓰는 명령

```bash
# 로컬 백엔드 실행
cd backend && node src/server.js

# 로컬 프론트엔드: VS Code Live Server (127.0.0.1:5500)

# DB 마이그레이션 실행 (Railway DB에 직접)
cd backend && node -e "
require('dotenv').config();
const pool = require('./src/db');
const fs = require('fs');
pool.query(fs.readFileSync('./src/migrations/NNN_name.sql', 'utf8'))
  .then(() => { console.log('OK'); return pool.end(); });
"

# 배포 (자동)
git push origin main
# → Railway + Vercel 자동 배포 (1~2분)

# 배포 검증
curl https://my-dday-production.up.railway.app/health
```
