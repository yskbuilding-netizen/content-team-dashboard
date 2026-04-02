@echo off
echo =========================================
echo 🚀 콘텐츠 팀 서버 설정 및 실행
echo =========================================

cd server

echo 📦 의존성 패키지 설치 중...
call npm install

echo.
echo ✅ 설치 완료!
echo.
echo 🔧 환경 설정:
echo 1. .env 파일에 API 키를 입력해주세요
echo    - ANTHROPIC_API_KEY (Claude AI)
echo    - OPENAI_API_KEY (ChatGPT)  
echo    - INSTAGRAM_ACCESS_TOKEN (Instagram)
echo.
echo 🌐 서버 시작 중...
call npm start

pause