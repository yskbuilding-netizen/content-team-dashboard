// ========================================
// News Scraper - 실시간 부동산 뉴스 수집
// Google News RSS + 한경/매경 등 RSS 활용
// ========================================

const https = require('https');

const NewsScaper = {
  // 키워드 리스트 (상업용 빌딩 중심)
  KEYWORDS: [
    '상업용 빌딩',
    '꼬마빌딩',
    '사옥 매입',
    '상가 임대',
    '오피스 공실률',
    '서울 빌딩 거래',
    '강남 사옥',
    '성수동 빌딩',
    '리모델링 사옥',
    '상업용 부동산'
  ],

  // 부동산 전문 매체 RSS (가능한 것들)
  RSS_FEEDS: [
    { name: '한경 부동산', url: 'https://www.hankyung.com/feed/realestate' },
    { name: '매경 부동산', url: 'https://www.mk.co.kr/rss/50300009/' }
  ],

  // HTTP GET 헬퍼
  fetch(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BSN-NewsBot/1.0)' },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  },

  // RSS XML 파싱 (간단한 정규식 기반)
  parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        if (!m) return '';
        return m[1].replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1').trim();
      };
      items.push({
        title: get('title'),
        link: get('link'),
        pubDate: get('pubDate'),
        description: get('description').replace(/<[^>]+>/g, '').slice(0, 300)
      });
    }
    return items;
  },

  // 키워드별 Google News 검색
  async searchByKeyword(keyword, count = 5) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
    try {
      const xml = await this.fetch(url);
      const items = this.parseRSS(xml).slice(0, count);
      return items.map(i => ({ ...i, keyword }));
    } catch (e) {
      console.error(`  ⚠️ ${keyword} 검색 실패:`, e.message);
      return [];
    }
  },

  // 매체 RSS에서 부동산 뉴스 가져오기
  async fetchFeed(feed, count = 10) {
    try {
      const xml = await this.fetch(feed.url);
      const items = this.parseRSS(xml).slice(0, count);
      return items.map(i => ({ ...i, source: feed.name }));
    } catch (e) {
      console.error(`  ⚠️ ${feed.name} 실패:`, e.message);
      return [];
    }
  },

  // 모든 소스에서 최신 뉴스 종합
  async fetchAll() {
    console.log('📰 실시간 뉴스 수집 시작\n');
    const all = [];

    // 1) 키워드 기반 Google News
    console.log('🔍 키워드 검색 (Google News)...');
    for (const kw of this.KEYWORDS.slice(0, 5)) {
      const items = await this.searchByKeyword(kw, 3);
      all.push(...items);
      console.log(`  ✓ "${kw}" — ${items.length}건`);
      await new Promise(r => setTimeout(r, 300));
    }

    // 2) 부동산 매체 RSS
    console.log('\n📡 매체 RSS...');
    for (const feed of this.RSS_FEEDS) {
      const items = await this.fetchFeed(feed, 5);
      all.push(...items);
      console.log(`  ✓ ${feed.name} — ${items.length}건`);
    }

    // 중복 제거 (제목 기준)
    const seen = new Set();
    const unique = all.filter(item => {
      const key = (item.title || '').slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 상업용 빌딩 관련만 필터링
    const filtered = unique.filter(item => {
      const text = (item.title + ' ' + item.description).toLowerCase();
      // 주택 관련 키워드 제외 (빌사남 스타일 가이드)
      if (text.match(/아파트|전세|분양|청약|재건축|입주|신축아파트/)) return false;
      // 상업용 키워드 포함
      return text.match(/빌딩|상가|사옥|오피스|상업|투자|매입|매각|꼬마/);
    });

    console.log(`\n✅ 총 ${filtered.length}건 수집 (전체 ${unique.length}건 중)\n`);
    return filtered;
  },

  // 뉴스를 references 폴더에 저장
  async saveNews(items) {
    const fs = require('fs').promises;
    const path = require('path');
    const dir = path.join(__dirname, 'references', 'news');
    await fs.mkdir(dir, { recursive: true });

    const today = new Date().toISOString().slice(0, 10);
    const file = path.join(dir, `${today}.txt`);

    const content = items.map(i =>
      `[${i.source || i.keyword || '-'}] ${i.title}\n${i.description}\n${i.link}\n`
    ).join('\n---\n\n');

    await fs.writeFile(file, content, 'utf-8');
    console.log(`💾 저장: ${file}`);
    return file;
  }
};

// CLI 실행
if (require.main === module) {
  (async () => {
    const items = await NewsScaper.fetchAll();
    await NewsScaper.saveNews(items);

    console.log('\n📋 상위 10건:');
    items.slice(0, 10).forEach((i, idx) => {
      console.log(`\n${idx + 1}. [${i.source || i.keyword}] ${i.title}`);
    });
  })();
}

module.exports = NewsScaper;
