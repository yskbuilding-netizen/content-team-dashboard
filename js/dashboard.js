// ========================================
// Dashboard Module - 마케팅 채널 종합 분석
// ========================================
const Dashboard = {
  charts: {},

  PLATFORMS: [
    { key: 'youtube-bilsanam', label: '빌사남TV', emoji: '🏢', color: '#ff4444', metrics: [
      { field: 'views', label: '조회수' },
      { field: 'subscribers', label: '구독자' },
      { field: 'likes', label: '좋아요' }
    ]},
    { key: 'youtube-seoulspace', label: '서울스페이스', emoji: '🏙️', color: '#4a90e2', metrics: [
      { field: 'views', label: '조회수' },
      { field: 'subscribers', label: '구독자' },
      { field: 'likes', label: '좋아요' }
    ]},
    { key: 'instagram', label: '빌사남 인스타그램', emoji: '📸', color: '#e1306c', metrics: [
      { field: 'views', label: '도달' },
      { field: 'subscribers', label: '팔로워' },
      { field: 'likes', label: '좋아요' }
    ]}
  ],

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('add-stat-btn').addEventListener('click', () => this.openModal());
    document.getElementById('cancel-stat-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('save-stat-btn').addEventListener('click', () => this.saveStat());
    document.getElementById('stat-modal').addEventListener('click', (e) => {
      if (e.target.id === 'stat-modal') this.closeModal();
    });
    const refreshBtn = document.getElementById('dash-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadBsnChannels(true));
  },

  // ── BSN 채널 데이터 로딩 (빌사남TV / 서울스페이스 / Instagram) ──
  loadBsnChannels() {
    // refresh()에서 직접 처리하므로 호환용만 유지
    this.refresh();
  },

  async _ensureChannelData() {
    const channels = [
      { key: 'bilsanam', search: '빌사남 TV', cacheKey: 'yt_cache_bilsanam', idKey: 'yt_channel_id_bilsanam' },
      { key: 'seoulspace', search: '서울스페이스', cacheKey: 'yt_cache_seoulspace', idKey: 'yt_channel_id_seoulspace' }
    ];
    for (const c of channels) {
      // 캐시 확인
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(c.cacheKey)); } catch {}
      const cached = (raw && raw.data) ? raw.data : raw;
      if (cached && cached.channelInfo) continue;

      // 서버 프록시로 직접 가져오기
      try {
        let channelId = localStorage.getItem(c.idKey);
        if (!channelId) {
          const searchRes = await fetch(`/api/youtube/search?part=snippet&q=${encodeURIComponent(c.search)}&type=channel&maxResults=1`);
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items[0]) {
            channelId = searchData.items[0].id.channelId || searchData.items[0].snippet.channelId;
            localStorage.setItem(c.idKey, channelId);
          }
        }
        if (!channelId) continue;

        // 채널 정보
        const chRes = await fetch(`/api/youtube/channels?part=snippet,statistics,contentDetails&id=${channelId}`);
        const chData = await chRes.json();
        if (!chData.items || !chData.items[0]) continue;
        const ch = chData.items[0];
        const channelInfo = {
          id: ch.id, title: ch.snippet.title, thumbnail: ch.snippet.thumbnails?.medium?.url || '',
          subscriberCount: Number(ch.statistics.subscriberCount) || 0,
          videoCount: Number(ch.statistics.videoCount) || 0,
          viewCount: Number(ch.statistics.viewCount) || 0,
          uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || ''
        };

        // 최근 영상
        let videos = [];
        if (channelInfo.uploadsPlaylistId) {
          const plRes = await fetch(`/api/youtube/playlistItems?part=snippet,contentDetails&playlistId=${channelInfo.uploadsPlaylistId}&maxResults=30`);
          const plData = await plRes.json();
          const ids = (plData.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
          if (ids.length > 0) {
            const vRes = await fetch(`/api/youtube/videos?part=snippet,statistics,contentDetails&id=${ids.join(',')}`);
            const vData = await vRes.json();
            videos = (vData.items || []).map(v => ({
              id: v.id, title: v.snippet.title, publishedAt: v.snippet.publishedAt,
              thumbnail: v.snippet.thumbnails?.medium?.url || '',
              viewCount: Number(v.statistics.viewCount) || 0,
              likeCount: Number(v.statistics.likeCount) || 0,
              commentCount: Number(v.statistics.commentCount) || 0
            }));
          }
        }

        // 캐시 저장
        localStorage.setItem(c.cacheKey, JSON.stringify({ timestamp: Date.now(), data: { channelInfo, videos } }));
      } catch (e) {
        console.warn(c.key + ' 로딩 실패:', e.message);
      }
    }
  },

  renderChannelSchedule() {
    const el = document.getElementById('dash-channel-schedule');
    if (!el) return;
    const uploads = (typeof UploadPlanner !== 'undefined') ? UploadPlanner.getUploads() : [];
    const today = new Date();
    today.setHours(0,0,0,0);

    const CHANNELS = [
      { key: 'youtube-bilsanam', name: '빌사남TV', icon: '🏢', color: '#ff4444' },
      { key: 'youtube-seoulspace', name: '서울스페이스', icon: '🏙️', color: '#4a90e2' },
      { key: 'instagram', name: '빌사남 인스타그램', icon: '📸', color: '#e1306c' },
      { key: 'reels', name: '릴스', icon: '🎬', color: '#9b59b6' }
    ];

    const dayNames = ['일','월','화','수','목','금','토'];

    el.innerHTML = CHANNELS.map(ch => {
      const items = uploads.filter(u => u.platform === ch.key);
      const upcoming = items.filter(u => new Date(u.date + 'T00:00:00') >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);
      const past = items.filter(u => new Date(u.date + 'T00:00:00') < today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4);

      const renderRow = (u, isPast) => {
        const d = new Date(u.date + 'T00:00:00');
        return `
          <div class="ch-upload-row${isPast ? ' past' : ''}">
            <div class="ch-upload-date">${d.getMonth()+1}/${d.getDate()} (${dayNames[d.getDay()]})</div>
            <div class="ch-upload-body">
              <div class="ch-upload-title">${this._esc(u.title)}</div>
              ${u.pd ? `<div class="ch-upload-pd">👤 ${this._esc(u.pd)}</div>` : ''}
            </div>
          </div>`;
      };

      return `
        <div class="ch-card" style="border-top-color:${ch.color};">
          <div class="ch-card-header">
            <span class="ch-icon" style="color:${ch.color};">${ch.icon}</span>
            <span class="ch-name">${ch.name}</span>
            <span class="ch-count">${items.length}개</span>
          </div>
          <div class="ch-section-label">📤 예정 (${upcoming.length})</div>
          <div class="ch-upload-list">
            ${upcoming.length === 0 ? '<div class="pd-empty">예정 없음</div>' : upcoming.map(u => renderRow(u, false)).join('')}
          </div>
          ${past.length > 0 ? `
            <div class="ch-section-label" style="margin-top:10px;">✅ 최근 (${past.length})</div>
            <div class="ch-upload-list">${past.map(u => renderRow(u, true)).join('')}</div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  CACHE_MAP: { bilsanam: 'yt_cache_bilsanam', seoulspace: 'yt_cache_seoulspace' },

  renderBsnYouTube(channelKey, statsElId, recentElId) {
    const statsEl = document.getElementById(statsElId);
    const recentEl = document.getElementById(recentElId);
    if (!statsEl || !recentEl) return;
    const cacheKey = this.CACHE_MAP[channelKey];
    if (!cacheKey) return;

    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(cacheKey)); } catch {}
    const cached = (raw && raw.data) ? raw.data : raw;

    if (!cached || !cached.channelInfo) {
      statsEl.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:20px;">
          <div class="yt-spinner" style="display:inline-block;margin-bottom:8px;"></div>
          <div style="font-size:13px;color:var(--text-muted);">YouTube 데이터 로딩 중...</div>
        </div>`;
      recentEl.innerHTML = '';
      return;
    }

    const info = cached.channelInfo;
    const videos = cached.videos || [];
    const subs = Number(info.subscriberCount || 0);
    const totalViews = Number(info.viewCount || 0);
    const totalVideos = Number(info.videoCount || videos.length || 0);
    const now = Date.now();
    const recent30 = videos.filter(v => (now - new Date(v.publishedAt).getTime()) < 30 * 24 * 60 * 60 * 1000);
    const recent30Views = recent30.reduce((s, v) => s + Number(v.viewCount || 0), 0);
    const avgView30 = recent30.length > 0 ? Math.round(recent30Views / recent30.length) : 0;

    statsEl.innerHTML = `
      <div class="bsn-stat-item"><div class="bsn-stat-value">${this.formatNumber(subs)}</div><div class="bsn-stat-label">구독자</div></div>
      <div class="bsn-stat-item"><div class="bsn-stat-value">${this.formatNumber(totalViews)}</div><div class="bsn-stat-label">총 조회수</div></div>
      <div class="bsn-stat-item"><div class="bsn-stat-value">${this.formatNumber(avgView30)}</div><div class="bsn-stat-label">평균조회(30일)</div></div>
    `;

    const top = videos.slice(0, 3);
    recentEl.innerHTML = `
      <div class="bsn-recent-title">최근 영상 · 영상 ${totalVideos}개</div>
      ${top.map(v => `
        <a href="https://youtube.com/watch?v=${v.id}" target="_blank" class="bsn-recent-item">
          <img class="bsn-recent-thumb" src="${v.thumbnail || ''}" alt="" loading="lazy">
          <div class="bsn-recent-info">
            <div class="bsn-recent-title-text">${v.title}</div>
            <div class="bsn-recent-meta">👁 ${this.formatNumber(v.viewCount)} · 👍 ${this.formatNumber(v.likeCount)}</div>
          </div>
        </a>
      `).join('')}
    `;
  },

  renderBsnInstagram(statsElId, recentElId) {
    const statsEl = document.getElementById(statsElId);
    const recentEl = document.getElementById(recentElId);
    if (!statsEl || !recentEl) return;

    let raw = null;
    try { raw = JSON.parse(localStorage.getItem('ig_cache')); } catch {}
    const cached = (raw && raw.data) ? raw.data : raw;

    if (!cached || !cached.profile) {
      statsEl.innerHTML = `
        <div class="bsn-connection-status disconnected" style="grid-column:1/-1;">
          <div class="bsn-connection-icon">⚪</div>
          <div class="bsn-connection-text">
            <div class="bsn-connection-title">미연결</div>
            <div class="bsn-connection-sub"><a href="#instagram" onclick="App.switchPage('instagram')" style="color:#667eea;">Instagram 메뉴에서 연결</a></div>
          </div>
        </div>`;
      recentEl.innerHTML = '';
      return;
    }

    const p = cached.profile;
    const posts = cached.posts || [];
    const now = Date.now();
    const recent30 = posts.filter(m => (now - new Date(m.date).getTime()) < 30 * 24 * 60 * 60 * 1000);
    const likes30 = recent30.reduce((s, m) => s + Number(m.likes || 0), 0);
    const avgLike30 = recent30.length > 0 ? Math.round(likes30 / recent30.length) : 0;

    statsEl.innerHTML = `
      <div class="bsn-stat-item"><div class="bsn-stat-value">${this.formatNumber(p.followers_count)}</div><div class="bsn-stat-label">팔로워</div></div>
      <div class="bsn-stat-item"><div class="bsn-stat-value">${this.formatNumber(p.media_count)}</div><div class="bsn-stat-label">총 게시물</div></div>
      <div class="bsn-stat-item"><div class="bsn-stat-value">${this.formatNumber(avgLike30)}</div><div class="bsn-stat-label">평균좋아요(30일)</div></div>
    `;

    const top = posts.slice(0, 3);
    recentEl.innerHTML = `
      <div class="bsn-recent-title">@${p.username || ''} · 최근 게시물</div>
      ${top.map(m => `
        <a href="${m.permalink || '#'}" target="_blank" class="bsn-recent-item">
          <img class="bsn-recent-thumb" src="${m.thumbnail || ''}" alt="" loading="lazy">
          <div class="bsn-recent-info">
            <div class="bsn-recent-title-text">${(m.caption || '(캡션 없음)').slice(0, 40)}</div>
            <div class="bsn-recent-meta">❤ ${this.formatNumber(m.likes)} · 💬 ${this.formatNumber(m.comments)}</div>
          </div>
        </a>
      `).join('')}
    `;
  },

  renderPdSummary() {
    const el = document.getElementById('dash-pd-summary');
    if (!el) return;

    // 캘린더 데이터에서 PD별 업무 추출
    const allTasks = Storage.getTasks();
    const today = new Date();
    today.setHours(0,0,0,0);
    const pdNames = (typeof Calendar !== 'undefined' && Calendar.PDS) ? Calendar.PDS.filter(p => p !== '미지정') : [];
    const CAT_COLORS = (typeof Calendar !== 'undefined') ? Calendar.COLORS : {};

    if (allTasks.length === 0 && pdNames.length === 0) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">캘린더에서 업무를 추가하면 PD별로 자동 표시됩니다.</div>';
      return;
    }

    const pdMap = {};
    pdNames.forEach(p => { pdMap[p] = { upcoming: [], past: [] }; });

    allTasks.forEach(t => {
      const pd = t.pd || '';
      if (!pd || pd === '미지정') return;
      if (!pdMap[pd]) pdMap[pd] = { upcoming: [], past: [] };
      const taskDate = new Date(t.date + 'T00:00:00');
      if (taskDate >= today) {
        pdMap[pd].upcoming.push(t);
      } else {
        pdMap[pd].past.push(t);
      }
    });

    const dayNames = ['일','월','화','수','목','금','토'];
    el.innerHTML = Object.entries(pdMap).filter(([pd, data]) => data.upcoming.length > 0 || data.past.length > 0).map(([pd, data]) => {
      const upcoming = data.upcoming.sort((a,b) => a.date.localeCompare(b.date)).slice(0, 5);
      const past = data.past.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3);

      const renderRow = (t, isPast) => {
        const d = new Date(t.date + 'T00:00:00');
        const color = CAT_COLORS[t.category] || '#888';
        return '<div style="display:flex;gap:6px;align-items:center;padding:4px 0;font-size:12px;' + (isPast?'opacity:0.5;':'') + '">' +
          '<span style="min-width:50px;color:var(--text-muted);">' + (d.getMonth()+1) + '/' + d.getDate() + '(' + dayNames[d.getDay()] + ')</span>' +
          '<span style="color:' + color + ';">' + (t.categoryEmoji||'📌') + '</span>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + this._esc(t.text) + '</span>' +
        '</div>';
      };

      return '<div class="pd-card">' +
        '<div class="pd-card-header"><div class="pd-avatar">' + pd.charAt(0) + '</div><div class="pd-info"><div class="pd-name">' + this._esc(pd) + '</div><div class="pd-stats">예정 ' + data.upcoming.length + '건' + (data.past.length ? ' · 완료 ' + data.past.length + '건' : '') + '</div></div></div>' +
        (upcoming.length > 0 ? '<div style="padding:8px 12px;"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">📤 예정</div>' + upcoming.map(t => renderRow(t, false)).join('') + '</div>' : '') +
        (past.length > 0 ? '<div style="padding:4px 12px 8px;"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">✅ 최근</div>' + past.map(t => renderRow(t, true)).join('') + '</div>' : '') +
      '</div>';
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);">캘린더에서 업무를 추가하면 PD별로 자동 표시됩니다.</div>';
  },

  _esc(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },

  openModal() {
    document.getElementById('stat-modal').classList.add('active');
  },

  closeModal() {
    document.getElementById('stat-modal').classList.remove('active');
  },

  saveStat() {
    const platform = document.getElementById('stat-platform').value;
    const views = document.getElementById('stat-views').value;
    const subs = document.getElementById('stat-subs').value;
    const likes = document.getElementById('stat-likes').value;
    const date = document.getElementById('stat-date').value;

    if (!views && !subs && !likes) return;

    Storage.addStat({ platform, views, subscribers: subs, likes, date: date || undefined });
    this.closeModal();
    document.getElementById('stat-views').value = '';
    document.getElementById('stat-subs').value = '';
    document.getElementById('stat-likes').value = '';
    this.refresh();
  },

  refresh() {
    this.renderOverview();
    this.renderCards();
    this.renderCharts();
    this.renderPdSummary();
    // 서버에서 대시보드 데이터 한번에 가져오기
    this._loadDashboardData();
  },

  _loadDashboardData: function() {
    var self = this;
    // 심플하게 fetch로 교체 + 에러 표시
    var statsEl = document.getElementById('dash-bilsanam-stats');
    fetch('/api/dashboard-data')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.bilsanam) {
          localStorage.setItem('yt_cache_bilsanam', JSON.stringify({ timestamp: Date.now(), data: data.bilsanam }));
        }
        if (data && data.seoulspace) {
          localStorage.setItem('yt_cache_seoulspace', JSON.stringify({ timestamp: Date.now(), data: data.seoulspace }));
        }
        self.renderBsnYouTube('bilsanam', 'dash-bilsanam-stats', 'dash-bilsanam-recent');
        self.renderBsnYouTube('seoulspace', 'dash-seoulspace-stats', 'dash-seoulspace-recent');
        self.renderBsnInstagram('dash-instagram-stats', 'dash-instagram-recent');
      })
      .catch(function(e) {
        if (statsEl) statsEl.innerHTML = '<div style="padding:20px;color:#ff6b6b;">로딩 실패: ' + e.message + '</div>';
      });
  },

  formatNumber(num) {
    if (!num || num === 0) return '0';
    num = Number(num);
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  },

  getTrend(current, previous) {
    if (!previous || previous === 0) return { text: '-', cls: 'neutral' };
    const pct = ((current - previous) / previous * 100).toFixed(1);
    if (pct > 0) return { text: `▲ ${pct}%`, cls: 'up' };
    if (pct < 0) return { text: `▼ ${Math.abs(pct)}%`, cls: 'down' };
    return { text: '- 0%', cls: 'neutral' };
  },

  // 전체 채널 종합 요약
  renderOverview() {
    const container = document.getElementById('dashboard-overview');
    if (!container) return;

    let totalViews = 0, totalSubs = 0, totalLikes = 0;
    let activePlatforms = 0;

    this.PLATFORMS.forEach(p => {
      const latest = Storage.getLatestStat(p.key);
      if (latest) {
        activePlatforms++;
        totalViews += Number(latest.views || 0);
        totalSubs += Number(latest.subscribers || 0);
        totalLikes += Number(latest.likes || 0);
      }
    });

    const engRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0';

    container.innerHTML = `
      <div class="overview-grid">
        <div class="overview-card overview-total">
          <div class="overview-icon">🌐</div>
          <div class="overview-value">${activePlatforms}</div>
          <div class="overview-label">활성 채널</div>
        </div>
        <div class="overview-card overview-views">
          <div class="overview-icon">👁️</div>
          <div class="overview-value">${this.formatNumber(totalViews)}</div>
          <div class="overview-label">총 조회수/방문</div>
        </div>
        <div class="overview-card overview-subs">
          <div class="overview-icon">👥</div>
          <div class="overview-value">${this.formatNumber(totalSubs)}</div>
          <div class="overview-label">총 구독자/팔로워</div>
        </div>
        <div class="overview-card overview-likes">
          <div class="overview-icon">❤️</div>
          <div class="overview-value">${this.formatNumber(totalLikes)}</div>
          <div class="overview-label">총 좋아요/공감</div>
        </div>
        <div class="overview-card overview-engage">
          <div class="overview-icon">📊</div>
          <div class="overview-value">${engRate}%</div>
          <div class="overview-label">평균 참여율</div>
        </div>
      </div>
    `;
  },

  renderCards() {
    const container = document.getElementById('stats-cards');
    let html = '';
    let hasData = false;

    this.PLATFORMS.forEach(p => {
      const latest = Storage.getLatestStat(p.key);
      const prev = Storage.getPreviousStat(p.key);

      // 플랫폼별 그룹 헤더 + 카드
      const metricsHtml = p.metrics.map(m => {
        const val = latest ? (Number(latest[m.field]) || 0) : 0;
        const prevVal = prev ? (Number(prev[m.field]) || 0) : 0;
        const trend = this.getTrend(val, prevVal);
        return `
          <div class="platform-metric">
            <div class="pm-label">${m.label}</div>
            <div class="pm-value">${this.formatNumber(val)}</div>
            <div class="pm-trend ${trend.cls}">${trend.text}</div>
          </div>`;
      }).join('');

      const dateStr = latest ? latest.date : '-';
      const hasLatest = !!latest;
      if (hasLatest) hasData = true;

      html += `
        <div class="platform-card ${p.key}" style="border-left:3px solid ${p.color};${hasLatest ? '' : 'opacity:0.5;'}">
          <div class="platform-header">
            <span class="platform-name">${p.emoji} ${p.label}</span>
            <span class="platform-date">${hasLatest ? dateStr : '데이터 없음'}</span>
          </div>
          <div class="platform-metrics">${metricsHtml}</div>
        </div>`;
    });

    if (!hasData) {
      html = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📊</div><div class="empty-text">아직 입력된 통계가 없어요<br>"+ 통계 입력" 버튼을 눌러 데이터를 추가하세요!</div></div>`;
    }

    container.innerHTML = html;
  },

  renderCharts() {
    // 기존 차트 + 새 플랫폼 차트
    this.PLATFORMS.forEach(p => {
      const canvasId = p.key + '-chart';
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        this.renderChart(p.key, canvasId, p.color);
      }
    });
  },

  renderChart(platform, canvasId, color) {
    const stats = Storage.getStatsByPlatform(platform);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const chartCard = canvas.closest('.chart-card');
    if (!chartCard) return;
    const emptyEl = chartCard.querySelector('.chart-empty');

    if (stats.length < 2) {
      canvas.style.display = 'none';
      if (!emptyEl) {
        const div = document.createElement('div');
        div.className = 'chart-empty';
        div.textContent = '데이터가 2개 이상 필요합니다';
        chartCard.appendChild(div);
      }
      return;
    }

    canvas.style.display = 'block';
    if (emptyEl) emptyEl.remove();

    const labels = stats.map(s => {
      const d = new Date(s.date + 'T00:00:00');
      return `${d.getMonth()+1}/${d.getDate()}`;
    });
    const views = stats.map(s => s.views || 0);

    if (this.charts[platform]) this.charts[platform].destroy();

    this.charts[platform] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '조회수',
          data: views,
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: color,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8a8aa8', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8a8aa8', font: { size: 11 } } }
        }
      }
    });
  }
};
