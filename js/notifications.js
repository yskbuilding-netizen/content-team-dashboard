// 실시간 알림 시스템
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.loadNotifications();
        this.startPeriodicCheck();
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(container);
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        notification.style.cssText = `
            background: ${this.getTypeColor(type)};
            color: white;
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.getElementById('notification-container').appendChild(notification);
        
        // 애니메이션
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // 자동 삭제
        if (duration > 0) {
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    getTypeColor(type) {
        const colors = {
            'info': '#3498db',
            'success': '#27ae60',
            'warning': '#f39c12',
            'error': '#e74c3c'
        };
        return colors[type] || colors.info;
    }

    // 실시간 업데이트 체크
    startPeriodicCheck() {
        setInterval(() => {
            this.checkForUpdates();
        }, 30000); // 30초마다 체크
    }

    checkForUpdates() {
        // 새로운 콘텐츠 업로드 확인
        const lastCheck = localStorage.getItem('lastNotificationCheck');
        const now = new Date().toISOString();
        
        // 시뮬레이션: 랜덤하게 알림 생성
        if (Math.random() > 0.8) {
            const messages = [
                '새 YouTube 영상이 업로드되었습니다!',
                'Instagram 포스트 성과가 좋습니다!',
                '팀 멤버가 새 아이디어를 제출했습니다.',
                '오늘의 목표 달성률 80% 돌파!'
            ];
            
            const types = ['info', 'success', 'warning'];
            const message = messages[Math.floor(Math.random() * messages.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            
            this.showNotification(message, type);
        }
        
        localStorage.setItem('lastNotificationCheck', now);
    }

    // 수동 알림 추가
    addNotification(title, message, type = 'info') {
        this.showNotification(`<strong>${title}</strong><br>${message}`, type);
    }
}

// 전역 인스턴스 생성
window.notificationSystem = new NotificationSystem();

// 페이지별 알림 설정
document.addEventListener('DOMContentLoaded', () => {
    // 초기 알림
    setTimeout(() => {
        window.notificationSystem.showNotification('콘텐츠 관리 시스템에 오신 것을 환영합니다!', 'success');
    }, 1000);
});