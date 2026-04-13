// ========================================
// AI Content Agent Module
// 뉴스 수집, 콘텐츠 추천, 글 작성, 카드뉴스, 영상 기획
// ========================================
const ContentAgent = {
  API_KEY_KEY: 'claude_api_key',
  HISTORY_KEY: 'ct_agent_history',
  CALENDAR_KEY: 'ct_agent_calendar',

  _K: ['sk-ant-api03-2fwwVEswojYHLnJ6uTjKgDlBIq98','iHuk0sMenmKwuJCJaQ30jAS4fD81QP6Q-7Jofsk2Kffnm9IVvTF-L1UZbQ-s5cUWAAA'],

  getApiKey() {
    return localStorage.getItem(this.API_KEY_KEY) || this._K.join('');
  },

  checkSetup() {
    // API 키가 항상 있으므로 바로 메인 표시
    const setup = document.getElementById('agent-api-setup');
    const main = document.getElementById('agent-main-area');
    if (setup) setup.style.display = 'none';
    if (main) main.style.display = '';
    this.renderHistory();
  },

  init() {
    this.checkSetup();
    // 날짜 표시
    const now = new Date();
    const days = ['일','월','화','수','목','금','토'];
    const label = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
    const el = document.getElementById('agent-date-label');
    if (el) el.textContent = label;
  },

  // ── 탭 전환 ──
  switchTab(tabName) {
    document.querySelectorAll('.agent-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.agent-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`.agent-tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
  },

  // ── Claude API 호출 ──
  async callClaude(prompt, maxTokens = 4096) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API 오류: ${res.status}`);
    }

    const data = await res.json();
    return data.content[0].text;
  },

  // ── 히스토리 관리 ──
  getHistory() {
    try { return JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || []; } catch { return []; }
  },

  addHistory(item) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now().toString(36),
      ...item,
      createdAt: new Date().toISOString()
    });
    if (history.length > 50) history.length = 50;
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    this.renderHistory();
  },

  clearHistory() {
    if (!confirm('생성 기록을 모두 삭제하시겠습니까?')) return;
    localStorage.removeItem(this.HISTORY_KEY);
    this.renderHistory();
  },

  renderHistory() {
    const el = document.getElementById('agent-history');
    if (!el) return;
    const history = this.getHistory();
    if (history.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>아직 생성 기록이 없습니다.</p></div>';
      return;
    }
    el.innerHTML = history.slice(0, 10).map(h => {
      const date = new Date(h.createdAt);
      const timeStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
      const typeIcons = { news: '📰', recommend: '💡', article: '✍️', cardnews: '📸', video: '🎬', calendar: '📅' };
      return `<div class="history-item" onclick="ContentAgent.showHistoryDetail('${h.id}')">
        <span class="history-icon">${typeIcons[h.type] || '📄'}</span>
        <span class="history-title">${h.title}</span>
        <span class="history-time">${timeStr}</span>
      </div>`;
    }).join('');
  },

  showHistoryDetail(id) {
    const item = this.getHistory().find(h => h.id === id);
    if (!item) return;
    const modal = document.getElementById('agent-detail-modal');
    if (modal) {
      document.getElementById('agent-detail-content').innerHTML = this.formatMarkdown(item.content);
      modal.style.display = 'flex';
    }
  },

  // ── 마크다운 → HTML 변환 ──
  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="margin-top:16px;color:var(--accent-primary);">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="margin-top:20px;">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li><strong>$1.</strong> $2</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin:8px 0;padding-left:20px;">$&</ul>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  },

  // ════════════════════════════════════════
  // 1. 뉴스/기사 수집
  // ════════════════════════════════════════
  async fetchNews() {
    const category = document.getElementById('news-category').value;
    const loading = document.getElementById('news-loading');
    const results = document.getElementById('news-results');

    loading.style.display = 'flex';
    results.innerHTML = '';

    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;

      // 순차적으로 호출 (rate limit 방지)
      const types = ['뉴스/기사', '통계/데이터', '정책/제도'];
      const counts = [12, 10, 10];
      let allItems = [];

      for (let i = 0; i < types.length; i++) {
        const prompt = this._buildNewsPrompt(dateStr, category, types[i], counts[i]);
        try {
          const res = await this.callClaude(prompt, 4000);
          const m = res.match(/\[[\s\S]*\]/);
          if (m) allItems = allItems.concat(JSON.parse(m[0]));
        } catch (e) {
          console.warn(`${types[i]} 수집 오류:`, e.message);
          // rate limit이면 10초 대기 후 재시도
          if (e.message.includes('rate') || e.message.includes('limit')) {
            await new Promise(r => setTimeout(r, 12000));
            try {
              const res = await this.callClaude(prompt, 3000);
              const m = res.match(/\[[\s\S]*\]/);
              if (m) allItems = allItems.concat(JSON.parse(m[0]));
            } catch (e2) { console.warn('재시도 실패:', e2.message); }
          }
        }
        // 호출 간 딜레이
        if (i < types.length - 1) await new Promise(r => setTimeout(r, 5000));
      }

      if (allItems.length === 0) throw new Error('뉴스 수집에 실패했습니다. 잠시 후 다시 시도해주세요.');

      // 종합 분석 (딜레이 후)
      await new Promise(r => setTimeout(r, 5000));

      const summaryPrompt = `당신은 중소형 빌딩(꼬마빌딩) 투자 전문 애널리스트입니다.

아래 ${allItems.length}건의 뉴스/통계/정책 데이터를 **중소형 빌딩(50억 이하) 투자자 관점**에서 종합 분석하여 브리핑을 작성해주세요.

## 수집된 데이터
${allItems.map((n, i) => `${i+1}. [${n.category || '뉴스'}] ${n.title}`).join('\n')}

## 작성 형식
### 📊 중소형 빌딩 시장 핵심 요약 (3줄)
### 🔥 꼬마빌딩 투자자가 주목할 이슈 TOP 3
### 📈 주요 통계 포인트 (중소형 빌딩 매매가, 수익률, 공실률, 금리 등)
### 💡 빌사남 콘텐츠 기회 (예비 건물주가 궁금해할 주제)
### ⚠️ 중소형 빌딩 투자 리스크/주의사항
### 🎯 오늘 추천 콘텐츠 주제 3가지 (유튜브/인스타용 제목까지)

간결하고 인사이트 있게, 10~50억 규모 빌딩 투자자 눈높이에 맞게 작성해주세요.`;

      const summaryRes = await this.callClaude(summaryPrompt, 3000);

      this.renderNews(allItems, summaryRes);
      this.addHistory({ type: 'news', title: `${category} 종합분석 ${allItems.length}건`, content: summaryRes });

    } catch (err) {
      results.innerHTML = `<div class="agent-error">오류: ${err.message}</div>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  _buildNewsPrompt(dateStr, category, type, count) {
    const typeGuide = {
      '뉴스/기사': `중소형 빌딩(꼬마빌딩, 50억 이하), 근린생활시설, 소규모 오피스, 상가주택 관련 최신 부동산/경제 뉴스와 기사 ${count}개를 생성해주세요. 출처는 한국경제, 매일경제, 조선일보, 서울경제, 이데일리, 머니투데이, 헤럴드경제 등에서. 대형 빌딩/아파트 위주가 아닌 중소형 상업용 부동산 중심으로.`,
      '통계/데이터': `통계청, 한국부동산원, 국토교통부, 한국은행, KB부동산, 부동산R114 등의 최신 통계 중 중소형 빌딩 투자자에게 유용한 데이터 ${count}개를 생성해주세요. 소규모 상업용 부동산 실거래가, 근생시설 공실률, 소형 오피스 임대료, 상가 수익률, 꼬마빌딩 경매 낙찰가율, 금리 동향, 중소형 빌딩 매매가 추이, 주요 상권 분석 등.`,
      '정책/제도': `국토교통부, 기획재정부, 서울시, 금융위원회 등의 최신 부동산 관련 정책 중 중소형 빌딩 매매/임대/보유에 영향을 주는 제도 변화 ${count}개를 생성해주세요. 취득세/양도세/종합부동산세, 임대사업자 제도, 용도변경, 건축법 개정, 대출 규제, 상가임대차보호법, 리모델링 관련 등.`
    };

    return `당신은 부동산/경제 전문 리서처입니다.

오늘 날짜: ${dateStr}
카테고리: ${category}
분석 유형: ${type}

${typeGuide[type]}

빌사남(빌딩을 사랑하는 남자) 회사의 고객에게 도움이 될 만한 내용을 중심으로.
- 핵심 타겟: 중소형 빌딩(꼬마빌딩, 50억 이하) 투자에 관심있는 예비 건물주, 자산가
- 주력 분야: 중소형 상업용 부동산 매매/임대, 근린생활시설, 소규모 오피스빌딩, 상가주택, 다가구/다세대 리모델링
- 관심 지역: 서울 강남/서초/마포/성수/홍대/합정/연남/이태원/용산 등 핵심 상권 및 수도권 주요 역세권

각 항목에 대해 다음 JSON 형식으로 응답해주세요:
[
  {
    "title": "제목",
    "summary": "핵심 내용 3줄 요약",
    "source": "출처 기관/매체",
    "category": "${type}",
    "relevance": "높음/중간/낮음",
    "contentIdea": "이 데이터를 활용한 콘텐츠 아이디어 1줄",
    "platforms": ["youtube", "instagram"],
    "keywords": ["키워드1", "키워드2", "키워드3"]
  }
]

반드시 JSON 배열만 응답해주세요.`;
  },

  renderNews(news, summary) {
    const results = document.getElementById('news-results');
    const platformIcons = { youtube: '🎬', instagram: '📸', blog: '📝', tistory: '🟠', wordpress: '🔵', tiktok: '🎵' };
    const relevanceColors = { '높음': '#4ade80', '중간': '#fbbf24', '낮음': '#94a3b8' };
    const categoryColors = { '뉴스/기사': '#667eea', '통계/데이터': '#48cae4', '정책/제도': '#ffab40' };

    // 종합 브리핑 상단
    const summaryHtml = summary ? `
      <div class="news-summary-briefing">
        <div class="briefing-header">
          <h3>📋 오늘의 부동산 시장 종합 브리핑</h3>
          <div style="display:flex;gap:6px;">
            <span class="briefing-count">뉴스 ${news.filter(n=>n.category==='뉴스/기사').length}건</span>
            <span class="briefing-count stat">통계 ${news.filter(n=>n.category==='통계/데이터').length}건</span>
            <span class="briefing-count policy">정책 ${news.filter(n=>n.category==='정책/제도').length}건</span>
          </div>
        </div>
        <div class="briefing-body">${this.formatMarkdown(summary)}</div>
      </div>` : '';

    // 카테고리별 필터 버튼
    const filterHtml = `
      <div class="news-filters">
        <button class="news-filter-btn active" onclick="ContentAgent.filterNews('all')">전체 (${news.length})</button>
        <button class="news-filter-btn" onclick="ContentAgent.filterNews('뉴스/기사')">📰 뉴스 (${news.filter(n=>n.category==='뉴스/기사').length})</button>
        <button class="news-filter-btn" onclick="ContentAgent.filterNews('통계/데이터')">📊 통계 (${news.filter(n=>n.category==='통계/데이터').length})</button>
        <button class="news-filter-btn" onclick="ContentAgent.filterNews('정책/제도')">📜 정책 (${news.filter(n=>n.category==='정책/제도').length})</button>
      </div>`;

    const cardsHtml = news.map(n => `
      <div class="news-card" data-news-cat="${n.category || '뉴스/기사'}">
        <div class="news-card-header">
          <span class="news-cat-badge" style="background:${categoryColors[n.category] || '#667eea'}">${n.category || '뉴스'}</span>
          <span class="news-relevance" style="background:${relevanceColors[n.relevance] || '#94a3b8'}">${n.relevance}</span>
          <span class="news-source">${n.source}</span>
        </div>
        <h4 class="news-title">${n.title}</h4>
        <p class="news-summary">${n.summary}</p>
        <div class="news-idea">
          <strong>💡 콘텐츠 아이디어:</strong> ${n.contentIdea}
        </div>
        <div class="news-footer">
          <div class="news-platforms">${(n.platforms || []).map(p => `<span class="platform-badge">${platformIcons[p] || ''} ${p}</span>`).join('')}</div>
          <div class="news-keywords">${(n.keywords || []).map(k => `<span class="keyword-tag">#${k}</span>`).join('')}</div>
        </div>
        <div class="news-actions">
          <button class="btn btn-sm btn-primary" onclick="ContentAgent.useNewsForArticle('${n.title.replace(/'/g, "\\'")}')">✍️ 글 작성</button>
          <button class="btn btn-sm btn-secondary" onclick="ContentAgent.useNewsForCardnews('${n.title.replace(/'/g, "\\'")}')">📸 카드뉴스</button>
          <button class="btn btn-sm btn-secondary" onclick="ContentAgent.useNewsForVideo('${n.title.replace(/'/g, "\\'")}')">🎬 영상</button>
        </div>
      </div>
    `).join('');

    results.innerHTML = summaryHtml + filterHtml + `<div class="news-grid">${cardsHtml}</div>`;

    // 뉴스 데이터 저장 (자동생성용)
    this._latestNews = news;
    this._latestSummary = summary;
  },

  filterNews(cat) {
    document.querySelectorAll('.news-filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.news-card').forEach(card => {
      card.style.display = (cat === 'all' || card.dataset.newsCat === cat) ? '' : 'none';
    });
  },

  useNewsForArticle(title) {
    document.getElementById('writer-topic').value = title;
    this.switchTab('writer');
  },
  useNewsForCardnews(title) {
    document.getElementById('cardnews-topic').value = title;
    this.switchTab('cardnews');
  },
  useNewsForVideo(title) {
    document.getElementById('video-topic').value = title;
    this.switchTab('video');
  },

  // ════════════════════════════════════════
  // 2. 콘텐츠 추천 (유튜브 인기영상 기반)
  // ════════════════════════════════════════

  // YouTube 인기 영상 검색
  async searchYouTubeTrending(queries) {
    const apiKey = YouTubeService.getApiKey();
    if (!apiKey) return [];

    let allVideos = [];
    for (const query of queries) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=viewCount&maxResults=10&publishedAfter=${this._getRecentDate()}&relevanceLanguage=ko&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const videoIds = (data.items || []).map(i => i.id.videoId).filter(Boolean);
        if (videoIds.length === 0) continue;

        // 조회수 등 상세정보
        const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${apiKey}`;
        const detailRes = await fetch(detailUrl);
        if (!detailRes.ok) continue;
        const detailData = await detailRes.json();

        for (const v of (detailData.items || [])) {
          allVideos.push({
            title: v.snippet.title,
            channel: v.snippet.channelTitle,
            views: Number(v.statistics.viewCount) || 0,
            likes: Number(v.statistics.likeCount) || 0,
            comments: Number(v.statistics.commentCount) || 0,
            publishedAt: v.snippet.publishedAt,
            videoId: v.id,
            thumbnail: v.snippet.thumbnails?.medium?.url || ''
          });
        }
      } catch (e) {
        console.warn(`YouTube 검색 오류 (${query}):`, e.message);
      }
    }

    // 중복 제거 + 조회수 순 정렬
    const seen = new Set();
    return allVideos
      .filter(v => { if (seen.has(v.videoId)) return false; seen.add(v.videoId); return true; })
      .sort((a, b) => b.views - a.views)
      .slice(0, 30);
  },

  _getRecentDate() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  },

  async getRecommendations() {
    const platform = document.getElementById('recommend-platform').value;
    const loading = document.getElementById('recommend-loading');
    const results = document.getElementById('recommend-results');

    loading.style.display = 'flex';
    results.innerHTML = '';

    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;
      const dayOfWeek = ['일','월','화','수','목','금','토'][today.getDay()];

      // 1단계: YouTube에서 실제 인기 영상 검색
      loading.innerHTML = '<div class="yt-spinner"></div> YouTube에서 최근 인기 영상을 검색하고 있습니다...';
      const searchQueries = [
        '꼬마빌딩 투자', '빌딩 매매', '건물주', '상가 투자',
        '부동산 투자 2026', '빌딩 수익률', '상업용 부동산'
      ];
      const trendingVideos = await this.searchYouTubeTrending(searchQueries);

      // 인기 영상 데이터 구성
      let trendingContext = '';
      if (trendingVideos.length > 0) {
        trendingContext = `\n## 최근 1개월 유튜브 인기 영상 TOP ${Math.min(trendingVideos.length, 25)} (조회수순)
${trendingVideos.slice(0, 25).map((v, i) => `${i+1}. "${v.title}" - ${v.channel} | 조회수 ${v.views.toLocaleString()} | 좋아요 ${v.likes.toLocaleString()} | 댓글 ${v.comments.toLocaleString()}`).join('\n')}`;
      }

      // 수집된 뉴스 컨텍스트
      const newsContext = this._latestNews ? `\n## 오늘 수집된 뉴스/통계 주요 항목\n${this._latestNews.filter(n=>n.relevance==='높음').slice(0,8).map((n,i)=>`${i+1}. [${n.category}] ${n.title}`).join('\n')}` : '';

      // 2단계: AI에게 인기 영상 데이터 기반으로 추천 요청
      loading.innerHTML = '<div class="yt-spinner"></div> AI가 인기 영상을 분석하여 콘텐츠를 추천하고 있습니다...';

      const prompt = `당신은 부동산 유튜브/SNS 콘텐츠 전략가입니다.

## 회사 정보
- 회사: 빌사남 (빌딩을 사랑하는 남자)
- 분야: 중소형 빌딩(꼬마빌딩, 50억 이하) 매매/임대/투자 컨설팅
- 운영 채널: 빌사남TV (유튜브), 서울스페이스 (유튜브), 인스타그램
- 고객: 중소형 빌딩 투자에 관심있는 예비 건물주, 자산가 (자산 10~50억대)
${trendingContext}
${newsContext}

## 핵심 지시사항
위의 실제 인기 영상 데이터를 분석하여:
1. 어떤 주제/포맷의 영상이 조회수가 높은지 패턴을 파악하세요
2. 인기 영상과 비슷한 주제이지만 빌사남만의 차별화된 콘텐츠를 추천하세요
3. 조회수 높은 영상의 제목 스타일(숫자 활용, 질문형, 금액 노출 등)을 참고하세요
4. 각 추천에 "이 영상을 참고했다"는 레퍼런스를 포함하세요

오늘 날짜: ${dateStr} (${dayOfWeek}요일)

## 7개 콘텐츠를 추천해주세요. JSON 형식:
[
  {
    "title": "콘텐츠 제목 (클릭율 높은 스타일로)",
    "platform": "youtube/instagram",
    "format": "롱폼/숏폼/카루셀/릴스 등",
    "reference": "참고한 인기 영상 제목과 조회수",
    "reason": "이 콘텐츠가 뜰 수 있는 이유 (인기 영상 데이터 근거)",
    "outline": "영상/콘텐츠 구성 (3-5줄)",
    "thumbnailIdea": "썸네일/커버 아이디어",
    "publishGuide": "어디에 어떻게 올릴지 가이드",
    "hashtags": ["해시태그1", "해시태그2", "해시태그3"],
    "bestTime": "최적 게시 시간",
    "expectedViews": "예상 조회수 범위"
  }
]

반드시 JSON 배열만 응답해주세요.`;

      const response = await this.callClaude(prompt, 4096);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('응답 파싱 실패');

      const recommendations = JSON.parse(jsonMatch[0]);
      this.renderRecommendations(recommendations, trendingVideos);
      this.addHistory({ type: 'recommend', title: `인기영상 기반 콘텐츠 추천 ${recommendations.length}건`, content: response });

    } catch (err) {
      results.innerHTML = `<div class="agent-error">오류: ${err.message}</div>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  renderRecommendations(recs, trendingVideos) {
    const results = document.getElementById('recommend-results');
    const platformIcons = { youtube: '🎬', instagram: '📸', blog: '📝', tistory: '🟠', wordpress: '🔵' };

    // 인기 영상 리스트 상단
    let trendingHtml = '';
    if (trendingVideos && trendingVideos.length > 0) {
      trendingHtml = `
        <div class="trending-section">
          <div class="trending-header" onclick="this.parentElement.classList.toggle('open')">
            <h3>🔥 최근 인기 영상 TOP ${Math.min(trendingVideos.length, 15)} (실제 YouTube 데이터)</h3>
            <span class="yt-collapse-icon">▼</span>
          </div>
          <div class="trending-body">
            ${trendingVideos.slice(0, 15).map((v, i) => `
              <div class="trending-video-item">
                <span class="trending-rank">${i + 1}</span>
                <img class="trending-thumb" src="${v.thumbnail}" alt="" onerror="this.style.display='none'">
                <div class="trending-info">
                  <div class="trending-title">${v.title}</div>
                  <div class="trending-meta">
                    <span>${v.channel}</span>
                    <span>👁️ ${v.views.toLocaleString()}</span>
                    <span>👍 ${v.likes.toLocaleString()}</span>
                    <span>💬 ${v.comments.toLocaleString()}</span>
                  </div>
                </div>
                <a href="https://youtube.com/watch?v=${v.videoId}" target="_blank" class="btn btn-sm btn-secondary" style="flex-shrink:0;">▶</a>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // 추천 카드
    const recsHtml = recs.map((r, i) => `
      <div class="recommend-card">
        <div class="recommend-header">
          <span class="recommend-num">${i + 1}</span>
          <span class="platform-badge">${platformIcons[r.platform] || '📄'} ${r.platform}</span>
          <span class="format-badge">${r.format}</span>
          <span class="time-badge">⏰ ${r.bestTime}</span>
          ${r.expectedViews ? `<span class="views-badge">👁️ ${r.expectedViews}</span>` : ''}
        </div>
        <h4 class="recommend-title">${r.title}</h4>
        ${r.reference ? `<div class="reference-badge">📌 참고: ${r.reference}</div>` : ''}
        <p class="recommend-reason"><strong>뜨는 이유:</strong> ${r.reason}</p>
        <div class="recommend-outline">
          <strong>구성:</strong><br>${(r.outline || '').replace(/\n/g, '<br>')}
        </div>
        ${r.thumbnailIdea ? `<div class="thumbnail-idea"><strong>🖼️ 썸네일:</strong> ${r.thumbnailIdea}</div>` : ''}
        ${r.publishGuide ? `<div class="publish-guide"><strong>📌 발행 가이드:</strong> ${r.publishGuide}</div>` : ''}
        <div class="recommend-tags">
          ${(r.hashtags || []).map(h => `<span class="keyword-tag">#${h}</span>`).join('')}
        </div>
        <div class="news-actions" style="margin-top:10px;">
          <button class="btn btn-sm btn-primary" onclick="ContentAgent.useRecommendation('${r.title.replace(/'/g, "\\'")}', '${r.platform}')">🚀 바로 만들기</button>
        </div>
      </div>
    `).join('');

    results.innerHTML = trendingHtml + `<h3 style="margin:20px 0 14px;color:var(--text-primary);font-size:16px;">💡 인기 영상 기반 추천 콘텐츠</h3>` + recsHtml;
  },

  useRecommendation(title, platform) {
    if (platform === 'youtube') {
      document.getElementById('video-topic').value = title;
      this.switchTab('video');
    } else if (platform === 'instagram') {
      document.getElementById('cardnews-topic').value = title;
      this.switchTab('cardnews');
    } else {
      document.getElementById('writer-topic').value = title;
      const sel = document.getElementById('writer-platform');
      if (['blog','tistory','wordpress'].includes(platform)) sel.value = platform;
      this.switchTab('writer');
    }
  },

  // ════════════════════════════════════════
  // 3. 글 작성
  // ════════════════════════════════════════
  updateWriterUI() {},

  async generateArticle() {
    const platform = document.getElementById('writer-platform').value;
    const tone = document.getElementById('writer-tone').value;
    const length = document.getElementById('writer-length').value;
    const topic = document.getElementById('writer-topic').value.trim();
    const reference = document.getElementById('writer-reference').value.trim();

    if (!topic) { alert('주제를 입력해주세요.'); return; }

    const loading = document.getElementById('writer-loading');
    const result = document.getElementById('writer-result');
    loading.style.display = 'flex';
    result.innerHTML = '';

    try {
      const platformNames = { blog: '네이버 블로그', tistory: '티스토리', wordpress: '워드프레스', instagram: '인스타그램 캡션' };
      const toneNames = { professional: '전문적이고 신뢰감 있는', friendly: '친근하고 대화하듯', educational: '쉽게 설명하는 교육적', casual: '가볍고 캐주얼한' };
      const lengthGuide = { short: '500자 내외의 짧은 글', medium: '1500자 내외의 중간 길이 글', long: '3000자 이상의 장문 글' };

      const platformSpecific = {
        blog: '네이버 SEO에 최적화해주세요. 제목에 핵심 키워드 포함, 소제목 활용, 이미지 삽입 위치 표시([이미지: 설명]), 2000자 이상 권장.',
        tistory: '구글 SEO에 최적화해주세요. H2/H3 소제목 구조, 목차 포함, 내부 링크 제안, 메타 디스크립션 포함.',
        wordpress: '글로벌 SEO 최적화. 영문 슬러그 제안, 메타 정보 포함, CTA(상담 신청) 자연스럽게 삽입.',
        instagram: '인스타그램 캡션 형식. 첫 줄 후킹, 줄바꿈 활용, 이모지 적절히, 해시태그 20개, CTA 포함.'
      };

      const prompt = `당신은 부동산 전문 콘텐츠 작가입니다.

## 회사 정보
- 빌사남 (빌딩을 사랑하는 남자): 중소형 빌딩(꼬마빌딩, 50억 이하) 매매/임대/투자 컨설팅
- 고객: 중소형 빌딩 투자에 관심있는 예비 건물주, 자산가 (10~50억 규모)
- 핵심 분야: 꼬마빌딩 매매, 근린생활시설, 소규모 오피스, 상가주택, 리모델링, 공실 관리, 임대 수익률

## 작성 요청
- 플랫폼: ${platformNames[platform]}
- 톤앤매너: ${toneNames[tone]}
- 길이: ${lengthGuide[length]}
- 주제: ${topic}
${reference ? `\n## 참고 자료\n${reference}` : ''}

## 플랫폼 가이드
${platformSpecific[platform]}

## 요구사항
1. 실제 바로 게시할 수 있는 완성된 글을 작성해주세요
2. 제목을 포함해주세요
3. SEO 키워드를 글 하단에 별도로 정리해주세요
4. 이미지 삽입이 필요한 위치를 [이미지: 설명] 형태로 표시해주세요
5. 글 마지막에 CTA(상담 유도)를 자연스럽게 넣어주세요

완성된 글을 바로 작성해주세요.`;

      const response = await this.callClaude(prompt, 8192);
      result.innerHTML = `
        <div class="writer-output">
          <div class="writer-output-header">
            <h4>${platformNames[platform]} - 생성 완료</h4>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-primary" onclick="ContentAgent.copyContent('writer-content')">📋 복사</button>
              <button class="btn btn-sm btn-secondary" onclick="ContentAgent.downloadContent('${topic}', 'writer-content')">💾 저장</button>
            </div>
          </div>
          <div class="writer-content" id="writer-content">${this.formatMarkdown(response)}</div>
        </div>`;
      this.addHistory({ type: 'article', title: `${platformNames[platform]}: ${topic}`, content: response });

    } catch (err) {
      result.innerHTML = `<div class="agent-error">오류: ${err.message}</div>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  // ════════════════════════════════════════
  // 4. 카드뉴스 생성
  // ════════════════════════════════════════
  async generateCardNews() {
    const topic = document.getElementById('cardnews-topic').value.trim();
    const pages = document.getElementById('cardnews-pages').value;
    const style = document.getElementById('cardnews-style').value;
    const extra = document.getElementById('cardnews-extra').value.trim();

    if (!topic) { alert('카드뉴스 주제를 입력해주세요.'); return; }

    const loading = document.getElementById('cardnews-loading');
    const result = document.getElementById('cardnews-result');
    loading.style.display = 'flex';
    result.innerHTML = '';

    try {
      const styleGuide = {
        modern: { bg: 'rgba(20,20,40,0.85)', text: '#ffffff', accent: '#667eea', gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
        bold: { bg: 'rgba(0,0,0,0.75)', text: '#ffffff', accent: '#ff4444', gradient: 'linear-gradient(135deg,#ff4444,#ff8a00)' },
        soft: { bg: 'rgba(255,255,255,0.88)', text: '#2d2d2d', accent: '#d4956b', gradient: 'linear-gradient(135deg,#d4956b,#e8c4a0)' },
        data: { bg: 'rgba(10,25,47,0.88)', text: '#e0e0e0', accent: '#48cae4', gradient: 'linear-gradient(135deg,#0077b6,#48cae4)' }
      };

      // 부동산 관련 Unsplash 이미지 키워드
      const imageKeywords = [
        'building+city+architecture', 'office+building+exterior', 'commercial+building',
        'city+skyline+korea', 'modern+building+facade', 'real+estate+building',
        'apartment+building+urban', 'street+shop+storefront', 'interior+office+modern',
        'construction+building+site', 'architecture+minimal+concrete', 'urban+building+night'
      ];

      const prompt = `당신은 인스타그램 카드뉴스 전문 디자이너/카피라이터입니다.

## 요청
- 주제: ${topic}
- 장수: ${pages}장
- 스타일: ${style}
${extra ? `- 추가 지시: ${extra}` : ''}
- 회사: 빌사남 (중소형 빌딩/꼬마빌딩 50억 이하 매매·임대·투자 컨설팅)

## 카드뉴스 작성 가이드
- 1장(표지): 강렬한 후킹 제목 + 부제. 배경 이미지 위에 큰 텍스트
- 2~${pages-1}장(본문): 핵심 내용을 한 장에 하나씩. 숫자/데이터 강조
- ${pages}장(마무리): CTA + 팔로우/저장 유도

각 장에 대해 다음 JSON 형식으로 응답해주세요:
[
  {
    "page": 1,
    "type": "cover/content/cta",
    "headline": "메인 텍스트 (짧고 강렬하게, 2줄 이내)",
    "subtext": "보조 텍스트 (1~2줄)",
    "dataPoint": "숫자/통계가 있으면 (예: 수익률 4.2%, 공실률 8.3% 등)",
    "imageSearch": "이 장에 어울리는 배경 이미지 키워드 (영문, 예: modern building exterior)"
  }
]

텍스트는 짧고 임팩트 있게. 반드시 JSON 배열만 응답해주세요.`;

      const response = await this.callClaude(prompt, 4000);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('응답 파싱 실패');

      const cards = JSON.parse(jsonMatch[0]);
      const colors = styleGuide[style] || styleGuide.modern;
      this.renderCardNews(cards, colors, topic, imageKeywords);
      this.addHistory({ type: 'cardnews', title: `카드뉴스: ${topic}`, content: response });

    } catch (err) {
      result.innerHTML = `<div class="agent-error">오류: ${err.message}</div>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  renderCardNews(cards, colors, topic, defaultKeywords) {
    const result = document.getElementById('cardnews-result');

    const cardHtml = cards.map((card, idx) => {
      const isCover = card.type === 'cover' || card.page === 1;
      const isCta = card.type === 'cta' || card.page === cards.length;
      // Unsplash 이미지 (1080x1080 인스타 정사각형)
      const imgQuery = card.imageSearch || defaultKeywords[idx % defaultKeywords.length];
      const imgUrl = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(imgQuery)}&sig=${idx}${Date.now()}`;

      return `
        <div class="cardnews-slide cn-with-image" id="cn-slide-${idx}" style="background-image:url('${imgUrl}');">
          <div class="cn-overlay" style="background:${colors.bg};"></div>
          <div class="cn-inner">
            <div class="cardnews-page-num" style="color:${colors.accent};">${card.page} / ${cards.length}</div>
            ${isCover ? `<div class="cn-logo-bar" style="background:${colors.gradient};"><span>빌사남</span></div>` : ''}
            ${card.dataPoint ? `<div class="cn-data-point" style="color:${colors.accent};">${card.dataPoint}</div>` : ''}
            <div class="cardnews-headline" style="${isCover ? 'font-size:26px;' : 'font-size:20px;'}">${card.headline}</div>
            <div class="cardnews-subtext">${card.subtext || ''}</div>
            ${isCta ? `<div class="cardnews-cta" style="background:${colors.gradient};color:white;">빌사남과 상담하기 →</div>` : ''}
            ${isCover ? '' : `<div class="cn-bottom-bar" style="background:${colors.gradient};"></div>`}
          </div>
        </div>`;
    }).join('');

    result.innerHTML = `
      <div class="cardnews-output">
        <div class="cardnews-output-header">
          <h4>📸 카드뉴스 미리보기 (${cards.length}장)</h4>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm btn-primary" onclick="ContentAgent.downloadAllCards()">💾 전체 이미지 저장</button>
            <button class="btn btn-sm btn-secondary" onclick="ContentAgent.copyCardNewsText()">📋 텍스트 복사</button>
          </div>
        </div>
        <div class="cardnews-carousel" id="cardnews-carousel">
          ${cardHtml}
        </div>
        <div class="cardnews-nav">
          <button class="btn btn-sm btn-secondary" onclick="ContentAgent.scrollCards(-1)">◀ 이전</button>
          <span id="cn-page-indicator" style="color:var(--text-muted);font-size:13px;">1 / ${cards.length}</span>
          <button class="btn btn-sm btn-secondary" onclick="ContentAgent.scrollCards(1)">다음 ▶</button>
        </div>
        <div class="cardnews-caption" style="margin-top:16px;">
          <h4>📝 인스타그램 캡션</h4>
          <div class="writer-content" id="cardnews-caption-text" style="font-size:14px;">
            <p><strong>${topic}</strong></p>
            <p>.</p>
            <p>${cards.filter(c => c.type !== 'cover' && c.type !== 'cta').map((c,i) => `${i+1}️⃣ ${c.headline}`).join('<br><br>')}</p>
            <p>.</p>
            <p>💡 도움이 되셨다면 [저장] & [공유] 해주세요!</p>
            <p>🏢 중소형 빌딩 투자 상담 → DM 또는 프로필 링크</p>
            <p>.</p>
            <p>#빌사남 #꼬마빌딩 #빌딩투자 #건물주되기 #중소형빌딩 #상가투자 #부동산투자 #건물주 #빌딩매매 #근생빌딩 #부동산공부 #상업용부동산 #건물투자 #부동산재테크 #예비건물주</p>
          </div>
        </div>
      </div>`;

    // 카로셀 스크롤 시 페이지 인디케이터 업데이트
    const carousel = document.getElementById('cardnews-carousel');
    if (carousel) {
      carousel.addEventListener('scroll', () => {
        const idx = Math.round(carousel.scrollLeft / 340) + 1;
        const ind = document.getElementById('cn-page-indicator');
        if (ind) ind.textContent = `${idx} / ${cards.length}`;
      });
    }
  },

  scrollCards(dir) {
    const carousel = document.getElementById('cardnews-carousel');
    if (!carousel) return;
    carousel.scrollBy({ left: 340 * dir, behavior: 'smooth' });
  },

  async downloadAllCards() {
    // html2canvas 로드
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      document.head.appendChild(script);
      await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; });
    }

    const slides = document.querySelectorAll('.cardnews-slide');
    if (!slides.length) return;

    for (let i = 0; i < slides.length; i++) {
      try {
        // 이미지 로드 대기
        const imgs = slides[i].querySelectorAll('img');
        await Promise.all([...imgs].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));

        const canvas = await html2canvas(slides[i], {
          width: 1080,
          height: 1080,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null
        });
        const link = document.createElement('a');
        link.download = `cardnews-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        // 연속 다운로드 간 짧은 딜레이
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.warn(`슬라이드 ${i+1} 저장 실패:`, e);
      }
    }
    alert(`${slides.length}장의 카드뉴스 이미지가 저장되었습니다!`);
  },

  copyCardNewsText() {
    const el = document.getElementById('cardnews-caption-text');
    if (el) {
      navigator.clipboard.writeText(el.innerText).then(() => alert('캡션이 복사되었습니다!')).catch(() => {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        alert('캡션이 복사되었습니다!');
      });
    }
  },

  // ════════════════════════════════════════
  // 5. 영상 기획 & 스크립트
  // ════════════════════════════════════════
  async generateVideoScript() {
    const type = document.getElementById('video-type').value;
    const channel = document.getElementById('video-channel').value;
    const tone = document.getElementById('video-tone').value;
    const topic = document.getElementById('video-topic').value.trim();

    if (!topic) { alert('영상 주제를 입력해주세요.'); return; }

    const loading = document.getElementById('video-loading');
    const result = document.getElementById('video-result');
    loading.style.display = 'flex';
    result.innerHTML = '';

    try {
      const typeGuide = {
        long: '10~20분 롱폼 영상. 심층 분석, 강의형. 챕터 구분 필수.',
        medium: '3~8분 미디엄 영상. 핵심만 간결하게.',
        short: '60초 이하 숏폼/릴스. 후킹 → 핵심 → CTA 구조.'
      };
      const channelNames = { bilsanam: '빌사남 TV (부동산 투자 전문)', seoulspace: '서울 스페이스 (공간/인테리어)' };
      const toneGuide = { professional: '전문적이고 신뢰감 있는', casual: '친근하고 대화하듯', entertaining: '재미있고 흥미로운' };

      const prompt = `당신은 유튜브 콘텐츠 기획 전문가이자 구성작가입니다.

## 채널 정보
- 채널: ${channelNames[channel]}
- 회사: 빌사남 (중소형 빌딩/꼬마빌딩 50억 이하 매매·임대·투자 컨설팅)

## 영상 요청
- 유형: ${typeGuide[type]}
- 톤: ${toneGuide[tone]}
- 주제: ${topic}

## 다음 내용을 모두 포함해서 작성해주세요:

### 1. 영상 기획서
- 제목 (3가지 옵션, 클릭율 높은 순)
- 썸네일 아이디어 (텍스트 + 이미지 구성)
- 타겟 시청자
- 핵심 메시지

### 2. 영상 구성표
${type === 'short' ? '- 0~3초: 후킹\n- 3~30초: 핵심 내용\n- 30~60초: CTA' : '- 각 챕터별 시간, 내용, 화면 구성'}

### 3. 전체 스크립트
- 실제 촬영에 바로 사용할 수 있는 대본
- 자막 텍스트 포함
- [화면 지시] 형태로 편집 포인트 표시
${type !== 'short' ? '- 인트로 → 본문 → 아웃트로 구조' : ''}

### 4. SEO 최적화
- 영상 설명글 (유튜브 디스크립션)
- 태그 15개
- 해시태그 5개

완성된 기획서와 스크립트를 작성해주세요.`;

      const response = await this.callClaude(prompt, 8192);

      result.innerHTML = `
        <div class="writer-output">
          <div class="writer-output-header">
            <h4>🎬 ${channelNames[channel]} - 영상 기획서 & 스크립트</h4>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-primary" onclick="ContentAgent.copyContent('video-content')">📋 복사</button>
              <button class="btn btn-sm btn-secondary" onclick="ContentAgent.downloadContent('${topic}', 'video-content')">💾 저장</button>
            </div>
          </div>
          <div class="writer-content" id="video-content">${this.formatMarkdown(response)}</div>
        </div>`;
      this.addHistory({ type: 'video', title: `영상: ${topic}`, content: response });

    } catch (err) {
      result.innerHTML = `<div class="agent-error">오류: ${err.message}</div>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  // ════════════════════════════════════════
  // 6. 주간 발행 캘린더
  // ════════════════════════════════════════
  async generateWeeklyPlan() {
    const loading = document.getElementById('calendar-loading');
    const result = document.getElementById('agent-calendar-result');
    loading.style.display = 'flex';
    result.innerHTML = '';

    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dayNames = ['일','월','화','수','목','금','토'];
        days.push(`${d.getMonth()+1}/${d.getDate()} (${dayNames[d.getDay()]})`);
      }

      const prompt = `당신은 콘텐츠 마케팅 캘린더 전문가입니다.

## 회사 정보
- 빌사남: 중소형 빌딩(꼬마빌딩, 50억 이하) 매매·임대·투자 컨설팅
- 채널: 유튜브(빌사남TV, 서울스페이스), 인스타그램, 네이버블로그, 티스토리, 워드프레스
- 목표: 매일 1개 이상 콘텐츠 발행, 크로스 플랫폼 재활용

## 이번 주 날짜
${days.map((d, i) => `${i === 0 ? '월' : i === 1 ? '화' : i === 2 ? '수' : i === 3 ? '목' : i === 4 ? '금' : i === 5 ? '토' : '일'}요일: ${d}`).join('\n')}

## 주간 콘텐츠 캘린더를 JSON으로 생성해주세요:

[
  {
    "day": "월",
    "date": "${days[0]}",
    "contents": [
      {
        "platform": "youtube/instagram/blog/tistory/wordpress",
        "type": "롱폼/숏폼/카루셀/릴스/블로그글/스토리",
        "title": "콘텐츠 제목",
        "description": "간단한 설명",
        "time": "게시 시간",
        "priority": "필수/권장/선택"
      }
    ]
  }
]

규칙:
- 매일 최소 1개, 최대 3개 콘텐츠
- 유튜브 롱폼은 화/목/토 중 선택
- 인스타 카루셀은 월/수/금
- 블로그는 매일 1개
- 숏폼/릴스는 매일 가능
- 주제의 다양성 확보 (부동산 시장, 투자 팁, 세금, 인테리어, 매물 소개 등)
- 크로스 플랫폼 재활용 고려

반드시 JSON 배열만 응답해주세요.`;

      const response = await this.callClaude(prompt, 6144);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('응답 파싱 실패');

      const calendar = JSON.parse(jsonMatch[0]);
      this.renderWeeklyCalendar(calendar);
      localStorage.setItem(this.CALENDAR_KEY, JSON.stringify(calendar));
      this.addHistory({ type: 'calendar', title: '주간 콘텐츠 캘린더', content: response });

    } catch (err) {
      result.innerHTML = `<div class="agent-error">오류: ${err.message}</div>`;
    } finally {
      loading.style.display = 'none';
    }
  },

  renderWeeklyCalendar(calendar) {
    const result = document.getElementById('agent-calendar-result');
    const platformIcons = { youtube: '🎬', instagram: '📸', blog: '📝', tistory: '🟠', wordpress: '🔵', tiktok: '🎵' };
    const priorityColors = { '필수': '#4ade80', '권장': '#fbbf24', '선택': '#94a3b8' };

    result.innerHTML = `
      <div class="weekly-calendar-grid">
        ${calendar.map(day => `
          <div class="calendar-day-card">
            <div class="calendar-day-header">
              <span class="calendar-day-name">${day.day}요일</span>
              <span class="calendar-day-date">${day.date}</span>
            </div>
            <div class="calendar-day-contents">
              ${(day.contents || []).map(c => `
                <div class="calendar-content-item">
                  <div class="calendar-content-header">
                    <span>${platformIcons[c.platform] || '📄'}</span>
                    <span class="calendar-content-type">${c.type}</span>
                    <span class="calendar-priority" style="background:${priorityColors[c.priority] || '#94a3b8'}">${c.priority}</span>
                  </div>
                  <div class="calendar-content-title">${c.title}</div>
                  <div class="calendar-content-desc">${c.description || ''}</div>
                  <div class="calendar-content-time">⏰ ${c.time}</div>
                  <button class="btn btn-sm btn-primary" style="margin-top:6px;width:100%;" onclick="ContentAgent.makeFromCalendar('${c.title.replace(/'/g, "\\'")}', '${c.platform}')">🚀 만들기</button>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  makeFromCalendar(title, platform) {
    if (platform === 'youtube') {
      document.getElementById('video-topic').value = title;
      this.switchTab('video');
    } else if (platform === 'instagram') {
      document.getElementById('cardnews-topic').value = title;
      this.switchTab('cardnews');
    } else {
      document.getElementById('writer-topic').value = title;
      const sel = document.getElementById('writer-platform');
      if (['blog','tistory','wordpress'].includes(platform)) sel.value = platform;
      this.switchTab('writer');
    }
  },

  exportCalendar() {
    const cal = localStorage.getItem(this.CALENDAR_KEY);
    if (!cal) { alert('먼저 주간 계획을 생성해주세요.'); return; }
    const blob = new Blob([cal], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `content-calendar-${Storage.formatDate(new Date())}.json`;
    a.click();
  },

  // ════════════════════════════════════════
  // 7. 오늘의 콘텐츠 일괄 생성
  // ════════════════════════════════════════
  async runDaily() {
    if (!confirm('오늘의 콘텐츠를 AI가 자동 생성합니다.\n(뉴스 수집 → 콘텐츠 추천 → 블로그 글 1편)\n\n진행하시겠습니까?')) return;

    this.switchTab('news');
    await this.fetchNews();

    this.switchTab('recommend');
    await this.getRecommendations();

    alert('뉴스 수집과 콘텐츠 추천이 완료되었습니다!\n추천된 주제로 글 작성, 카드뉴스, 영상을 만들어보세요.');
  },

  // ── 유틸리티 ──
  copyContent(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      navigator.clipboard.writeText(el.innerText).then(() => alert('복사되었습니다!')).catch(() => {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        alert('복사되었습니다!');
      });
    }
  },

  downloadContent(title, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.substring(0, 30)}-${Storage.formatDate(new Date())}.txt`;
    a.click();
  }
};
