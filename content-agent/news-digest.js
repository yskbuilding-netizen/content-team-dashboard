// 매일 아침 부동산 뉴스 요약 → 텔레그램 발송
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const Anthropic = require('@anthropic-ai/sdk');
const NewsScraper = require('./news-scraper');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function notify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('⚠️ 텔레그램 미설정. 콘솔 출력:');
    console.log(msg);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (e) { console.error('TG 실패:', e.message); }
}

async function summarize(news) {
  const newsText = news.slice(0, 15).map(n =>
    `[${n.source || n.keyword}] ${n.title}\n${n.link}`
  ).join('\n\n');

  const r = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `당신은 빌사남(상업용 빌딩 투자 전문가)에게 매일 아침 부동산 뉴스를 정리해주는 비서입니다.
- 빌사남이 관심 있는 주제만: 상업용 빌딩, 꼬마빌딩, 사옥 매입, 상권 변화, 임대 트렌드, 부동산 정책
- 주택(아파트·전세) 관련 뉴스는 제외
- 콘텐츠 소재로 쓸만한 것 우선
- 한국어, 간결한 톤`,
    messages: [{
      role: 'user',
      content: `오늘 부동산 뉴스 ${news.length}건 중 빌사남이 꼭 봐야 할 5개를 골라 요약하세요.

[뉴스 목록]
${newsText}

다음 형식으로:
🏢 오늘의 부동산 핵심 뉴스 5

1. [출처] 핵심 제목
   → 빌사남 관점 한 줄 (왜 중요한지)
   → 콘텐츠 소재 가능성: ○○○

(이하 반복)

마지막에:
📌 오늘 콘텐츠 추천 주제: (1개)`
    }]
  });
  return r.content[0].text;
}

async function run() {
  console.log('📰 부동산 뉴스 요약 시작');
  const news = await NewsScraper.fetchAll();
  if (news.length === 0) { console.log('뉴스 없음'); return; }

  const summary = await summarize(news);
  const today = new Date().toLocaleDateString('ko-KR');
  await notify(`📅 <b>${today} 부동산 브리핑</b>\n\n${summary}`);
  console.log('✅ 발송 완료');
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { run };
