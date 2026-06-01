// WP Mail SMTP — Gmail SMTP 자동 설정
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

// Gmail 설정 (CLI로 받음)
const GMAIL_USER = process.argv[2] || 'bsn.building@gmail.com';
const GMAIL_APP_PASSWORD = (process.argv[3] || '').replace(/\s+/g, '');
const FROM_NAME = process.argv[4] || 'BSN GROUP';

if (!GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD.length !== 16) {
  console.error('❌ Gmail App Password 16자리가 필요합니다');
  console.error('사용법: node configure-mail-smtp.js <gmail> <app_password> [from_name]');
  process.exit(1);
}

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
  console.log('\n📧 Gmail SMTP 자동 연결\n');
  console.log(`발신자: ${GMAIL_USER}`);
  console.log(`표시명: ${FROM_NAME}\n`);

  // Code Snippets로 wp_mail_smtp 옵션 직접 업데이트
  const phpCode = `// WP Mail SMTP 설정 자동 적용 (1회 실행 후 비활성화)
add_action('init', function() {
    if (get_option('bsn_smtp_configured') === 'yes') return;

    $opts = array(
        'mail' => array(
            'from_email' => '${GMAIL_USER}',
            'from_name'  => '${FROM_NAME.replace(/'/g, "\\'")}',
            'mailer'     => 'smtp',
            'return_path' => true,
            'from_email_force' => true,
            'from_name_force'  => true,
        ),
        'smtp' => array(
            'host'       => 'smtp.gmail.com',
            'port'       => 465,
            'encryption' => 'ssl',
            'auth'       => true,
            'user'       => '${GMAIL_USER}',
            'pass'       => '${GMAIL_APP_PASSWORD}',
            'autotls'    => true,
        ),
        'general' => array(
            'do_not_send' => false,
        ),
    );
    update_option('wp_mail_smtp', $opts);
    update_option('bsn_smtp_configured', 'yes');
}, 99);

// 테스트 메일 발송 (1회만)
add_action('init', function() {
    if (get_option('bsn_smtp_test_sent') === 'yes') return;

    $sent = wp_mail(
        '${GMAIL_USER}',
        '[BSN] WP Mail SMTP 연결 테스트',
        "워드프레스 SMTP 연결이 정상 작동합니다.\\n\\n발송 시각: " . current_time('Y-m-d H:i:s')
    );

    if ($sent) {
        update_option('bsn_smtp_test_sent', 'yes');
        update_option('bsn_smtp_test_result', 'success');
    } else {
        update_option('bsn_smtp_test_result', 'failed');
    }
}, 100);`;

  // 기존 스니펫 확인 후 추가/업데이트
  const list = await api('GET', '/code-snippets/v1/snippets');
  let existingId = null;
  if (list.ok && Array.isArray(list.data)) {
    const found = list.data.find(s => s.name === 'BSN Mail SMTP Config');
    if (found) existingId = found.id;
  }

  // 기존 플래그 리셋해서 재실행 가능하게
  const resetCode = `delete_option('bsn_smtp_configured'); delete_option('bsn_smtp_test_sent'); delete_option('bsn_smtp_test_result');`;
  console.log('1️⃣ Gmail SMTP 옵션 등록 중...');

  const payload = {
    name: 'BSN Mail SMTP Config',
    desc: 'WP Mail SMTP Gmail 자동 설정 + 테스트 메일',
    code: phpCode,
    scope: 'global',
    active: true,
    tags: ['mail', 'smtp']
  };

  const r = existingId
    ? await api('POST', `/code-snippets/v1/snippets/${existingId}`, payload)
    : await api('POST', '/code-snippets/v1/snippets', payload);

  if (!r.ok) {
    console.log('❌ 스니펫 등록 실패:', JSON.stringify(r.data).slice(0, 200));
    process.exit(1);
  }
  console.log('  ✅ 스니펫 등록');

  // 트리거: 사이트 호출
  console.log('\n2️⃣ 설정 적용 + 테스트 메일 트리거...');
  for (let i = 0; i < 3; i++) {
    await fetch(WP_SITE_URL + '?cb=' + Date.now());
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('  ✅ 설정 적용 완료\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📬 확인 방법');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${GMAIL_USER} 받은편지함 확인`);
  console.log(`  제목: [BSN] WP Mail SMTP 연결 테스트`);
  console.log('  (스팸함도 같이 확인하세요)\n');
  console.log('  메일 도착했으면 SMTP 연결 성공.');
  console.log('  앞으로 비밀번호 분실 메일 + WP 알림 메일 다 정상 발송됩니다.\n');
})();
