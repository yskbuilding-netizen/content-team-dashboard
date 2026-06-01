// ========================================
// Analytics Module - 성과 분석 시스템
// ========================================
const Analytics = {
  charts: {},
  
  init() {
    this.bindEvents();
    this.loadAnalytics();
  },

  bindEvents() {
    const periodSelect = document.getElementById('analytics-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => this.loadAnalytics());
    }
  },

  loadAnalytics() {
    const period = parseInt(document.getElementById('analytics-period')?.value || 30);
    this.updatePerformanceTrend(period);
    this.updateGoalProgress();
    this.updateTimeAnalysis(period);
    this.updateTeamPerformance(period);
  },

  updatePerformanceTrend(days) {
    const ctx = document.getElementById('performance-trend-chart');
    if (!ctx) return;

    // 기존 차트 제거
    if (this.charts.performanceTrend) {
      this.charts.performanceTrend.destroy();
    }

    // 가상 데이터 생성 (실제로는 Storage에서 가져와야 함)
    const labels = [];
    const youtubeData = [];
    const instagramData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.getMonth() + 1 + '/' + date.getDate());
      
      // 실제 데이터로 교체 필요
      youtubeData.push(Math.floor(Math.random() * 10000) + 5000);
      instagramData.push(Math.floor(Math.random() * 5000) + 2000);
    }

    this.charts.performanceTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '유튜브 조회수',
          data: youtubeData,
          borderColor: '#ff4444',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          tension: 0.4
        }, {
          label: '인스타 조회수',
          data: instagramData,
          borderColor: '#4444ff',
          backgroundColor: 'rgba(68, 68, 255, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        }
      }
    });
  },

  updateGoalProgress() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // 실제 데이터 가져오기 (예시)
    const youtubeStats = Storage.getStats().filter(stat => 
      new Date(stat.date).getMonth() === currentMonth && 
      new Date(stat.date).getFullYear() === currentYear
    );
    
    const instagramStats = Storage.getInstagramStats().filter(stat => 
      new Date(stat.date).getMonth() === currentMonth && 
      new Date(stat.date).getFullYear() === currentYear
    );

    // 월 목표 설정 (설정 가능하게 만들 수 있음)
    const monthlyGoals = {
      youtube: 20, // 20개 영상
      instagram: 60 // 60개 포스트
    };

    const youtubeCount = youtubeStats.reduce((sum, stat) => sum + (stat.uploads || 0), 0);
    const instagramCount = instagramStats.reduce((sum, stat) => sum + (stat.posts || 0), 0);

    const youtubeProgress = Math.min((youtubeCount / monthlyGoals.youtube) * 100, 100);
    const instagramProgress = Math.min((instagramCount / monthlyGoals.instagram) * 100, 100);

    // UI 업데이트
    const youtubeProgressEl = document.getElementById('youtube-progress');
    const youtubePercentageEl = document.getElementById('youtube-percentage');
    const instagramProgressEl = document.getElementById('instagram-progress');
    const instagramPercentageEl = document.getElementById('instagram-percentage');

    if (youtubeProgressEl) youtubeProgressEl.style.width = `${youtubeProgress}%`;
    if (youtubePercentageEl) youtubePercentageEl.textContent = `${Math.round(youtubeProgress)}% (${youtubeCount}/${monthlyGoals.youtube})`;
    
    if (instagramProgressEl) instagramProgressEl.style.width = `${instagramProgress}%`;
    if (instagramPercentageEl) instagramPercentageEl.textContent = `${Math.round(instagramProgress)}% (${instagramCount}/${monthlyGoals.instagram})`;
  },

  updateTimeAnalysis(days) {
    const ctx = document.getElementById('time-analysis-chart');
    if (!ctx) return;

    if (this.charts.timeAnalysis) {
      this.charts.timeAnalysis.destroy();
    }

    // 작업 시간 분석 데이터 (실제로는 작업 완료 시간 등을 분석)
    const timeData = {
      labels: ['기획', '촬영', '편집', '썸네일', '업로드'],
      datasets: [{
        label: '평균 소요시간(시간)',
        data: [2, 4, 8, 1, 0.5],
        backgroundColor: [
          '#ff6b6b',
          '#4ecdc4',
          '#45b7d1',
          '#f9ca24',
          '#6c5ce7'
        ]
      }]
    };

    this.charts.timeAnalysis = new Chart(ctx, {
      type: 'doughnut',
      data: timeData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + '시간';
              }
            }
          }
        }
      }
    });
  },

  updateTeamPerformance(days) {
    const teamPerformanceEl = document.getElementById('team-performance');
    if (!teamPerformanceEl) return;

    // 팀원별 성과 데이터 (예시)
    const teamData = [
      { name: '김PD', tasks: 15, completed: 12, rating: 4.5 },
      { name: '이작가', tasks: 20, completed: 18, rating: 4.8 },
      { name: '박편집자', tasks: 25, completed: 22, rating: 4.3 },
      { name: '최디자이너', tasks: 12, completed: 11, rating: 4.7 }
    ];

    const html = teamData.map(member => `
      <div class="team-member-card">
        <div class="member-info">
          <h4>${member.name}</h4>
          <div class="member-stats">
            <span>완료율: ${Math.round((member.completed / member.tasks) * 100)}%</span>
            <span>평점: ${'⭐'.repeat(Math.floor(member.rating))} ${member.rating}</span>
          </div>
        </div>
        <div class="member-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${(member.completed / member.tasks) * 100}%"></div>
          </div>
          <span class="progress-text">${member.completed}/${member.tasks}</span>
        </div>
      </div>
    `).join('');

    teamPerformanceEl.innerHTML = html;
  },

  generateReport() {
    const period = parseInt(document.getElementById('analytics-period')?.value || 30);
    const report = this.createReport(period);
    
    // 리포트를 새 창에서 보여주거나 다운로드
    const blob = new Blob([report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `콘텐츠팀_성과리포트_${Storage.formatDate(new Date())}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Notifications.add('리포트가 생성되었습니다.', 'achievement');
  },

  createReport(days) {
    const stats = Storage.getStats();
    const instagramStats = Storage.getInstagramStats();
    const tasks = Storage.getTasks();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>콘텐츠팀 성과 리포트</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
          .stat-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
          .stat-card h3 { margin: 0 0 10px 0; color: #333; }
          .stat-card .value { font-size: 2em; font-weight: bold; color: #007bff; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 콘텐츠팀 성과 리포트</h1>
          <p>생성일: ${Storage.formatDate(new Date())}</p>
          <p>분석 기간: 최근 ${days}일</p>
        </div>
        
        <div class="stat-grid">
          <div class="stat-card">
            <h3>📺 총 영상 업로드</h3>
            <div class="value">${stats.reduce((sum, s) => sum + (s.uploads || 0), 0)}개</div>
          </div>
          <div class="stat-card">
            <h3>👀 총 조회수</h3>
            <div class="value">${stats.reduce((sum, s) => sum + (s.views || 0), 0).toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <h3>📸 인스타 포스트</h3>
            <div class="value">${instagramStats.reduce((sum, s) => sum + (s.posts || 0), 0)}개</div>
          </div>
          <div class="stat-card">
            <h3>✅ 완료된 작업</h3>
            <div class="value">${tasks.filter(t => t.completed).length}개</div>
          </div>
        </div>
        
        <h2>📈 최근 활동</h2>
        <table>
          <tr><th>날짜</th><th>업로드</th><th>조회수</th><th>구독자</th><th>인스타 포스트</th></tr>
          ${stats.slice(-7).map(stat => `
            <tr>
              <td>${stat.date}</td>
              <td>${stat.uploads || 0}</td>
              <td>${(stat.views || 0).toLocaleString()}</td>
              <td>${(stat.subscribers || 0).toLocaleString()}</td>
              <td>${instagramStats.find(is => is.date === stat.date)?.posts || 0}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
  },

  refresh() {
    this.loadAnalytics();
  }
};