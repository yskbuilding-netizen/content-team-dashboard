// 방금 발행한 스레드 + 링크드인 게시물 삭제
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const THREADS_ID = '18133679029563729';
const LINKEDIN_URN = 'urn:li:share:7460820842587852800';

const THREADS_API = 'https://graph.threads.net/v1.0';
const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN;

const LI_API = 'https://api.linkedin.com/v2';
const LI_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

(async () => {
  console.log('\n🗑️ 발행 게시물 삭제\n');

  // 1) Threads
  console.log('1️⃣ 스레드 삭제 시도...');
  try {
    const r = await fetch(`${THREADS_API}/${THREADS_ID}?access_token=${THREADS_TOKEN}`, { method: 'DELETE' });
    if (r.ok) console.log('  ✅ 스레드 삭제 완료');
    else {
      console.log(`  ⚠️ Threads API 삭제 미지원 (${r.status})`);
      console.log(`  → 수동: https://www.threads.net/@bsn__official/post/${THREADS_ID}`);
      console.log('    (게시물 우측 상단 "..." → 삭제)');
    }
  } catch (e) { console.log('  ❌', e.message); }

  // 2) LinkedIn
  console.log('\n2️⃣ 링크드인 삭제 시도...');
  try {
    const r = await fetch(`${LI_API}/ugcPosts/${encodeURIComponent(LINKEDIN_URN)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${LI_TOKEN}`, 'X-Restli-Protocol-Version': '2.0.0' }
    });
    if (r.ok || r.status === 204) console.log('  ✅ 링크드인 삭제 완료');
    else {
      const text = await r.text();
      console.log(`  ⚠️ 삭제 실패 (${r.status}): ${text.slice(0, 200)}`);
    }
  } catch (e) { console.log('  ❌', e.message); }
})();
