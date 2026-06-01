// 링크드인 OAuth 토큰 자동 발급 (로컬 서버 실행)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const http = require('http');
const { URL } = require('url');
const readline = require('readline');

// 링크드인 개발자 앱에서 확인한 값
const CLIENT_ID = '8641dpe5581ehw';
const REDIRECT_URI = 'https://localhost/';
const SCOPES = 'openid profile email w_member_social';

// STEP 1: 인증 URL 출력
const state = Math.random().toString(36).substring(7);
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(SCOPES)}`;

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔗 링크드인 OAuth 토큰 발급');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('1단계: 아래 URL을 브라우저에 붙여넣어 접속하세요:');
console.log('');
console.log(authUrl);
console.log('');
console.log('2단계: 링크드인에서 "Allow" 버튼 클릭');
console.log('');
console.log('3단계: 브라우저가 https://localhost/?code=... 로 이동합니다');
console.log('       (페이지 로딩 실패 메시지가 나와도 정상입니다)');
console.log('');
console.log('4단계: 주소창의 전체 URL을 복사해서 아래에 붙여넣으세요');
console.log('       (https://localhost/?code=xxx&state=yyy 형태)');
console.log('');

// STEP 2: 사용자가 입력한 URL에서 code 추출 → 토큰 교환
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📥 리다이렉트된 URL 전체 붙여넣기: ', async (inputUrl) => {
  rl.question('🔑 Client Secret 붙여넣기 (.env에 저장 안된 경우): ', async (clientSecret) => {
    rl.close();

    try {
      const url = new URL(inputUrl.trim());
      const code = url.searchParams.get('code');

      if (!code) {
        console.error('❌ URL에 code가 없습니다. 다시 시도해주세요.');
        process.exit(1);
      }

      console.log('');
      console.log('⏳ 액세스 토큰 교환 중...');

      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: clientSecret.trim()
        })
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error('❌ 토큰 교환 실패:', tokenData.error_description || tokenData.error);
        process.exit(1);
      }

      const accessToken = tokenData.access_token;
      console.log('✅ 액세스 토큰 발급 성공!');
      console.log('');

      // 사용자 정보 조회
      console.log('⏳ 사용자 정보 조회 중...');
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const userData = await userRes.json();

      console.log('✅ 사용자 정보 조회 성공!');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 계정 정보:');
      console.log(`   이름: ${userData.name}`);
      console.log(`   이메일: ${userData.email}`);
      console.log(`   User ID (sub): ${userData.sub}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📝 .env 파일에 다음 내용을 추가하세요:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`LINKEDIN_ACCESS_TOKEN=${accessToken}`);
      console.log(`LINKEDIN_USER_ID=${userData.sub}`);
      console.log(`LINKEDIN_NAME=${userData.name}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('💡 토큰은 2개월간 유효합니다.');
      console.log('');
    } catch (err) {
      console.error('❌ 에러:', err.message);
      process.exit(1);
    }
  });
});
