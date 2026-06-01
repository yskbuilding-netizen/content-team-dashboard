# Railway 배포 가이드 (24시간 운영)

## 개요

PC를 꺼도 텔레그램 봇이 24시간 돌아가도록 Railway.app에 배포합니다.
- 비용: 월 $5 (처음 $5 크레딧 무료)
- 배포 시간: 약 10분
- 신용카드 필요

---

## 1단계: GitHub 저장소 만들기

Railway는 GitHub에서 코드를 가져오는 방식입니다.

### A. GitHub 계정 만들기 (이미 있으면 스킵)
https://github.com/signup

### B. GitHub Desktop 설치 (가장 쉬운 방법)
https://desktop.github.com

설치 후 GitHub 계정으로 로그인.

### C. 새 저장소 만들기
1. GitHub Desktop 실행
2. **File → New Repository**
3. 입력:
   - **Name**: `bsn-content-agent`
   - **Local Path**: `C:\Users\yskbu\OneDrive\Desktop\기타업무\AI\content-team\content-agent`
   - **Initialize with README**: ✅ 체크
   - **Git Ignore**: `Node` 선택
4. **Create Repository** 클릭

### D. GitHub에 올리기 (Publish)
1. GitHub Desktop에서 **Publish repository** 버튼 클릭
2. **Keep this code private** ✅ 체크 (중요! API 키가 들어있으므로)
3. **Publish Repository** 클릭

완료! 이제 GitHub에 코드가 올라갔습니다.

---

## 2단계: Railway.app 가입

### A. 가입
https://railway.app/login

**"Login with GitHub"** 클릭 (GitHub 계정으로 바로 가입)

### B. 결제 수단 등록
1. 우측 상단 프로필 아이콘 → **Settings**
2. **Billing** 탭 → **Update Plan**
3. **Hobby Plan ($5/month)** 선택
4. 신용카드 등록

처음 $5 크레딧은 무료로 제공됩니다.

---

## 3단계: 프로젝트 배포

### A. 새 프로젝트 생성
1. Railway 대시보드 → **New Project**
2. **Deploy from GitHub repo** 선택
3. **Configure GitHub App** → 저장소 접근 권한 허용
4. `bsn-content-agent` 저장소 선택
5. **Deploy Now** 클릭

Railway가 자동으로 Node.js 프로젝트임을 인식하고 빌드를 시작합니다.

### B. 환경변수 설정 (가장 중요!)
빌드는 실패할 겁니다. .env가 없어서 그래요. 환경변수를 웹에서 설정합니다.

1. 프로젝트 대시보드 → 서비스 클릭
2. **Variables** 탭
3. **New Variable** 버튼
4. 아래 환경변수들을 **하나씩** 추가:

```
ANTHROPIC_API_KEY
TELEGRAM_BOT_TOKEN
WP_SITE_URL
WP_USERNAME
WP_APP_PASSWORD
THREADS_ACCESS_TOKEN
THREADS_USER_ID
THREADS_USERNAME
LINKEDIN_ACCESS_TOKEN
LINKEDIN_USER_ID
LINKEDIN_NAME
```

각 값은 로컬 `.env` 파일에서 복사해서 붙여넣으세요.

**Tip**: Railway는 **Raw Editor**를 제공합니다. .env 파일 내용 전체를 붙여넣으면 자동 파싱됩니다.
- **Variables** 탭 → **RAW Editor** 버튼 → .env 내용 전체 복붙 → **Update Variables**

### C. 재배포
환경변수 설정 후:
1. **Deployments** 탭
2. 최신 배포 옆 **⋮** 메뉴 → **Redeploy**

몇 분 내에 빌드 완료되고 봇이 실행됩니다.

---

## 4단계: 실행 확인

### A. 로그 확인
Railway 대시보드 → 서비스 → **Deployments** → 최신 배포 → **View Logs**

아래와 같은 메시지가 보이면 성공:
```
✅ 텔레그램 연결 준비 완료!
📝 빌사남 콘텐츠 에이전트가 시작되었습니다!
[폴링 #1] ok=true, 메시지 수=0
```

### B. 로컬 agent.js 종료
중요! Railway와 로컬에서 동시에 실행되면 봇 메시지가 충돌합니다.

PC의 PowerShell에서 `Ctrl+C`로 agent.js 종료.

### C. 텔레그램 테스트
텔레그램에서 `/start` 전송 → 답변 오면 성공!

---

## 5단계: 자동 발행 다시 켜기

Railway로 이관 후, 텔레그램에서 다시:
```
/자동발행
```

매일 오전 9시 자동 초안 생성이 다시 활성화됩니다.

---

## 운영 팁

### 코드 수정 시
1. 로컬에서 파일 수정
2. GitHub Desktop으로 커밋 & 푸시
3. Railway가 자동으로 감지하고 재배포

### 로그 확인
Railway 대시보드에서 언제든 실시간 로그 볼 수 있습니다.

### 비용 관리
- Hobby Plan: 월 $5
- 사용량 기준 과금이지만 봇은 거의 리소스를 안 써서 $5 내외
- Railway 대시보드에서 남은 크레딧 확인 가능

### 토큰 만료 시
로컬에서:
1. `node setup-threads.js` 또는 `node setup-linkedin.js` 실행해서 새 토큰 발급
2. Railway **Variables** 탭에서 해당 환경변수 값 업데이트
3. 자동으로 재배포됨

---

## 문제 해결

### 배포 실패 시
- **Deployments** 탭에서 로그 확인
- 환경변수 누락이 가장 흔한 원인
- `.env.example` 파일 참고해서 필수 변수 모두 설정했는지 확인

### 텔레그램 "Conflict" 에러
- 로컬 agent.js가 아직 실행 중일 가능성
- PowerShell에서 `Ctrl+C`로 종료 후 Railway만 사용

### 로그가 멈춘 것처럼 보일 때
- 텔레그램 메시지가 없을 때는 폴링만 하므로 로그가 적을 수 있음
- `/start` 보내면 `[수신] /start` 로그 뜸
