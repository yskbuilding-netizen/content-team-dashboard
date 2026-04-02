// ========================================
// Dashboard Module - 마케팅 채널 종합 분석
// ========================================
const Dashboard = {
  charts: {},

  PLATFORMS: [
    { key: 'youtube', label: 'YouTube', emoji: '🎬', color: '#ff4444', metrics: [
      { field: 'views', label: '조회수' },
      { field: 'subscribers', label: '구독자' },
      { field: 'likes', label: '좋아요' }
    ]},
    { key: 'instagram', label: 'Instagram', emoji: '📸', color: '#e1306c', metrics: [
      { field: 'views', label: '도달' },
      { field: 'subscribers', label: '팔로워' },
      { field: 'likes', label: '좋아요' }
    ]},
    { key: 'tiktok', label: 'TikTok', emoji: '🎵', color: '#00f2ea', metrics: [
      { field: 'views', label: '조회수' },
      { field: 'subscribers', label: '팔로워' },
      { field: 'likes', label: '좋아요' }
    ]},
    { key: 'blog', label: '블로그', emoji: '📝', color: '#03c75a', metrics: [
      { field: 'views', label: '방문자' },
      { field: 'subscribers', label: '구독자' },
      { field: 'likes', label: '공감' }
    ]},
    { key: 'tistory', label: '티스토리', emoji: '🟠', color: '#eb531f', metrics: [
      { field: 'views', label: '방문자' },
      { field: 'subscribers', label: '구독자' },
      { field: 'likes', label: '공감' }
    ]},
    { key: 'wordpress', label: 'WordPress', emoji: '🔵', color: '#21759b', metrics: [
      { field: 'views', label: '방문자' },
      { field: 'subscribers', label: '구독자' },
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
  },

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
