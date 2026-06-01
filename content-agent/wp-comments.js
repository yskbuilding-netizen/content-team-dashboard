// 워드프레스 댓글 모니터링 + 텔레그램 알림
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;
const auth = 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');

const SEEN_FILE = path.join(__dirname, '.wp-comments-seen.json');

async function notify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.log(msg); return; }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (e) { console.error(e.message); }
}

async function run() {
  const r = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/comments?per_page=20&orderby=date&order=desc&status=any`, {
    headers: { 'Authorization': auth }
  });
  if (!r.ok) { console.error('WP API 실패'); return; }
  const comments = await r.json();

  let seen = [];
  if (fs.existsSync(SEEN_FILE)) {
    try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf-8')); } catch {}
  }
  const seenIds = new Set(seen);

  const newComments = comments.filter(c => !seenIds.has(c.id));
  if (newComments.length === 0) { console.log('새 댓글 없음'); return; }

  // 새 댓글 알림
  for (const c of newComments) {
    const content = c.content.rendered.replace(/<[^>]+>/g, '').trim().slice(0, 300);
    const author = c.author_name || '익명';
    const status = c.status === 'approved' ? '✅ 승인' : '⏳ 대기';
    const msg = `💬 <b>새 댓글</b> (${status})\n\n작성자: ${author}\n\n${content}\n\n관리: ${WP_SITE_URL}/wp-admin/edit-comments.php`;
    await notify(msg);
  }

  // 히스토리 업데이트
  const updated = [...new Set([...comments.map(c => c.id), ...seen])].slice(0, 200);
  fs.writeFileSync(SEEN_FILE, JSON.stringify(updated), 'utf-8');
  console.log(`✅ 새 댓글 ${newComments.length}건 알림`);
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { run };
