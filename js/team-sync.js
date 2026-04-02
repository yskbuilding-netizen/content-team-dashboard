// ========================================
// Team Sync Module - Firebase 실시간 캘린더 공유
// ========================================
const TeamSync = {
  FB_URL_KEY: 'team_fb_url',
  FB_API_KEY: 'team_fb_apikey',
  TEAM_NAME_KEY: 'team_member_name',
  connected: false,
  lastSync: 0,

  init() {
    document.getElementById('team-sync-btn').addEventListener('click', () => this.toggleSetup());
    document.getElementById('team-save-btn').addEventListener('click', () => this.saveConfig());
    document.getElementById('team-cancel-btn').addEventListener('click', () => this.hideSetup());

    // 기존 설정 복원
    const url = this.getUrl();
    const name = this.getName();
    if (url && name) {
      this.connected = true;
      this.updateBanner();
      // 초기 동기화
      this.syncUp();
    }
  },

  getUrl() { return localStorage.getItem(this.FB_URL_KEY) || ''; },
  getApiKey() { return localStorage.getItem(this.FB_API_KEY) || ''; },
  getName() { return localStorage.getItem(this.TEAM_NAME_KEY) || ''; },

  toggleSetup() {
    const el = document.getElementById('team-sync-setup');
    if (el.style.display === 'none') {
      el.style.display = 'block';
      // 기존 값 복원
      document.getElementById('firebase-url-input').value = this.getUrl();
      document.getElementById('firebase-key-input').value = this.getApiKey();
      document.getElementById('team-name-input').value = this.getName();
    } else {
      el.style.display = 'none';
    }
  },

  hideSetup() {
    document.getElementById('team-sync-setup').style.display = 'none';
  },

  async saveConfig() {
    const url = document.getElementById('firebase-url-input').value.trim();
    const apiKey = document.getElementById('firebase-key-input').value.trim();
    const name = document.getElementById('team-name-input').value.trim();

    if (!url || !name) {
      this.showStatus('DB URL과 이름을 입력해주세요.', 'error');
      return;
    }

    // URL 정리
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    localStorage.setItem(this.FB_URL_KEY, cleanUrl);
    localStorage.setItem(this.FB_API_KEY, apiKey);
    localStorage.setItem(this.TEAM_NAME_KEY, name);

    this.showStatus('연결 테스트 중...', 'info');

    try {
      // 연결 테스트
      const testRes = await fetch(`${cleanUrl}/team_test.json`);
      if (!testRes.ok) throw new Error('Firebase 연결 실패');

      this.connected = true;
      this.showStatus(`${name}님, 팀 캘린더에 연결되었습니다!`, 'success');
      this.updateBanner();
      this.hideSetup();

      // 로컬 데이터 업로드
      await this.syncUp();
      // 팀 데이터 다운로드
      await this.syncDown();
      Calendar.refresh();
    } catch (err) {
      this.showStatus('오류: ' + err.message, 'error');
    }
  },

  showStatus(msg, type) {
    const el = document.getElementById('team-status');
    el.textContent = msg;
    el.className = 'yt-status yt-status-' + type;
    el.style.display = 'block';
    if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 3000);
  },

  updateBanner() {
    const statusEl = document.getElementById('team-sync-status');
    const btn = document.getElementById('team-sync-btn');
    if (this.connected) {
      const name = this.getName();
      statusEl.innerHTML = `🟢 팀 공유 활성 · <strong>${name}</strong>`;
      btn.textContent = '설정';
    } else {
      statusEl.textContent = '🔒 로컬 저장 중';
      btn.textContent = '팀 공유 설정';
    }
  },

  // 로컬 → Firebase 업로드
  async syncUp() {
    if (!this.connected) return;
    const url = this.getUrl();
    const name = this.getName();
    const tasks = Storage.getTasks();

    // 내 이름으로 태그된 업무만 업로드
    const myTasks = tasks.map(t => ({
      ...t,
      memberName: name
    }));

    try {
      await fetch(`${url}/tasks/${this.sanitizeName(name)}.json`, {
        method: 'PUT',
        body: JSON.stringify(myTasks),
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Sync up failed:', err);
    }
  },

  // Firebase → 로컬 (팀원 데이터 가져오기)
  async syncDown() {
    if (!this.connected) return;
    const url = this.getUrl();

    try {
      const res = await fetch(`${url}/tasks.json`);
      const data = await res.json();
      if (!data) return;

      // 팀원별 업무를 합치기
      const teamTasks = [];
      Object.entries(data).forEach(([member, tasks]) => {
        if (Array.isArray(tasks)) {
          tasks.forEach(t => {
            teamTasks.push({
              ...t,
              memberName: t.memberName || member
            });
          });
        }
      });

      // 로컬 스토리지에 팀 데이터 저장 (별도 키)
      localStorage.setItem('ct_team_tasks', JSON.stringify(teamTasks));
      this.lastSync = Date.now();
    } catch (err) {
      console.error('Sync down failed:', err);
    }
  },

  // 팀 전체 업무 가져오기 (캘린더용)
  getTeamTasksByDate(dateStr) {
    if (!this.connected) return [];
    try {
      const all = JSON.parse(localStorage.getItem('ct_team_tasks') || '[]');
      const myName = this.getName();
      // 내 업무는 제외 (로컬에서 이미 표시)
      return all.filter(t => t.date === dateStr && t.memberName !== myName);
    } catch {
      return [];
    }
  },

  sanitizeName(name) {
    return name.replace(/[.#$[\]/]/g, '_');
  },

  // 업무 추가 시 자동 동기화
  onTaskAdded() {
    if (this.connected) {
      this.syncUp();
    }
  }
};
