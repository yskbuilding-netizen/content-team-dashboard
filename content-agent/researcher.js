// ========================================
// Researcher Module - 부동산 뉴스/통계 수집
// ========================================

const Anthropic = require('@anthropic-ai/sdk');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Researcher = {
  // 부동산 관련 주요 통계 데이터 소스
  DATA_SOURCES: [
    { name: 'KB부동산', url: 'https://kbland.kr', description: 'KB 주간 아파트 시세, 매매/전세 지수' },
    { name: '한국부동산원', url: 'https://www.reb.or.kr', description: '부동산 통계, 실거래가 분석' },
    { name: '국토교통부 실거래가', url: 'https://rt.molit.go.kr', description: '아파트 실거래가 공개 시스템' },
    { name: '서울부동산정보광장', url: 'https://land.seoul.go.kr', description: '서울시 부동산 거래 현황' },
    { name: '부동산114', url: 'https://www.r114.com', description: '시세 동향, 분양 정보' },
  ],

  // 최근 부동산 이슈 키워드 (주기적으로 업데이트)
  HOT_TOPICS: [
    '아파트 매매가', '전세 시세', '금리 인하', '재건축', '재개발',
    'DSR 규제', 'GTX', '신도시', '분양가 상한제', '공급 부족',
    '역세권 개발', '상업용 부동산', '오피스텔 투자', '토지 투자',
    '부동산 세금', '양도소득세', '종합부동산세', '취득세',
    '전세사기', '깡통전세', '역전세', '부동산 PF',
    '리모델링', '용적률', '건폐율', '도시정비사업'
  ],

  // Claude를 활용해 최신 부동산 트렌드 리서치
  async researchTrend(topic) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `당신은 한국 부동산 시장 전문 리서처입니다.
최신 부동산 트렌드, 정책, 시장 동향에 대해 정확한 정보를 제공합니다.
답변할 때는 반드시 구체적인 수치, 날짜, 출처를 포함하세요.
현재 날짜: ${new Date().toISOString().split('T')[0]}`,
        messages: [{
          role: 'user',
          content: `다음 주제에 대해 블로그 칼럼 작성을 위한 리서치를 해주세요.

주제: ${topic}

다음 형식으로 정리해주세요:
1. **핵심 현황** (최신 통계/수치 포함)
2. **주요 변화 포인트** (최근 정책 변화, 시장 흐름)
3. **전문가 의견/전망**
4. **참고 데이터 출처** (KB부동산, 한국부동산원 등)
5. **칼럼에 활용할 수 있는 인사이트** (독자에게 실질적 도움이 되는 내용)`
        }]
      });
      return {
        success: true,
        topic,
        research: response.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('Research error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 오늘의 추천 주제 생성
  async suggestTopics(columnSummaries) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `당신은 한국 부동산 콘텐츠 전략가입니다.
기존 칼럼의 스타일과 주제를 분석하여, 오늘 작성하면 좋을 새로운 칼럼 주제를 추천합니다.
최신 부동산 이슈와 기존 칼럼의 연속성을 모두 고려하세요.
현재 날짜: ${new Date().toISOString().split('T')[0]}`,
        messages: [{
          role: 'user',
          content: `기존에 작성한 칼럼 목록입니다:

${columnSummaries}

위 칼럼들의 주제와 스타일을 참고해서, 오늘 작성하면 좋을 칼럼 주제 3개를 추천해주세요.

각 주제마다:
- 제목 (클릭하고 싶은 매력적인 제목)
- 핵심 논점 (2-3줄)
- 왜 지금 이 주제인지 (시의성)
- 타겟 독자

JSON 형식으로 응답해주세요:
[{"title": "...", "keyPoints": "...", "timeliness": "...", "targetAudience": "..."}]`
        }]
      });

      const text = response.content[0].text;
      // JSON 부분만 추출
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return { success: true, topics: JSON.parse(jsonMatch[0]) };
      }
      return { success: true, topics: [], rawText: text };
    } catch (err) {
      console.error('Topic suggestion error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 랜덤 핫 토픽 선택
  getRandomHotTopic() {
    return this.HOT_TOPICS[Math.floor(Math.random() * this.HOT_TOPICS.length)];
  }
};

module.exports = Researcher;
