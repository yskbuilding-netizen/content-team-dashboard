// ========================================
// Storage Module - LocalStorage CRUD
// ========================================
const Storage = {
  KEYS: {
    TASKS: 'ct_tasks',
    PLANS: 'ct_plans',
    STATS: 'ct_stats',
    CHAT_HISTORY: 'ct_chat',
    CONTENTS: 'ct_contents'
  },

  _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // ── Date Utilities ──
  getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  getWeekEnd(date = new Date()) {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  },

  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  formatDateKR(date) {
    const d = new Date(date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
  },

  getWeekLabel(date) {
    const start = this.getWeekStart(date);
    const end = this.getWeekEnd(date);
    return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
  },

  getNextWeekStart(date = new Date()) {
    const start = this.getWeekStart(date);
    start.setDate(start.getDate() + 7);
    return start;
  },

  isSameDay(d1, d2) {
    const a = new Date(d1), b = new Date(d2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  },

  // ── Tasks (서버가 유일한 저장소 — PD간 완전 공유) ──
  _tasksCache: null,
  _initialDataLoaded: false,

  async loadInitialData() {
    if (this._initialDataLoaded) return;
    const storedTasks = this._get(this.KEYS.TASKS);
    if (storedTasks.length > 0) {
      this._initialDataLoaded = true;
      return; // 이미 데이터 있음
    }
    try {
      const res = await fetch('/initial-tasks.json');
      if (res.ok) {
        const data = await res.json();
        this._set(this.KEYS.TASKS, data);
        this._tasksCache = data;
      }
    } catch (e) {
      console.log('Initial data not available');
    }
    this._initialDataLoaded = true;
  },

  getTasks() {
    // 캐시 있으면 캐시, 없으면 localStorage 폴백
    if (this._tasksCache) return this._tasksCache;
    return this._get(this.KEYS.TASKS);
  },

  addTask(task) {
    const newTask = {
      id: this.generateId(),
      text: task.text,
      url: task.url || '',
      category: task.category || '기타',
      categoryEmoji: task.categoryEmoji || '📌',
      pd: task.pd || '',
      date: task.date || this.formatDate(new Date()),
      time: task.time || '',
      timeEnd: task.timeEnd || '',
      createdAt: new Date().toISOString()
    };
    // 로컬 캐시 즉시 업데이트
    var tasks = this.getTasks();
    tasks.push(newTask);
    this._tasksCache = tasks;
    this._set(this.KEYS.TASKS, tasks);
    // 서버에 저장
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    }).catch(function(){});
    return newTask;
  },

  updateTask(id, updates) {
    var tasks = this.getTasks().map(function(t) {
      if (t.id === id) return Object.assign({}, t, updates);
      return t;
    });
    this._tasksCache = tasks;
    this._set(this.KEYS.TASKS, tasks);
    fetch('/api/tasks/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(function(){});
  },

  deleteTask(id) {
    var tasks = this.getTasks().filter(function(t) { return t.id !== id; });
    this._tasksCache = tasks;
    this._set(this.KEYS.TASKS, tasks);
    fetch('/api/tasks/' + id, { method: 'DELETE' }).catch(function(){});
  },

  // 서버에서 전체 태스크 불러오기 (서버가 진실의 원천)
  async syncFromServer() {
    try {
      var res = await fetch('/api/tasks');
      if (!res.ok) return;
      var serverTasks = await res.json();
      this._tasksCache = serverTasks;
      this._set(this.KEYS.TASKS, serverTasks);
    } catch (e) {}
  },

  getTasksByWeek(weekStart) {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return this.getTasks().filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d >= start && d <= end;
    });
  },

  getTasksByDate(dateStr) {
    return this.getTasks().filter(t => t.date === dateStr);
  },

  // ── Plans ──
  getPlans() { return this._get(this.KEYS.PLANS); },

  addPlan(plan) {
    const plans = this.getPlans();
    const newPlan = {
      id: this.generateId(),
      text: plan.text,
      priority: plan.priority || 'normal',
      notes: plan.notes || '',
      completed: false,
      weekStart: plan.weekStart,
      createdAt: new Date().toISOString()
    };
    plans.push(newPlan);
    this._set(this.KEYS.PLANS, plans);
    return newPlan;
  },

  updatePlan(id, updates) {
    const plans = this.getPlans().map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    this._set(this.KEYS.PLANS, plans);
  },

  deletePlan(id) {
    const plans = this.getPlans().filter(p => p.id !== id);
    this._set(this.KEYS.PLANS, plans);
  },

  getPlansByWeek(weekStart) {
    const startStr = this.formatDate(new Date(weekStart));
    return this.getPlans().filter(p => p.weekStart === startStr);
  },

  // ── Stats ──
  getStats() { return this._get(this.KEYS.STATS); },

  addStat(stat) {
    const stats = this.getStats();
    const newStat = {
      id: this.generateId(),
      platform: stat.platform,
      views: Number(stat.views) || 0,
      subscribers: Number(stat.subscribers) || 0,
      likes: Number(stat.likes) || 0,
      date: stat.date || this.formatDate(new Date()),
      createdAt: new Date().toISOString()
    };
    stats.push(newStat);
    this._set(this.KEYS.STATS, stats);
    return newStat;
  },

  deleteStat(id) {
    const stats = this.getStats().filter(s => s.id !== id);
    this._set(this.KEYS.STATS, stats);
  },

  getStatsByPlatform(platform) {
    return this.getStats()
      .filter(s => s.platform === platform)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getLatestStat(platform) {
    const stats = this.getStatsByPlatform(platform);
    return stats.length > 0 ? stats[stats.length - 1] : null;
  },

  getPreviousStat(platform) {
    const stats = this.getStatsByPlatform(platform);
    return stats.length > 1 ? stats[stats.length - 2] : null;
  },

  // ── Chat History ──
  getChatHistory() { return this._get(this.KEYS.CHAT_HISTORY); },

  addChatMessage(msg) {
    const history = this.getChatHistory();
    history.push({
      id: this.generateId(),
      text: msg.text,
      type: msg.type,
      category: msg.category || null,
      timestamp: new Date().toISOString()
    });
    if (history.length > 200) history.splice(0, history.length - 200);
    this._set(this.KEYS.CHAT_HISTORY, history);
  },

  clearChatHistory() {
    this._set(this.KEYS.CHAT_HISTORY, []);
  },

  // ── Contents (영상별 현황) ──
  getContents() { return this._get(this.KEYS.CONTENTS); },

  addContent(content) {
    const contents = this.getContents();
    const newContent = {
      id: this.generateId(),
      title: content.title,
      platform: content.platform || 'youtube',
      status: content.status || 'uploaded',
      uploadDate: content.uploadDate || this.formatDate(new Date()),
      views: Number(content.views) || 0,
      likes: Number(content.likes) || 0,
      comments: Number(content.comments) || 0,
      duration: content.duration || '0:00',
      avgWatchTime: content.avgWatchTime || '0:00',
      watchPercent: Number(content.watchPercent) || 0,
      ctr: Number(content.ctr) || 0,
      thumbnail: content.thumbnail || '',
      tags: content.tags || '',
      notes: content.notes || '',
      createdAt: new Date().toISOString()
    };
    contents.push(newContent);
    this._set(this.KEYS.CONTENTS, contents);
    return newContent;
  },

  updateContent(id, updates) {
    const contents = this.getContents().map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    this._set(this.KEYS.CONTENTS, contents);
  },

  deleteContent(id) {
    const contents = this.getContents().filter(c => c.id !== id);
    this._set(this.KEYS.CONTENTS, contents);
  },

  getContentsByPlatform(platform) {
    return this.getContents()
      .filter(c => c.platform === platform)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  },

  getContentsSorted(sortBy = 'uploadDate', order = 'desc') {
    const contents = this.getContents();
    return contents.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string' && !isNaN(Date.parse(va))) {
        va = new Date(va); vb = new Date(vb);
      }
      if (order === 'desc') return va > vb ? -1 : 1;
      return va > vb ? 1 : -1;
    });
  }
};
