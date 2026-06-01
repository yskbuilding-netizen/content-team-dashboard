// Rank Math 사이트맵 모듈 자동 활성화
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
  console.log('🚀 Rank Math 사이트맵 모듈 활성화\n');

  // 코드 스니펫 등록: rank_math_modules 옵션에 sitemap 추가
  const code = `add_action('init', function() {
    $modules = get_option('rank_math_modules', array());
    if (!is_array($modules)) $modules = array();
    if (!in_array('sitemap', $modules)) {
        $modules[] = 'sitemap';
        update_option('rank_math_modules', $modules);
        flush_rewrite_rules(false);
    }
}, 5);

// Rank Math 옵션 강제 활성화
add_action('init', function() {
    $opts = get_option('rank-math-options-sitemap', array());
    if (!is_array($opts)) $opts = array();
    $opts['items_per_page'] = 200;
    $opts['include_images'] = 'on';
    $opts['posts_sitemap'] = 'on';
    $opts['pages_sitemap'] = 'on';
    update_option('rank-math-options-sitemap', $opts);
}, 6);`;

  // 기존 스니펫 확인
  const list = await api('GET', '/code-snippets/v1/snippets');
  let existingId = null;
  if (list.ok && Array.isArray(list.data)) {
    const found = list.data.find(s => s.name === 'BSN Rank Math Sitemap Enabler');
    if (found) existingId = found.id;
  }

  const payload = {
    name: 'BSN Rank Math Sitemap Enabler',
    desc: 'Rank Math 사이트맵 모듈 자동 활성화',
    code,
    scope: 'global',
    active: true,
    tags: ['seo', 'sitemap']
  };

  let r;
  if (existingId) {
    r = await api('POST', `/code-snippets/v1/snippets/${existingId}`, payload);
  } else {
    r = await api('POST', '/code-snippets/v1/snippets', payload);
  }

  if (!r.ok) {
    console.log('❌ 스니펫 등록 실패:', JSON.stringify(r.data).slice(0, 300));
    process.exit(1);
  }
  console.log('✅ 스니펫 생성 완료, ID:', r.data.id);

  // 사이트 한 번 호출해서 init 실행 트리거
  console.log('\n⏳ 사이트맵 생성 트리거 중...');
  await fetch(WP_SITE_URL);
  await new Promise(r => setTimeout(r, 3000));

  // 검증
  const tests = [
    'sitemap_index.xml',
    'sitemap.xml',
    'wp-sitemap.xml'
  ];
  console.log('\n📋 사이트맵 URL 점검:');
  for (const path of tests) {
    try {
      const r = await fetch(`${WP_SITE_URL}/${path}`);
      const ct = r.headers.get('content-type') || '';
      const isXml = ct.includes('xml');
      console.log(`  ${r.ok && isXml ? '✅' : '❌'} ${WP_SITE_URL}/${path} → ${r.status} ${ct}`);
    } catch (e) {
      console.log(`  ❌ ${path} → ${e.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 작동하는 URL을 네이버에 입력하세요');
})();
