// 네이버 블로그 전체 글 크롤링 → txt 파일로 저장
const fs = require('fs');
const path = require('path');

const BLOG_ID = 'yskim__';
const CUTOFF_DATE = new Date('2022-04-01');

// 제외 키워드
const EXCLUDE_KEYWORDS = [
  '모집', '레터', '뉴스레터', '구독자 모집', '신청', '접수', '마감',
  '추첨', '이벤트', '경품', '빌라 매매', '빌라 매물', '주택 매매',
  '주택 매물', '아파트 매물', '매물 소개', '매물 안내', '급매', '급매물',
  '다세대', '다가구 매매', '원룸 매매', '투룸 매매', '매물 홍보'
];

function cleanHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 개별 포스트 전체 본문 가져오기
async function getFullPost(logNo) {
  const urls = [
    `https://blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true`,
    `https://m.blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${logNo}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9'
        }
      });

      if (!res.ok) continue;
      const html = await res.text();

      // 여러 패턴으로 본문 추출 시도
      let content = '';

      // 패턴 1: SE 에디터 전체 텍스트 블록들
      const seTexts = html.match(/class="se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|span)>/gi);
      if (seTexts && seTexts.length > 0) {
        content = seTexts.map(t => cleanHtml(t)).join('\n');
      }

      // 패턴 2: se-main-container 전체
      if (!content || content.length < 100) {
        const mainMatch = html.match(/class="se-main-container">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
        if (mainMatch) content = cleanHtml(mainMatch[1]);
      }

      // 패턴 3: post_ct 또는 postViewArea
      if (!content || content.length < 100) {
        const pvMatch = html.match(/id="postViewArea">([\s\S]*?)<\/div>/);
        if (pvMatch) content = cleanHtml(pvMatch[1]);
      }

      // 패턴 4: 모든 se-component에서 텍스트 추출
      if (!content || content.length < 100) {
        const components = html.match(/class="se-component se-text[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi);
        if (components && components.length > 0) {
          content = components.map(c => cleanHtml(c)).join('\n\n');
        }
      }

      // 패턴 5: 가장 넓은 범위로 시도
      if (!content || content.length < 100) {
        const bodyMatch = html.match(/class="(?:se-main-container|post_ct|post-view|blog2_post)">([\s\S]*?)(?:<div class="(?:post_footer|blog2_post_footer|comment_area)"|<\/article>)/i);
        if (bodyMatch) content = cleanHtml(bodyMatch[1]);
      }

      if (content && content.length > 100) {
        return content;
      }

    } catch (err) {
      continue;
    }
  }

  return null;
}

(async () => {
  const outputDir = path.join(__dirname, 'columns', 'naver-posts');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 기존 파일 삭제
  const oldFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.txt'));
  if (oldFiles.length > 0) {
    oldFiles.forEach(f => fs.unlinkSync(path.join(outputDir, f)));
    console.log(`🗑️  기존 파일 ${oldFiles.length}개 삭제`);
  }

  console.log('');
  console.log('📥 네이버 블로그 전체 크롤링');
  console.log(`🌐 https://blog.naver.com/${BLOG_ID}`);
  console.log(`📅 2022년 4월 ~ 현재`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // RSS 피드로 글 목록 가져오기
  console.log('📡 RSS 피드 가져오는 중...');
  const rssUrl = `https://rss.blog.naver.com/${BLOG_ID}.xml`;

  try {
    const res = await fetch(rssUrl);
    if (!res.ok) throw new Error(`RSS 실패: ${res.status}`);
    const xml = await res.text();

    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    console.log(`📄 RSS에서 ${items.length}개 글 발견\n`);

    let count = 0;
    let skipped = 0;

    for (const item of items) {
      const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

      const title = titleMatch ? titleMatch[1].trim() : '제목없음';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = dateMatch ? dateMatch[1].trim() : '';

      // 날짜 필터
      const postDate = new Date(pubDate);
      if (postDate < CUTOFF_DATE) {
        console.log(`  ⬜ [스킵] ${title.slice(0, 40)} (2022.4 이전)`);
        skipped++;
        continue;
      }

      // 제외 키워드 필터
      const shouldExclude = EXCLUDE_KEYWORDS.some(kw => title.includes(kw));
      if (shouldExclude) {
        console.log(`  ⬜ [스킵] ${title.slice(0, 40)} (제외 대상)`);
        skipped++;
        continue;
      }

      // 포스트 번호 추출
      const logNoMatch = link.match(/\/(\d+)$/);
      if (!logNoMatch) continue;
      const logNo = logNoMatch[1];

      // 전체 본문 가져오기
      console.log(`  ⏳ [${count + 1}] ${title.slice(0, 45)}...`);
      const fullContent = await getFullPost(logNo);

      const dateStr = postDate.toISOString().split('T')[0];
      const safeName = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50).trim();
      const filename = `${dateStr}_${safeName}.txt`;
      const filepath = path.join(outputDir, filename);

      if (fullContent && fullContent.length > 100) {
        const fileContent = `제목: ${title}\n날짜: ${dateStr}\nURL: ${link}\n글자수: ${fullContent.length}자\n\n${'='.repeat(50)}\n\n${fullContent}`;
        fs.writeFileSync(filepath, fileContent, 'utf-8');
        count++;
        console.log(`  ✅ 저장 완료 (${fullContent.length}자)`);
      } else {
        console.log(`  ⚠️  본문 추출 실패 - URL: ${link}`);
      }

      // 네이버 차단 방지
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 저장: ${count}개`);
    console.log(`⬜ 스킵: ${skipped}개`);
    console.log('');
    console.log(`📂 저장 위치:`);
    console.log(`   ${outputDir}`);
    console.log('');

  } catch (err) {
    console.error('❌ 에러:', err.message);
    console.log(`💡 BLOG_ID 확인: https://blog.naver.com/${BLOG_ID}`);
    process.exit(1);
  }
})();
