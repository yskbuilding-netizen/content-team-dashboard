// ═══════════════════════════════════════════════════════════════════════════════
// 👥 팀원 상태 시스템 (Team Status System)
// ═══════════════════════════════════════════════════════════════════════════════

class TeamStatus {
  constructor() {
    this.teamMembers = this.loadTeamMembers();
    this.currentUser = this.getCurrentUser();
    this.init();
  }

  init() {
    this.createStatusWidget();
    this.startStatusUpdates();
    this.updateMyStatus();
  }

  createStatusWidget() {
    // 기존 위젯이 있으면 제거
    const existing = document.getElementById('team-status-widget');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'team-status-widget';
    widget.className = 'team-status-widget';
    
    widget.innerHTML = `
      <style>
        .team-status-widget {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          padding: 16px;
          min-width: 280px;
          z-index: 1000;
          border: 1px solid #e0e0e0;
        }
        
        .status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .status-title {
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }
        
        .status-toggle {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        
        .status-toggle:hover {
          background: #f5f5f5;
        }
        
        .team-member {
          display: flex;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f8f8f8;
        }
        
        .team-member:last-child {
          border-bottom: none;
        }
        
        .member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 12px;
          margin-right: 10px;
          position: relative;
        }
        
        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }
        
        .status-indicator.online { background: #4CAF50; }
        .status-indicator.away { background: #FF9800; }
        .status-indicator.busy { background: #F44336; }
        .status-indicator.offline { background: #9E9E9E; }
        
        .member-info {
          flex: 1;
        }
        
        .member-name {
          font-weight: 500;
          font-size: 13px;
          color: #333;
          margin-bottom: 2px;
        }
        
        .member-activity {
          font-size: 11px;
          color: #666;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .member-time {
          font-size: 10px;
          color: #999;
          margin-top: 1px;
        }
        
        .my-status {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;
        }
        
        .status-selector {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .status-btn {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .status-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        
        .status-btn:hover {
          background: #f8f9fa;
        }
        
        .status-btn.active:hover {
          background: #0056b3;
        }
        
        .activity-input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 11px;
          outline: none;
        }
        
        .activity-input:focus {
          border-color: #007bff;
        }
        
        .widget-collapsed .team-member {
          display: none;
        }
        
        .widget-collapsed .my-status {
          display: none;
        }
      </style>
      
      <div class="status-header">
        <span class="status-title">👥 팀 상태</span>
        <button class="status-toggle" onclick="teamStatus.toggleWidget()">📌</button>
      </div>
      
      <div class="team-members" id="team-members-list">
        <!-- 팀원 목록이 여기에 렌더링됩니다 -->
      </div>
      
      <div class="my-status">
        <div class="status-selector">
          <button class="status-btn active" data-status="online">🟢 온라인</button>
          <button class="status-btn" data-status="away">🟡 자리비움</button>
          <button class="status-btn" data-status="busy">🔴 다른 업무</button>
        </div>
        <input type="text" class="activity-input" id="my-activity" placeholder="현재 작업중인 내용..." maxlength="50">
      </div>
    `;
    
    document.body.appendChild(widget);
    
    // 이벤트 리스너 등록
    this.attachEventListeners();
    this.renderTeamMembers();
  }

  attachEventListeners() {
    // 상태 변경 버튼
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.updateMyStatus();
      });
    });

    // 활동 내용 입력
    const activityInput = document.getElementById('my-activity');
    if (activityInput) {
      activityInput.addEventListener('input', debounce(() => {
        this.updateMyStatus();
      }, 1000));
    }
  }

  loadTeamMembers() {
    return JSON.parse(localStorage.getItem('team-members') || JSON.stringify([
      {
        id: 'user1',
        name: '김콘텐츠',
        role: '유튜브 PD',
        status: 'online',
        activity: '신규 영상 기획 중...',
        lastSeen: new Date().toISOString(),
        avatar: '김'
      },
      {
        id: 'user2', 
        name: '이크리에이터',
        role: '인스타그램 매니저',
        status: 'away',
        activity: '점심시간',
        lastSeen: new Date(Date.now() - 30000).toISOString(),
        avatar: '이'
      },
      {
        id: 'user3',
        name: '박에디터',
        role: '영상 편집자',
        status: 'busy',
        activity: '영상 편집 중 (방해금지)',
        lastSeen: new Date(Date.now() - 120000).toISOString(),
        avatar: '박'
      }
    ]));
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('current-user') || JSON.stringify({
      id: 'me',
      name: '나',
      role: '콘텐츠 매니저',
      status: 'online',
      activity: '',
      avatar: '나'
    }));
  }

  renderTeamMembers() {
    const container = document.getElementById('team-members-list');
    if (!container) return;

    const allMembers = [...this.teamMembers, this.currentUser];
    
    container.innerHTML = allMembers.map(member => {
      const lastSeenTime = this.getRelativeTime(new Date(member.lastSeen));
      
      return `
        <div class="team-member">
          <div class="member-avatar">
            ${member.avatar}
            <div class="status-indicator ${member.status}"></div>
          </div>
          <div class="member-info">
            <div class="member-name">${member.name} ${member.id === 'me' ? '(나)' : ''}</div>
            <div class="member-activity">${member.activity || '상태 메시지 없음'}</div>
            <div class="member-time">${lastSeenTime}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateMyStatus() {
    const activeBtn = document.querySelector('.status-btn.active');
    const activityInput = document.getElementById('my-activity');
    
    if (activeBtn && activityInput) {
      this.currentUser.status = activeBtn.dataset.status;
      this.currentUser.activity = activityInput.value;
      this.currentUser.lastSeen = new Date().toISOString();
      
      localStorage.setItem('current-user', JSON.stringify(this.currentUser));
      this.renderTeamMembers();
      
      // 상태 변경 알림
      if (this.currentUser.status === 'busy') {
        notifications.info('상태 변경', '다른 업무 중으로 상태를 변경했습니다.');
      }
    }
  }

  toggleWidget() {
    const widget = document.getElementById('team-status-widget');
    if (widget) {
      widget.classList.toggle('widget-collapsed');
    }
  }

  startStatusUpdates() {
    // 주기적으로 팀원 상태 업데이트 (실제로는 서버에서 받아와야 함)
    setInterval(() => {
      this.simulateTeamActivity();
      this.renderTeamMembers();
    }, 30000); // 30초마다 업데이트
  }

  simulateTeamActivity() {
    // 실제 환경에서는 서버 API를 통해 받아옴
    const activities = [
      '영상 편집 중...',
      '스크립트 작성 중...',
      '썸네일 제작 중...',
      '회의 참석 중...',
      '점심시간',
      '외부 미팅',
      '컨텐츠 기획 중...',
      'SNS 관리 중...'
    ];

    this.teamMembers.forEach(member => {
      // 랜덤하게 활동 업데이트
      if (Math.random() < 0.3) {
        member.activity = activities[Math.floor(Math.random() * activities.length)];
        member.lastSeen = new Date().toISOString();
      }
      
      // 가끔 상태 변경
      if (Math.random() < 0.1) {
        const statuses = ['online', 'away', 'busy'];
        member.status = statuses[Math.floor(Math.random() * statuses.length)];
      }
    });

    localStorage.setItem('team-members', JSON.stringify(this.teamMembers));
  }

  getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  }

  // 팀원 추가
  addMember(member) {
    this.teamMembers.push({
      ...member,
      id: Date.now().toString(),
      lastSeen: new Date().toISOString()
    });
    localStorage.setItem('team-members', JSON.stringify(this.teamMembers));
    this.renderTeamMembers();
  }

  // 팀원 제거
  removeMember(memberId) {
    this.teamMembers = this.teamMembers.filter(m => m.id !== memberId);
    localStorage.setItem('team-members', JSON.stringify(this.teamMembers));
    this.renderTeamMembers();
  }
}

// 유틸리티 함수
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 전역 인스턴스 생성
const teamStatus = new TeamStatus();

// 내보내기
window.TeamStatus = TeamStatus;
window.teamStatus = teamStatus;