// BSN 콘텐츠 제작팀 에이전트 — 매일 자동 실행
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const Generator = require('./generator');
const Publisher = require('./publisher');
const NewsScraper = require('./news-scraper');
const YouTubeMonitor = require('./youtube-monitor');
const { generateCardnews } = require('./cardnews-generator');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HISTORY_FILE = path.join(__dirname, '.agent-history.json');
const COLUMNS_DIR = path.join(__dirname, 'columns');
const OUT_DIR = path.join(__dirname, 'out');  // 일자별 산출물 폴더

// 오늘 산출물 폴더 생성 + 반환
function todayOutDir() {
  const d = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  const dir = path.join(OUT_DIR, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 안전한 파일명: 제목에서 위험 문자 제거
function safeName(s) {
  return (s || 'untitled').replace(/[\\/:*?"<>|\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// ── 히스토리 (중복 방지) ──
function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch { return []; }
}
function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 60), null, 2), 'utf-8');
}

// ── 빌사남 풀 컨텍스트 ──
function buildContext() {
  let ctx = '';
  const sg = path.join(COLUMNS_DIR, '스타일가이드.md');
  if (fs.existsSync(sg)) ctx += '[스타일 가이드]\n' + fs.readFileSync(sg, 'utf-8') + '\n\n';

  if (fs.existsSync(COLUMNS_DIR)) {
    const files = fs.readdirSync(COLUMNS_DIR)
      .filter(f => (f.endsWith('.txt') || f.endsWith('.md')) && f !== '스타일가이드.md')
      .map(f => ({ p: path.join(COLUMNS_DIR, f), m: fs.statSync(path.join(COLUMNS_DIR, f)).mtime }))
      .sort((a, b) => b.m - a.m)
      .slice(0, 5);

    ctx += '[빌사남 실제 칼럼·유튜브 대본 샘플 — 이 톤을 반드시 흡수할 것]\n';
    files.forEach(f => {
      const c = fs.readFileSync(f.p, 'utf-8').slice(0, 5000);
      ctx += `\n--- ${path.basename(f.p)} ---\n${c}\n`;
    });
  }

  ctx += `\n[빌사남 프로필]
- 김윤수, BSN 그룹 대표
- 상업용 빌딩 투자 전문가 (꼬마빌딩 ~ 중형 빌딩)
- 저서 "빌딩 투자의 모든 것"
- 채널: 유튜브 빌사남TV, 인스타 @bsn__official, 워드프레스 buildingpartner.co.kr
- 주요 활동 지역: 강남·성수·한남·압구정·청담·신사·도산공원
- 핵심 철학: 환금성, 입지, 임차 안정성, 사업으로서의 빌딩 투자
- 주택 얘기는 배제 (상업용 빌딩 전문)
`;

  return ctx;
}

// ── 텔레그램 알림 ──
async function notify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (e) { console.error('TG 알림 실패:', e.message); }
}

// ── 주제 추천 (콘텐츠 제작팀 시뮬레이션) ──
async function suggestTopic(context, news, recentTitles, trending, bsnRecent) {
  const newsText = news.slice(0, 12).map(n => `- [${n.source || n.keyword}] ${n.title}`).join('\n');
  const recentText = recentTitles.length ? recentTitles.slice(0, 15).map(t => `- ${t}`).join('\n') : '(없음)';
  const trendingText = trending.length ? trending.slice(0, 8).map(v => `- [${v.views.toLocaleString()}회 · ${v.channel}] ${v.title}`).join('\n') : '(없음)';
  const bsnText = bsnRecent.length ? bsnRecent.slice(0, 5).map(v => `- [${v.views.toLocaleString()}회] ${v.title}`).join('\n') : '(없음)';

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `당신은 빌사남(김윤수)의 콘텐츠 제작팀입니다.
빌사남의 책·유튜브 대본·실제 칼럼을 깊이 흡수했고, 사람들이 가장 관심 가질 주제를 골라냅니다.

[컨텍스트]
${context}

[작성 원칙]
- AI 느낌 절대 금지. 빌사남이 실제로 쓴 칼럼처럼 자연스러워야 함
- "~예요", "~죠", "~거든요" 같은 친근형 어미 (워드프레스/블로그용)
- 단정형 "~다" (스레드/링크드인용)
- 구체적 수치·지역명·실제 사례 반드시 포함
- 시의성 + 호기심 후크 강하게
- 일반론·진부한 표현·"분석해보겠습니다" 같은 AI 톤 금지

[금지 주제]
- 주택 관련 (아파트·전세·청약)
- 너무 큰 정책 일반론
- 최근 다뤘던 주제 회피`,
    messages: [{
      role: 'user',
      content: `오늘 발행할 콘텐츠 주제 1개를 선정하세요.

[오늘의 부동산 뉴스]
${newsText}

[부동산 유튜브 트렌딩 영상 — 사람들이 지금 관심 가는 주제]
${trendingText}

[빌사남TV 본인 채널 최근 영상]
${bsnText}

[최근 발행한 주제 — 피해야 함]
${recentText}

조건:
1. 빌사남 핵심 독자(상업용 빌딩 투자자·건물주·매수 검토자)에게 강한 후크
2. 구체적인 사례/수치/지역명을 활용할 수 있는 주제
3. 시의성 + 빌사남 시그니처 톤 가능
4. 최근 다룬 주제와 차별화
5. 트렌딩 영상에서 관심사 파악, 빌사남 본인 채널 톤·주제 흐름 고려
6. 트렌딩 영상 제목을 그대로 베끼지 말고 빌사남 시각으로 재해석

JSON으로만 응답 (마크다운 X):
{
  "title": "제목 (강력한 후크)",
  "topic": "주제 한 줄",
  "angle": "빌사남 관점에서 어떻게 풀지 (구체적으로)",
  "key_facts": ["사실/데이터 1", "사실/데이터 2", "사실/데이터 3"],
  "hook_reason": "왜 이 주제가 지금 관심을 받을지 (한 줄)",
  "source_inspiration": "주제를 어디서 영감 받았는지 (뉴스/트렌딩/본인채널)"
}`
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('주제 추천 JSON 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

// ── 일일 에이전트 메인 ──
async function runDaily() {
  const startTime = new Date();
  console.log(`\n🤖 BSN 콘텐츠 제작팀 가동 — ${startTime.toLocaleString('ko-KR')}\n`);
  await notify(`🤖 콘텐츠 제작팀 시작\n${startTime.toLocaleString('ko-KR')}`);

  try {
    // 1. 컨텍스트 빌드
    console.log('1️⃣ 빌사남 컨텍스트 로드 (책·유튜브·스타일가이드)...');
    const context = buildContext();

    // 2. 히스토리 로드
    const history = loadHistory();
    const recentTitles = history.map(h => h.title);

    // 3. 뉴스 + YouTube 트렌딩 수집
    console.log('2️⃣ 부동산 뉴스 수집...');
    const news = await NewsScraper.fetchAll();

    console.log('   YouTube 트렌딩 영상 수집...');
    const trending = await YouTubeMonitor.getAllTrending().catch(() => []);
    console.log(`   ✓ 트렌딩 ${trending.length}개`);

    console.log('   빌사남TV 본인 채널 최근 영상...');
    const bsnRecent = await YouTubeMonitor.getBsnLatest(5).catch(() => []);
    console.log(`   ✓ 본인 채널 ${bsnRecent.length}개`);

    // 4. 주제 추천
    console.log('3️⃣ 콘텐츠 제작팀이 주제 선정 중...');
    const idea = await suggestTopic(context, news, recentTitles, trending, bsnRecent);
    console.log(`  ✓ ${idea.title}`);
    console.log(`  ✓ ${idea.hook_reason}`);

    // 5. 콘텐츠 생성 (모든 플랫폼)
    console.log('4️⃣ 각 플랫폼 본문 작성...');
    const researchData = `[angle]\n${idea.angle}\n\n[핵심 사실]\n${idea.key_facts.join('\n')}\n\n[오늘 뉴스]\n${news.slice(0,8).map(n => `- ${n.title}`).join('\n')}`;
    const platforms = ['wordpress', 'tistory', 'blog', 'threads'];  // 티스토리 추가
    const generated = {};
    const outDir = todayOutDir();
    const baseName = safeName(idea.title);
    for (const p of platforms) {
      const r = await Generator.generateContent(idea.topic, p, researchData);
      generated[p] = r;
      console.log(`  ✓ ${p}: ${r.success ? '성공' : '실패'}`);

      // 각 플랫폼 산출물을 out/YYYY-MM-DD/ 에 별도 파일로 저장 (수동 복붙용)
      if (r.success) {
        const ext = (p === 'wordpress' || p === 'tistory') ? 'html' : 'txt';
        const fileName = `${baseName}__${p}.${ext}`;
        const filePath = path.join(outDir, fileName);
        // 티스토리·워드프레스는 단독으로 미리보기 가능한 HTML로 감싸기
        let body;
        if (ext === 'html') {
          body = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${r.title}</title>
<style>body{font-family:'Noto Sans KR',-apple-system,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;line-height:1.8;color:#222}
h1{font-size:2rem;line-height:1.3;border-bottom:2px solid #1a3a8a;padding-bottom:14px}
h2{margin-top:36px;color:#1a3a8a}
blockquote{border-left:4px solid #c9a96e;background:#faf7ee;padding:12px 18px;margin:18px 0}
.meta{color:#888;font-size:0.85rem;margin-bottom:30px}
.tags{margin-top:40px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:0.9rem}</style></head>
<body>
<h1>${r.title}</h1>
<div class="meta">${p === 'tistory' ? '티스토리' : '워드프레스'}용 · ${new Date().toLocaleDateString('ko-KR')}</div>
${r.content}
<div class="tags">태그: ${(r.tags || []).map(t => '#' + t.replace(/^#/, '')).join(' ')}</div>
</body></html>`;
        } else {
          body = `[${r.title}]\n\n${r.content}\n\n태그: ${(r.tags || []).join(', ')}\n\n--- 요약 ---\n${r.summary || ''}`;
        }
        fs.writeFileSync(filePath, body, 'utf-8');
        console.log(`     💾 ${path.relative(__dirname, filePath)}`);
      }
    }

    // 6. 워드프레스 임시저장
    let wpResult = null;
    if (generated.wordpress && generated.wordpress.success) {
      console.log('5️⃣ 워드프레스 임시저장...');
      wpResult = await Publisher.publishToWordPress({
        title: generated.wordpress.title,
        content: generated.wordpress.content,
        tags: generated.wordpress.tags,
        summary: generated.wordpress.summary
      });
      if (wpResult.success) console.log(`  ✅ ${wpResult.editUrl}`);
    }

    // 7. 카드뉴스 생성 (WP 본문 기반)
    let cardnewsPath = null;
    if (generated.wordpress && generated.wordpress.success) {
      console.log('6️⃣ 카드뉴스 생성...');
      try {
        const cardnewsHtml = await generateCardnews({
          title: generated.wordpress.title,
          content: generated.wordpress.content,
          summary: generated.wordpress.summary,
          tags: generated.wordpress.tags,
          idea
        });
        const fileName = `${baseName}__cardnews.html`;
        cardnewsPath = path.join(outDir, fileName);
        fs.writeFileSync(cardnewsPath, cardnewsHtml, 'utf-8');
        console.log(`  ✅ ${path.relative(__dirname, cardnewsPath)} (${(cardnewsHtml.length/1024).toFixed(1)}KB)`);
      } catch (e) {
        console.error('  ❌ 카드뉴스 실패:', e.message);
      }
    }

    // 8. 히스토리 기록
    saveHistory({
      date: startTime.toISOString(),
      title: idea.title,
      topic: idea.topic,
      wpId: wpResult?.postId,
      wpUrl: wpResult?.editUrl,
      outDir: path.relative(__dirname, outDir),
      cardnews: cardnewsPath ? path.relative(__dirname, cardnewsPath) : null
    });

    // 9. 텔레그램 알림 (검토 요청)
    const tgMsg = `✅ <b>오늘 콘텐츠 준비 완료</b>

📌 <b>주제</b>
${idea.title}

💡 <b>후크</b>
${idea.hook_reason}

📝 <b>워드프레스 임시저장</b>
${wpResult?.success ? wpResult.editUrl : '실패'}

📁 <b>로컬 산출물 (수동 발행용)</b>
out/${new Date().toISOString().slice(0,10)}/
  · ${baseName}__tistory.html  ← 티스토리 복붙
  · ${baseName}__blog.txt       ← 네이버블로그
  · ${baseName}__threads.txt    ← 스레드
${cardnewsPath ? '  · ' + baseName + '__cardnews.html ← 카드뉴스 (브라우저에서 열어 다운로드)' : ''}

검토 후 각 플랫폼에 올리세요.`;
    await notify(tgMsg);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ 완료 (${elapsed}초)`);
    console.log(`📁 산출물 폴더: ${outDir}\n`);

    return { success: true, idea, wpResult, generated, outDir, cardnewsPath };
  } catch (err) {
    console.error('❌ 에러:', err.message);
    await notify(`❌ 콘텐츠 제작 실패\n${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── CLI ──
if (require.main === module) {
  const arg = process.argv[2];

  if (arg === 'cron') {
    let cron;
    try { cron = require('node-cron'); } catch { console.error('node-cron 필요: npm install node-cron'); process.exit(1); }

    cron.schedule('0 9 * * 1-5', () => {
      console.log('\n⏰ 9시 트리거 (평일)');
      runDaily().catch(e => console.error(e));
    }, { timezone: 'Asia/Seoul' });

    console.log('⏰ 일일 콘텐츠 에이전트 가동\n   평일 매일 09:00 KST 자동 실행');
    process.stdin.resume();
  } else if (arg === 'now') {
    runDaily().then(() => process.exit(0));
  } else {
    console.log(`
사용법:
  node daily-agent.js now    — 지금 한 번 실행 (테스트)
  node daily-agent.js cron   — 매일 09:00 자동 실행 (운영)
`);
  }
}

module.exports = { runDaily };
