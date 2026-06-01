// ========================================
// Calendar Module - 주간/월간 뷰
// ========================================
const Calendar = {
  currentWeekStart: null,
  currentMonth: null,
  viewMode: 'week',

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

      const teamTasks = (typeof TeamSync !== 'undefined') ? TeamSync.getTeamTasksByDate(dateStr) : [];
      const allTasks = [...tasks, ...teamTasks];

      let tasksHTML = '';
      if (allTasks.length > 0) {
        const show = allTasks.slice(0, 5);
        tasksHTML = show.map(t => {
          const label = t.text.length > 20 ? t.text.slice(0,20)+'...' : t.text;
          const memberTag = t.memberName ? `<span class="task-member">${t.memberName}</span>` : '';
          const delBtn = !t.memberName ? `<button class="task-del-btn" onclick="event.stopPropagation();Calendar.deleteTask('${t.id}')" title="삭제">✕</button>` : '';
          if (t.url) {
            return `<div class="day-task-item day-task-link-wrap"><a href="${t.url}" target="_blank" class="day-task-link-text"><span class="task-emoji">${t.categoryEmoji||'📌'}</span><span>${label}</span>${memberTag}</a>${delBtn}</div>`;
          }
          return `<div class="day-task-item"><span class="task-emoji">${t.categoryEmoji||'📌'}</span><span style="flex:1">${label}</span>${memberTag}${delBtn}</div>`;
        }).join('');
        if (allTasks.length > 5) tasksHTML += `<div class="day-task-count">+${allTasks.length-5}개 더</div>`;
      }

      dayEl.innerHTML = `
        <div class="day-header" style="cursor:pointer" onclick="Calendar.openAddModal('${dateStr}')">
          <span class="day-name">${dayNames[i]}</span>
          <span class="day-date">${date.getMonth()+1}/${date.getDate()}</span>
          <span class="day-add-btn">+</span>
        </div>
        <div class="day-tasks">${tasksHTML}</div>`;
      grid.appendChild(dayEl);
    }
  },

  renderSummary() {
    const container = document.getElementById('weekly-summary');
    const tasks = Storage.getTasksByWeek(this.currentWeekStart);

    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">이 주에는 아직 입력된 업무가 없어요<br>업무 입력에서 업무를 등록해보세요!</div></div>';
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

    const barsHTML = cats.map(([name,d]) =>
      `<div class="category-bar"><span class="bar-label">${d.emoji} ${name}</span><div class="bar-track"><div class="bar-fill" style="width:${d.count/max*100}%"></div></div><span class="bar-count">${d.count}</span></div>`
    ).join('');

    container.innerHTML = `<div class="card" style="margin-top:8px"><div class="card-title">📊 주간 업무 요약</div><div class="summary-grid"><div class="summary-card"><div class="summary-value">${tasks.length}</div><div class="summary-label">엁 업무 건수</div></div><div class="summary-card"><div class="summary-value">${cats.length}</div><div class="summary-label">카테고리</div></div><div class="summary-card"><div class="summary-value">${topDay?topDay[0]:'-'}</div><div class="summary-label">가장 바쁜 요일</div></div></div><div style="margin-top:20px"><div class="card-title">카테고리별 업무</div>${barsHTML}</div></div>`;
  },

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

    const dayNames = ['월','화','수','목','금','토','일'];
    dayNames.forEach(name => {
      const hdr = document.createElement('div');
      hdr.className = 'month-day-header';
      hdr.textContent = name;
      grid.appendChild(hdr);
    });

    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'month-day empty';
      grid.appendChild(empty);
    }

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
          const label = `${t.categoryEmoji||'📌'} ${t.text.length > 10 ? t.text.slice(0,10)+'...' : t.text}`;
          const member = t.memberName ? ` · ${t.memberName}` : '';
          if (t.url) return `<a href="${t.url}" target="_blank" class="month-task-item month-task-link">${label}${member} 🔗</a>`;
          return `<div class="month-task-item">${label}${member}</div>`;
        }).join('');
        if (allTasks.length > 3) tasksHTML += `<div class="month-task-more">+${allTasks.length-3}개</div>`;
      }

      dayEl.innerHTML = `<div class="month-day-num${isToday ? ' today-num' : ''}">${d}</div><div class="month-day-tasks">${tasksHTML}</div>`;
      grid.appendChild(dayEl);
    }
  },

  openAddModal(dateStr) {
    const d = dateStr || Storage.formatDate(new Date());
    let modal = document.getElementById('cal-add-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cal-add-modal';
      modal.className = 'modal-overlay';
      modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

      const box = document.createElement('div');
      box.className = 'modal';
      box.style.cssText = 'max-width:480px;width:92%;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;';
      header.innerHTML = '<h2 style="margin:0;font-size:17px;">📌 업무 추가</h2>';
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = 'background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-secondary);';
      closeBtn.onclick = () => { modal.style.display = 'none'; };
      header.appendChild(closeBtn);
      box.appendChild(header);

      box.insertAdjacentHTML('beforeend', [
        '<div class="form-group" style="margin-bottom:12px;">',
        '<label style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;display:block;">날짜</label>',
        '<input type="date" id="cal-task-date" class="agent-input" style="width:100%;box-sizing:border-box;">',
        '</div>',
        '<div class="form-group" style="margin-bottom:12px;">',
        '<label style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;display:block;">업무 내용</label>',
        '<input type="text" id="cal-task-text" class="agent-input" placeholder="업무 내용을 입력하세요" style="width:100%;box-sizing:border-box;">',
        '</div>',
        '<div style="display:flex;gap:10px;margin-bottom:12px;">',
        '<div class="form-group" style="flex:1;">',
        '<label style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;display:block;">카테고리</label>',
        '<select id="cal-task-category" class="agent-select" style="width:100%;">',
        '<option value="기획">📋 기획</option>',
        '<option value="촉영">🎬 촉영</option>',
        '<option value="편집">✂️ 편집</option>',
        '<option value="발행">📤 발행</option>',
        '<option value="미팅">💬 미팅</option>',
        '<option value="마케팅">📣 마케팅</option>',
        '<option value="기타">📌 기타</option>',
        '</select>',
        '</div>',
        '<div class="form-group" style="flex:1;">',
        '<label style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;display:block;">URL (선택)</label>',
        '<input type="url" id="cal-task-url" class="agent-input" placeholder="https://..." style="width:100%;box-sizing:border-box;">',
        '</div>',
        '</div>'
      ].join(''));

      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = '취소';
      cancelBtn.onclick = () => { modal.style.display = 'none'; };
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = '추가';
      saveBtn.onclick = () => Calendar.saveTask();
      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);
      box.appendChild(footer);
      modal.appendChild(box);
      document.body.appendChild(modal);
    }
    document.getElementById('cal-task-date').value = d;
    document.getElementById('cal-task-text').value = '';
    document.getElementById('cal-task-url').value = '';
    modal.style.display = 'flex';
    setTimeout(() => { const el = document.getElementById('cal-task-text'); if (el) el.focus(); }, 100);
  },

  saveTask() {
    const textEl = document.getElementById('cal-task-text');
    const dateEl = document.getElementById('cal-task-date');
    const catEl = document.getElementById('cal-task-category');
    const urlEl = document.getElementById('cal-task-url');
    const text = textEl ? textEl.value.trim() : '';
    const date = dateEl ? dateEl.value : '';
    const category = catEl ? catEl.value : '기타';
    const url = urlEl ? urlEl.value.trim() : '';
    if (!text) { if (textEl) textEl.focus(); return; }
    if (!date) { alert('날짜를 선택해주세요.'); return; }
    const emojiMap = {
      '기획': '📋',
      '촉영': '🎬',
      '편집': '✂️',
      '발행': '📤',
      '미팅': '💬',
      '마케팅': '📣',
      '기타': '📌'
    };
    Storage.addTask({ text, date, category, categoryEmoji: emojiMap[category] || '📌', url: url || undefined, completed: false });
    document.getElementById('cal-add-modal').style.display = 'none';
    this.refresh();
  },

  deleteTask(id) {
    if (!confirm('이 업무를 삭제하시겠습니까?')) return;
    Storage.deleteTask(id);
    this.refresh();
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
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">이번 달에는 아직 입력된 업무가 없어요</div></div>';
      return;
    }

    const catMap = {};
    allTasks.forEach(t => {
      const c = t.category || '기타';
      if (!catMap[c]) catMap[c] = { count: 0, emoji: t.categoryEmoji || '📌' };
      catMap[c].count++;
    });

    const weekMap = {};
    allTasks.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const weekNum = Math.ceil(d.getDate() / 7);
      weekMap[weekNum] = (weekMap[weekNum] || 0) + 1;
    });

    const cats = Object.entries(catMap).sort((a,b) => b[1].count - a[1].count);
    const max = Math.max(...cats.map(c => c[1].count));

    const barsHTML = cats.map(([name, d]) =>
      `<div class="category-bar"><span class="bar-label">${d.emoji} ${name}</span><div class="bar-track"><div class="bar-fill" style="width:${d.count/max*100}%"></div></div><span class="bar-count">${d.count}</span></div>`
    ).join('');

    const weeksHTML = Object.entries(weekMap).sort((a,b) => a[0]-b[0]).map(([w, cnt]) =>
      `<div class="summary-card"><div class="summary-value">${cnt}</div><div class="summary-label">${w}주차</div></div>`
    ).join('');

    container.innerHTML = `<div class="card" style="margin-top:8px"><div class="card-title">📊 ${this.currentMonth.getMonth()+1}월 업무 요약</div><div class="summary-grid"><div class="summary-card"><div class="summary-value">${allTasks.length}</div><div class="summary-label">엁 업무</div></div><div class="summary-card"><div class="summary-value">${cats.length}</div><div class="summary-label">카테고리</div></div>${weeksHTML}</div><div style="margin-top:20px"><div class="card-title">카테고리별 업무</div>${barsHTML}</div></div>`;
  }
};
