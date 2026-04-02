// ========================================
// Planner Module
// ========================================
const Planner = {
  currentWeekStart: null,

  init() {
    this.currentWeekStart = Storage.getNextWeekStart();
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('plan-prev-week').addEventListener('click', () => {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
      this.refresh();
    });
    document.getElementById('plan-next-week').addEventListener('click', () => {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
      this.refresh();
    });
    document.getElementById('add-plan-btn').addEventListener('click', () => this.addPlan());
    document.getElementById('plan-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addPlan();
    });
  },

  addPlan() {
    const input = document.getElementById('plan-input');
    const priority = document.getElementById('plan-priority').value;
    const notes = document.getElementById('plan-notes');
    const text = input.value.trim();
    if (!text) return;

    Storage.addPlan({
      text,
      priority,
      notes: notes.value.trim(),
      weekStart: Storage.formatDate(this.currentWeekStart)
    });

    input.value = '';
    notes.value = '';
    this.refresh();
  },

  refresh() {
    this.renderWeekLabel();
    this.renderPlans();
    this.renderProgress();
  },

  renderWeekLabel() {
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    document.getElementById('plan-week-label').textContent =
      `${this.currentWeekStart.getMonth()+1}/${this.currentWeekStart.getDate()} ~ ${end.getMonth()+1}/${end.getDate()}`;
  },

  renderProgress() {
    const plans = Storage.getPlansByWeek(this.currentWeekStart);
    const total = plans.length;
    const done = plans.filter(p => p.completed).length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const el = document.getElementById('plan-progress');
    el.innerHTML = total > 0 ? `
      <div class="progress-bar-container">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="progress-label">${done}/${total} (${pct}%)</span>
      </div>` : '';
  },

  renderPlans() {
    const list = document.getElementById('plans-list');
    const plans = Storage.getPlansByWeek(this.currentWeekStart);

    if (plans.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">아직 등록된 계획이 없어요<br>위에서 할 일을 추가해보세요!</div></div>`;
      return;
    }

    const priorityLabel = { high: '🔴 높음', normal: '🟡 보통', low: '🟢 낮음' };

    list.innerHTML = plans.map(p => `
      <div class="plan-item ${p.completed ? 'completed' : ''}" data-id="${p.id}">
        <div class="plan-item-header">
          <div class="plan-checkbox ${p.completed ? 'checked' : ''}" onclick="Planner.togglePlan('${p.id}')">✓</div>
          <span class="plan-text">${p.text}</span>
          <span class="priority-badge ${p.priority}">${priorityLabel[p.priority] || '🟡 보통'}</span>
          <div class="plan-item-actions">
            <button class="btn-icon" onclick="Planner.deletePlan('${p.id}')" title="삭제">🗑️</button>
          </div>
        </div>
        ${p.notes ? `<div class="plan-notes">${p.notes}</div>` : ''}
      </div>
    `).join('');
  },

  togglePlan(id) {
    const plans = Storage.getPlans();
    const plan = plans.find(p => p.id === id);
    if (plan) {
      Storage.updatePlan(id, { completed: !plan.completed });
      this.refresh();
    }
  },

  deletePlan(id) {
    Storage.deletePlan(id);
    this.refresh();
  }
};
