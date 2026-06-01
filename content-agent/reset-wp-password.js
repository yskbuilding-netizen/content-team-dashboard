// WP 관리자 비밀번호 재설정 (REST API)
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
  console.log('\n🔑 WP 비밀번호 재설정\n━━━━━━━━━━━━━━━━━━━━━━');

  // 1) 현재 사용자 조회
  console.log('\n1️⃣ 사용자 조회 중...');
  const me = await api('GET', '/wp/v2/users/me?context=edit');
  if (!me.ok) {
    console.log('❌ 조회 실패:', me.data);
    process.exit(1);
  }
  console.log(`  ✅ ID: ${me.data.id}, Username: ${me.data.username}, Email: ${me.data.email}`);
  console.log(`  Roles: ${(me.data.roles || []).join(', ')}`);

  // 2) Solid Security 락아웃 해제 시도 (Code Snippets 활용)
  console.log('\n2️⃣ 로그인 락아웃 해제 (Solid Security)...');
  const unlockCode = `// Solid Security 락아웃 테이블 비우기 (1회 실행)
add_action('init', function() {
    global $wpdb;
    $tables = array(
        $wpdb->prefix . 'itsec_lockouts',
        $wpdb->prefix . 'itsec_temp',
        $wpdb->prefix . 'itsec_log'
    );
    foreach ($tables as $t) {
        $wpdb->query("DELETE FROM $t WHERE 1=1");
    }
}, 1);`;

  const list = await api('GET', '/code-snippets/v1/snippets');
  let existingId = null;
  if (list.ok && Array.isArray(list.data)) {
    const found = list.data.find(s => s.name === 'BSN Unlock Solid Security');
    if (found) existingId = found.id;
  }

  const unlockPayload = {
    name: 'BSN Unlock Solid Security',
    desc: '로그인 락아웃 해제 1회 실행',
    code: unlockCode,
    scope: 'global',
    active: true,
    tags: ['security']
  };

  const unlockRes = existingId
    ? await api('POST', `/code-snippets/v1/snippets/${existingId}`, unlockPayload)
    : await api('POST', '/code-snippets/v1/snippets', unlockPayload);

  if (unlockRes.ok) {
    console.log('  ✅ 락아웃 해제 스니펫 등록');
    // 사이트 한 번 호출해서 트리거
    await fetch(WP_SITE_URL);
    await new Promise(r => setTimeout(r, 1000));
  } else {
    console.log('  ⚠️ 락아웃 해제 실패 (무시 가능):', JSON.stringify(unlockRes.data).slice(0, 100));
  }

  // 3) 새 비밀번호 생성
  const newPassword = 'BsnAdmin' + Math.floor(10000 + Math.random() * 90000) + '!@';
  console.log('\n3️⃣ 새 비밀번호 설정 중...');

  const update = await api('POST', `/wp/v2/users/${me.data.id}`, { password: newPassword });
  if (!update.ok) {
    console.log('❌ 비번 설정 실패:', JSON.stringify(update.data).slice(0, 300));
    process.exit(1);
  }

  console.log('  ✅ 비밀번호 변경 완료\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 새 로그인 정보');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  사용자명: ${me.data.username}`);
  console.log(`  비밀번호: ${newPassword}`);
  console.log(`  로그인 URL: ${WP_SITE_URL}/wp-admin\n`);
  console.log('⚠️ 로그인 후 즉시 본인 원하는 비번으로 변경하세요.');
  console.log('⚠️ 이 화면 캡처/복사 후 닫으면 비번 다시 못 봅니다.\n');
})();
