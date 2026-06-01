// ========================================
// Upload Planner - 이번주/다음주 업로드 예정 + 촬영 일정 CRUD
// ========================================
const UploadPlanner = {
  UPLOADS_KEY: 'ct_uploads',
  SHOOTS_KEY: 'ct_shoots',
  PD_REGISTRY_KEY: 'ct_pd_registry',
  DEFAULT_PDS: ['양승주 PD', '배미진 PD', '조성우 감독님'],
  editingId: null,
  editingShootId: null,

  PLATFORM_LABELS: {
    'youtube-bilsanam': { icon: '🏢', name: '빌사남TV', color: '#ff4444' },
    'youtube-seoulspace': { icon: '🏙️', name: '서울스페이스', color: '#4a90e2' },
    'instagram': { icon: '📸', name: '인스타그램', color: '#e1306c' },
    'reels': { icon: '🎬', name: '릴스', color: '#9b59b6' },
    'other': { icon: '📌', name: '기타', color: '#888' }
  },

  init() {
    this.seedDefaults();
    this.render();
  },

  getPdRegistry() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.PD_REGISTRY_KEY));
      if (Array.isArray(stored) && stored.length) return stored;
    } catch {}
    return this.DEFAULT_PDS.slice();
  },

  setPdRegistry(list) {
    localStorage.setItem(this.PD_REGISTRY_KEY, JSON.stringify(list));
  },

  addPd(name) {
    name = (name || '').trim();
    if (!name) return;
    const list = this.getPdRegistry();
    if (!list.includes(name)) {
      list.push(name);
      this.setPdRegistry(list);
    }
  },

  removePd(name) {
    const list = this.getPdRegistry().filter(p => p !== name);
    this.setPdRegistry(list);
  },

  seedDefaults() {
    if (!localStorage.getItem(this.PD_REGISTRY_KEY)) {
      this.setPdRegistry(this.DEFAULT_PDS);
    }
    if (localStorage.getItem('ct_uploads_seeded_v1') === '1') return;
    const seeds = [
      { date: '2026-05-18', platform: 'youtube-bilsanam', title: '성수 서연무장길 2편', pd: '양승주 PD', memo: '' },
      { date: '2026-05-21', platform: 'youtube-bilsanam', title: '재활병원 임차인', pd: '배미진 PD', memo: '' }
    ];
    const list = this.getUploads();
    seeds.forEach(s => list.push({ ...s, id: this.genId(), createdAt: new Date().toISOString() }));
    localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(list));

    const shoots = this.getShoots();
    shoots.push({
      id: this.genId(),
      dateText: '5월 20일 (수)~22일 (금) 중 1일',
      location: '성수 동연무장길',
      pd: '양승주 PD, 배미진 PD',
      memo: '기상여건에 따라 결정',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(this.SHOOTS_KEY, JSON.stringify(shoots));

    localStorage.setItem('ct_uploads_seeded_v1', '1');
  },

  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  getUploads() {
    try { return JSON.parse(localStorage.getItem(this.UPLOADS_KEY)) || []; } catch { return []; }
  },

  saveUploads(list) {
    localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(list));
  },

  getShoots() {
    try { return JSON.parse(localStorage.getItem(this.SHOOTS_KEY)) || []; } catch { return []; }
  },

  saveShoots(list) {
    localStorage.setItem(this.SHOOTS_KEY, JSON.stringify(list));
  },

  // 이번 주 / 다음 주 시작일 계산 (월요일 기준)
  weekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  weekEnd(date) {
    const start = this.weekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  },

  getUploadsInWeek(weekStart) {
    const start = this.weekStart(weekStart);
    const end = this.weekEnd(weekStart);
    return this.getUploads()
      .filter(u => {
        const d = new Date(u.date + 'T00:00:00');
        return d >= start && d <= end;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  render() {
    const now = new Date();
    const thisWeek = this.weekStart(now);
    const nextWeek = new Date(thisWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.renderUploadList('up-this-week', this.getUploadsInWeek(thisWeek), '이번 주');
    this.renderUploadList('up-next-week', this.getUploadsInWeek(nextWeek), '다음 주');
    this.renderShoots();
  },

  renderUploadList(elId, items, weekLabel) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (items.length === 0) {
      el.innerHTML = `<div class="up-empty">${weekLabel}에 예정된 업로드 없음. 우측 + 버튼으로 추가하세요.</div>`;
      return;
    }
    el.innerHTML = items.map(u => {
      const p = this.PLATFORM_LABELS[u.platform] || this.PLATFORM_LABELS.other;
      const d = new Date(u.date + 'T00:00:00');
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`;
      return `
        <div class="up-item" data-id="${u.id}">
          <div class="up-item-date">${dateStr}</div>
          <div class="up-item-platform" style="background:${p.color}22;color:${p.color};">${p.icon} ${p.name}</div>
          <div class="up-item-body">
            <div class="up-item-title">${this.escape(u.title)}</div>
            <div class="up-item-meta">${this.escape(u.pd || '')}${u.memo ? ' · ' + this.escape(u.memo) : ''}</div>
          </div>
          <div class="up-item-actions">
            <button class="up-action-btn" onclick="UploadPlanner.edit('${u.id}')" title="편집">✏️</button>
            <button class="up-action-btn" onclick="UploadPlanner.delete('${u.id}')" title="삭제">🗑</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderShoots() {
    const el = document.getElementById('up-shoots');
    if (!el) return;
    const items = this.getShoots();
    if (items.length === 0) {
      el.innerHTML = `<div class="up-empty">예정된 촬영 일정 없음. 우측 + 버튼으로 추가하세요.</div>`;
      return;
    }
    el.innerHTML = items.map(s => `
      <div class="up-item" data-id="${s.id}">
        <div class="up-item-date" style="flex:0 0 auto;min-width:180px;">${this.escape(s.dateText)}</div>
        <div class="up-item-body">
          <div class="up-item-title">📍 ${this.escape(s.location)}</div>
          <div class="up-item-meta">${this.escape(s.pd || '')}${s.memo ? ' · ' + this.escape(s.memo) : ''}</div>
        </div>
        <div class="up-item-actions">
          <button class="up-action-btn" onclick="UploadPlanner.editShoot('${s.id}')" title="편집">✏️</button>
          <button class="up-action-btn" onclick="UploadPlanner.deleteShoot('${s.id}')" title="삭제">🗑</button>
        </div>
      </div>
    `).join('');
  },

  escape(s) {
    return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  refreshPdDatalist() {
    const dl = document.getElementById('pd-list');
    if (!dl) return;
    const pds = this.getPdRegistry();
    dl.innerHTML = pds.map(p => `<option value="${this.escape(p)}">`).join('');
  },

  // ── 업로드 모달 ──
  openModal(weekHint, id) {
    this.editingId = id || null;
    this.refreshPdDatalist();
    const modal = document.getElementById('upload-modal');
    const title = document.getElementById('upload-modal-title');
    title.textContent = id ? '업로드 예정 편집' : '업로드 예정 추가';

    if (id) {
      const item = this.getUploads().find(u => u.id === id);
      if (item) {
        document.getElementById('upload-date').value = item.date;
        document.getElementById('upload-platform').value = item.platform;
        document.getElementById('upload-title').value = item.title;
        document.getElementById('upload-pd').value = item.pd || '';
        document.getElementById('upload-memo').value = item.memo || '';
      }
    } else {
      const base = this.weekStart(new Date());
      if (weekHint === 'next') base.setDate(base.getDate() + 7);
      const yyyy = base.getFullYear();
      const mm = String(base.getMonth() + 1).padStart(2, '0');
      const dd = String(base.getDate()).padStart(2, '0');
      document.getElementById('upload-date').value = `${yyyy}-${mm}-${dd}`;
      document.getElementById('upload-platform').value = 'youtube-bilsanam';
      document.getElementById('upload-title').value = '';
      document.getElementById('upload-pd').value = '';
      document.getElementById('upload-memo').value = '';
    }

    modal.classList.add('active');
  },

  closeModal() {
    document.getElementById('upload-modal').classList.remove('active');
    this.editingId = null;
  },

  save() {
    const date = document.getElementById('upload-date').value;
    const platform = document.getElementById('upload-platform').value;
    const title = document.getElementById('upload-title').value.trim();
    const pd = document.getElementById('upload-pd').value.trim();
    const memo = document.getElementById('upload-memo').value.trim();

    if (!date || !title) {
      alert('날짜와 제목은 필수입니다.');
      return;
    }

    if (pd) {
      pd.split(/[,、·]\s*/).map(s => s.trim()).filter(Boolean).forEach(p => this.addPd(p));
    }

    const list = this.getUploads();
    if (this.editingId) {
      const idx = list.findIndex(u => u.id === this.editingId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], date, platform, title, pd, memo };
      }
    } else {
      list.push({ id: this.genId(), date, platform, title, pd, memo, createdAt: new Date().toISOString() });
    }
    this.saveUploads(list);
    this.closeModal();
    this.render();
    if (typeof Dashboard !== 'undefined' && Dashboard.renderPdSummary) Dashboard.renderPdSummary();
  },

  edit(id) { this.openModal(null, id); },

  delete(id) {
    if (!confirm('이 업로드 예정을 삭제하시겠습니까?')) return;
    const list = this.getUploads().filter(u => u.id !== id);
    this.saveUploads(list);
    this.render();
  },

  // ── 촬영 모달 ──
  openShootModal(id) {
    this.editingShootId = id || null;
    this.refreshPdDatalist();
    const modal = document.getElementById('shoot-modal');
    document.getElementById('shoot-modal-title').textContent = id ? '촬영 일정 편집' : '촬영 일정 추가';

    if (id) {
      const item = this.getShoots().find(s => s.id === id);
      if (item) {
        document.getElementById('shoot-date').value = item.dateText;
        document.getElementById('shoot-location').value = item.location;
        document.getElementById('shoot-pd').value = item.pd || '';
        document.getElementById('shoot-memo').value = item.memo || '';
      }
    } else {
      document.getElementById('shoot-date').value = '';
      document.getElementById('shoot-location').value = '';
      document.getElementById('shoot-pd').value = '';
      document.getElementById('shoot-memo').value = '';
    }
    modal.classList.add('active');
  },

  closeShootModal() {
    document.getElementById('shoot-modal').classList.remove('active');
    this.editingShootId = null;
  },

  saveShoot() {
    const dateText = document.getElementById('shoot-date').value.trim();
    const location = document.getElementById('shoot-location').value.trim();
    const pd = document.getElementById('shoot-pd').value.trim();
    const memo = document.getElementById('shoot-memo').value.trim();

    if (!dateText || !location) {
      alert('일자와 장소는 필수입니다.');
      return;
    }

    if (pd) {
      pd.split(/[,、·]\s*/).map(s => s.trim()).filter(Boolean).forEach(p => this.addPd(p));
    }

    const list = this.getShoots();
    if (this.editingShootId) {
      const idx = list.findIndex(s => s.id === this.editingShootId);
      if (idx >= 0) list[idx] = { ...list[idx], dateText, location, pd, memo };
    } else {
      list.push({ id: this.genId(), dateText, location, pd, memo, createdAt: new Date().toISOString() });
    }
    this.saveShoots(list);
    this.closeShootModal();
    this.renderShoots();
    if (typeof Dashboard !== 'undefined' && Dashboard.renderPdSummary) Dashboard.renderPdSummary();
  },

  editShoot(id) { this.openShootModal(id); },

  deleteShoot(id) {
    if (!confirm('이 촬영 일정을 삭제하시겠습니까?')) return;
    const list = this.getShoots().filter(s => s.id !== id);
    this.saveShoots(list);
    this.renderShoots();
  }
};
