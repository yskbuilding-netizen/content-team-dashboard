// ========================================
// Marketing Module - 리드, 경쟁분석, 광고 관리
// ========================================
const Marketing = {
  // ─── 리드 관리 ───
  openLeadModal() {
    document.getElementById('lead-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('lead-modal').classList.add('active');
  },
  closeLeadModal() { document.getElementById('lead-modal').classList.remove('active'); },

  saveLead() {
    const lead = {
      id: Date.now().toString(),
      date: document.getElementById('lead-date').value,
      name: document.getElementById('lead-name').value.trim(),
      channel: document.getElementById('lead-channel').value,
      note: document.getElementById('lead-note').value.trim(),
      status: document.getElementById('lead-status').value
    };
    if (!lead.name) return;
    const leads = JSON.parse(localStorage.getItem('ct_leads') || '[]');
    leads.unshift(lead);
    localStorage.setItem('ct_leads', JSON.stringify(leads));
    this.closeLeadModal();
    this.renderLeads();
    document.getElementById('lead-name').value = '';
    document.getElementById('lead-note').value = '';
  },

  renderLeads() {
    const leads = JSON.parse(localStorage.getItem('ct_leads') || '[]');
    const list = document.getElementById('leads-list');
    if (!list) return;

    // 요약 카드 업데이트
    const total = leads.length;
    const byChannel = {};
    leads.forEach(l => { byChannel[l.channel] = (byChannel[l.channel] || 0) + 1; });
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('lead-total', total);
    el('lead-youtube', byChannel.youtube || 0);
    el('lead-instagram', byChannel.instagram || 0);
    el('lead-blog', (byChannel.blog || 0) + (byChannel.naver || 0));
    el('lead-other', (byChannel.tiktok || 0) + (byChannel.referral || 0) + (byChannel.other || 0));

    const statusMap = { new: '🆕 신규', contacted: '📞 연락완료', meeting: '🤝 미팅예정', closed: '✅ 계약완료', lost: '❌ 이탈' };
    const channelMap = { youtube: '🎬 YouTube', instagram: '📸 Instagram', tiktok: '🎵 TikTok', blog: '📝 블로그', naver: '🔍 네이버', referral: '👥 소개', other: '기타' };

    if (leads.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">아직 상담 기록이 없습니다.</div>';
      return;
    }

    list.innerHTML = leads.map(l => `
      <div class="platform-card" style="border-left:3px solid var(--accent-cyan);margin-bottom:8px;">
        <div class="platform-header">
          <span class="platform-name">${l.name}</span>
          <span class="platform-date">${l.date}</span>
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:12px;background:var(--bg-input);padding:3px 8px;border-radius:6px;">${channelMap[l.channel] || l.channel}</span>
          <span style="font-size:12px;background:var(--bg-input);padding:3px 8px;border-radius:6px;">${statusMap[l.status] || l.status}</span>
          <span style="font-size:12px;color:var(--text-secondary);">${l.note}</span>
          <button class="btn btn-sm" style="margin-left:auto;font-size:11px;padding:2px 8px;" onclick="Marketing.deleteLead('${l.id}')">삭제</button>
        </div>
      </div>
    `).join('');
  },

  deleteLead(id) {
    let leads = JSON.parse(localStorage.getItem('ct_leads') || '[]');
    leads = leads.filter(l => l.id !== id);
    localStorage.setItem('ct_leads', JSON.stringify(leads));
    this.renderLeads();
  },

  // ─── 경쟁 채널 관리 ───
  openCompetitorModal() { document.getElementById('competitor-modal').classList.add('active'); },
  closeCompetitorModal() { document.getElementById('competitor-modal').classList.remove('active'); },

  saveCompetitor() {
    const comp = {
      id: Date.now().toString(),
      name: document.getElementById('comp-name').value.trim(),
      platform: document.getElementById('comp-platform').value,
      subs: document.getElementById('comp-subs').value,
      note: document.getElementById('comp-note').value.trim()
    };
    if (!comp.name) return;
    const comps = JSON.parse(localStorage.getItem('ct_competitors') || '[]');
    comps.unshift(comp);
    localStorage.setItem('ct_competitors', JSON.stringify(comps));
    this.closeCompetitorModal();
    this.renderCompetitors();
    document.getElementById('comp-name').value = '';
    document.getElementById('comp-subs').value = '';
    document.getElementById('comp-note').value = '';
  },

  renderCompetitors() {
    const comps = JSON.parse(localStorage.getItem('ct_competitors') || '[]');
    const list = document.getElementById('competitors-list');
    if (!list) return;

    const platformMap = { youtube: '🎬 YouTube', instagram: '📸 Instagram', tiktok: '🎵 TikTok', blog: '📝 블로그' };
    const colorMap = { youtube: 'var(--youtube)', instagram: 'var(--instagram)', tiktok: 'var(--tiktok)', blog: 'var(--blog)' };

    const fmt = n => { n = Number(n); if (n >= 10000) return (n/10000).toFixed(1)+'만'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toLocaleString(); };

    if (comps.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">경쟁 채널을 추가해보세요.</div>';
      return;
    }

    list.innerHTML = '<div style="margin-bottom:20px;">' + comps.map(c => `
      <div class="platform-card" style="border-left:3px solid ${colorMap[c.platform] || 'var(--accent-purple)'};margin-bottom:8px;">
        <div class="platform-header">
          <span class="platform-name">${c.name}</span>
          <span style="font-size:12px;background:var(--bg-input);padding:3px 8px;border-radius:6px;">${platformMap[c.platform] || c.platform}</span>
        </div>
        <div style="display:flex;gap:16px;align-items:center;">
          <span style="font-size:14px;font-weight:600;color:var(--text-primary);">👥 ${c.subs ? fmt(c.subs) : '-'}</span>
          <span style="font-size:12px;color:var(--text-secondary);">${c.note}</span>
          <button class="btn btn-sm" style="margin-left:auto;font-size:11px;padding:2px 8px;" onclick="Marketing.deleteCompetitor('${c.id}')">삭제</button>
        </div>
      </div>
    `).join('') + '</div>';
  },

  deleteCompetitor(id) {
    let comps = JSON.parse(localStorage.getItem('ct_competitors') || '[]');
    comps = comps.filter(c => c.id !== id);
    localStorage.setItem('ct_competitors', JSON.stringify(comps));
    this.renderCompetitors();
  },

  // ─── 광고 관리 ───
  openAdModal() {
    document.getElementById('ad-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('ad-modal').classList.add('active');
  },
  closeAdModal() { document.getElementById('ad-modal').classList.remove('active'); },

  saveAd() {
    const ad = {
      id: Date.now().toString(),
      date: document.getElementById('ad-date').value,
      platform: document.getElementById('ad-platform').value,
      spend: Number(document.getElementById('ad-spend').value) || 0,
      reach: Number(document.getElementById('ad-reach').value) || 0,
      clicks: Number(document.getElementById('ad-clicks').value) || 0,
      conversions: Number(document.getElementById('ad-conv').value) || 0
    };
    if (!ad.spend) return;
    const ads = JSON.parse(localStorage.getItem('ct_ads') || '[]');
    ads.unshift(ad);
    localStorage.setItem('ct_ads', JSON.stringify(ads));
    this.closeAdModal();
    this.renderAds();
    document.getElementById('ad-spend').value = '';
    document.getElementById('ad-reach').value = '';
    document.getElementById('ad-clicks').value = '';
    document.getElementById('ad-conv').value = '';
  },

  renderAds() {
    const ads = JSON.parse(localStorage.getItem('ct_ads') || '[]');
    const list = document.getElementById('ads-list');
    if (!list) return;

    const fmt = n => { n = Number(n); if (n >= 10000) return (n/10000).toFixed(1)+'만'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toLocaleString(); };
    const platformMap = { youtube: '🎬 YouTube', instagram: '📸 Instagram', naver: '🔍 네이버', google: '🌐 Google', tiktok: '🎵 TikTok' };

    // 요약 업데이트
    let totalSpend = 0, totalReach = 0, totalClicks = 0, totalConv = 0;
    ads.forEach(a => { totalSpend += a.spend; totalReach += a.reach; totalClicks += a.clicks; totalConv += a.conversions; });
    const avgCpc = totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('ad-total-spend', fmt(totalSpend) + '원');
    el('ad-total-reach', fmt(totalReach));
    el('ad-total-clicks', fmt(totalClicks));
    el('ad-cpc', fmt(avgCpc) + '원');
    el('ad-conversions', totalConv);

    if (ads.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">광고 기록을 추가해보세요.</div>';
      return;
    }

    list.innerHTML = ads.map(a => {
      const cpc = a.clicks > 0 ? Math.round(a.spend / a.clicks) : 0;
      const ctr = a.reach > 0 ? (a.clicks / a.reach * 100).toFixed(2) : 0;
      return `
      <div class="platform-card" style="border-left:3px solid var(--youtube);margin-bottom:8px;">
        <div class="platform-header">
          <span class="platform-name">${platformMap[a.platform] || a.platform}</span>
          <span class="platform-date">${a.date}</span>
        </div>
        <div class="platform-metrics">
          <div class="platform-metric"><div class="pm-label">광고비</div><div class="pm-value" style="font-size:16px;">${fmt(a.spend)}원</div></div>
          <div class="platform-metric"><div class="pm-label">도달</div><div class="pm-value" style="font-size:16px;">${fmt(a.reach)}</div></div>
          <div class="platform-metric"><div class="pm-label">클릭</div><div class="pm-value" style="font-size:16px;">${fmt(a.clicks)}</div></div>
          <div class="platform-metric"><div class="pm-label">CTR</div><div class="pm-value" style="font-size:16px;">${ctr}%</div></div>
          <div class="platform-metric"><div class="pm-label">CPC</div><div class="pm-value" style="font-size:16px;">${fmt(cpc)}원</div></div>
          <div class="platform-metric"><div class="pm-label">전환</div><div class="pm-value" style="font-size:16px;">${a.conversions}</div></div>
        </div>
        <div style="text-align:right;margin-top:8px;"><button class="btn btn-sm" style="font-size:11px;padding:2px 8px;" onclick="Marketing.deleteAd('${a.id}')">삭제</button></div>
      </div>`;
    }).join('');
  },

  deleteAd(id) {
    let ads = JSON.parse(localStorage.getItem('ct_ads') || '[]');
    ads = ads.filter(a => a.id !== id);
    localStorage.setItem('ct_ads', JSON.stringify(ads));
    this.renderAds();
  },

  // 페이지 전환 시 렌더링
  refreshPage(page) {
    if (page === 'leads') this.renderLeads();
    if (page === 'competitors') this.renderCompetitors();
    if (page === 'ads') this.renderAds();
  }
};
