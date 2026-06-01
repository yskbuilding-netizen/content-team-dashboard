// 실시간 협업을 위한 WebSocket 시스템
class CollaborationManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
        this.activeUsers = new Map();
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.setupUI();
        this.setupEventListeners();
    }

    connectWebSocket() {
        // 실제 환경에서는 실제 WebSocket 서버 URL 사용
        // 여기서는 시뮬레이션을 위해 가상으로 구현
        console.log('WebSocket 연결 시뮬레이션 시작');
        
        // 연결 시뮬레이션
        setTimeout(() => {
            this.isConnected = true;
            this.showStatus('실시간 협업 연결됨', 'success');
            this.simulateCollaboration();
        }, 1000);
    }

    simulateCollaboration() {
        // 가상 사용자들 추가
        const virtualUsers = [
            { id: 'user_123', name: '김콘텐츠', status: 'editing', page: 'youtube' },
            { id: 'user_456', name: '박영상', status: 'viewing', page: 'instagram' },
            { id: 'user_789', name: '이분석', status: 'analyzing', page: 'analytics' }
        ];

        virtualUsers.forEach(user => {
            this.addActiveUser(user);
        });

        // 실시간 활동 시뮬레이션
        setInterval(() => {
            this.simulateUserActivity();
        }, 5000);
    }

    addActiveUser(user) {
        this.activeUsers.set(user.id, user);
        this.updateUsersList();
        this.showUserJoined(user);
    }

    removeActiveUser(userId) {
        const user = this.activeUsers.get(userId);
        if (user) {
            this.activeUsers.delete(userId);
            this.updateUsersList();
            this.showUserLeft(user);
        }
    }

    simulateUserActivity() {
        const users = Array.from(this.activeUsers.values());
        if (users.length > 0) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const activities = [
                '유튜브 영상을 업로드했습니다',
                '인스타그램 포스트를 작성했습니다',
                '성과 분석을 업데이트했습니다',
                '새로운 일정을 추가했습니다'
            ];
            
            const activity = activities[Math.floor(Math.random() * activities.length)];
            this.showRealtimeActivity(randomUser, activity);
        }
    }

    setupUI() {
        // 실시간 협업 패널 생성
        const collaborationPanel = `
            <div id="collaboration-panel" class="collaboration-panel">
                <div class="collaboration-header">
                    <h4>🤝 실시간 협업</h4>
                    <span id="connection-status" class="status-indicator"></span>
                </div>
                <div class="active-users">
                    <h5>활성 사용자</h5>
                    <div id="users-list"></div>
                </div>
                <div class="realtime-activity">
                    <h5>실시간 활동</h5>
                    <div id="activity-feed"></div>
                </div>
            </div>
        `;

        // 메인 콘텐츠 영역에 추가
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const panelDiv = document.createElement('div');
            panelDiv.innerHTML = collaborationPanel;
            mainContent.appendChild(panelDiv);
        }

        // CSS 스타일 추가
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style>
                .collaboration-panel {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    width: 300px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    padding: 20px;
                    max-height: 400px;
                    overflow-y: auto;
                    z-index: 1000;
                }

                .collaboration-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                }

                .collaboration-header h4 {
                    margin: 0;
                    color: #333;
                }

                .status-indicator {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #4CAF50;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }

                .active-users h5, .realtime-activity h5 {
                    margin: 10px 0 5px 0;
                    color: #666;
                    font-size: 12px;
                    text-transform: uppercase;
                }

                .user-item {
                    display: flex;
                    align-items: center;
                    padding: 5px 0;
                    font-size: 13px;
                }

                .user-avatar {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
                    margin-right: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                }

                .user-status {
                    margin-left: auto;
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    background: #f0f0f0;
                }

                .activity-item {
                    padding: 8px 0;
                    border-bottom: 1px solid #f5f5f5;
                    font-size: 12px;
                    color: #666;
                }

                .activity-item:last-child {
                    border-bottom: none;
                }

                .activity-user {
                    font-weight: bold;
                    color: #333;
                }

                .activity-time {
                    color: #999;
                    font-size: 11px;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        // 페이지 이동 감지
        window.addEventListener('hashchange', () => {
            this.broadcastPageChange(window.location.hash);
        });

        // 사용자 입력 감지 (실시간 편집)
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea')) {
                this.broadcastTyping(e.target);
            }
        });
    }

    updateUsersList() {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        usersList.innerHTML = '';
        this.activeUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-avatar">${user.name.charAt(0)}</div>
                <span>${user.name}</span>
                <span class="user-status">${this.getStatusText(user.status)}</span>
            `;
            usersList.appendChild(userItem);
        });
    }

    getStatusText(status) {
        const statusMap = {
            'editing': '편집중',
            'viewing': '보기',
            'analyzing': '분석중',
            'idle': '대기중'
        };
        return statusMap[status] || status;
    }

    showUserJoined(user) {
        this.addActivityItem(`${user.name}님이 참여했습니다`, 'join');
    }

    showUserLeft(user) {
        this.addActivityItem(`${user.name}님이 나갔습니다`, 'leave');
    }

    showRealtimeActivity(user, activity) {
        this.addActivityItem(`${user.name}님이 ${activity}`, 'activity');
    }

    addActivityItem(message, type) {
        const activityFeed = document.getElementById('activity-feed');
        if (!activityFeed) return;

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-user">${message}</div>
            <div class="activity-time">${new Date().toLocaleTimeString()}</div>
        `;

        activityFeed.insertBefore(activityItem, activityFeed.firstChild);

        // 최대 10개 항목만 유지
        while (activityFeed.children.length > 10) {
            activityFeed.removeChild(activityFeed.lastChild);
        }
    }

    showStatus(message, type) {
        // 기존 알림 시스템 활용
        if (window.notificationManager) {
            window.notificationManager.addNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    broadcastPageChange(page) {
        // 실제 구현에서는 WebSocket으로 전송
        console.log(`페이지 변경: ${page}`);
    }

    broadcastTyping(element) {
        // 실제 구현에서는 WebSocket으로 타이핑 상태 전송
        console.log('타이핑 중:', element.value.length);
    }
}

// 페이지 로드 시 협업 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.collaborationManager = new CollaborationManager();
});