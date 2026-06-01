# 빌사남 텔레그램 24시간 개발 봇 설정 가이드

텔레그램에서 명령을 보내면 이 PC의 파일을 실제로 읽고·쓰고·실행합니다.
**보안 3중 장치**(텔레그램 계정 + chat_id + PIN 인증 세션)로 오직 주인만 사용 가능합니다.

---

## 1. 설치

```bash
cd content-team/telegram-bot
npm install
```

`@anthropic-ai/claude-agent-sdk`가 새로 추가되었으니 반드시 다시 설치하세요.

---

## 2. `.env` 파일 준비

`.env.example`을 복사해서 `.env`로 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

### 필수 값 얻는 법

| 변수 | 얻는 법 |
|------|---------|
| `TELEGRAM_BOT_TOKEN` | 텔레그램 @BotFather 에서 `/newbot` |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |
| `TELEGRAM_OWNER_USER_ID` | 봇에게 아무 메시지 보낸 뒤 `/whoami` 하면 표시 |
| `TELEGRAM_OWNER_CHAT_ID` | 위 `/whoami`에서 함께 표시 |
| `DEV_AUTH_PIN` | 본인만 아는 6자 이상 비밀번호 (예: `Bsn2026!@#`) |

⚠️ `.env`는 `.gitignore`에 이미 포함되어 있으니 커밋되지 않습니다. 타인에게 보이지 마세요.

---

## 3. 실행

### A. 수동 실행 (테스트용)

```bash
# 더블클릭으로도 실행 가능
start-bot.bat
```

### B. 24시간 자동 실행 (로그인 시 자동 시작)

**관리자 권한 PowerShell**에서:

```powershell
cd "C:\Users\yskbu\OneDrive\Desktop\기타업무\AI\content-team\telegram-bot"
PowerShell -ExecutionPolicy Bypass -File install-autostart.ps1
```

등록 후 바로 시작하려면:

```powershell
Start-ScheduledTask -TaskName BsnTelegramBot
```

제거하려면:

```powershell
PowerShell -ExecutionPolicy Bypass -File uninstall-autostart.ps1
```

> PC가 꺼져 있거나 절전 모드면 봇도 멈춥니다. **24시간 켜두거나** 절전 설정을 꺼야 합니다.

---

## 4. 보안 구조 (3중 장치)

```
텔레그램에서 /dev 입력
    ↓
[1] user_id 확인   ← 텔레그램 계정(폰번호 연결)
    ↓
[2] chat_id 확인   ← 1:1 대화창 ID
    ↓
[3] PIN 세션 확인  ← /auth <PIN> 으로 60분 세션
    ↓
Claude Agent SDK 실행 (파일 R/W, Bash)
```

### 공격 시나리오별 방어

| 시나리오 | 방어 |
|---------|------|
| 봇 검색해서 다른 사람이 /dev 시도 | user_id 불일치 → 차단 |
| 텔레그램 계정 잠깐 도용 | PIN 모름 → /auth 실패 (10분 3회 제한) |
| PIN 무차별 대입 | 10분에 3회까지만 허용, 상수시간 비교 |
| PC에 침입해 .env 탈취 | PIN+세션만으론 텔레그램 보낼 수 없음 |
| 세션 탈취 | 60분 후 자동 만료, `/logout` 즉시 종료 |

---

## 5. 명령어 사용법

### 처음 쓸 때

```
/whoami            ← user_id / chat_id 확인해서 .env에 기록
/auth 내PIN        ← 60분 세션 개시
/pwd               ← 현재 작업 폴더 확인
/dev 이 폴더 구조 보여줘
```

### 개발 명령 예

```
/cd C:\Users\yskbu\bsn-redesign
/dev package.json 읽고 의존성 요약해줘
/dev src/app.tsx에 다크모드 토글 추가해줘
/dev npm test 돌리고 결과 보여줘
```

### 세션 종료

```
/logout            ← 즉시 인증 해제
```

---

## 6. 감사 로그

모든 보안 이벤트는 `dev-audit.log`에 기록됩니다:
- 인증 시도 (성공·실패·차단)
- /dev 실행 시작·완료·오류
- 권한 없는 접근 시도

주기적으로 확인하세요:

```bash
type dev-audit.log
```

---

## 7. 문제 해결

| 증상 | 해결 |
|------|------|
| `⛔ 권한 없음` | `/whoami`로 user_id 확인 후 .env 수정 |
| `🔒 인증 필요` | `/auth <PIN>` 먼저 실행 |
| `⏱ 인증 시도 과다` | 10분 기다리거나 봇 재시작 |
| `MODULE_NOT_FOUND: claude-agent-sdk` | `npm install` 다시 실행 |
| 봇이 응답 없음 | 작업관리자에서 `node.exe` 확인, 로그 확인 |

---

## 8. 비용 주의

- Claude Sonnet 4.6 기준 /dev 1회 평균 $0.05~$0.30
- 긴 작업은 $1 넘을 수도 있음 → 속도 제한(분당 6회) 기본 적용
- 완료 시 텔레그램에 비용 표시됨
