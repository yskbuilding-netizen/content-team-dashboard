// WP Mail SMTP 플러그인 자동 설치
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

const auth = 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${WP_SITE_URL}/wp-json${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  console.log('\n📧 WP Mail SMTP 자동 설치\n');

  console.log('1️⃣ 플러그인 설치 + 활성화...');
  let r = await api('POST', '/wp/v2/plugins', { slug: 'wp-mail-smtp', status: 'active' });

  if (r.ok) {
    console.log('  ✅ 설치 완료');
  } else if (r.status === 400 || JSON.stringify(r.data).includes('exists')) {
    console.log('  ℹ️ 이미 설치됨, 활성화 시도...');
    const list = await api('GET', '/wp/v2/plugins');
    if (list.ok && Array.isArray(list.data)) {
      const found = list.data.find(p => p.plugin && p.plugin.includes('wp-mail-smtp'));
      if (found) {
        const act = await api('PUT', '/wp/v2/plugins/' + found.plugin, { status: 'active' });
        if (act.ok) console.log('  ✅ 활성화 완료');
      }
    }
  } else {
    console.log('  ❌ 설치 실패:', JSON.stringify(r.data).slice(0, 200));
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 다음 단계: Gmail App Password 발급\n');
  console.log('1. https://myaccount.google.com/security 접속');
  console.log('   → "2단계 인증" 켜져 있는지 확인');
  console.log('   (안 켜져있으면 켜야 App Password 메뉴가 나옴)\n');
  console.log('2. https://myaccount.google.com/apppasswords 접속');
  console.log('   → 앱 이름: "BSN WordPress" 입력');
  console.log('   → "만들기" 클릭');
  console.log('   → 16자리 비밀번호 복사 (공백 무시)\n');
  console.log('3. 16자리 App Password를 저한테 알려주세요');
  console.log('   예: abcd efgh ijkl mnop\n');
  console.log('   받으면 SMTP 자동 연결 + 테스트 메일 발송할게요.\n');
})();
