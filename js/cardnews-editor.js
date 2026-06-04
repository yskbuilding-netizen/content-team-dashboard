// ========================================
// Card News Editor — 카드뉴스 에디터
// AI 생성 + 실시간 편집 + 이미지 저장
// ========================================
const CardNewsEditor = {
  cards: [],
  currentIdx: 0,
  colors: null,

  STYLES: {
    modern: { bg: 'rgba(20,20,40,0.85)', text: '#ffffff', accent: '#667eea', gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
    bold:   { bg: 'rgba(0,0,0,0.75)', text: '#ffffff', accent: '#ff4444', gradient: 'linear-gradient(135deg,#ff4444,#ff8a00)' },
    soft:   { bg: 'rgba(255,255,255,0.88)', text: '#2d2d2d', accent: '#d4956b', gradient: 'linear-gradient(135deg,#d4956b,#e8c4a0)' },
    data:   { bg: 'rgba(10,25,47,0.88)', text: '#e0e0e0', accent: '#48cae4', gradient: 'linear-gradient(135deg,#0077b6,#48cae4)' }
  },

  async generate() {
    const topic = document.getElementById('cne-topic').value.trim();
    const pages = document.getElementById('cne-pages').value;
    const style = document.getElementById('cne-style').value;
    if (!topic) { alert('주제를 입력하세요.'); return; }

    const loading = document.getElementById('cne-loading');
    const btn = document.getElementById('cne-gen-btn');
    loading.style.display = 'block';
    btn.disabled = true;

    try {
      const prompt = `당신은 인스타그램 카드뉴스 전문 디자이너입니다.

주제: ${topic}
장수: ${pages}장
회사: BSN 빌사남 (중소형 빌딩 투자 전문)

각 장에 대해 JSON 배열로 응답하세요:
[{"page":1,"type":"cover","headline":"메인 제목","subtext":"부제","dataPoint":"","imageSearch":"modern building exterior"},...]

- 1장=표지(강렬한 후킹), 마지막=CTA(팔로우/상담 유도)
- headline은 2줄 이내, subtext는 1-2줄
- dataPoint는 숫자/통계 (없으면 빈 문자열)
- imageSearch는 영문 키워드

JSON 배열만 응답하세요.`;

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 3000 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI 호출 실패');

      const jsonMatch = data.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('JSON 파싱 실패');

      this.cards = JSON.parse(jsonMatch[0]);
      this.colors = this.STYLES[style] || this.STYLES.modern;
      this.currentIdx = 0;

      document.getElementById('cne-workspace').style.display = 'block';
      this.renderCardList();
      this.renderPreview();
      this.loadPropsPanel();

    } catch (err) {
      alert('생성 실패: ' + err.message);
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
    }
  },

  renderCardList() {
    const list = document.getElementById('cne-card-list');
    list.innerHTML = this.cards.map((c, i) => `
      <div class="cne-thumb ${i === this.currentIdx ? 'active' : ''}" onclick="CardNewsEditor.selectCard(${i})">
        <div style="font-size:10px;color:var(--text-muted);">${i + 1}/${this.cards.length}</div>
        <div style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.headline.slice(0, 12)}</div>
      </div>
    `).join('');
  },

  selectCard(idx) {
    this.currentIdx = idx;
    this.renderCardList();
    this.renderPreview();
    this.loadPropsPanel();
  },

  renderPreview() {
    const card = this.cards[this.currentIdx];
    if (!card) return;
    const c = this.colors;
    const isCover = card.type === 'cover' || card.page === 1;
    const isCta = card.type === 'cta' || card.page === this.cards.length;
    const imgQuery = card.imageSearch || 'modern building';
    const imgUrl = `https://source.unsplash.com/1080x1080/?${encodeURIComponent(imgQuery)}&sig=${this.currentIdx}${Date.now()}`;
    const textColor = c.text || '#fff';
    const isDark = c.bg.includes('255,255,255') || c.bg.includes('rgba(255');
    const headColor = isDark ? '#1a1a2e' : '#ffffff';

    document.getElementById('cne-preview').innerHTML = `
      <div id="cne-render-target" style="width:100%;height:100%;position:relative;background-image:url('${imgUrl}');background-size:cover;background-position:center;">
        <div style="position:absolute;inset:0;background:${card._customBg || c.bg};"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:32px;text-align:center;box-sizing:border-box;">
          <div style="font-size:11px;color:${c.accent};margin-bottom:8px;">${card.page} / ${this.cards.length}</div>
          ${isCover ? `<div style="background:${c.gradient};color:#fff;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px;">빌사남</div>` : ''}
          ${card.dataPoint ? `<div style="font-size:28px;font-weight:800;color:${c.accent};margin-bottom:8px;">${card.dataPoint}</div>` : ''}
          <div style="font-size:${isCover ? '22px' : '18px'};font-weight:800;color:${headColor};line-height:1.4;margin-bottom:12px;word-break:keep-all;">${card.headline}</div>
          <div style="font-size:13px;color:${headColor}aa;line-height:1.5;">${card.subtext || ''}</div>
          ${isCta ? `<div style="margin-top:20px;background:${c.gradient};color:#fff;padding:12px 28px;border-radius:30px;font-weight:700;font-size:14px;">빌사남과 상담하기 →</div>` : ''}
        </div>
      </div>`;
  },

  loadPropsPanel() {
    const card = this.cards[this.currentIdx];
    if (!card) return;
    document.getElementById('cne-edit-headline').value = card.headline;
    document.getElementById('cne-edit-subtext').value = card.subtext || '';
    document.getElementById('cne-edit-data').value = card.dataPoint || '';
    document.getElementById('cne-edit-imgquery').value = card.imageSearch || '';
  },

  updateCard() {
    const card = this.cards[this.currentIdx];
    if (!card) return;
    card.headline = document.getElementById('cne-edit-headline').value;
    card.subtext = document.getElementById('cne-edit-subtext').value;
    card.dataPoint = document.getElementById('cne-edit-data').value;
    this.renderPreview();
  },

  setBg(el) {
    const bg = el.getAttribute('data-bg');
    this.cards[this.currentIdx]._customBg = bg;
    this.renderPreview();
  },

  changeImage() {
    const query = document.getElementById('cne-edit-imgquery').value.trim();
    if (!query) return;
    this.cards[this.currentIdx].imageSearch = query;
    this.renderPreview();
  },

  async downloadCurrent() {
    const target = document.getElementById('cne-render-target');
    if (!target) return;
    try {
      // html2canvas CDN 로드
      if (typeof html2canvas === 'undefined') {
        await this._loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      }
      const canvas = await html2canvas(target, { width: 1080, height: 1080, scale: 1, useCORS: true, allowTaint: true });
      const link = document.createElement('a');
      link.download = `cardnews_${this.currentIdx + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
  },

  async downloadAll() {
    if (this.cards.length === 0) { alert('먼저 카드뉴스를 생성하세요.'); return; }
    for (let i = 0; i < this.cards.length; i++) {
      this.selectCard(i);
      await new Promise(r => setTimeout(r, 500));
      await this.downloadCurrent();
      await new Promise(r => setTimeout(r, 300));
    }
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
};
