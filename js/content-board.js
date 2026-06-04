// ========================================
// Content Board Module - 빌사남 TV YouTube 현황판
// ========================================
const ContentBoard = {
  data: null,
  loading: false,
  useDemo: false,
  currentChannel: null, // 'bilsanam' or 'seoulspace'

  CHANNELS: {
    bilsanam: { name: '빌사남 TV', icon: '🏢', search: '빌사남 TV', cacheKey: 'yt_cache_bilsanam', channelIdKey: 'yt_channel_id_bilsanam' },
    seoulspace: { name: '서울 스페이스', icon: '🏙️', search: '서울스페이스', cacheKey: 'yt_cache_seoulspace', channelIdKey: 'yt_channel_id_seoulspace' }
  },

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('yt-save-key-btn').addEventListener('click', () => this.saveApiKey());
    document.getElementById('yt-demo-btn').addEventListener('click', () => this.loadDemo());
    document.getElementById('yt-refresh-btn').addEventListener('click', () => this.fetchData(true));
    document.getElementById('yt-connect-real-btn').addEventListener('click', () => this.showSetup());
    document.getElementById('yt-api-key-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveApiKey();
    });
    document.getElementById('video-analysis-modal').addEventListener('click', (e) => {
      if (e.target.id === 'video-analysis-modal') this.closeVideoAnalysis();
    });
  },

  // ── 데모 데이터 생성 ──
  generateDemoData() {
    const today = new Date();
    const channelInfo = {
      id: 'demo',
      title: '빌사남 TV',
      description: '빌딩부자 사나이 남자의 부동산 채널',
      thumbnail: '',
      subscriberCount: 152000,
      videoCount: 487,
      viewCount: 38500000
    };

    const demoVideos = [
      // 이번 주
      { title: '강남 신축 빌딩 매물 투어 | 수익률 분석까지', days: 0, dur: 1245, views: 18200, likes: 890, comments: 156 },
      { title: '월세 1억 받는 건물주의 하루', days: 1, dur: 952, views: 42500, likes: 2100, comments: 387 },
      { title: '#shorts 부동산 초보가 꼭 알아야 할 3가지', days: 1, dur: 45, views: 85000, likes: 3200, comments: 210 },
      { title: '2026년 상반기 부동산 시장 전망', days: 2, dur: 1830, views: 31200, likes: 1540, comments: 298 },
      { title: '#shorts 이 지역 지금 사면 대박', days: 3, dur: 38, views: 120000, likes: 5600, comments: 445 },
      // 저번 주
      { title: '소액으로 빌딩 투자하는 방법 (ft. 공동투자)', days: 7, dur: 1560, views: 28900, likes: 1380, comments: 267 },
      { title: '역세권 꼬마빌딩 실거래가 분석', days: 8, dur: 1120, views: 22100, likes: 1050, comments: 189 },
      { title: '#shorts 월세 계약 시 주의사항', days: 8, dur: 52, views: 95000, likes: 4100, comments: 312 },
      { title: '건물 매입 후 리모델링 비용 총정리', days: 9, dur: 1380, views: 19800, likes: 940, comments: 145 },
      { title: '신사동 상가 건물 수익률 공개', days: 10, dur: 890, views: 15600, likes: 720, comments: 98 },
      { title: '#shorts 전세 vs 월세 뭐가 유리할까?', days: 11, dur: 42, views: 110000, likes: 4800, comments: 389 },
      // 2주 전
      { title: '10억으로 시작하는 빌딩 투자 로드맵', days: 14, dur: 2100, views: 56000, likes: 2800, comments: 412 },
      { title: '상가 공실률 낮추는 실전 노하우', days: 15, dur: 1450, views: 17500, likes: 830, comments: 134 },
      { title: '#shorts 부동산 세금 이것만 알면 끝', days: 15, dur: 55, views: 78000, likes: 3400, comments: 256 },
      { title: '서울 vs 경기 빌딩 투자 비교', days: 16, dur: 1680, views: 24300, likes: 1180, comments: 201 },
      { title: '#shorts 경매로 빌딩 사는 법', days: 17, dur: 48, views: 92000, likes: 4200, comments: 334 },
      { title: '임대수익 극대화하는 인테리어 전략', days: 18, dur: 1290, views: 13200, likes: 620, comments: 87 },
      // 3주 전
      { title: '2026 부동산 정책 변화 총정리', days: 21, dur: 1920, views: 38000, likes: 1900, comments: 345 },
      { title: '강남 3구 빌딩 시세 변동 추이', days: 22, dur: 1350, views: 21000, likes: 980, comments: 167 },
      { title: '#shorts 부동산 대출 꿀팁', days: 22, dur: 40, views: 68000, likes: 2900, comments: 223 },
      { title: '꼬마빌딩 매입 체크리스트 완벽 가이드', days: 23, dur: 1740, views: 29500, likes: 1420, comments: 256 },
      { title: '#shorts 지금 당장 사야 할 지역', days: 24, dur: 35, views: 135000, likes: 6100, comments: 512 },
      { title: '건물주가 되기 전 꼭 알아야 할 법률 상식', days: 25, dur: 1580, views: 16800, likes: 790, comments: 123 },
      // 4주 전
      { title: '월 500만원 수익 나는 빌딩 실제 사례', days: 28, dur: 1650, views: 45000, likes: 2200, comments: 378 },
      { title: '부동산 경매 입문 완전 가이드', days: 29, dur: 2400, views: 52000, likes: 2600, comments: 445 },
      { title: '#shorts 건물 감정평가 쉽게 보는 법', days: 29, dur: 50, views: 73000, likes: 3100, comments: 245 },
      { title: '홍대 상권 분석 & 투자 포인트', days: 30, dur: 1180, views: 18700, likes: 880, comments: 142 },
      { title: '#shorts 임대차 3법 핵심 요약', days: 31, dur: 44, views: 88000, likes: 3800, comments: 298 },
    ];

    const videos = demoVideos.map((v, i) => {
      const pubDate = new Date(today);
      pubDate.setDate(pubDate.getDate() - v.days);
      return {
        id: 'demo_' + i,
        title: v.title.replace('#shorts ', ''),
        description: '',
        publishedAt: pubDate.toISOString(),
        thumbnail: '',
        duration: v.dur,
        durationText: YouTubeService.formatDuration(v.dur),
        isShort: v.dur <= 60,
        views: v.views,
        likes: v.likes,
        comments: v.comments
      };
    });

    const weeks = YouTubeService.groupByWeek(videos);
    return { channelInfo, videos, weeks };
  },

  loadDemo() {
    this.useDemo = true;
    this.data = this.generateDemoData();
    this.render();
  },

  showSetup() {
    this.useDemo = false;
    document.getElementById('yt-setup-area').style.display = 'flex';
    document.getElementById('yt-dashboard-area').style.display = 'none';
    document.getElementById('yt-demo-banner').style.display = 'none';
  },

  selectChannel(channelKey) {
    this.currentChannel = channelKey;
    const ch = this.CHANNELS[channelKey];
    document.getElementById('yt-page-title').textContent = `🎬 ${ch.name}`;
    document.getElementById('yt-channel-select').style.display = 'none';
    document.getElementById('yt-back-btn').style.display = 'inline-flex';
    document.getElementById('yt-setup-area').style.display = 'none';
    document.getElementById('yt-dashboard-area').style.display = 'block';
    this.useDemo = false;

    // 채널별 캐시/ID 로드
    YouTubeService.CACHE_KEY = ch.cacheKey;

    // 캐시 있으면 즉시 표시
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ch.cacheKey)); } catch {}
    const cached = (raw && raw.data) ? raw.data : raw;
    if (cached && cached.channelInfo) {
      this.data = cached;
      this.render();
      return;
    }

    // 캐시 없으면 API 호출
    this.data = null;
    const savedId = localStorage.getItem(ch.channelIdKey);
    if (savedId) {
      YouTubeService.setChannelId(savedId);
      this.fetchData(false);
    } else {
      this.autoConnectChannel(channelKey);
    }
  },

  async autoConnectChannel(channelKey) {
    const ch = this.CHANNELS[channelKey];
    document.getElementById('yt-loading').style.display = 'flex';
    document.getElementById('yt-setup-area').style.display = 'none';
    try {
      const channels = await YouTubeService.searchChannel(ch.search);
      if (channels.length > 0) {
        YouTubeService.setChannelId(channels[0].id);
        localStorage.setItem(ch.channelIdKey, channels[0].id);
        await this.fetchData(true);
      } else {
        this.loadDemo();
      }
    } catch (err) {
      this.loadDemo();
    }
  },

  showChannelSelect() {
    this.currentChannel = null;
    this.data = null;
    document.getElementById('yt-page-title').textContent = '🎬 유튜브';
    document.getElementById('yt-channel-select').style.display = 'block';
    document.getElementById('yt-dashboard-area').style.display = 'none';
    document.getElementById('yt-setup-area').style.display = 'none';
    document.getElementById('yt-back-btn').style.display = 'none';
    document.getElementById('yt-demo-banner').style.display = 'none';
  },

  async saveApiKey() {
    const input = document.getElementById('yt-api-key-input');
    const key = input.value.trim();
    if (!key) { input.focus(); return; }

    YouTubeService.setApiKey(key);
    this.showStatus('API 키 저장 완료! 채널을 검색합니다...', 'info');

    try {
      const channels = await YouTubeService.searchChannel('빌사남 TV');
      if (channels.length === 0) {
        this.showStatus('채널을 찾을 수 없습니다. API 키를 확인해주세요.', 'error');
        return;
      }
      YouTubeService.setChannelId(channels[0].id);
      this.showStatus(`"${channels[0].title}" 채널이 연결되었습니다!`, 'success');
      this.useDemo = false;
      await this.fetchData(true);
    } catch (err) {
      this.showStatus('오류: ' + err.message, 'error');
    }
  },

  showStatus(msg, type) {
    const el = document.getElementById('yt-status');
    el.textContent = msg;
    el.className = 'yt-status yt-status-' + type;
    el.style.display = 'block';
    if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 3000);
  },

  async refresh() {
    // 채널이 선택되지 않았으면 자동으로 빌사남TV 선택 (상세 안 눌러도 바로)
    if (!this.currentChannel) {
      this.selectChannel('bilsanam');
      return;
    }

    const hasKey = !!YouTubeService.getApiKey();

    if (hasKey && !this.useDemo) {
      if (!YouTubeService.getChannelId()) {
        await this.autoConnectChannel(this.currentChannel);
        return;
      }

      document.getElementById('yt-setup-area').style.display = 'none';
      document.getElementById('yt-dashboard-area').style.display = 'block';
      document.getElementById('yt-channel-select').style.display = 'none';
      const cached = YouTubeService.loadCache();
      if (cached) {
        this.data = cached;
        this.render();
      } else {
        await this.fetchData(false);
      }
    } else if (this.useDemo || this.data) {
      if (!this.data) this.data = this.generateDemoData();
      this.render();
    } else {
      document.getElementById('yt-setup-area').style.display = 'flex';
      document.getElementById('yt-dashboard-area').style.display = 'none';
      const existingKey = YouTubeService.getApiKey();
      if (existingKey) {
        document.getElementById('yt-api-key-input').value = existingKey;
      }
    }
  },


  async fetchData(force) {
    if (this.loading) return;
    if (!force) {
      const cached = YouTubeService.loadCache();
      if (cached) { this.data = cached; this.render(); return; }
    }

    this.loading = true;
    document.getElementById('yt-loading').style.display = 'flex';

    try {
      const result = await YouTubeService.getRecentVideos(50);
      const weeks = YouTubeService.groupByWeek(result.videos);
      this.data = { channelInfo: result.channelInfo, videos: result.videos, weeks };
      YouTubeService.saveCache(this.data);
      this.useDemo = false;
      this.render();
    } catch (err) {
      this.showStatus('데이터 로드 실패: ' + err.message, 'error');
      if (err.message.includes('API') || err.message.includes('403') || err.message.includes('401')) {
        document.getElementById('yt-setup-area').style.display = 'flex';
        document.getElementById('yt-dashboard-area').style.display = 'none';
      }
    } finally {
      this.loading = false;
      document.getElementById('yt-loading').style.display = 'none';
    }
  },

  formatNum(num) {
    if (!num || num === 0) return '0';
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  },

  formatDurationShort(seconds) {
    if (!seconds) return '0분';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  },

  render() {
    if (!this.data) return;
    document.getElementById('yt-setup-area').style.display = 'none';
    document.getElementById('yt-dashboard-area').style.display = 'block';

    // 데모 모드 배너
    const banner = document.getElementById('yt-demo-banner');
    if (this.useDemo) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }

    this.renderChannelHeader();
    this.renderOverviewCards();
    this.renderQuickStats();
    // AI 자동 분석 (서버 프록시 경유)
    this.runAutoAI();
    this.renderVideoCards();
    this.renderRecommendations();
    this.renderInsights();
    this.renderScriptIdeas();
  },

  renderQuickStats() {
    const videos = this.data.videos;
    const weeks = this.data.weeks;
    const container = document.getElementById('yt-quick-stats');
    if (!weeks.length) { container.innerHTML = ''; return; }

    const thisWeek = weeks[0] || { videos: [], totalViews: 0, longVideos: [], shortVideos: [] };
    const lastWeek = weeks[1] || { videos: [], totalViews: 0, longVideos: [], shortVideos: [] };

    const viewsTrend = lastWeek.totalViews > 0 ? ((thisWeek.totalViews / lastWeek.totalViews - 1) * 100).toFixed(0) : 0;
    const uploadTrend = lastWeek.videos.length > 0 ? thisWeek.videos.length - lastWeek.videos.length : 0;

    // 가장 잘 된 영상 (이번주)
    const bestThisWeek = thisWeek.videos.length > 0 ? [...thisWeek.videos].sort((a, b) => b.views - a.views)[0] : null;

    // 전체 참여율
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const totalEng = videos.reduce((s, v) => s + v.likes + v.comments, 0);
    const engRate = totalViews > 0 ? (totalEng / totalViews * 100).toFixed(1) : '0';

    container.innerHTML = `
      <div class="qs-card" onclick="ContentBoard.showQsDetail('upload')">
        <div class="qs-label">이번 주 업로드</div>
        <div class="qs-value">${thisWeek.videos.length}개</div>
        <div class="qs-detail">롱 ${thisWeek.longVideos.length} · 숏 ${thisWeek.shortVideos.length}</div>
        <div class="qs-trend ${uploadTrend >= 0 ? 'up' : 'down'}">${uploadTrend >= 0 ? '▲' : '▼'} 지난주 대비 ${Math.abs(uploadTrend)}개</div>
      </div>
      <div class="qs-card" onclick="ContentBoard.showQsDetail('weekviews')">
        <div class="qs-label">이번 주 조회수</div>
        <div class="qs-value">${this.formatNum(thisWeek.totalViews)}</div>
        <div class="qs-trend ${Number(viewsTrend) >= 0 ? 'up' : 'down'}">${Number(viewsTrend) >= 0 ? '▲' : '▼'} ${Math.abs(viewsTrend)}%</div>
      </div>
      <div class="qs-card" onclick="ContentBoard.showQsDetail('engage')">
        <div class="qs-label">전체 참여율</div>
        <div class="qs-value">${engRate}%</div>
        <div class="qs-detail">좋아요 + 댓글 / 조회수</div>
      </div>
      <div class="qs-card qs-best" onclick="ContentBoard.showQsDetail('best')">
        <div class="qs-label">🏆 이번 주 BEST</div>
        <div class="qs-best-title">${bestThisWeek ? this.escapeHtml(bestThisWeek.title.length > 28 ? bestThisWeek.title.slice(0, 28) + '…' : bestThisWeek.title) : '-'}</div>
        <div class="qs-detail">${bestThisWeek ? this.formatNum(bestThisWeek.views) + '회' : ''}</div>
      </div>
    `;
  },

  renderChannelHeader() {
    const ch = this.data.channelInfo;
    const el = document.getElementById('yt-channel-info');
    const thumbHtml = ch.thumbnail
      ? `<img src="${ch.thumbnail}" alt="${ch.title}" class="yt-channel-thumb">`
      : `<div class="yt-channel-thumb yt-channel-thumb-placeholder">🎬</div>`;

    el.innerHTML = `
      ${thumbHtml}
      <div class="yt-channel-meta">
        <div class="yt-channel-name">${ch.title}</div>
        <div class="yt-channel-stats">
          구독자 ${this.formatNum(ch.subscriberCount)}명 · 동영상 ${this.formatNum(ch.videoCount)}개 · 총 조회수 ${this.formatNum(ch.viewCount)}회
        </div>
      </div>
      <button class="btn btn-primary" id="ai-channel-btn" onclick="ContentBoard.runChannelAI()" style="margin-left:auto">🤖 AI 종합 분석</button>
    `;
  },

  renderOverviewCards() {
    const videos = this.data.videos;
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
    const totalComments = videos.reduce((s, v) => s + v.comments, 0);
    const longCount = videos.filter(v => !v.isShort).length;
    const shortCount = videos.filter(v => v.isShort).length;

    document.getElementById('yt-overview-cards').innerHTML = `
      <div class="cb-summary-card" onclick="ContentBoard.showSummaryDetail('all')">
        <span class="cb-summary-icon">🎬</span>
        <span class="cb-summary-num">${videos.length}</span>
        <span class="cb-summary-label">전체</span>
      </div>
      <div class="cb-summary-card" onclick="ContentBoard.showSummaryDetail('long')">
        <span class="cb-summary-icon">📺</span>
        <span class="cb-summary-num">${longCount}</span>
        <span class="cb-summary-label">롱폼</span>
      </div>
      <div class="cb-summary-card" onclick="ContentBoard.showSummaryDetail('short')">
        <span class="cb-summary-icon">📱</span>
        <span class="cb-summary-num">${shortCount}</span>
        <span class="cb-summary-label">숏폼</span>
      </div>
      <div class="cb-summary-card" onclick="ContentBoard.showSummaryDetail('views')">
        <span class="cb-summary-icon">👁️</span>
        <span class="cb-summary-num">${this.formatNum(totalViews)}</span>
        <span class="cb-summary-label">조회수</span>
      </div>
      <div class="cb-summary-card" onclick="ContentBoard.showSummaryDetail('likes')">
        <span class="cb-summary-icon">❤️</span>
        <span class="cb-summary-num">${this.formatNum(totalLikes)}</span>
        <span class="cb-summary-label">좋아요</span>
      </div>
      <div class="cb-summary-card" onclick="ContentBoard.showSummaryDetail('comments')">
        <span class="cb-summary-icon">💬</span>
        <span class="cb-summary-num">${this.formatNum(totalComments)}</span>
        <span class="cb-summary-label">댓글</span>
      </div>
    `;
  },

  showSummaryDetail(type) {
    const videos = this.data.videos;
    let filtered, title, sortKey;

    switch(type) {
      case 'long': filtered = videos.filter(v => !v.isShort); title = '📺 롱폼 영상'; sortKey = 'views'; break;
      case 'short': filtered = videos.filter(v => v.isShort); title = '📱 숏폼 영상'; sortKey = 'views'; break;
      case 'views': filtered = [...videos]; title = '👁️ 조회수 순위'; sortKey = 'views'; break;
      case 'likes': filtered = [...videos]; title = '❤️ 좋아요 순위'; sortKey = 'likes'; break;
      case 'comments': filtered = [...videos]; title = '💬 댓글 순위'; sortKey = 'comments'; break;
      default: filtered = [...videos]; title = '🎬 전체 영상'; sortKey = 'views'; break;
    }

    filtered.sort((a, b) => b[sortKey] - a[sortKey]);

    const existing = document.getElementById('summary-detail-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'summary-detail-panel';
    panel.className = 'summary-detail-panel';
    panel.innerHTML = `
      <div class="summary-detail-header">
        <h4>${title} (${filtered.length}개)</h4>
        <button class="btn-icon" onclick="document.getElementById('summary-detail-panel').remove()">✕</button>
      </div>
      <div class="summary-detail-list">
        ${filtered.map((v, i) => `
          <div class="summary-detail-item" onclick="ContentBoard.openVideoAnalysis('${v.id}')">
            <span style="color:var(--text-muted);min-width:20px">${i+1}</span>
            <span class="yt-type-badge ${v.isShort ? 'short' : 'long'}" style="font-size:10px">${v.isShort ? '숏' : '롱'}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.escapeHtml(v.title)}</span>
            <span class="sdi-views">${sortKey === 'likes' ? '❤️ ' + this.formatNum(v.likes) : sortKey === 'comments' ? '💬 ' + this.formatNum(v.comments) : '👁️ ' + this.formatNum(v.views)}</span>
          </div>
        `).join('')}
      </div>
    `;

    const overviewCards = document.getElementById('yt-overview-cards');
    overviewCards.parentElement.insertBefore(panel, overviewCards.nextSibling);
  },

  renderWeeklyTable() {
    const weeks = this.data.weeks;
    const container = document.getElementById('yt-weekly-table');

    if (weeks.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">주간 데이터가 없습니다</div></div>';
      return;
    }

    const rows = weeks.map(w => `
      <tr class="cb-row">
        <td class="yt-week-label">${w.weekLabel}</td>
        <td class="cb-cell-num">${w.videos.length}개</td>
        <td class="cb-cell-num"><span class="yt-long-badge">롱 ${w.longVideos.length}</span></td>
        <td class="cb-cell-num"><span class="yt-short-badge">숏 ${w.shortVideos.length}</span></td>
        <td class="cb-cell-num cb-highlight">${this.formatNum(w.totalViews)}</td>
        <td class="cb-cell-num">${this.formatNum(w.totalLikes)}</td>
        <td class="cb-cell-num">${this.formatNum(w.totalComments)}</td>
        <td class="cb-cell-num">${this.formatDurationShort(w.totalDuration)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="cb-table">
        <thead>
          <tr>
            <th>주차</th>
            <th>업로드</th>
            <th>롱폼</th>
            <th>숏폼</th>
            <th>조회수</th>
            <th>좋아요</th>
            <th>댓글</th>
            <th>총 길이</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },

  renderWeeklyChart() {
    const weeks = this.data.weeks.slice().reverse();
    const canvas = document.getElementById('yt-weekly-chart');
    if (!canvas) return;

    if (this._chart) this._chart.destroy();

    if (weeks.length < 2) {
      canvas.style.display = 'none';
      return;
    }
    canvas.style.display = 'block';

    this._chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: weeks.map(w => w.weekLabel),
        datasets: [
          {
            label: '롱폼',
            data: weeks.map(w => w.longVideos.length),
            backgroundColor: 'rgba(124, 92, 252, 0.7)',
            borderRadius: 4,
            barPercentage: 0.6
          },
          {
            label: '숏폼',
            data: weeks.map(w => w.shortVideos.length),
            backgroundColor: 'rgba(0, 212, 255, 0.7)',
            borderRadius: 4,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#8a8aa8', font: { size: 12 } }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#8a8aa8', font: { size: 11 } }
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#8a8aa8', font: { size: 11 }, stepSize: 1 }
          }
        }
      }
    });
  },

  renderRecommendations() {
    const videos = this.data.videos;
    const container = document.getElementById('yt-recommendations');
    if (!container || videos.length === 0) return;

    const recs = [];

    // 1. 가장 잘 된 주제 분석 → 시리즈 추천
    const top5 = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
    const topKeywords = {};
    top5.forEach(v => {
      const words = v.title.replace(/[[\]()｜|#\d]/g, '').split(/\s+/).filter(w => w.length > 1);
      words.forEach(w => { topKeywords[w] = (topKeywords[w] || 0) + 1; });
    });
    const hotTopics = Object.entries(topKeywords).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    if (hotTopics.length > 0) {
      recs.push({
        type: 'hot', label: '🔥 인기 주제',
        title: `"${hotTopics.join(', ')}" 관련 콘텐츠를 더 만드세요`,
        reason: `최근 조회수 TOP 5 영상에서 반복적으로 등장하는 키워드입니다. 시청자들이 이 주제에 가장 많이 반응하고 있습니다.`,
        examples: `제목 예시: "${hotTopics[0]} 실전 가이드 2탄", "${hotTopics[0]} 초보가 모르는 비밀 3가지"`
      });
    }


    // 3. 참여율 높은 영상 포맷 분석
    const byEngagement = [...videos].sort((a, b) => {
      const rateA = a.views > 0 ? (a.likes + a.comments) / a.views : 0;
      const rateB = b.views > 0 ? (b.likes + b.comments) / b.views : 0;
      return rateB - rateA;
    });
    const topEngaged = byEngagement[0];
    if (topEngaged) {
      const rate = (topEngaged.views > 0 ? ((topEngaged.likes + topEngaged.comments) / topEngaged.views * 100).toFixed(1) : 0);
      recs.push({
        type: 'new', label: '💡 포맷 추천',
        title: `"${topEngaged.title.length > 30 ? topEngaged.title.slice(0,30) + '…' : topEngaged.title}" 포맷을 반복하세요`,
        reason: `참여율 ${rate}%로 전체 1위입니다. 이 영상과 비슷한 구성(길이, 주제, 스타일)으로 제작하면 댓글과 좋아요가 늘어납니다.`,
        examples: `비슷한 길이(${YouTubeService.formatDuration(topEngaged.duration)}), 비슷한 주제, 비슷한 썸네일 톤으로 제작`
      });
    }

    // 4. 숏폼 부족 체크
    const shortCount = videos.filter(v => v.isShort).length;
    if (shortCount === 0) {
      recs.push({
        type: 'new', label: '🆕 새로운 시도',
        title: '숏폼(Shorts)을 시작하세요',
        reason: '현재 숏폼 콘텐츠가 없습니다. YouTube Shorts는 신규 구독자 유입의 핵심 채널입니다.',
        examples: '"1분 정리: 부동산 투자 핵심", "이것만 기억하세요 #shorts"'
      });
    }

    // 5. 댓글 많은 영상 → Q&A/논쟁 콘텐츠 추천
    const topComments = [...videos].sort((a, b) => b.comments - a.comments)[0];
    if (topComments && topComments.comments > 50) {
      recs.push({
        type: 'hot', label: '🔥 참여 유도',
        title: '시청자 의견을 활용한 Q&A / 반박 콘텐츠',
        reason: `"${topComments.title.slice(0,25)}…" 영상에 댓글 ${this.formatNum(topComments.comments)}개가 달렸습니다. 시청자 질문이나 반대 의견을 모아 후속 콘텐츠를 만들면 참여율이 폭발합니다.`,
        examples: '"댓글 모음 반박합니다", "구독자 질문 TOP 10 답변"'
      });
    }

    // 6. 업로드 시간대 추천
    recs.push({
      type: 'grow', label: '⏰ 운영 팁',
      title: '업로드 시간을 고정하세요',
      reason: '같은 요일, 같은 시간에 꾸준히 올리면 구독자가 기대하게 됩니다. 부동산 채널은 화/목/토 오전 8-10시 or 저녁 7-9시가 효과적입니다.',
      examples: '예: 매주 화요일 오전 9시 롱폼, 목/토 숏폼'
    });

    container.innerHTML = `<div class="rec-grid">${recs.map((r, i) => `
      <div class="rec-card rec-${r.type}">
        <span class="rec-type">${r.label}</span>
        <div class="rec-title">${r.title}</div>
        <div class="rec-reason">${r.reason}</div>
        <div class="rec-examples"><strong>💬 </strong>${r.examples}</div>
        <button class="btn btn-sm btn-primary" style="margin-top:12px;width:100%" onclick="ContentBoard.runRecAI(${i})">🤖 AI 상세 솔루션</button>
      </div>
    `).join('')}</div>`;
  },

  renderScriptIdeas() {
    const videos = this.data.videos;
    const container = document.getElementById('yt-script-ideas');
    if (!container || videos.length === 0) return;

    const top3 = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);
    const topKeywords = {};
    top3.forEach(v => {
      v.title.replace(/[[\]()｜|#\d]/g, '').split(/\s+/).filter(w => w.length > 1).forEach(w => {
        topKeywords[w] = (topKeywords[w] || 0) + 1;
      });
    });
    const hot = Object.entries(topKeywords).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const kw = hot[0] || '부동산';

    const ch = this.CHANNELS[this.currentChannel];
    const chName = ch ? ch.name : '채널';
    const isBS = this.currentChannel === 'bilsanam';

    const scripts = [
      {
        title: `${kw} 완벽 가이드 (롱폼 15분)`,
        hook: `"${kw}에 대해 아직도 이렇게 생각하시나요? 오늘 영상 하나로 완벽하게 정리해드리겠습니다."`,
        structure: `1. 후킹 (0:00~0:30) - 충격적인 통계나 사례로 시작\n2. 문제 제기 (0:30~2:00) - 시청자의 오해/고민 짚기\n3. 핵심 정보 (2:00~10:00) - 3~5가지 핵심 포인트\n4. 실전 사례 (10:00~13:00) - 실제 케이스 분석\n5. 마무리 (13:00~15:00) - 핵심 요약 + 다음 영상 예고`,
        cta: `"이 영상이 도움이 되셨다면 좋아요와 구독 부탁드립니다. 댓글로 ${kw} 관련 궁금한 점 남겨주세요!"`
      },
      {
        title: `${isBS ? '건물주' : '서울 부동산'} 현실 Q&A (숏폼 시리즈)`,
        hook: `"구독자님이 물어봤습니다. '${kw} 지금 해도 될까요?'"`,
        structure: `1. 질문 화면 (0~3초) - 댓글 캡쳐 or 텍스트\n2. 답변 핵심 (3~20초) - 결론 먼저, 이유 설명\n3. 한 줄 정리 (20~30초) - 핵심 메시지 자막`,
        cta: `"더 궁금한 거 댓글로 남겨주세요! 다음 숏폼에서 답해드립니다."`
      },
      {
        title: `${isBS ? '이 빌딩 얼마일까?' : '서울 핫플 분석'} (참여형 콘텐츠)`,
        hook: `"자, 이 건물 보이시죠? 여러분이 가격을 맞혀보세요. 정답은 영상 마지막에!"`,
        structure: `1. 건물 외관 소개 (0:00~1:00)\n2. 힌트 제공 - 위치, 면적, 층수 (1:00~3:00)\n3. 시청자 추측 유도 (3:00~3:30)\n4. 내부/수익 정보 공개 (3:30~7:00)\n5. 가격 공개 + 분석 (7:00~10:00)`,
        cta: `"맞추신 분 댓글로 알려주세요! 다음에는 더 놀라운 건물 가져오겠습니다."`
      }
    ];

    container.innerHTML = scripts.map((s, i) => `
      <div class="rec-card rec-new" style="margin-bottom:16px;">
        <span class="rec-type">📝 스크립트 #${i+1}</span>
        <div class="rec-title">${s.title}</div>
        <div style="margin-top:10px;">
          <div style="margin-bottom:8px;"><strong>🎣 후킹:</strong> <span style="color:var(--accent-cyan)">${s.hook}</span></div>
          <div style="margin-bottom:8px;"><strong>📋 구성:</strong><pre style="white-space:pre-wrap;font-size:12px;color:var(--text-secondary);margin:4px 0;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;">${s.structure}</pre></div>
          <div><strong>📢 CTA:</strong> <span style="color:var(--accent-green)">${s.cta}</span></div>
        </div>
      </div>
    `).join('');
  },

  renderVideoCards() {
    const videos = this.data.videos;
    const container = document.getElementById('yt-video-cards');
    if (!container) return;

    const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;

    const cards = videos.map(v => {
      const date = new Date(v.publishedAt);
      const dateStr = `${date.getMonth()+1}/${date.getDate()}`;
      const engageRate = v.views > 0 ? ((v.likes + v.comments) / v.views * 100).toFixed(1) : '0';

      let perfLabel, perfClass;
      if (v.views >= avgViews * 1.5) { perfLabel = '매우 우수'; perfClass = 'perf-great'; }
      else if (v.views >= avgViews) { perfLabel = '양호'; perfClass = 'perf-good'; }
      else if (v.views >= avgViews * 0.5) { perfLabel = '보통'; perfClass = 'perf-avg'; }
      else { perfLabel = '개선 필요'; perfClass = 'perf-low'; }

      const thumbHtml = v.thumbnail
        ? `<img src="${v.thumbnail}" alt="" class="vc-thumb">`
        : `<div class="vc-thumb vc-thumb-ph">${v.isShort ? '📱' : '📺'}</div>`;

      return `
        <div class="video-card" onclick="ContentBoard.openVideoAnalysis('${v.id}')">
          <div class="vc-thumb-wrap">
            ${thumbHtml}
            <span class="vc-duration">${v.durationText}</span>
            <span class="vc-type-tag ${v.isShort ? 'short' : 'long'}">${v.isShort ? 'SHORT' : 'LONG'}</span>
          </div>
          <div class="vc-body">
            <div class="vc-title">${this.escapeHtml(v.title)}</div>
            <div class="vc-date">${dateStr}</div>
            <div class="vc-stats-row">
              <div class="vc-stat"><span class="vc-stat-icon">👁️</span>${this.formatNum(v.views)}</div>
              <div class="vc-stat"><span class="vc-stat-icon">❤️</span>${this.formatNum(v.likes)}</div>
              <div class="vc-stat"><span class="vc-stat-icon">💬</span>${this.formatNum(v.comments)}</div>
            </div>
            <div class="vc-bottom">
              <span class="vc-engage">참여 ${engageRate}%</span>
              <span class="vc-perf ${perfClass}">${perfLabel}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="video-cards-grid">${cards}</div>`;
  },

  // ══════════════════════════════════════
  // 콘텐츠 분석 엔진
  // ══════════════════════════════════════
  renderInsights() {
    const videos = this.data.videos;
    const weeks = this.data.weeks;
    if (videos.length === 0) return;

    const container = document.getElementById('yt-analysis');
    if (!container) return;
    const insights = this.generateInsights(videos, weeks);

    container.innerHTML = `
      <div class="analysis-insights">
        ${insights.map(i => `
          <div class="insight-card insight-${i.type}">
            <div class="insight-icon">${i.icon}</div>
            <div class="insight-body">
              <div class="insight-title">${i.title}</div>
              <div class="insight-desc">${i.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  generateInsights(videos, weeks) {
    const insights = [];

    // 1. 업로드 빈도 분석
    if (weeks.length >= 2) {
      const avgPerWeek = (videos.length / weeks.length).toFixed(1);
      const thisWeek = weeks[0];
      const lastWeek = weeks[1];
      if (thisWeek.videos.length < lastWeek.videos.length) {
        insights.push({
          type: 'warn',
          icon: '⚠️',
          title: `이번 주 업로드가 줄었습니다 (${thisWeek.videos.length}개 vs 지난주 ${lastWeek.videos.length}개)`,
          desc: `주간 평균 ${avgPerWeek}개 업로드 중입니다. 꾸준한 업로드가 알고리즘에 유리합니다.`
        });
      } else if (thisWeek.videos.length >= lastWeek.videos.length) {
        insights.push({
          type: 'good',
          icon: '✅',
          title: `이번 주 업로드 순조 (${thisWeek.videos.length}개)`,
          desc: `주간 평균 ${avgPerWeek}개 유지 중. 좋은 페이스입니다!`
        });
      }
    }

    // 2. 조회수 트렌드
    if (weeks.length >= 3) {
      const recentViews = weeks[0].totalViews;
      const prevViews = weeks[1].totalViews;
      const oldViews = weeks[2].totalViews;
      if (recentViews > prevViews && prevViews > oldViews) {
        insights.push({
          type: 'good',
          icon: '📈',
          title: '조회수가 3주 연속 상승 중!',
          desc: `${this.formatNum(oldViews)} → ${this.formatNum(prevViews)} → ${this.formatNum(recentViews)}. 현재 전략을 유지하세요.`
        });
      } else if (recentViews < prevViews && prevViews < oldViews) {
        insights.push({
          type: 'warn',
          icon: '📉',
          title: '조회수가 3주 연속 하락 중',
          desc: `${this.formatNum(oldViews)} → ${this.formatNum(prevViews)} → ${this.formatNum(recentViews)}. 썸네일/제목 개선이나 새로운 주제를 시도해보세요.`
        });
      }
    }

    // 5. 참여율 분석
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const totalEngagement = videos.reduce((s, v) => s + v.likes + v.comments, 0);
    const overallRate = totalViews > 0 ? (totalEngagement / totalViews * 100).toFixed(2) : 0;
    if (overallRate < 3) {
      insights.push({
        type: 'warn',
        icon: '🎯',
        title: `전체 참여율 ${overallRate}% - 개선이 필요합니다`,
        desc: '영상 내에서 좋아요/댓글을 유도하는 CTA(Call To Action)를 추가해보세요.'
      });
    } else if (overallRate >= 5) {
      insights.push({
        type: 'good',
        icon: '🎯',
        title: `전체 참여율 ${overallRate}% - 우수합니다!`,
        desc: '시청자들이 적극적으로 반응하고 있습니다. 댓글 소통을 늘려보세요.'
      });
    }

    // 6. 베스트 콘텐츠 주제 분석
    const topVideo = [...videos].sort((a, b) => b.views - a.views)[0];
    if (topVideo) {
      insights.push({
        type: 'tip',
        icon: '🏆',
        title: `가장 인기 있는 영상: "${topVideo.title.substring(0, 30)}..."`,
        desc: `조회수 ${this.formatNum(topVideo.views)}회. 이 주제와 유사한 후속 콘텐츠를 기획해보세요.`
      });
    }

    return insights;
  },

  // ══════════════════════════════════════
  // 영상 개별 분석 모달
  // ══════════════════════════════════════
  openVideoAnalysis(videoId) {
    const v = this.data.videos.find(x => x.id === videoId);
    if (!v) return;

    const videos = this.data.videos;
    const sameType = videos.filter(x => x.isShort === v.isShort);
    const avgViews = sameType.reduce((s, x) => s + x.views, 0) / sameType.length;
    const avgLikes = sameType.reduce((s, x) => s + x.likes, 0) / sameType.length;
    const avgComments = sameType.reduce((s, x) => s + x.comments, 0) / sameType.length;
    const engageRate = v.views > 0 ? ((v.likes + v.comments) / v.views * 100).toFixed(2) : 0;
    const avgEngageRate = avgViews > 0 ? ((avgLikes + avgComments) / avgViews * 100).toFixed(2) : 0;
    const viewsVsAvg = avgViews > 0 ? ((v.views / avgViews - 1) * 100).toFixed(0) : 0;
    const likesVsAvg = avgLikes > 0 ? ((v.likes / avgLikes - 1) * 100).toFixed(0) : 0;

    const viewsRank = [...videos].sort((a, b) => b.views - a.views).findIndex(x => x.id === v.id) + 1;
    const likesRank = [...videos].sort((a, b) => b.likes - a.likes).findIndex(x => x.id === v.id) + 1;

    const date = new Date(v.publishedAt);
    const dateStr = `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;

    let verdict, verdictClass;
    if (v.views >= avgViews * 1.5) { verdict = '평균 대비 매우 우수'; verdictClass = 'great'; }
    else if (v.views >= avgViews) { verdict = '평균 이상 성과'; verdictClass = 'good'; }
    else if (v.views >= avgViews * 0.5) { verdict = '평균 이하 - 개선 필요'; verdictClass = 'warn'; }
    else { verdict = '저조한 성과 - 원인 분석 필요'; verdictClass = 'bad'; }

    const modal = document.getElementById('video-analysis-modal');
    document.getElementById('va-content').innerHTML = `
      <div class="va-header">
        <div class="va-thumb-area">
          ${v.thumbnail ? `<img src="${v.thumbnail}" class="va-thumb">` : `<div class="va-thumb va-thumb-placeholder">${v.isShort ? '📱' : '📺'}</div>`}
          <span class="yt-type-badge ${v.isShort ? 'short' : 'long'}">${v.isShort ? '숏폼' : '롱폼'} · ${v.durationText}</span>
        </div>
        <div class="va-title-area">
          <div class="va-title">${this.escapeHtml(v.title)}</div>
          <div class="va-date">${dateStr} 업로드</div>
          <div class="va-verdict va-verdict-${verdictClass}">${verdict}</div>
          ${!v.id.startsWith('demo_') ? `<a href="https://youtube.com/watch?v=${v.id}" target="_blank" style="font-size:13px;color:var(--accent-cyan);margin-top:8px;display:inline-block">YouTube에서 보기 →</a>` : ''}
        </div>
      </div>

      <div class="va-stats-grid">
        <div class="va-stat">
          <div class="va-stat-label">조회수</div>
          <div class="va-stat-value">${this.formatNum(v.views)}</div>
          <div class="va-stat-compare ${Number(viewsVsAvg) >= 0 ? 'up' : 'down'}">평균 대비 ${Number(viewsVsAvg) >= 0 ? '+' : ''}${viewsVsAvg}%</div>
          <div class="va-stat-rank">${videos.length}개 중 ${viewsRank}위</div>
        </div>
        <div class="va-stat">
          <div class="va-stat-label">좋아요</div>
          <div class="va-stat-value">${this.formatNum(v.likes)}</div>
          <div class="va-stat-compare ${Number(likesVsAvg) >= 0 ? 'up' : 'down'}">평균 대비 ${Number(likesVsAvg) >= 0 ? '+' : ''}${likesVsAvg}%</div>
          <div class="va-stat-rank">${videos.length}개 중 ${likesRank}위</div>
        </div>
        <div class="va-stat">
          <div class="va-stat-label">댓글</div>
          <div class="va-stat-value">${this.formatNum(v.comments)}</div>
          <div class="va-stat-compare ${v.comments >= avgComments ? 'up' : 'down'}">평균 ${this.formatNum(Math.round(avgComments))}개</div>
        </div>
        <div class="va-stat">
          <div class="va-stat-label">참여율</div>
          <div class="va-stat-value">${engageRate}%</div>
          <div class="va-stat-compare ${parseFloat(engageRate) >= parseFloat(avgEngageRate) ? 'up' : 'down'}">${v.isShort ? '숏폼' : '롱폼'} 평균 ${avgEngageRate}%</div>
        </div>
      </div>

      <!-- 분석 결과 -->
      <div class="ai-analysis-section">
        <div class="ai-header">
          <h4>📊 문제진단 · 솔루션 · 제목/썸네일 추천</h4>
        </div>
        <div id="ai-result" class="ai-result"></div>
      </div>
    `;
    modal.classList.add('active');
    // 규칙 기반 분석 바로 표시
    document.getElementById('ai-result').innerHTML = this.getVideoFallback(v, videos, avgViews, avgLikes, avgComments, engageRate, avgEngageRate);
    // 서버 AI 분석 자동 시도 (Claude API 키가 있으면)
    this._autoAIAnalysis(v);
  },

  async _autoAIAnalysis(v) {
    // 서버사이드 AI 분석 시도 (/api/ai/analyze 사용)
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    const videos = this.data.videos;
    const channelInfo = this.data.channelInfo;
    const sameType = videos.filter(x => x.isShort === v.isShort);
    const avgViews = Math.round(sameType.reduce((s, x) => s + x.views, 0) / sameType.length);
    const avgLikes = Math.round(sameType.reduce((s, x) => s + x.likes, 0) / sameType.length);
    const top5 = [...videos].sort((a, b) => b.views - a.views).slice(0, 5).map(x => `"${x.title}" (조회 ${x.views})`).join(', ');
    const engRate = v.views > 0 ? ((v.likes + v.comments) / v.views * 100).toFixed(2) : 0;

    const prompt = `당신은 유튜브 콘텐츠 전략가입니다. 아래 영상을 분석해주세요.

채널: ${channelInfo.title} (구독자 ${channelInfo.subscriberCount}, 영상 ${channelInfo.videoCount}개)
분석 대상: "${v.title}"
- 유형: ${v.isShort ? '숏폼' : '롱폼'} (${v.durationText})
- 조회수: ${v.views} (${v.isShort?'숏폼':'롱폼'} 평균 ${avgViews})
- 좋아요: ${v.likes} (평균 ${avgLikes})
- 댓글: ${v.comments}
- 참여율: ${engRate}%
- 업로드: ${v.publishedAt.slice(0,10)}

채널 TOP5: ${top5}

다음 형식으로 분석해주세요:
## 1. 문제 진단
이 영상이 평균 대비 어떤 성과인지, 구체적 문제점 2-3개

## 2. 개선 솔루션
실행 가능한 구체적 액션 3개 (제목 변경, 썸네일, 업로드 시간 등)

## 3. 제목 추천
현재 제목의 문제점과 대안 제목 3개 (클릭률 높이는 방향)

## 4. 썸네일 전략
이 영상에 맞는 썸네일 디자인 조언

## 5. 후속 콘텐츠
이 영상 기반으로 만들면 좋을 후속 콘텐츠 2개

간결하고 실행 가능하게 작성하세요. 한국어로 답변.`;

    // 기존 분석 아래에 "AI 상세 분석 로딩중" 추가
    const existingContent = resultEl.innerHTML;
    resultEl.innerHTML = existingContent + '<div id="ai-deep-result" style="margin-top:16px;padding:16px;background:rgba(102,126,234,0.08);border-radius:10px;border:1px solid rgba(102,126,234,0.2);"><div class="ai-loading"><div class="yt-spinner"></div> AI가 상세 분석 중...</div></div>';

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      const deepEl = document.getElementById('ai-deep-result');
      if (!deepEl) return;
      if (data.success && data.content) {
        deepEl.innerHTML = '<h4 style="margin:0 0 12px;color:#667eea;">🤖 AI 상세 분석</h4>' + this._markdownToHtml(data.content);
      } else {
        deepEl.remove(); // AI 키 없으면 조용히 제거 (규칙 기반만 표시)
      }
    } catch (e) {
      const deepEl = document.getElementById('ai-deep-result');
      if (deepEl) deepEl.remove();
    }
  },

  _markdownToHtml(md) {
    return md
      .replace(/## (.+)/g, '<h4 style="margin:14px 0 8px;color:#e8e8f0;">$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)/gm, '<li style="margin:3px 0;color:#c0c0d0;">$1</li>')
      .replace(/^(\d+)\. (.+)/gm, '<li style="margin:3px 0;color:#c0c0d0;"><strong>$1.</strong> $2</li>')
      .replace(/\n{2,}/g, '<br>')
      .replace(/\n/g, '<br>');
  },

  saveClaudeKey() {
    const input = document.getElementById('claude-key-input');
    const key = input.value.trim();
    if (!key) { input.focus(); return; }
    AIAnalysis.setApiKey(key);
    // 버튼으로 교체
    const setup = input.parentElement;
    setup.outerHTML = `<button class="btn btn-primary btn-sm" onclick="ContentBoard.runAIAnalysis('${this._currentVideoId}')">AI 분석 실행</button>`;
  },

  async runAIAnalysis(videoId) {
    this._currentVideoId = videoId;
    const v = this.data.videos.find(x => x.id === videoId);
    if (!v) return;

    const resultEl = document.getElementById('ai-result');
    const retryBtn = document.getElementById('ai-retry-btn');
    resultEl.innerHTML = '<div class="ai-loading"><div class="yt-spinner"></div> AI가 분석 중입니다...</div>';
    if (retryBtn) retryBtn.style.display = 'none';

    try {
      const text = await AIAnalysis.analyze(v, this.data.videos, this.data.channelInfo);
      resultEl.innerHTML = `<div class="ai-response">${AIAnalysis.formatResponse(text)}</div>`;
      if (retryBtn) retryBtn.style.display = 'inline-flex';
    } catch (err) {
      resultEl.innerHTML = `<div class="yt-status yt-status-error">AI 분석 실패: ${err.message}</div>`;
      if (retryBtn) retryBtn.style.display = 'inline-flex';
    }
  },

  showQsDetail(type) {
    const weeks = this.data.weeks;
    const videos = this.data.videos;
    const thisWeek = weeks[0] || { videos: [] };

    let title, items;
    switch(type) {
      case 'upload':
        title = '📤 이번 주 업로드 영상';
        items = thisWeek.videos;
        break;
      case 'weekviews':
        title = '👁️ 이번 주 조회수 순위';
        items = [...thisWeek.videos].sort((a, b) => b.views - a.views);
        break;
      case 'engage':
        title = '🎯 참여율 순위 (전체)';
        items = [...videos].sort((a, b) => {
          const ra = a.views > 0 ? (a.likes + a.comments) / a.views : 0;
          const rb = b.views > 0 ? (b.likes + b.comments) / b.views : 0;
          return rb - ra;
        });
        break;
      case 'best':
        title = '🏆 이번 주 BEST 영상';
        items = [...thisWeek.videos].sort((a, b) => b.views - a.views);
        break;
      default: items = []; title = '';
    }

    const existing = document.getElementById('qs-detail-panel');
    if (existing) existing.remove();

    if (items.length === 0) return;

    const panel = document.createElement('div');
    panel.id = 'qs-detail-panel';
    panel.className = 'summary-detail-panel';
    panel.innerHTML = `
      <div class="summary-detail-header">
        <h4>${title} (${items.length}개)</h4>
        <button class="btn-icon" onclick="document.getElementById('qs-detail-panel').remove()">✕</button>
      </div>
      <div class="summary-detail-list">
        ${items.map((v, i) => {
          const eng = v.views > 0 ? ((v.likes + v.comments) / v.views * 100).toFixed(1) : '0';
          return `<div class="summary-detail-item" onclick="ContentBoard.openVideoAnalysis('${v.id}')">
            <span style="color:var(--text-muted);min-width:20px">${i+1}</span>
            <span class="yt-type-badge ${v.isShort ? 'short' : 'long'}" style="font-size:10px">${v.isShort ? '숏' : '롱'}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.escapeHtml(v.title)}</span>
            <span style="font-size:11px;color:var(--text-muted)">참여 ${eng}%</span>
            <span class="sdi-views">👁️ ${this.formatNum(v.views)}</span>
          </div>`;
        }).join('')}
      </div>`;

    const qs = document.getElementById('yt-quick-stats');
    qs.parentElement.insertBefore(panel, qs.nextSibling);
  },

  async runRecAI(index) {
    const btn = event.target;
    const card = btn.closest('.rec-card');
    let resultEl = card.querySelector('.rec-ai-result');
    if (!resultEl) {
      resultEl = document.createElement('div');
      resultEl.className = 'rec-ai-result';
      card.appendChild(resultEl);
    }
    resultEl.innerHTML = '<div class="ai-loading"><div class="yt-spinner"></div> AI 솔루션 작성 중...</div>';
    btn.style.display = 'none';

    const title = card.querySelector('.rec-title').textContent;
    const reason = card.querySelector('.rec-reason').textContent;

    try {
      const apiKey = AIAnalysis.getApiKey();
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{ role: 'user', content: `유튜브 채널 "${this.data.channelInfo.title}"의 콘텐츠 전략 추천입니다:\n\n주제: ${title}\n근거: ${reason}\n\n이 추천을 구체적으로 실행하는 방법을 알려주세요:\n1. 구체적인 영상 제목 3가지\n2. 썸네일 구성 방법\n3. 영상 구성(대본 흐름)\n4. 예상 효과\n\n간결하게 답변하세요.` }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      resultEl.innerHTML = `<div class="ai-response" style="margin-top:12px;font-size:13px">${AIAnalysis.formatResponse(data.content[0].text)}</div>`;
    } catch (err) {
      resultEl.innerHTML = `<div class="yt-status yt-status-error" style="margin-top:8px">실패: ${err.message}</div>`;
      btn.style.display = 'inline-flex';
    }
  },

  async runAutoAI() {
    if (!this.data) return;
    const resultEl = document.getElementById('ai-auto-result');
    const retryBtn = document.getElementById('ai-auto-retry');
    if (!resultEl) return;

    resultEl.innerHTML = '<div class="ai-loading"><div class="yt-spinner"></div> AI 분석 중... (10~20초)</div>';
    if (retryBtn) retryBtn.style.display = 'none';

    try {
      const videos = this.data.videos;
      const ch = this.data.channelInfo;
      const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;
      const top5 = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
      const bottom5 = [...videos].sort((a, b) => a.views - b.views).slice(0, 5);
      const totalEng = videos.reduce((s, v) => s + v.likes + v.comments, 0);
      const totalViews = videos.reduce((s, v) => s + v.views, 0);

      const prompt = `유튜브 채널 성장 컨설턴트로서 실제 데이터 기반 분석하세요.

채널: ${ch.title} (구독자 ${ch.subscriberCount.toLocaleString()}명)
최근 ${videos.length}개 영상 평균 조회수: ${Math.round(avgViews).toLocaleString()}
참여율: ${totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(2) : 0}%

TOP 5: ${top5.map((v, i) => `${i+1}."${v.title}" ${v.views.toLocaleString()}회(${v.isShort?'숏':'롱'})`).join(' / ')}
하위 5: ${bottom5.map((v, i) => `${i+1}."${v.title}" ${v.views.toLocaleString()}회`).join(' / ')}

간결하게 분석:
1. 현재 문제점 (3줄)
2. 추천 콘텐츠 제목 3개 + 이유`;

      // 서버 프록시로 호출 (CORS 문제 없음)
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, maxTokens: 1000 })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'AI 호출 실패');

      var html = data.content.replace(/### (.+)/g, '<h4 style="margin:12px 0 6px;color:#667eea;">$1</h4>')
        .replace(/## (.+)/g, '<h4 style="margin:12px 0 6px;color:#667eea;">$1</h4>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)/gm, '<li><strong>$1.</strong> $2</li>')
        .replace(/\n/g, '<br>');
      resultEl.innerHTML = '<div style="font-size:14px;line-height:1.7;color:#ccc;">' + html + '</div>';
      if (retryBtn) { retryBtn.style.display = 'inline-flex'; retryBtn.textContent = '다시 분석'; }
    } catch (err) {
      // AI 실패 시 규칙 기반 분석으로 대체
      resultEl.innerHTML = this.getFallbackAnalysis();
      if (retryBtn) retryBtn.style.display = 'inline-flex';
    }
  },

  getFallbackAnalysis() {
    const videos = this.data.videos;
    const ch = this.data.channelInfo;
    const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;
    const top5 = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
    const bottom5 = [...videos].sort((a, b) => a.views - b.views).slice(0, 5);
    const totalEng = videos.reduce((s, v) => s + v.likes + v.comments, 0);
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const engRate = totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(2) : 0;

    // 문제점 분석
    const problems = [];
    // 하위 영상 공통점 찾기
    const bottomTitles = bottom5.map(v => v.title).join(' ');
    const topTitles = top5.map(v => v.title).join(' ');

    if (engRate < 3) {
      problems.push(`참여율이 ${engRate}%로 낮습니다. 영상 내 좋아요/댓글 유도 CTA가 부족할 수 있습니다.`);
    }

    const bottomShorts = bottom5.filter(v => v.isShort).length;
    const bottomLongs = bottom5.filter(v => !v.isShort).length;
    if (bottomShorts >= 3) {
      problems.push(`조회수 하위 5개 중 ${bottomShorts}개가 숏폼입니다. 숏폼의 초반 후킹이 약하거나 주제 선정이 맞지 않을 수 있습니다.`);
    } else if (bottomLongs >= 3) {
      problems.push(`조회수 하위 5개 중 ${bottomLongs}개가 롱폼입니다. 영상 길이가 길거나 썸네일/제목의 클릭 유도가 부족할 수 있습니다.`);
    }

    const weeks = this.data.weeks;
    if (weeks.length >= 3 && weeks[0].totalViews < weeks[1].totalViews && weeks[1].totalViews < weeks[2].totalViews) {
      problems.push(`조회수가 3주 연속 하락 중입니다 (${this.formatNum(weeks[2].totalViews)} → ${this.formatNum(weeks[1].totalViews)} → ${this.formatNum(weeks[0].totalViews)}). 새로운 주제나 포맷 변경이 필요합니다.`);
    }

    if (problems.length === 0) {
      problems.push(`전반적으로 안정적인 성과를 보이고 있습니다. 참여율 ${engRate}%, 평균 조회수 ${this.formatNum(Math.round(avgViews))}회.`);
    }

    // 추천 주제 - 인기 영상 키워드 기반
    const topKeywords = {};
    top5.forEach(v => {
      v.title.replace(/[[\]()｜|#\d]/g, '').split(/\s+/).filter(w => w.length > 1).forEach(w => {
        topKeywords[w] = (topKeywords[w] || 0) + 1;
      });
    });
    const hotWords = Object.entries(topKeywords).sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);

    const suggestions = [];
    if (hotWords.length > 0) {
      suggestions.push(`"${hotWords.slice(0, 2).join(', ')}" 관련 심화 콘텐츠 - 조회수 TOP 영상에서 반복 등장하는 키워드입니다.`);
    }
    if (top5[0]) {
      suggestions.push(`"${top5[0].title.slice(0, 25)}..." 후속편 - 가장 인기 있는 영상(${this.formatNum(top5[0].views)}회)의 시리즈물을 만들어보세요.`);
    }
    suggestions.push(`시청자 댓글 기반 Q&A 영상 - 댓글이 많은 영상의 질문을 모아 답변하면 참여율이 높아집니다.`);

    return `
      <div class="ai-response">
        <div class="ai-section-title"><span class="ai-num">1</span> 현재 문제점</div>
        ${problems.map(p => `<span class="ai-bullet">•</span> ${p}<br>`).join('')}
        <br>
        <div class="ai-section-title"><span class="ai-num">2</span> 추천 콘텐츠 주제</div>
        ${suggestions.map(s => `<span class="ai-bullet">•</span> ${s}<br>`).join('')}
        <br>
        <div style="font-size:11px;color:var(--text-muted);font-style:italic">* 데이터 기반 자동 분석입니다. AI 서버 복구 시 더 상세한 분석이 제공됩니다.</div>
      </div>
    `;
  },

  async runChannelAI() {
    if (!this.data) return;
    const resultEl = document.getElementById('ai-channel-result');
    const btn = document.getElementById('ai-channel-btn');
    btn.disabled = true;
    btn.textContent = '분석 중...';
    resultEl.innerHTML = '<div class="ai-loading"><div class="yt-spinner"></div> AI가 채널을 종합 분석 중입니다... (15-30초)</div>';

    try {
      const text = await AIAnalysis.analyzeChannel(this.data.videos, this.data.channelInfo);
      resultEl.innerHTML = `<div class="ai-response">${AIAnalysis.formatResponse(text)}</div>`;
    } catch (err) {
      resultEl.innerHTML = `<div class="yt-status yt-status-error">AI 분석 실패: ${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '다시 분석';
    }
  },

  getVideoFallback(v, videos, avgViews, avgLikes, avgComments, engageRate, avgEngageRate) {
    var problems = [];
    var solutions = [];
    var titles = [];
    var thumbs = [];

    // 문제 진단
    if (v.views < avgViews * 0.7) problems.push('조회수가 평균 대비 낮습니다. 썸네일이나 제목이 클릭을 유도하지 못하고 있습니다.');
    if (v.likes > 0 && v.views > 0 && (v.likes / v.views) < 0.02) problems.push('좋아요 비율이 낮습니다. 영상 내용이 기대와 다르거나, 시청자가 끝까지 보지 않았을 수 있습니다.');
    if (v.comments < avgComments * 0.5) problems.push('댓글이 적습니다. 영상에서 시청자에게 질문하거나 의견을 묻는 부분이 없을 수 있습니다.');
    if (!v.isShort && v.duration > 1500 && v.views < avgViews) problems.push('영상 길이(' + YouTubeService.formatDuration(v.duration) + ')가 길어 시청 이탈이 높을 수 있습니다.');
    if (v.isShort && v.views < avgViews * 0.5) problems.push('숏폼 초반 1-2초에 시선을 잡지 못했을 가능성이 높습니다.');
    if (problems.length === 0) problems.push('이 영상은 전반적으로 양호한 성과를 보이고 있습니다.');

    // 솔루션
    if (v.views < avgViews) {
      solutions.push('썸네일을 교체해보세요. 얼굴 클로즈업 + 큰 텍스트 + 밝은 배경색이 효과적입니다.');
      solutions.push('제목에 숫자, 질문형, 긴급성을 추가하세요. 예: "지금 당장", "꼭 알아야 할"');
    }
    if (parseFloat(engageRate) < parseFloat(avgEngageRate)) {
      solutions.push('영상 초반과 후반에 좋아요/댓글 유도 멘트를 넣으세요.');
    }
    if (v.views >= avgViews * 1.5) {
      solutions.push('이 영상이 잘 됐으니 같은 포맷으로 "Part 2", "후속편"을 만들어보세요.');
      solutions.push('핵심 장면을 30-60초 숏폼으로 재가공하세요.');
    }
    if (solutions.length === 0) solutions.push('현재 전략을 유지하면서 꾸준히 업로드하세요.');

    // 제목 추천
    var words = v.title.replace(/[\\[\\]()｜|#\\d]/g, '').split(/\\s+/).filter(function(w) { return w.length > 1; });
    var kw = words[0] || '부동산';
    if (v.views < avgViews) {
      titles.push('"' + kw + ', 이것 모르면 큰일납니다" (긴급성)');
      titles.push('"' + kw + ' 초보가 꼭 알아야 할 3가지" (숫자형)');
      titles.push('"' + kw + ' 완벽 정리 | 이 영상 하나면 끝" (정리형)');
    } else {
      titles.push('"' + kw + ' 심화편 | 더 깊이 파헤칩니다" (시리즈)');
      titles.push('"' + kw + ' 실전 가이드 2탄" (후속편)');
    }

    // 썸네일
    if (v.views < avgViews) {
      thumbs.push('놀란 표정 클로즈업 + "충격!" 같은 강조 텍스트');
      thumbs.push('배경색을 노랑/빨강으로 변경');
      thumbs.push('화살표, 동그라미 등 시선 유도 요소 추가');
    } else {
      thumbs.push('현재 스타일이 잘 작동하고 있습니다. 같은 톤 유지하세요.');
    }
    thumbs.push('텍스트는 최대 5-7글자, 모바일에서도 읽힐 크기로');

    return '<div class="ai-response">' +
      '<div class="ai-section-title"><span class="ai-num">1</span> 문제 진단</div>' +
      problems.map(function(p) { return '<span class="ai-bullet">•</span> ' + p + '<br>'; }).join('') + '<br>' +
      '<div class="ai-section-title"><span class="ai-num">2</span> 솔루션</div>' +
      solutions.map(function(s) { return '<span class="ai-bullet">•</span> ' + s + '<br>'; }).join('') + '<br>' +
      '<div class="ai-section-title"><span class="ai-num">3</span> 제목 추천</div>' +
      titles.map(function(t) { return '<span class="ai-bullet">•</span> ' + t + '<br>'; }).join('') + '<br>' +
      '<div class="ai-section-title"><span class="ai-num">4</span> 썸네일 전략</div>' +
      thumbs.map(function(t) { return '<span class="ai-bullet">•</span> ' + t + '<br>'; }).join('') +
      '</div>';
  },

  closeVideoAnalysis() {
    document.getElementById('video-analysis-modal').classList.remove('active');
  },

  // renderVideoList 수정 - 분석 버튼 추가
  renderVideoList() {
    const videos = this.data.videos;
    const container = document.getElementById('yt-video-list');
    const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;

    const rows = videos.map(v => {
      const date = new Date(v.publishedAt);
      const dateStr = `${date.getMonth()+1}/${date.getDate()}`;
      const thumbHtml = v.thumbnail
        ? `<img src="${v.thumbnail}" alt="" class="yt-video-thumb">`
        : `<div class="yt-video-thumb yt-video-thumb-placeholder">${v.isShort ? '📱' : '📺'}</div>`;
      const linkOrText = v.id.startsWith('demo_')
        ? `<span class="yt-video-title">${this.escapeHtml(v.title)}</span>`
        : `<a href="https://youtube.com/watch?v=${v.id}" target="_blank" class="yt-video-title">${this.escapeHtml(v.title)}</a>`;

      const engageRate = v.views > 0 ? ((v.likes + v.comments) / v.views * 100).toFixed(1) : '0';
      const perfClass = v.views >= avgViews * 1.5 ? 'perf-great' : v.views >= avgViews ? 'perf-good' : v.views >= avgViews * 0.5 ? 'perf-avg' : 'perf-low';

      return `
        <tr class="cb-row">
          <td class="yt-video-cell">
            ${thumbHtml}
            <div class="yt-video-info">
              ${linkOrText}
              <span class="yt-type-badge ${v.isShort ? 'short' : 'long'}">${v.isShort ? '숏폼' : '롱폼'} · ${v.durationText}</span>
            </div>
          </td>
          <td class="cb-cell-date">${dateStr}</td>
          <td class="cb-cell-num cb-highlight">${this.formatNum(v.views)}</td>
          <td class="cb-cell-num">${this.formatNum(v.likes)}</td>
          <td class="cb-cell-num">${this.formatNum(v.comments)}</td>
          <td class="cb-cell-num">${engageRate}%</td>
          <td class="cb-cell-num"><span class="perf-dot ${perfClass}"></span></td>
          <td class="cb-cell-actions">
            <button class="btn-icon" title="분석" onclick="ContentBoard.openVideoAnalysis('${v.id}')">🔍</button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <table class="cb-table">
        <thead>
          <tr>
            <th class="cb-th-title">영상</th>
            <th>날짜</th>
            <th>조회수</th>
            <th>좋아요</th>
            <th>댓글</th>
            <th>참여율</th>
            <th>성과</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
