// ========================================
// Calendar Module - 주간/월간 뷰
// ========================================
const Calendar = {
  currentWeekStart: null,
  currentMonth: null,  // Date object for month view
  viewMode: 'week',    // 'week' or 'month'

  init() {
    this.currentWeekStart = Storage.getWeekStart();
    const now = new Date();
    this.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('prev-week').addEventListener('click', () => this.navigate(-1));
    document.getElementById('next-week').addEventListener('click', () => this.navigate(1));
    document.getElementById('cal-view-week').addEventListener('click', () => this.setView('week'));
    document.getElementById('cal-view-month').addEventListener('click', () => this.setView('month'));
  },

  setView(mode) {
    this.viewMode = mode;
    document.getElementById('cal-view-week').classList.toggle('active', mode === 'week');
    document.getElementById('cal-view-month').classList.toggle('active', mode === 'month');
    this.refresh();
  },

  navigate(dir) {
    if (this.viewMode === 'week') {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (dir * 7));
    } else {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + dir);
    }
    this.refresh();
  },

  refresh() {
    if (this.viewMode === 'week') {
      this.renderWeekLabel();
      this.renderWeekGrid();
      this.renderSummary();
    } else {
      this.renderMonthLabel();
      this.renderMonthGrid();
      this.renderMonthlySummary();
    }
  },

  // ── 주간 뷰 ──
  renderWeekLabel() {
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    document.getElementById('cal-week-label').textContent =
      `${this.currentWeekStart.getFullYear()}. ${this.currentWeekStart.getMonth()+1}/${this.currentWeekStart.getDate()} ~ ${end.getMonth()+1}/${end.getDate()}`;
  },

  renderWeekGrid() {
    const grid = document.getElementById('calendar-grid');
    grid.className = 'calendar-grid calendar-grid-week';
    grid.innerHTML = '';
    const dayNames = ['월','화','수','목','금','토','일'];
    const today = Storage.formatDate(new Date());

    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = Storage.formatDate(date);
      const isToday = dateStr === today;
      const tasks = Storage.getTasksByDate(dateStr);

      const dayEl = document.createElement('div');
      dayEl.className = `calendar-day${isToday ? ' today' : ''}`;

      // 팀원 업무 합치기
      const teamTasks = (typeof TeamSync !== 'undefined') ? TeamSync.getTeamTasksByDate(dateStr) : [];
      const allTasks = [...tasks, ...teamTasks];

      let tasksHTML = '';
      if (allTasks.length > 0) {
        const show = allTasks.slice(0, 5);
        tasksHTML = show.map(t => {
          const label = t.text.length > 20 ? t.text.slice(0,20)+'…' : t.text;
          const memberTag = t.memberName ? `<span class="task-member">${t.memberName}</span>` : '';
          if (t.url) {
            return `<a href="${t.url}" target="_blank" class="day-task-item day-task-link">
              <span class="task-emoji">${t.categoryEmoji||'📌'}</span>
              <span>${label}</span>${memberTag}<span class="task-link-icon">🔗</span>
            </a>`;
          }
          return `<div class="day-task-item">
            <span class="task-emoji">${t.categoryEmoji||'📌'}</span>
            <span>${label}</span>${memberTag}
          </div>`;
        }).join('');
        if (allTasks.length > 5) tasksHTML += `<div class="day-task-count">+${allTasks.length-5}개 더</div>`;
      }

      dayEl.innerHTML = `
        <div class="day-header">
          <span class="day-name">${dayNames[i]}</span>
          <span class="day-date">${date.getMonth()+1}/${date.getDate()}</span>
        </div>
        <div class="day-tasks">${tasksHTML}</div>`;
      grid.appendChild(dayEl);
    }
  },

  renderSummary() {
    const container = document.getElementById('weekly-summary');
    const tasks = Storage.getTasksByWeek(this.currentWeekStart);

    if (tasks.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">이 주에는 아직 입력된 업무가 없어요<br>업무 입력에서 업무를 등록해보세요!</div></div>`;
      return;
    }

    const catMap = {};
    tasks.forEach(t => {
      const c = t.category || '기타';
      if (!catMap[c]) catMap[c] = { count: 0, emoji: t.categoryEmoji || '📌' };
      catMap[c].count++;
    });

    const dayMap = {};
    const dn = ['일','월','화','수','목','금','토'];
    tasks.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const name = dn[d.getDay()];
      dayMap[name] = (dayMap[name]||0) + 1;
    });
    const topDay = Object.entries(dayMap).sort((a,b)=>b[1]-a[1])[0];

    const cats = Object.entries(catMap).sort((a,b)=>b[1].count-a[1].count);
    const max = Math.max(...cats.map(c=>c[1].count));

    const barsHTML = cats.map(([name,data]) => `
      <div class="category-bar">
        <span class="bar-label">${data.emoji} ${name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${data.count/max*100}%"></div></div>
        <span class="bar-count">${data.count}</span>
      </div>`).join('');

    container.innerHTML = `
      <div class="card" style="margin-top:8px">
        <div class="card-title">📊 주간 업무 요약</div>
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-value">${tasks.length}</div><div class="summary-label">총 업무 건수</div></div>
          <div class="summary-card"><div class="summary-value">${cats.length}</div><div class="summary-label">카테고리</div></div>
          <div class="summary-card"><div class="summary-value">${topDay?topDay[0]:'-'}</div><div class="summary-label">가장 바쁜 요일</div></div>
        </div>
        <div style="margin-top:20px"><div class="card-title">카테고리별 업무</div>${barsHTML}</div>
      </div>`;
  },

  // ── 월간 뷰 ──
  renderMonthLabel() {
    const y = this.currentMonth.getFullYear();
    const m = this.currentMonth.getMonth() + 1;
    document.getElementById('cal-week-label').textContent = `${y}년 ${m}월`;
  },

  renderMonthGrid() {
    const grid = document.getElementById('calendar-grid');
    grid.className = 'calendar-grid calendar-grid-month';
    grid.innerHTML = '';

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = Storage.formatDate(new Date());

    // 요일 헤더
    const dayNames = ['월','화','수','목','금','토','일'];
    dayNames.forEach(name => {
      const hdr = document.createElement('div');
      hdr.className = 'month-day-header';
      hdr.textContent = name;
      grid.appendChild(hdr);
    });

    // 시작 요일 (월=0, 일=6)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    // 빈칸
    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'month-day empty';
      grid.appendChild(empty);
    }

    // 날짜
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = Storage.formatDate(date);
      const isToday = dateStr === today;
      const tasks = Storage.getTasksByDate(dateStr);

      const dayEl = document.createElement('div');
      dayEl.className = `month-day${isToday ? ' today' : ''}${tasks.length > 0 ? ' has-tasks' : ''}`;

      const teamTasks = (typeof TeamSync !== 'undefined') ? TeamSync.getTeamTasksByDate(dateStr) : [];
      const allTasks = [...tasks, ...teamTasks];

      let tasksHTML = '';
      if (allTasks.length > 0) {
        const show = allTasks.slice(0, 3);
        tasksHTML = show.map(t => {
          const label = `${t.categoryEmoji||'📌'} ${t.text.length > 10 ? t.text.slice(0,10)+'…' : t.text}`;
          const member = t.memberName ? ` · ${t.memberName}` : '';
          if (t.url) {
            return `<a href="${t.url}" target="_blank" class="month-task-item month-task-link">${label}${member} 🔗</a>`;
          }
          return `<div class="month-task-item">${label}${member}</div>`;
        }).join('');
        if (allTasks.length > 3) tasksHTML += `<div class="month-task-more">+${allTasks.length-3}개</div>`;
      }

      dayEl.innerHTML = `
        <div class="month-day-num${isToday ? ' today-num' : ''}">${d}</div>
        <div class="month-day-tasks">${tasksHTML}</div>`;
      grid.appendChild(dayEl);
    }
  },

  renderMonthlySummary() {
    const container = document.getElementById('weekly-summary');
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const allTasks = Storage.getTasks().filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });

    if (allTasks.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">이번 달에는 아직 입력된 업무가 없어요</div></div>`;
      return;
    }

    const catMap = {};
    allTasks.forEach(t => {
      const c = t.category || '기타';
      if (!catMap[c]) catMap[c] = { count: 0, emoji: t.categoryEmoji || '📌' };
      catMap[c].count++;
    });

    // 주차별 업무 수
    const weekMap = {};
    allTasks.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const weekNum = Math.ceil(d.getDate() / 7);
      weekMap[weekNum] = (weekMap[weekNum] || 0) + 1;
    });

    const cats = Object.entries(catMap).sort((a,b) => b[1].count - a[1].count);
    const max = Math.max(...cats.map(c => c[1].count));

    const barsHTML = cats.map(([name, data]) => `
      <div class="category-bar">
        <span class="bar-label">${data.emoji} ${name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${data.count/max*100}%"></div></div>
        <span class="bar-count">${data.count}</span>
      </div>`).join('');

    const weeksHTML = Object.entries(weekMap).sort((a,b) => a[0]-b[0]).map(([w, cnt]) =>
      `<div class="summary-card"><div class="summary-value">${cnt}</div><div class="summary-label">${w}주차</div></div>`
    ).join('');

    container.innerHTML = `
      <div class="card" style="margin-top:8px">
        <div class="card-title">📊 ${this.currentMonth.getMonth()+1}월 업무 요약</div>
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-value">${allTasks.length}</div><div class="summary-label">총 업무</div></div>
          <div class="summary-card"><div class="summary-value">${cats.length}</div><div class="summary-label">카테고리</div></div>
          ${weeksHTML}
        </div>
        <div style="margin-top:20px"><div class="card-title">카테고리별 업무</div>${barsHTML}</div>
      </div>`;
  }
};
