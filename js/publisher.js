// ========================================
// Publisher — 멀티 플랫폼 콘텐츠 발행
// 원본 → AI → 6개 플랫폼 동시 생성
// ========================================
const Publisher = {
  results: {},
  currentSource: 'manual',

  TOPICS: [
    '2026 하반기 꼬마빌딩 투자 전망',
    '신사동 vs 성수동 상가 수익률 비교',
    '빌딩 매입 시 반드시 확인할 5가지',
    '월세 1억 받는 건물주가 되려면?',
    '소액 빌딩 투자, 10억으로 시작하기',
    '공실률 낮추는 임차인 유치 전략',
    '강남 꼬마빌딩 실거래가 분석 2026',
    '빌딩 리모델링으로 수익률 2배 만들기',
    '부동산 법인 vs 개인, 세금 차이 총정리',
    '역세권 상가 빌딩 고르는 기준',
    '건물주 첫 달 현금흐름 계산법',
    '임대차 계약 시 놓치면 안 되는 조항 7가지',
    '2026 서울 오피스 빌딩 시장 동향',
    '빌딩 감정평가 쉽게 이해하기',
    '상가 공실, 업종 전환으로 해결하는 법',
    '빌딩 투자 수익률 4% 넘기는 비결',
  ],

  switchTab(tab) {
    document.querySelectorAll('.pub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('pub-tab-text').style.display = tab === 'text' ? '' : 'none';
    document.getElementById('pub-tab-cardnews').style.display = tab === 'cardnews' ? '' : 'none';
  },

  useTopic(el) {
    const topic = el.textContent;
    document.getElementById('pub-title').value = topic;
    document.getElementById('pub-content').value = topic + ' 에 대해 BSN 빌사남 관점에서 전문적으로 작성해주세요.';
    // 카드뉴스 주제에도 동시에 세팅
    const cne = document.getElementById('cne-topic');
    if (cne) cne.value = topic;
  },

  refreshTopics() {
    const shuffled = [...this.TOPICS].sort(() => Math.random() - 0.5).slice(0, 6);
    const el = document.getElementById('pub-topics');
    el.innerHTML = shuffled.map(t => `<span class="pub-topic-chip" onclick="Publisher.useTopic(this)">${t}</span>`).join('');
  },

  switchSource(src) {
    this.currentSource = src;
    document.querySelectorAll('.pub-src-btn').forEach(b => b.classList.toggle('active', b.dataset.src === src));
    document.getElementById('pub-src-manual').style.display = src === 'manual' ? '' : 'none';
    document.getElementById('pub-src-youtube').style.display = src === 'youtube' ? '' : 'none';
    if (src === 'youtube') this.loadYoutubeList();
  },

  loadYoutubeList() {
    const el = document.getElementById('pub-yt-list');
    // ContentBoard에서 영상 데이터 가져오기
    const videos = (typeof ContentBoard !== 'undefined' && ContentBoard.data && ContentBoard.data.videos)
      ? ContentBoard.data.videos.slice(0, 10)
      : [];

    if (videos.length === 0) {
      el.innerHTML = '<div style="color:var(--text-muted);padding:16px;">유튜브 탭에서 먼저 채널을 연결하세요.</div>';
      return;
    }

    el.innerHTML = videos.map(v => `
      <div class="pub-yt-item ${v._selected ? 'selected' : ''}" onclick="Publisher.selectVideo('${v.id}')" style="display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px;cursor:pointer;border:1px solid var(--border);margin-bottom:6px;">
        ${v.thumbnail ? `<img src="${v.thumbnail}" style="width:80px;height:45px;border-radius:4px;object-fit:cover;">` : ''}
        <div style="flex:1;overflow:hidden;">
          <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title}</div>
          <div style="font-size:11px;color:var(--text-muted);">👁 ${v.views.toLocaleString()} · 👍 ${v.likes}</div>
        </div>
      </div>
    `).join('');
  },

  selectVideo(id) {
    const videos = ContentBoard.data.videos;
    const v = videos.find(x => x.id === id);
    if (!v) return;
    document.getElementById('pub-title').value = v.title;
    document.getElementById('pub-content').value = `유튜브 영상 제목: ${v.title}\n조회수: ${v.views}\n좋아요: ${v.likes}\n댓글: ${v.comments}\n길이: ${v.durationText}\n\n이 영상의 핵심 내용을 기반으로 각 플랫폼에 맞는 콘텐츠를 생성해주세요.`;
    this.switchSource('manual');
  },

  async generateAll() {
    const title = document.getElementById('pub-title').value.trim();
    const content = document.getElementById('pub-content').value.trim();
    if (!title && !content) { alert('제목 또는 내용을 입력하세요.'); return; }

    const loading = document.getElementById('pub-loading');
    const btn = document.getElementById('pub-gen-btn');
    loading.style.display = 'block';
    btn.disabled = true;

    const prompt = `당신은 부동산 콘텐츠 마케팅 전문가입니다. BSN 빌사남(중소형 빌딩 투자 전문) 회사의 콘텐츠를 작성합니다.

## 원본 콘텐츠
제목: ${title}
내용: ${content}

위 내용을 아래 6개 플랫폼에 맞게 변환하세요. 반드시 JSON으로 응답:

{
  "blog": "네이버 블로그용 (1500-2000자, SEO 키워드 포함, 소제목 3-4개, 자연스러운 톤)",
  "wordpress": "WordPress용 (HTML 마크업 포함, h2/h3/p/ul 태그, 1500자+, 전문적 톤)",
  "threads": "Threads용 (500자 이내, 캐주얼 톤, 이모지 적절히, 해시태그 5개)",
  "linkedin": "LinkedIn용 (800-1000자, 전문가 톤, 인사이트 중심, CTA 포함)",
  "tistory": "티스토리용 (1200-1500자, 마크다운 형식, 목차 포함, 분석적 톤)",
  "instagram": "Instagram 캡션 (300자 이내, 줄바꿈 활용, 해시태그 15-20개, 감성적)"
}

JSON 객체만 응답하세요.`;

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 4000 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI 호출 실패');

      const jsonMatch = data.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 파싱 실패');

      this.results = JSON.parse(jsonMatch[0]);
      this.renderResults();

    } catch (err) {
      alert('생성 실패: ' + err.message);
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
    }
  },

  renderResults() {
    document.getElementById('pub-results').style.display = 'block';
    const platforms = ['blog', 'wordpress', 'threads', 'linkedin', 'tistory', 'instagram'];
    platforms.forEach(p => {
      const body = document.getElementById('pub-body-' + p);
      if (body && this.results[p]) {
        body.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;color:var(--text);font-family:inherit;margin:0;">${this._esc(this.results[p])}</pre>`;
      }
    });
  },

  copy(platform) {
    const text = this.results[platform];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector(`#pub-card-${platform} .btn`);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ 복사됨';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    }).catch(() => {
      // 폴백: textarea 복사
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  },

  _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
