// 부동산 정책 변화 주간 모니터링
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const POLICY_KEYWORDS = [
  '양도세 중과', '종합부동산세', '취득세 개편', '부동산 규제',
  'DSR 규제', '법인 부동산세', '상가임대차보호법', '임대료 규제',
  '국토교통부 발표', '부동산 세제', '대출 규제'
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = t => {
      const r = block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`));
      return r ? r[1].replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim() : '';
    };
    items.push({ title: get('title'), link: get('link'), pubDate: get('pubDate') });
  }
  return items;
}

async function notify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.log(msg); return; }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`).catch(() => {});
  try {
    await global.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (e) { console.error(e.message); }
}

async function run() {
  console.log('🏛️ 부동산 정책 변화 주간 모니터링');
  const all = [];
  for (const kw of POLICY_KEYWORDS) {
    try {
      const xml = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(kw)}&hl=ko&gl=KR&ceid=KR:ko`);
      const items = parseRSS(xml).slice(0, 5);
      all.push(...items.map(i => ({ ...i, keyword: kw })));
    } catch (e) { /* skip */ }
    await new Promise(r => setTimeout(r, 400));
  }

  // 중복 제거
  const seen = new Set();
  const unique = all.filter(i => { if (seen.has(i.title)) return false; seen.add(i.title); return true; });

  if (unique.length === 0) { console.log('정책 변화 없음'); return; }

  const newsText = unique.slice(0, 25).map(i => `[${i.keyword}] ${i.title}`).join('\n');

  const r = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `당신은 빌사남(상업용 빌딩 투자 전문가)을 위한 부동산 정책 분석 비서입니다.
이번 주 부동산 정책 변화 중 빌딩 시장에 직접 영향을 주는 것만 추려서 정리합니다.`,
    messages: [{
      role: 'user',
      content: `이번 주 부동산 정책 관련 뉴스 ${unique.length}건 중 빌딩 투자자가 꼭 알아야 할 정책 변화 3가지를 골라 정리.

${newsText}

형식:
🏛️ 이번 주 부동산 정책 변화

1. [정책명]
   → 변화 내용
   → 빌딩 시장 영향
   → 콘텐츠 소재 가능성

(반복)`
    }]
  });

  const today = new Date().toLocaleDateString('ko-KR');
  await notify(`📅 <b>${today} 주간 정책 브리핑</b>\n\n${r.content[0].text}`);
  console.log('✅ 완료');
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { run };
