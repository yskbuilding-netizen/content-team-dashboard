// 네이버 서치 어드바이저 인증 100% 자동 설정
// 1) Code Snippets 플러그인 자동 설치/활성화
// 2) Naver 메타 태그 스니펫 자동 생성/활성화
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

const NAVER_CODE = 'b1c2a57e86a41909a6d3cd4d544315b4dc8501e8';

const auth = 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${WP_SITE_URL}${path.startsWith('/wp-json') ? path : '/wp-json' + path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': auth },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function installPlugin(slug) {
  const r = await api('POST', '/wp/v2/plugins', { slug, status: 'active' });
  if (r.ok) return { ok: true, msg: '설치+활성화 완료' };
  if (r.status === 400 || r.status === 409 || JSON.stringify(r.data).includes('exists') || JSON.stringify(r.data).includes('folder_exists')) {
    // 이미 있으면 활성화만 시도
    const list = await api('GET', '/wp/v2/plugins');
    if (list.ok && Array.isArray(list.data)) {
      const found = list.data.find(p => p.plugin && p.plugin.startsWith(slug + '/'));
      if (found) {
        const act = await api('PUT', '/wp/v2/plugins/' + found.plugin, { status: 'active' });
        if (act.ok) return { ok: true, msg: '이미 설치됨, 활성화 완료' };
      }
    }
  }
  return { ok: false, msg: JSON.stringify(r.data).slice(0, 200) };
}

(async () => {
  console.log('\n🚀 네이버 SEO 100% 자동 설정\n━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📌 사이트: ${WP_SITE_URL}\n`);

  // Step 1: Code Snippets 설치
  console.log('1️⃣ Code Snippets 플러그인 설치 중...');
  const inst = await installPlugin('code-snippets');
  if (!inst.ok) {
    console.log('  ❌ 설치 실패:', inst.msg);
    process.exit(1);
  }
  console.log('  ✅', inst.msg);

  // Step 2: Code Snippets REST API로 스니펫 추가
  console.log('\n2️⃣ Naver 메타 태그 스니펫 등록 중...');

  const snippetCode = `add_action('wp_head', function() {
    echo '<meta name="naver-site-verification" content="${NAVER_CODE}" />' . "\\n";
}, 1);`;

  // 기존 스니펫 확인
  const list = await api('GET', '/code-snippets/v1/snippets');
  let existingId = null;
  if (list.ok && Array.isArray(list.data)) {
    const found = list.data.find(s => s.name === 'BSN Naver Verification');
    if (found) existingId = found.id;
  }

  const payload = {
    name: 'BSN Naver Verification',
    desc: '네이버 서치 어드바이저 사이트 확인 메타 태그',
    code: snippetCode,
    scope: 'global',
    active: true,
    tags: ['naver', 'seo']
  };

  let r;
  if (existingId) {
    r = await api('POST', `/code-snippets/v1/snippets/${existingId}`, payload);
  } else {
    r = await api('POST', '/code-snippets/v1/snippets', payload);
  }

  if (!r.ok) {
    console.log('  ❌ 스니펫 등록 실패:', JSON.stringify(r.data).slice(0, 300));
    console.log('\n  📋 매뉴얼 백업: 워드프레스 → Snippets → Add New → 아래 코드 붙여넣기:');
    console.log('  ─────────────────');
    console.log(snippetCode);
    console.log('  ─────────────────');
    process.exit(1);
  }
  console.log('  ✅ 스니펫 생성 완료, ID:', r.data.id);

  // 활성화 확인
  if (!r.data.active) {
    console.log('  ↻ 활성화 시도...');
    const act = await api('POST', `/code-snippets/v1/snippets/${r.data.id}/activate`);
    if (act.ok) console.log('  ✅ 활성화 완료');
    else console.log('  ⚠️ 활성화 실패, 수동 활성화 필요');
  }

  // Step 3: 검증
  console.log('\n3️⃣ 메타 태그 적용 확인 중...');
  await new Promise(r => setTimeout(r, 1500));
  const homeRes = await fetch(WP_SITE_URL);
  const html = await homeRes.text();
  if (html.includes(NAVER_CODE)) {
    console.log('  ✅ 메타 태그가 사이트에 노출되고 있습니다!');
  } else {
    console.log('  ⚠️ 메타 태그가 아직 안 보임. 캐시 문제일 수 있음.');
    console.log('     워드프레스 캐시 삭제 후 재확인하세요.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 자동 설정 완료!\n');
  console.log('📋 마지막 한 번:');
  console.log('  1. 네이버 서치 어드바이저 → "확인" 버튼 클릭');
  console.log('  2. 통과되면 사이트맵 제출:');
  console.log(`     ${WP_SITE_URL}/sitemap_index.xml\n`);
})();
