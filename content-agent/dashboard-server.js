// BSN 콘텐츠 제작 대시보드 서버 v2
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const Generator = require('./generator');
const Publisher = require('./publisher');
const Threads = require('./threads');
const LinkedIn = require('./linkedin');
const NewsScraper = require('./news-scraper');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3300;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: imagesDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '');
      cb(null, `${safeName}_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// ── 빌사남 컨텍스트 빌더 ──
function buildContext() {
  const columnsDir = path.join(__dirname, 'columns');
  const styleGuidePath = path.join(columnsDir, '스타일가이드.md');
  let context = '';

  if (fs.existsSync(styleGuidePath)) {
    context += '[스타일 가이드]\n' + fs.readFileSync(styleGuidePath, 'utf-8') + '\n\n';
  }

  // 최근 칼럼 3편 (각 4000자)
  if (fs.existsSync(columnsDir)) {
    const files = fs.readdirSync(columnsDir)
      .filter(f => (f.endsWith('.txt') || f.endsWith('.md')) && f !== '스타일가이드.md')
      .map(f => ({ path: path.join(columnsDir, f), mtime: fs.statSync(path.join(columnsDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 3);

    context += '[최근 칼럼·유튜브 대본 샘플]\n';
    files.forEach(f => {
      const content = fs.readFileSync(f.path, 'utf-8').slice(0, 4000);
      context += `--- ${path.basename(f.path)} ---\n${content}\n\n`;
    });
  }

  context += `[빌사남 프로필]
- 본명 김윤수, BSN 그룹 대표
- 상업용 빌딩 투자 전문가 (꼬마빌딩, 상권, 리모델링)
- 저서 '빌딩 투자의 모든 것'
- 채널: 유튜브 빌사남TV, 인스타 @bsn__official
- 핵심 철학: 환금성·입지·임차 안정성, 사업으로서의 빌딩 투자
- 주택 이야기는 배제, 상업용 빌딩 중심
`;

  return context;
}

// ── 자동 주제 + 콘텐츠 생성 ──
app.post('/api/auto-generate', async (req, res) => {
  try {
    const context = buildContext();

    // 1. 뉴스 수집
    const news = await NewsScraper.fetchAll();
    const newsText = news.slice(0, 10).map(n => `- [${n.source || n.keyword}] ${n.title}`).join('\n');

    // 2. Claude로 주제 + 키워드 추천
    const suggest = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `당신은 빌사남(김윤수)의 콘텐츠 전략가입니다. 빌사남의 문체·관점·전문성을 깊이 이해하고, 시의성 있는 주제를 골라냅니다.\n\n${context}`,
      messages: [{
        role: 'user',
        content: `오늘 발행할 콘텐츠 주제 1개를 골라주세요.

[오늘의 부동산 뉴스]
${newsText}

조건:
- 빌사남의 핵심 독자(상업용 빌딩 투자자·건물주)에게 강한 후크
- 주택 일반 얘기는 배제, 상업용 빌딩 관점으로 풀어낼 것
- 시의성 + 빌사남 시그니처 톤
- 최근 칼럼들과 너무 겹치지 않을 것

JSON으로만 응답:
{
  "title": "기사 제목 (후크 강하게)",
  "topic": "주제 한 줄 요약",
  "angle": "빌사남 관점에서 어떻게 풀지",
  "key_facts": ["사실 1", "사실 2", "사실 3"]
}`
      }]
    });

    const text = suggest.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('주제 추천 파싱 실패');
    const idea = JSON.parse(jsonMatch[0]);

    // 3. 각 플랫폼별 생성
    const researchData = `[추천 angle]\n${idea.angle}\n\n[핵심 사실]\n${idea.key_facts.join('\n')}\n\n[오늘 뉴스]\n${newsText}`;
    const platforms = ['wordpress', 'blog', 'threads'];
    const results = {};
    for (const p of platforms) {
      const r = await Generator.generateContent(idea.topic, p, researchData);
      results[p] = r;
    }

    res.json({ success: true, idea, results });
  } catch (err) {
    console.error('auto-generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── 수동 주제로 생성 ──
app.post('/api/generate', async (req, res) => {
  try {
    const { topic, platforms = ['wordpress', 'blog', 'threads'], useNews = false } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic 필요' });

    let researchData = null;
    if (useNews) {
      const news = await NewsScraper.fetchAll();
      if (news.length > 0) {
        researchData = '[오늘 뉴스]\n' + news.slice(0, 8).map(n =>
          `[${n.source || n.keyword}] ${n.title}`
        ).join('\n');
      }
    }

    const results = {};
    for (const p of platforms) {
      const r = await Generator.generateContent(topic, p, researchData);
      results[p] = r;
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 전체 발행 ──
app.post('/api/publish-all', async (req, res) => {
  try {
    const { wordpress, threads, linkedin } = req.body;
    const result = { wordpress: null, threads: null, linkedin: null };

    if (wordpress && wordpress.title) {
      result.wordpress = await Publisher.publishToWordPress({
        title: wordpress.title,
        content: wordpress.content,
        tags: wordpress.tags || [],
        summary: wordpress.summary || ''
      });
    }
    if (threads && Threads.isConfigured()) {
      result.threads = await Threads.publish(threads);
    }
    if (linkedin && LinkedIn.isConfigured()) {
      result.linkedin = await LinkedIn.publish(linkedin);
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 이미지 업로드 ──
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 없음' });
  res.json({ success: true, filename: req.file.filename, url: `/images/${req.file.filename}` });
});

app.get('/api/images', (req, res) => {
  const files = fs.readdirSync(imagesDir)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .map(f => ({ name: f, url: `/images/${f}`, size: fs.statSync(path.join(imagesDir, f)).size }));
  res.json({ success: true, images: files });
});

// ── 카드뉴스 ──
app.get('/api/cardnews/list', (req, res) => {
  const files = fs.readdirSync(__dirname)
    .filter(f => /^cardnews(-\d+)?\.html$/i.test(f) && !f.includes('embed'))
    .map(f => ({ name: f, url: `/${f}`, modified: fs.statSync(path.join(__dirname, f)).mtime }))
    .sort((a, b) => b.modified - a.modified);
  res.json({ success: true, files });
});

app.get('/api/cardnews/read', (req, res) => {
  const file = req.query.file;
  if (!file || !/^cardnews/.test(file)) return res.status(400).json({ error: '잘못된 파일' });
  const filepath = path.join(__dirname, file);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: '없음' });
  res.json({ success: true, content: fs.readFileSync(filepath, 'utf-8') });
});

app.post('/api/cardnews/save', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !/^cardnews/.test(filename)) return res.status(400).json({ error: '잘못된 파일명' });
  fs.writeFileSync(path.join(__dirname, filename), content, 'utf-8');
  res.json({ success: true });
});

// 카드뉴스 카드별 데이터 파싱 (이미지 + 큰 텍스트만)
app.get('/api/cardnews/parse', (req, res) => {
  const file = req.query.file;
  if (!file) return res.status(400).json({ error: 'file 필요' });
  const html = fs.readFileSync(path.join(__dirname, file), 'utf-8');

  // 각 카드 추출
  const cards = [];
  const cardRegex = /<div class="card" id="card-(\d+)">([\s\S]*?)<\/div>\s*<button class="download-btn"/g;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const cardNum = parseInt(m[1]);
    const cardHtml = m[2];

    // 이미지 추출
    const imgMatch = cardHtml.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
    const image = imgMatch ? imgMatch[1] : null;

    // 큰 텍스트 추출 (font-size >= 24px인 div 내용)
    const texts = [];
    const textRegex = /<div[^>]*font-size:\s*(\d+)px[^>]*>([^<]+)<\/div>/g;
    let tm;
    while ((tm = textRegex.exec(cardHtml)) !== null) {
      const size = parseInt(tm[1]);
      const text = tm[2].trim();
      if (size >= 18 && text.length > 1 && text.length < 200) {
        texts.push({ size, text });
      }
    }
    texts.sort((a, b) => b.size - a.size);

    cards.push({ num: cardNum, image, texts: texts.slice(0, 6) });
  }
  res.json({ success: true, cards });
});

// 카드뉴스 부분 수정 (이미지 또는 텍스트)
app.post('/api/cardnews/patch', (req, res) => {
  const { filename, replacements } = req.body;
  if (!filename || !replacements) return res.status(400).json({ error: '필수 누락' });
  const filepath = path.join(__dirname, filename);
  let html = fs.readFileSync(filepath, 'utf-8');

  replacements.forEach(r => {
    if (!r.from || r.to === undefined) return;
    html = html.split(r.from).join(r.to);
  });

  fs.writeFileSync(filepath, html, 'utf-8');
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 BSN 콘텐츠 대시보드 v2 가동\n   http://localhost:${PORT}\n`);
});
