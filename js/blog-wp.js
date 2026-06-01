// ========================================
// BlogWP Module - 블로그/WordPress 통합 관리
// 콘텐츠 생성 + 발행 + 히스토리
// ========================================
const BlogWP = {
  HISTORY_KEY: 'bwp_history',
  CONFIG_KEY: 'bwp_config',
  currentPlatform: 'all',

  init() {
    this.loadConfig();
    this.renderHistory();
    this.updateSummary();
  },

  refresh() {
    this.renderHistory();
    this.updateSummary();
    this.checkConnections();
  },

  // ── 설정 관리 ──
  loadConfig() {
    try {
      return JSON.parse(localStorage.getItem(this.CONFIG_KEY)) || {};
    } catch { return {}; }
  },

  saveConfig(cfg) {
    const current = this.loadConfig();
    Object.assign(current, cfg);
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(current));
  },

  async saveWPConfig() {
    const url = document.getElementById('bwp-wp-url').value.trim();
    const user = document.getElementById('bwp-wp-user').value.trim();
    const pass = document.getElementById('bwp-wp-pass').value.trim();
    if (!url || !user || !pass) { alert('모든 필드를 입력해주세요.'); return; }
    try {
      await fetch('/api/publish/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'wordpress', url, user, pass })
      });
      this.saveConfig({ wp: { url, user, pass } });
      this.checkConnections();
      alert('WordPress 설정이 저장되었습니다.');
    } catch (e) { alert('저장 실패: ' + e.message); }
  },

  async saveThreadsConfig() {
    const uid = document.getElementById('bwp-threads-uid').value.trim();
    const token = document.getElementById('bwp-threads-token').value.trim();
    if (!uid || !token) { alert('모든 필드를 입력해주세요.'); return; }
    try {
      await fetch('/api/publish/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'threads', uid, token })
      });
      this.saveConfig({ threads: { uid, token } });
      this.checkConnections();
      alert('Threads 설정이 저장되었습니다.');
    } catch (e) { alert('저장 실패: ' + e.message); }
  },

  async saveLIConfig() {
    const uid = document.getElementById('bwp-li-uid').value.trim();
    const token = document.getElementById('bwp-li-token').value.trim();
    if (!uid || !token) { alert('모든 필드를 입력해주세요.'); return; }
    try {
      await fetch('/api/publish/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'linkedin', uid, token })
      });
      this.saveConfig({ linkedin: { uid, token } });
      this.checkConnections();
      alert('LinkedIn 설정이 저장되었습니다.');
    } catch (e) { alert('저장 실패: ' + e.message); }
  },

  async checkConnections() {
    try {
      const res = await fetch('/api/publish/config');
      if (res.ok) {
        const cfg = await res.json();
        const setStatus = (id, connected) => {
          const el = document.getElementById(id);
          if (el) {
            el.textContent = connected ? '✅ 연결됨' : '❌ 미연결';
            el.className = 'bwp-setting-status ' + (connected ? 'connected' : '');
          }
        };
        setStatus('bwp-wp-status', cfg.wordpress && cfg.wordpress.connected);
        setStatus('bwp-threads-status', cfg.threads && cfg.threads.connected);
        setStatus('bwp-li-status', cfg.linkedin && cfg.linkedin.connected);
        return;
      }
    } catch {}
    const cfg = this.loadConfig();
    const setStatus = (id, connected) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = connected ? '✅ 연결됨' : '❌ 미연결';
        el.className = 'bwp-setting-status ' + (connected ? 'connected' : '');
      }
    };
    setStatus('bwp-wp-status', cfg.wp && cfg.wp.url);
    setStatus('bwp-threads-status', cfg.threads && cfg.threads.token);
    setStatus('bwp-li-status', cfg.linkedin && cfg.linkedin.token);
  },

  // ── 플랫폼 탭 전환 ──
  switchPlatform(platform) {
    this.currentPlatform = platform;
    document.querySelectorAll('.bwp-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.platform === platform);
    });
    this.renderHistory();
  },

  // ── AI 콘텐츠 생성 ──
  async generateContent() {
    const topic = document.getElementById('bwp-topic').value.trim();
    if (!topic) { alert('주제를 입력해주세요.'); return; }

    const platform = document.getElementById('bwp-gen-platform').value;
    const useNews = document.getElementById('bwp-use-news').checked;
    const loading = document.getElementById('bwp-gen-loading');
    const btn = document.getElementById('bwp-gen-btn');
    const resultsArea = document.getElementById('bwp-gen-results');

    loading.style.display = 'flex';
    btn.disabled = true;
    btn.textContent = '생성 중...';

    try {
      const platforms = platform === 'all'
        ? ['wordpress', 'blog', 'threads']
        : [platform];

      const results = {};

      for (const p of platforms) {
        const content = await this._generateForPlatform(topic, p, useNews);
        results[p] = content;
      }

      this._renderResults(results, topic);
      resultsArea.style.display = '';

    } catch (err) {
      alert('생성 오류: ' + err.message);
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
      btn.textContent = '생성';
    }
  },

  async _generateForPlatform(topic, platform, useNews) {
    const apiKey = this._getApiKey();
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

    const platformConfigs = {
      wordpress: { name: '워드프레스', format: 'HTML', length: '1500~3000자', style: 'SEO 최적화된 HTML. h2/h3 소제목, strong 강조, blockquote 인용. 전문적이면서 읽기 쉬운 톤.' },
      blog: { name: '네이버 블로그', format: 'TEXT', length: '1000~2500자', style: '친근한 문체. 이모지 적절히, 소제목에 번호, 핵심 볼드. 마지막에 공감/댓글 유도.' },
      tistory: { name: '티스토리', format: 'HTML', length: '1500~3000자', style: 'HTML 형식. 깊이 있는 분석, 데이터 테이블, 목차형 소제목. 구글 SEO 최적화.' },
      threads: { name: 'Threads', format: 'TEXT', length: '100~500자', style: '짧고 임팩트 있는 문장. 핵심 수치 1~2개, 호기심 유발 첫 문장, 해시태그 3~5개.' },
      linkedin: { name: 'LinkedIn', format: 'TEXT', length: '300~1000자', style: '전문적이고 비즈니스적인 톤. 인사이트 중심, 데이터 기반. 마지막에 의견 요청.' }
    };

    const cfg = platformConfigs[platform] || platformConfigs.wordpress;

    const systemPrompt = `당신은 '빌사남(김윤수)'의 문체로 글을 쓰는 부동산 전문 칼럼니스트입니다.
- 상업용 빌딩만 다룹니다. 주택/아파트/전세 절대 금지.
- 워드프레스/블로그/티스토리: "~예요", "~죠", "~거든요" 친근형
- 스레드/링크드인: "~다", "~한다" 단정형
- 금지: "~입니다", "~해보겠습니다", "~살펴보겠습니다" 같은 격식 표현
- 권장: "현장에서 보면", "실제로 ~한 케이스", "근데", "이게"
- 구체 수치·지역·금액 반드시 포함
- 현재 날짜: ${new Date().toISOString().split('T')[0]}`;

    const userPrompt = `${cfg.name}용 글을 작성해주세요.

주제: ${topic}
${useNews ? '오늘 뉴스/트렌드를 반영해서 시의성 있게 작성해주세요.' : ''}

포맷: ${cfg.format}
길이: ${cfg.length}
스타일: ${cfg.style}

다음 구조로 응답 (JSON):
{"title":"제목","content":"본문","tags":["태그1","태그2"],"summary":"한줄 요약"}`;

    // 서버 프록시 우선
    const serverRes = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt, systemPrompt, maxTokens: 4096 })
    }).catch(() => null);

    let res, data;
    if (serverRes && serverRes.ok) {
      const sd = await serverRes.json();
      if (sd.success) {
        const text = sd.content;
        try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
        return { title: topic, content: text, tags: [], summary: '' };
      }
    }

    if (!apiKey) throw new Error('API 키 미설정. 서버를 재시작하거나 설정에서 Anthropic API 키를 등록해주세요.');

    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API 오류: ${res.status}`);
    }

    data = await res.json();
    const text = data.content[0].text;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}

    return { title: topic, content: text, tags: [], summary: '' };
  },

  _getApiKey() {
    return localStorage.getItem('claude_api_key') ||
      (typeof ContentAgent !== 'undefined' && ContentAgent._K ? ContentAgent._K.join('') : '');
  },

  // ── 결과 렌더링 ──
  _renderResults(results, topic) {
    const grid = document.getElementById('bwp-results-grid');
    const platformIcons = {
      wordpress: '🔵', blog: '📗', tistory: '🟠', threads: '🧵', linkedin: '💼'
    };
    const platformNames = {
      wordpress: 'WordPress', blog: '네이버 블로그', tistory: '티스토리', threads: 'Threads', linkedin: 'LinkedIn'
    };

    grid.innerHTML = Object.entries(results).map(([platform, data]) => {
      const icon = platformIcons[platform] || '📄';
      const name = platformNames[platform] || platform;
      const contentPreview = (data.content || '').replace(/<[^>]*>/g, '').slice(0, 200);

      return `<div class="bwp-result-card" data-platform="${platform}">
        <div class="bwp-result-header">
          <span class="bwp-result-icon">${icon}</span>
          <span class="bwp-result-platform">${name}</span>
        </div>
        <div class="bwp-result-title">${this._esc(data.title || topic)}</div>
        <div class="bwp-result-preview">${this._esc(contentPreview)}...</div>
        ${data.tags && data.tags.length ? `<div class="bwp-result-tags">${data.tags.map(t => `<span class="bwp-tag">#${t}</span>`).join(' ')}</div>` : ''}
        <div class="bwp-result-actions">
          <button class="btn btn-secondary btn-sm" onclick="BlogWP.editContent('${platform}')">편집</button>
          <button class="btn btn-secondary btn-sm" onclick="BlogWP.copyContent('${platform}')">복사</button>
          <button class="btn btn-secondary btn-sm" onclick="BlogWP.saveDraft('${platform}')">임시저장</button>
          <button class="btn btn-primary btn-sm" onclick="BlogWP.publishOne('${platform}')">발행</button>
        </div>
      </div>`;
    }).join('');

    this._lastResults = results;
    this._lastTopic = topic;
  },

  // ── 개별 액션 ──
  copyContent(platform) {
    const data = this._lastResults && this._lastResults[platform];
    if (!data) return;
    const text = data.content || '';
    navigator.clipboard.writeText(text).then(() => {
      alert('클립보드에 복사되었습니다!');
    });
  },

  editContent(platform) {
    const data = this._lastResults && this._lastResults[platform];
    if (!data) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.id = 'bwp-edit-modal';
    modal.innerHTML = `<div class="modal" style="max-width:700px;width:90%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;">편집 - ${platform}</h2>
        <button class="btn-icon" onclick="BlogWP.closeEditModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-secondary);">✕</button>
      </div>
      <div class="form-group"><label>제목</label><input type="text" id="bwp-edit-title" class="agent-input" value="${this._esc(data.title || '')}"></div>
      <div class="form-group"><label>본문</label><textarea id="bwp-edit-content" class="agent-textarea" rows="14" style="min-height:300px;font-size:13px;">${this._esc(data.content || '')}</textarea></div>
      <div class="form-group"><label>태그 (쉼표 구분)</label><input type="text" id="bwp-edit-tags" class="agent-input" value="${(data.tags || []).join(', ')}"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button class="btn btn-secondary" onclick="BlogWP.closeEditModal()">취소</button>
        <button class="btn btn-primary" onclick="BlogWP.applyEdit('${platform}')">적용</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },

  closeEditModal() {
    const modal = document.getElementById('bwp-edit-modal');
    if (modal) modal.remove();
  },

  applyEdit(platform) {
    if (!this._lastResults || !this._lastResults[platform]) return;
    this._lastResults[platform].title = document.getElementById('bwp-edit-title').value;
    this._lastResults[platform].content = document.getElementById('bwp-edit-content').value;
    this._lastResults[platform].tags = document.getElementById('bwp-edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    this.closeEditModal();
    this._renderResults(this._lastResults, this._lastTopic);
  },

  // ── 임시저장 ──
  saveDraft(platform) {
    const data = this._lastResults && this._lastResults[platform];
    if (!data) return;
    this._saveToHistory(platform, data, 'draft');
    alert(`${platform} 글이 임시저장되었습니다.`);
  },

  saveAllDrafts() {
    if (!this._lastResults) return;
    Object.entries(this._lastResults).forEach(([p, d]) => {
      this._saveToHistory(p, d, 'draft');
    });
    alert('전체 임시저장 완료!');
    this.renderHistory();
    this.updateSummary();
  },

  // ── 발행 ──
  async publishOne(platform) {
    const data = this._lastResults && this._lastResults[platform];
    if (!data) return;

    if (platform === 'wordpress') {
      await this._publishToWordPress(data);
    } else if (platform === 'threads') {
      await this._publishToThreads(data);
    } else if (platform === 'linkedin') {
      await this._publishToLinkedIn(data);
    } else {
      this._saveToHistory(platform, data, 'published');
      this.copyContent(platform);
      alert(`${platform} 글이 클립보드에 복사되었습니다.\n해당 플랫폼에 직접 붙여넣기 해주세요.`);
    }

    this.renderHistory();
    this.updateSummary();
  },

  async publishAll() {
    if (!this._lastResults) return;
    if (!confirm('모든 플랫폼에 발행하시겠습니까?\n(WordPress는 API로, 나머지는 클립보드 복사)')) return;

    for (const [platform, data] of Object.entries(this._lastResults)) {
      await this.publishOne(platform);
    }
  },

  async _publishToWordPress(data) {
    try {
      const res = await fetch('/api/publish/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          tags: data.tags || [],
          summary: data.summary || '',
          status: 'draft'
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'WordPress 발행 실패');

      this._saveToHistory('wordpress', data, 'published', {
        postId: result.postId,
        postUrl: result.postUrl,
        editUrl: result.editUrl
      });
      alert(`WordPress에 임시글로 발행 완료!\n편집: ${result.editUrl}`);
    } catch (err) {
      if (err.message.includes('미연결')) {
        this.copyContent('wordpress');
        alert('WordPress 미연결 — 클립보드에 복사되었습니다.');
      } else {
        alert('WordPress 발행 실패: ' + err.message);
      }
      this._saveToHistory('wordpress', data, 'draft');
    }
  },

  async _publishToThreads(data) {
    try {
      const res = await fetch('/api/publish/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data.content })
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Threads 발행 실패');

      this._saveToHistory('threads', data, 'published', { postId: result.postId });
      alert('Threads에 발행 완료!');
    } catch (err) {
      if (err.message.includes('미연결')) {
        this.copyContent('threads');
        alert('Threads 미연결 — 클립보드에 복사되었습니다.');
      } else {
        alert('Threads 발행 실패: ' + err.message);
      }
      this._saveToHistory('threads', data, 'draft');
    }
  },

  async _publishToLinkedIn(data) {
    try {
      const res = await fetch('/api/publish/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data.content })
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'LinkedIn 발행 실패');

      this._saveToHistory('linkedin', data, 'published', { postId: result.postId });
      alert('LinkedIn에 발행 완료!');
    } catch (err) {
      if (err.message.includes('미연결')) {
        this.copyContent('linkedin');
        alert('LinkedIn 미연결 — 클립보드에 복사되었습니다.');
      } else {
        alert('LinkedIn 발행 실패: ' + err.message);
      }
      this._saveToHistory('linkedin', data, 'draft');
    }
  },

  // ── 새 글 작성 (자동 주제 추천 + 선택 즉시 생성) ──
  async newPost() {
    const section = document.getElementById('bwp-topic');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const area = document.getElementById('bwp-topic-suggestions');
    if (area) area.style.display = 'block';
    await this.suggestTopics();
  },

  // ── 주제 자동 추천 ──
  async suggestTopics() {
    const btn = document.getElementById('bwp-suggest-btn');
    const container = document.getElementById('bwp-topic-suggestions');
    if (btn) { btn.disabled = true; btn.textContent = '추천 중...'; }
    if (container) container.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">AI가 주제를 생성하고 있습니다...</div>';

    // 기존 글 히스토리에서 컨텍스트 추출
    const history = this.getHistory().slice(0, 5);
    const historyContext = history.length > 0
      ? '기존 발행 글 제목:\n' + history.map(h => `- ${h.title || '(무제)'}`).join('\n')
      : '';

    const prompt = `빌사남(김윤수) 유튜브 채널 + 블로그용 콘텐츠 주제 10개를 추천해주세요.

${historyContext}

조건:
- 상업용 빌딩/꼬마빌딩 투자 전문
- 실무적이고 구체적인 주제 (추상적 금지)
- 제목은 클릭 유도형 (숫자, 금액, 지역명 포함)
- 카테고리별로 분류: 투자전략/세금법률/현장분석/경험사례/시장트렌드

JSON 형식으로 응답:
{"topics":[{"title":"주제 제목","category":"카테고리","why":"왜 지금 써야 하는지 한 줄","platform":"권장 플랫폼 (wordpress/threads/linkedin/all)"}]}`;

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 1500 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '생성 실패');

      let topics = [];
      try {
        const m = data.content.match(/\{[\s\S]*\}/);
        if (m) topics = JSON.parse(m[0]).topics || [];
      } catch { topics = []; }

      if (!topics.length) {
        if (container) container.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">주제 파싱 실패. 다시 시도해주세요.</div>';
        return;
      }

      const categoryColors = { '투자전략': '#667eea', '세금법률': '#f7971e', '현장분석': '#4ecdc4', '경험사례': '#a8e6cf', '시장트렌드': '#ff6b9d' };
      const platformIcons = { wordpress: '🔵', threads: '🧵', linkedin: '💼', all: '📢' };

      if (container) container.innerHTML = `
        <div class="bwp-suggest-grid">
          ${topics.map(t => `
            <div class="bwp-suggest-item" onclick="BlogWP.useTopic(${JSON.stringify(t.title).replace(/"/g, '&quot;')}, '${t.platform || 'all'}')">
              <div class="bwp-suggest-top">
                <span class="bwp-suggest-cat" style="background:${categoryColors[t.category]||'#667eea'}22;color:${categoryColors[t.category]||'#667eea'}">${t.category||''}</span>
                <span class="bwp-suggest-platform">${platformIcons[t.platform]||'📄'}</span>
              </div>
              <div class="bwp-suggest-title">${t.title}</div>
              <div class="bwp-suggest-why">${t.why||''}</div>
            </div>
          `).join('')}
        </div>`;
    } catch (err) {
      if (container) container.innerHTML = `<div style="padding:16px;color:#ff6b6b">오류: ${err.message}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔄 주제 추천'; }
    }
  },

  useTopic(title, platform) {
    const topicInput = document.getElementById('bwp-topic');
    const platformSelect = document.getElementById('bwp-gen-platform');
    if (topicInput) topicInput.value = title;
    if (platformSelect && platform && platform !== 'all') platformSelect.value = platform;
    const el = document.getElementById('bwp-topic');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // 주제 선택 즉시 자동 생성
    setTimeout(() => this.generateContent(), 300);
  },

  // ── 히스토리 관리 ──
  _saveToHistory(platform, data, status, extra = {}) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      platform,
      title: data.title || '',
      content: data.content || '',
      tags: data.tags || [],
      summary: data.summary || '',
      status,
      ...extra,
      createdAt: new Date().toISOString()
    });
    if (history.length > 100) history.length = 100;
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
  },

  getHistory() {
    try { return JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || []; }
    catch { return []; }
  },

  clearHistory() {
    if (!confirm('발행 기록을 모두 삭제하시겠습니까?')) return;
    localStorage.removeItem(this.HISTORY_KEY);
    this.renderHistory();
    this.updateSummary();
  },

  renderHistory() {
    const el = document.getElementById('bwp-history-list');
    if (!el) return;

    const filter = document.getElementById('bwp-history-filter')?.value || 'all';
    let history = this.getHistory();

    if (this.currentPlatform !== 'all') {
      history = history.filter(h => h.platform === this.currentPlatform);
    }
    if (filter !== 'all') {
      history = history.filter(h => h.status === filter);
    }

    if (history.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>기록이 없습니다.</p></div>';
      return;
    }

    const platformIcons = { wordpress: '🔵', blog: '📗', tistory: '🟠', threads: '🧵', linkedin: '💼' };
    const platformNames = { wordpress: 'WordPress', blog: '네이버 블로그', tistory: '티스토리', threads: 'Threads', linkedin: 'LinkedIn' };
    const statusLabels = { draft: '임시저장', published: '발행완료', failed: '실패' };
    const statusColors = { draft: '#888', published: '#4ecdc4', failed: '#ff6b6b' };

    el.innerHTML = history.map(h => {
      const icon = platformIcons[h.platform] || '📄';
      const name = platformNames[h.platform] || h.platform;
      const statusLabel = statusLabels[h.status] || h.status;
      const statusColor = statusColors[h.status] || '#888';
      const date = new Date(h.createdAt).toLocaleDateString('ko-KR');
      return [
        '<div class="bwp-history-item">',
        '<div class="bwp-history-header">',
        `<span class="bwp-result-icon">${icon}</span>`,
        `<span class="bwp-result-platform">${name}</span>`,
        `<span style="margin-left:auto;font-size:11px;color:${statusColor}">${statusLabel}</span>`,
        `<span style="font-size:11px;color:var(--text-muted);margin-left:8px">${date}</span>`,
        '</div>',
        `<div class="bwp-result-title">${this._esc(h.title||'(무제)')}</div>`,
        h.summary ? `<div class="bwp-result-preview">${this._esc(h.summary)}</div>` : '',
        '</div>'
      ].join('');
    }).join('');
  },

  updateSummary() {
    const history = this.getHistory();
    const published = history.filter(h => h.status === 'published').length;
    const drafts = history.filter(h => h.status === 'draft').length;
    const el = document.getElementById('bwp-summary');
    if (el) el.innerHTML = `<span>발행 ${published}건</span><span style="margin-left:12px">임시저장 ${drafts}건</span>`;
  },

  checkConnections() {
    const cfg = this.loadConfig();
    const wpStatus = document.getElementById('bwp-wp-status');
    const thStatus = document.getElementById('bwp-threads-status');
    const liStatus = document.getElementById('bwp-linkedin-status');
    if (wpStatus) wpStatus.textContent = cfg.wp && cfg.wp.url ? '연결됨' : '미연결';
    if (thStatus) thStatus.textContent = cfg.threads && cfg.threads.token ? '연결됨' : '미연결';
    if (liStatus) liStatus.textContent = cfg.linkedin && cfg.linkedin.token ? '연결됨' : '미연결';
  },

  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
