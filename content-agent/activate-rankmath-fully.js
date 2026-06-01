// Rank Math 완전 초기화 + 사이트맵 활성화
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
  console.log('🚀 Rank Math 완전 초기화\n');

  const code = `// Rank Math 셋업 마법사 우회 + 모듈 풀 활성화
add_action('init', function() {
    // 1. 셋업 마법사 완료 처리
    update_option('rank_math_wizard_completed', true);
    update_option('rank_math_registration_skip', true);

    // 2. 모든 핵심 모듈 활성화
    $required_modules = array('sitemap', 'rich-snippet', 'seo-analysis', '404-monitor', 'redirections', 'role-manager', 'analytics', 'amp', 'instant-indexing');
    $modules = get_option('rank_math_modules', array());
    if (!is_array($modules)) $modules = array();
    foreach ($required_modules as $m) {
        if (!in_array($m, $modules)) $modules[] = $m;
    }
    update_option('rank_math_modules', $modules);

    // 3. 사이트맵 옵션 초기화
    $sitemap_opts = array(
        'items_per_page' => 200,
        'include_images' => 'on',
        'posts_sitemap' => 'on',
        'pages_sitemap' => 'on',
        'attachment_redirect_default' => 'on',
        'cat_archive_robots' => 'index follow'
    );
    update_option('rank-math-options-sitemap', $sitemap_opts);

    // 4. 일반 옵션
    $general = get_option('rank-math-options-general', array());
    if (!is_array($general)) $general = array();
    $general['naver_verify'] = 'b1c2a57e86a41909a6d3cd4d544315b4dc8501e8';
    update_option('rank-math-options-general', $general);

    // 5. 리라이트 규칙 강제 갱신
    if (function_exists('flush_rewrite_rules')) {
        flush_rewrite_rules(true);
    }
}, 99);

// Rank Math 사이트맵이 직접 핸들링하도록
add_action('parse_request', function($wp) {
    if (isset($_SERVER['REQUEST_URI']) && preg_match('#sitemap_index\\.xml#', $_SERVER['REQUEST_URI'])) {
        if (class_exists('RankMath\\\\Sitemap\\\\Router')) {
            $router = \\RankMath\\\\Sitemap\\\\Router::get();
            if (method_exists($router, 'serve_xml_sitemaps')) {
                $router->serve_xml_sitemaps();
            }
        }
    }
});`;

  const list = await api('GET', '/code-snippets/v1/snippets');
  let existingId = null;
  if (list.ok && Array.isArray(list.data)) {
    const found = list.data.find(s => s.name === 'BSN Rank Math Sitemap Enabler');
    if (found) existingId = found.id;
  }

  const payload = {
    name: 'BSN Rank Math Sitemap Enabler',
    desc: 'Rank Math 사이트맵 자동 활성화',
    code,
    scope: 'global',
    active: true,
    tags: ['seo', 'sitemap']
  };

  const r = existingId
    ? await api('POST', `/code-snippets/v1/snippets/${existingId}`, payload)
    : await api('POST', '/code-snippets/v1/snippets', payload);

  if (!r.ok) {
    console.log('❌', JSON.stringify(r.data).slice(0, 300));
    process.exit(1);
  }
  console.log('✅ 스니펫 업데이트 완료, ID:', r.data.id);

  console.log('\n⏳ 트리거 중 (3회)...');
  for (let i = 0; i < 3; i++) {
    await fetch(WP_SITE_URL + '/?cache_bust=' + Date.now());
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n📋 최종 점검:');
  const tests = [
    'sitemap_index.xml',
    'sitemap.xml',
    'wp-sitemap.xml',
    'wp-sitemap-posts-post-1.xml'
  ];
  for (const path of tests) {
    try {
      const r = await fetch(`${WP_SITE_URL}/${path}`);
      const ct = r.headers.get('content-type') || '';
      const isXml = ct.includes('xml');
      const text = isXml ? (await r.text()).slice(0, 100).replace(/\s+/g, ' ') : '';
      console.log(`  ${r.ok && isXml ? '✅' : '❌'} /${path} → ${r.status} ${isXml ? 'XML' : 'HTML'}`);
      if (text) console.log(`     ${text}...`);
    } catch (e) {
      console.log(`  ❌ /${path} → ${e.message}`);
    }
  }
})();
