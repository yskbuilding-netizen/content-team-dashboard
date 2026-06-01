// Bing Webmaster 인증 메타 태그 자동 삽입
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

const BING_CODE = 'C00C6CF1ED5A3758DEE4BE3C145C25DD';

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
  console.log('🚀 Bing 인증 메타 태그 등록\n');

  const code = `add_action('wp_head', function() {
    echo '<meta name="msvalidate.01" content="${BING_CODE}" />' . "\\n";
}, 1);`;

  const list = await api('GET', '/code-snippets/v1/snippets');
  let existingId = null;
  if (list.ok && Array.isArray(list.data)) {
    const found = list.data.find(s => s.name === 'BSN Bing Verification');
    if (found) existingId = found.id;
  }

  const payload = {
    name: 'BSN Bing Verification',
    desc: 'Bing 웹마스터 사이트 확인 메타 태그',
    code,
    scope: 'global',
    active: true,
    tags: ['bing', 'seo']
  };

  const r = existingId
    ? await api('POST', `/code-snippets/v1/snippets/${existingId}`, payload)
    : await api('POST', '/code-snippets/v1/snippets', payload);

  if (!r.ok) {
    console.log('❌', JSON.stringify(r.data).slice(0, 300));
    process.exit(1);
  }
  console.log('✅ 스니펫 등록 완료, ID:', r.data.id);

  await new Promise(r => setTimeout(r, 1500));
  const homeRes = await fetch(WP_SITE_URL);
  const html = await homeRes.text();
  if (html.includes(BING_CODE)) {
    console.log('✅ Bing 메타 태그가 사이트에 노출되고 있습니다!');
    console.log('\n👉 Bing Webmaster Tools에서 "검증" 버튼 클릭하세요.');
  } else {
    console.log('⚠️ 아직 노출 안 됨. 캐시 문제일 수 있음.');
  }
})();
