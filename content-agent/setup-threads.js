// Threads 연결 테스트 + User ID 자동 확인
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const TOKEN = process.env.THREADS_ACCESS_TOKEN;

(async () => {
  console.log('');
  console.log('🔍 Threads 연결 테스트 시작...');
  console.log('');

  if (!TOKEN || TOKEN.includes('붙여넣기') || TOKEN.length < 20) {
    console.error('❌ .env 파일에 THREADS_ACCESS_TOKEN이 제대로 입력되지 않았습니다.');
    console.error('   현재 값 길이:', TOKEN ? TOKEN.length : 0);
    process.exit(1);
  }

  try {
    const res = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${TOKEN}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('❌ API 에러:', data.error.message);
      console.error('   → 토큰이 유효하지 않거나 만료되었습니다.');
      process.exit(1);
    }

    console.log('✅ Threads 연결 성공!');
    console.log('');
    console.log('📋 계정 정보:');
    console.log(`   User ID: ${data.id}`);
    console.log(`   Username: @${data.username}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 .env 파일에 다음을 추가하세요:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`THREADS_USER_ID=${data.id}`);
    console.log(`THREADS_USERNAME=${data.username}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('💡 위 두 줄을 .env 파일에 추가하고 저장하세요.');
    console.log('   (THREADS_ACCESS_TOKEN은 이미 있으니 그대로 두세요)');
    console.log('');
  } catch (err) {
    console.error('❌ 요청 실패:', err.message);
    process.exit(1);
  }
})();
