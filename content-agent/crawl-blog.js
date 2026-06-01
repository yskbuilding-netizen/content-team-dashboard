// 워드프레스 블로그 전체 글 크롤링 → txt 파일로 저장
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

function authHeader() {
  return `Basic ${Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64')}`;
}

function stripHtml(html) {
  return html
    .replace(/<h[1-6][^>]*>/g, '\n\n## ')
    .replace(/<\/h[1-6]>/g, '\n')
    .replace(/<p[^>]*>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<li[^>]*>/g, '• ')
    .replace(/<\/li>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

(async () => {
  const outputDir = path.join(__dirname, 'columns', 'blog-posts');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('');
  console.log('📥 워드프레스 블로그 크롤링 시작');
  console.log(`🌐 ${WP_SITE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  let page = 1;
  let totalPosts = 0;
  let allDone = false;

  while (!allDone) {
    try {
      const res = await fetch(
        `${WP_SITE_URL}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish,draft`,
        { headers: { 'Authorization': authHeader() } }
      );

      if (!res.ok) {
        if (res.status === 400) { allDone = true; break; }
        throw new Error(`API error ${res.status}`);
      }

      const posts = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) { allDone = true; break; }

      for (const post of posts) {
        const title = post.title.rendered.replace(/<[^>]*>/g, '').trim();
        const content = stripHtml(post.content.rendered);
        const date = post.date.split('T')[0];
        const status = post.status;

        // 파일명 생성 (특수문자 제거)
        const safeName = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50).trim();
        const filename = `${date}_${safeName}.txt`;
        const filepath = path.join(outputDir, filename);

        const fileContent = `제목: ${title}\n날짜: ${date}\n상태: ${status}\nURL: ${post.link}\n\n${'='.repeat(50)}\n\n${content}`;

        fs.writeFileSync(filepath, fileContent, 'utf-8');
        totalPosts++;
        console.log(`  ✅ [${totalPosts}] ${title}`);
      }

      const totalPages = res.headers.get('x-wp-totalpages');
      if (page >= parseInt(totalPages || '1')) { allDone = true; }
      page++;

    } catch (err) {
      console.error('에러:', err.message);
      allDone = true;
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📁 총 ${totalPosts}개 글 저장 완료!`);
  console.log(`📂 저장 위치: ${outputDir}`);
  console.log('');
})();
