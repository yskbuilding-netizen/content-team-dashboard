// BSN 마스터 스케줄러 — 모든 자동화 작업 통합 운영
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const cron = require('node-cron');

const newsDigest = require('./news-digest');
const dailyAgent = require('./daily-agent');
const youtubeMonitor = require('./youtube-monitor');
const policyWatch = require('./policy-watch');
const wpComments = require('./wp-comments');

async function notify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch {}
}

function safe(name, fn) {
  return async () => {
    console.log(`\n⏰ [${new Date().toLocaleString('ko-KR')}] ${name} 시작`);
    try { await fn(); } catch (e) {
      console.error(`${name} 실패:`, e.message);
      await notify(`❌ ${name} 실패\n${e.message}`);
    }
  };
}

// ── 스케줄 ──
// 평일 07:00 — 부동산 뉴스 일일 브리핑
cron.schedule('0 7 * * 1-5', safe('뉴스 브리핑', newsDigest.run), { timezone: 'Asia/Seoul' });

// 평일 09:00 — 일일 콘텐츠 자동 생성 (메인)
cron.schedule('0 9 * * 1-5', safe('일일 콘텐츠', dailyAgent.runDaily), { timezone: 'Asia/Seoul' });

// 평일 10:00 — 빌사남TV 새 영상 체크
cron.schedule('0 10 * * 1-5', safe('빌사남TV 모니터', async () => {
  const r = await youtubeMonitor.checkBsnNew();
  if (r.newVideos.length > 0) {
    const msg = `📺 빌사남TV 새 영상\n\n` + r.newVideos.map(v => `• ${v.title}\n  ${v.url}`).join('\n\n');
    await notify(msg);
  }
}), { timezone: 'Asia/Seoul' });

// 매 시간 — 워드프레스 댓글 체크
cron.schedule('15 * * * *', safe('WP 댓글', wpComments.run), { timezone: 'Asia/Seoul' });

// 월요일 08:00 — 주간 정책 변화 모니터링
cron.schedule('0 8 * * 1', safe('주간 정책', policyWatch.run), { timezone: 'Asia/Seoul' });

console.log(`\n🚀 BSN 마스터 스케줄러 가동 (KST)\n`);
console.log('  📰 평일 07:00  뉴스 일일 브리핑');
console.log('  ✍️ 평일 09:00  콘텐츠 자동 생성 → 워드프레스 임시저장');
console.log('  📺 평일 10:00  빌사남TV 새 영상 모니터');
console.log('  💬 매 시간 15분  워드프레스 댓글 체크');
console.log('  🏛️ 월요일 08:00  주간 정책 변화 정리\n');
console.log('  (Ctrl+C로 종료)\n');

notify(`🚀 BSN 자동화 스케줄러 가동\n\n📰 평일 07:00 뉴스 브리핑\n✍️ 평일 09:00 콘텐츠 생성\n📺 평일 10:00 빌사남TV 모니터\n💬 매시간 댓글 체크\n🏛️ 월요일 08:00 정책 변화`);

process.stdin.resume();
