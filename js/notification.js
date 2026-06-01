// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 알림 시스템 (Notification System)
// ═══════════════════════════════════════════════════════════════════════════════

class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.settings = this.loadSettings();
    this.init();
  }

  init() {
    this.createNotificationContainer();
    this.requestPermission();
    this.startPeriodicCheck();
  }

  createNotificationContainer() {
    if (document.getElementById('notification-container')) return;

    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    container.innerHTML = `
      <style>
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          max-width: 350px;
        }
        .notification {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          border-left: 4px solid #4CAF50;
          animation: slideIn 0.3s ease-out;
          position: relative;
        }
        .notification.warning { border-left-color: #FF9800; }
        .notification.error { border-left-color: #F44336; }
        .notification.info { border-left-color: #2196F3; }
        .notification.reminder { border-left-color: #9C27B0; }
        
        .notification-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .notification-icon {
          font-size: 18px;
          margin-right: 8px;
        }
        .notification-title {
          font-weight: 600;
          font-size: 14px;
          flex: 1;
        }
        .notification-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.6;
          padding: 0;
          width: 20px;
          height: 20px;
        }
        .notification-close:hover { opacity: 1; }
        
        .notification-content {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }
        .notification-time {
          font-size: 11px;
          color: #999;
          margin-top: 8px;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      </style>
    `;
    document.body.appendChild(container);
  }

  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('알림 권한:', permission);
    }
  }

  show(type, title, message, options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      timestamp: new Date(),
      ...options
    };

    this.notifications.push(notification);
    this.renderNotification(notification);

    // 브라우저 네이티브 알림도 표시
    if (this.settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: this.getIcon(type)
      });
    }

    // 자동 제거 (기본 5초)
    setTimeout(() => {
      this.remove(notification.id);
    }, options.duration || 5000);

    return notification.id;
  }

  renderNotification(notification) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notifEl = document.createElement('div');
    notifEl.className = `notification ${notification.type}`;
    notifEl.dataset.id = notification.id;

    notifEl.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">${this.getIcon(notification.type)}</span>
        <span class="notification-title">${notification.title}</span>
        <button class="notification-close" onclick="notifications.remove(${notification.id})">&times;</button>
      </div>
      <div class="notification-content">${notification.message}</div>
      <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
    `;

    container.appendChild(notifEl);
  }

  remove(id) {
    const notifEl = document.querySelector(`[data-id="${id}"]`);
    if (notifEl) {
      notifEl.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notifEl.remove(), 300);
    }
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️',
      reminder: '⏰',
      deadline: '🚨'
    };
    return icons[type] || 'ℹ️';
  }

  formatTime(date) {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // 주기적 체크 (마감일, 작업 알림 등)
  startPeriodicCheck() {
    setInterval(() => {
      this.checkDeadlines();
      this.checkTasks();
    }, 60000); // 1분마다 체크
  }

  checkDeadlines() {
    try {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      tasks.forEach(task => {
        if (task.deadline && !task.completed) {
          const deadline = new Date(task.deadline);
          const hoursDiff = (deadline - now) / (1000 * 60 * 60);

          // 마감 1시간 전 알림
          if (hoursDiff > 0 && hoursDiff <= 1 && !task.notified_1h) {
            this.show('warning', '⏰ 마감 임박', `"${task.title}" 작업이 1시간 후 마감됩니다!`);
            task.notified_1h = true;
          }
          // 마감일 당일 알림
          else if (deadline.toDateString() === now.toDateString() && !task.notified_today) {
            this.show('reminder', '📅 오늘 마감', `"${task.title}" 작업이 오늘 마감됩니다.`);
            task.notified_today = true;
          }
          // 마감일 지남
          else if (deadline < now && !task.notified_overdue) {
            this.show('error', '🚨 마감일 초과', `"${task.title}" 작업 마감일이 지났습니다!`);
            task.notified_overdue = true;
          }
        }
      });

      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('마감일 체크 오류:', error);
    }
  }

  checkTasks() {
    // 완료된 작업 알림
    try {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const recentCompleted = tasks.filter(task => {
        if (!task.completed || task.completion_notified) return false;
        const completedTime = new Date(task.completedAt || task.updatedAt);
        const timeDiff = Date.now() - completedTime.getTime();
        return timeDiff < 300000; // 5분 이내 완료된 작업
      });

      recentCompleted.forEach(task => {
        this.show('success', '🎉 작업 완료', `"${task.title}" 작업이 완료되었습니다!`);
        task.completion_notified = true;
      });

      if (recentCompleted.length > 0) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
      }
    } catch (error) {
      console.error('작업 체크 오류:', error);
    }
  }

  loadSettings() {
    return JSON.parse(localStorage.getItem('notification-settings') || JSON.stringify({
      browserNotifications: true,
      deadlineReminders: true,
      taskCompletions: true,
      teamUpdates: true
    }));
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('notification-settings', JSON.stringify(this.settings));
  }

  // 편의 메서드들
  success(title, message, options) {
    return this.show('success', title, message, options);
  }

  warning(title, message, options) {
    return this.show('warning', title, message, options);
  }

  error(title, message, options) {
    return this.show('error', title, message, options);
  }

  info(title, message, options) {
    return this.show('info', title, message, options);
  }

  reminder(title, message, options) {
    return this.show('reminder', title, message, options);
  }
}

// 전역 인스턴스 생성
const notifications = new NotificationSystem();

// 내보내기
window.NotificationSystem = NotificationSystem;
window.notifications = notifications;