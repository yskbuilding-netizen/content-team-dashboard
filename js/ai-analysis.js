// ========================================
// AI Analysis Module - Claude API 연동
// ========================================
const AIAnalysis = {
  API_KEY_KEY: 'claude_api_key',
  DEFAULT_KEY: '',

  getApiKey() {
    return localStorage.getItem(this.API_KEY_KEY) || this.DEFAULT_KEY;
  },

  setApiKey(key) {
    localStorage.setItem(this.API_KEY_KEY, key.trim());
  },

  isConfigured() {
    return !!this.getApiKey();
  },

  async analyze(video, allVideos, channelInfo) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    // 채널 컨텍스트 구성
    const avgViews = allVideos.reduce((s, v) => s + v.views, 0) / allVideos.length;
    const avgLikes = allVideos.reduce((s, v) => s + v.likes, 0) / allVideos.length;
    const avgComments = allVideos.reduce((s, v) => s + v.comments, 0) / allVideos.length;
    const longVideos = allVideos.filter(v => !v.isShort);
    const shortVideos = allVideos.filter(v => v.isShort);
    const top5 = [...allVideos].sort((a, b) => b.views - a.views).slice(0, 5);

    const prompt = `당신은 유튜브 채널 성장 전문 컨설턴트입니다.

## 채널 정보
- 채널명: ${channelInfo.title}
- 구독자: ${channelInfo.subscriberCount.toLocaleString()}명
- 총 영상: ${channelInfo.videoCount}개
- 최근 ${allVideos.length}개 영상 평균 조회수: ${Math.round(avgViews).toLocaleString()}
- 최근 평균 좋아요: ${Math.round(avgLikes).toLocaleString()}
- 최근 평균 댓글: ${Math.round(avgComments).toLocaleString()}
- 롱폼 ${longVideos.length}개, 숏폼 ${shortVideos.length}개

## 조회수 TOP 5 영상
${top5.map((v, i) => `${i + 1}. "${v.title}" - 조회수 ${v.views.toLocaleString()}, 좋아요 ${v.likes.toLocaleString()}, 댓글 ${v.comments.toLocaleString()}`).join('\n')}

## 분석 대상 영상
- 제목: "${video.title}"
- 조회수: ${video.views.toLocaleString()} (채널 평균 대비 ${video.views >= avgViews ? '높음' : '낮음'})
- 좋아요: ${video.likes.toLocaleString()}
- 댓글: ${video.comments.toLocaleString()}
- 길이: ${video.durationText} (${video.isShort ? '숏폼' : '롱폼'})
- 업로드일: ${new Date(video.publishedAt).toLocaleDateString('ko-KR')}
- 참여율: ${video.views > 0 ? ((video.likes + video.comments) / video.views * 100).toFixed(2) : 0}%

아래 형식으로 분석해주세요. 각 항목은 이 영상의 실제 숫자를 근거로 구체적으로 작성하세요.

### 1. 문제 진단
이 영상이 왜 이런 성과가 나왔는지 구체적으로 진단 (제목/썸네일/주제/길이/업로드 시점 등 가능한 원인을 숫자 근거와 함께 2-3가지 제시)

### 2. 솔루션
지금 당장 이 영상의 성과를 올릴 수 있는 실행 방법 (제목 변경, 썸네일 교체, 설명란 수정 등 구체적 액션)

### 3. 제목 추천
현재 제목의 문제점을 짚고, 클릭률을 높일 대안 제목 3가지 (각각 왜 더 나은지 이유 포함)

### 4. 썸네일 전략
이 영상의 주제에 맞는 구체적인 썸네일 구성안 (텍스트 문구, 표정, 배경색, 레이아웃 등)

### 5. 후속 콘텐츠
이 영상을 기반으로 만들 수 있는 후속 영상 2가지 (제목 + 예상 조회수 근거)

### 6. 핵심 한줄
가장 중요한 액션 아이템 딱 하나`;

    try {
      // 서버 프록시 우선 (API 키 불필요)
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 1500 })
      });
      const data = await res.json();
      if (data.success) return data.content;

      // 서버 실패 시 직접 호출 (브라우저 API 키)
      if (apiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
        });
        if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${response.status}`); }
        const d = await response.json();
        return d.content[0].text;
      }
      throw new Error(data.error || 'API 키 미설정. 서버 설정에서 Anthropic API 키를 등록해주세요.');
    } catch (err) {
      console.error('AI Analysis error:', err);
      throw err;
    }
  },

  async analyzeChannel(videos, channelInfo) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;
    const longVideos = videos.filter(v => !v.isShort);
    const shortVideos = videos.filter(v => v.isShort);
    const longAvgViews = longVideos.length > 0 ? longVideos.reduce((s, v) => s + v.views, 0) / longVideos.length : 0;
    const shortAvgViews = shortVideos.length > 0 ? shortVideos.reduce((s, v) => s + v.views, 0) / shortVideos.length : 0;
    const top5 = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
    const bottom5 = [...videos].sort((a, b) => a.views - b.views).slice(0, 5);
    const totalEng = videos.reduce((s, v) => s + v.likes + v.comments, 0);
    const totalViews = videos.reduce((s, v) => s + v.views, 0);

    const prompt = `당신은 유튜브 채널 성장 전문 컨설턴트입니다. 아래 실제 데이터를 기반으로 채널을 종합 분석해주세요.

## 채널 정보
- 채널명: ${channelInfo.title}
- 구독자: ${channelInfo.subscriberCount.toLocaleString()}명
- 총 영상: ${channelInfo.videoCount}개
- 총 조회수: ${channelInfo.viewCount.toLocaleString()}회

## 최근 ${videos.length}개 영상 데이터
- 롱폼: ${longVideos.length}개 (평균 조회수 ${Math.round(longAvgViews).toLocaleString()})
- 숏폼: ${shortVideos.length}개 (평균 조회수 ${Math.round(shortAvgViews).toLocaleString()})
- 전체 평균 조회수: ${Math.round(avgViews).toLocaleString()}
- 전체 참여율: ${totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(2) : 0}%

## 조회수 TOP 5
${top5.map((v, i) => `${i+1}. "${v.title}" - ${v.views.toLocaleString()}회 / 좋아요 ${v.likes} / 댓글 ${v.comments} / ${v.isShort ? '숏폼' : '롱폼'}`).join('\n')}

## 조회수 하위 5개
${bottom5.map((v, i) => `${i+1}. "${v.title}" - ${v.views.toLocaleString()}회 / 좋아요 ${v.likes} / 댓글 ${v.comments} / ${v.isShort ? '숏폼' : '롱폼'}`).join('\n')}

아래 형식으로 분석해주세요. 숫자 근거를 반드시 포함하고, 실행 가능한 조언을 해주세요.

### 1. 채널 현황 요약
현재 채널의 상태를 3줄로 요약 (구독자 대비 조회수, 참여율 수준 등)

### 2. 가장 잘 되는 콘텐츠
어떤 주제/형식이 잘 되는지, 왜 잘 되는지 (데이터 근거 포함)

### 3. 개선이 필요한 부분
구체적으로 뭐가 문제인지, 숫자로 설명

### 4. 이번 주 해야 할 것
지금 당장 실행할 수 있는 액션 3가지 (구체적으로)

### 5. 한 달 성장 전략
구독자와 조회수를 올리기 위한 한 달 로드맵`;

    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens: 2000 })
    });
    const data = await res.json();
    if (data.success) return data.content;

    // 폴백: 직접 호출
    if (apiKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
      });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${response.status}`); }
      const d = await response.json();
      return d.content[0].text;
    }
    throw new Error(data.error || 'API 키 미설정');
  },

  // 마크다운을 간단한 HTML로 변환
  formatResponse(text) {
    return text
      .replace(/### (\d+)\. (.+)/g, '<div class="ai-section-title"><span class="ai-num">$1</span> $2</div>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- /g, '\n\u2022 ')
      .replace(/\n/g, '<br>')
      .replace(/\u2022 /g, '<span class="ai-bullet">\u2022</span> ');
  }
};
