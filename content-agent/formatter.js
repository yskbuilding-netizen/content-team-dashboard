// ========================================
// Formatter Module - 플랫폼별 포맷 변환
// 하나의 원본 칼럼 → 워드프레스/티스토리/네이버블로그/스레드용으로 변환
// ========================================

const Anthropic = require('@anthropic-ai/sdk');
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Formatter = {
  // HTML 태그 제거
  stripHtml(html) {
    return html
      .replace(/<h2[^>]*>/g, '\n\n■ ')
      .replace(/<\/h2>/g, '\n')
      .replace(/<h3[^>]*>/g, '\n\n▶ ')
      .replace(/<\/h3>/g, '\n')
      .replace(/<strong>/g, '')
      .replace(/<\/strong>/g, '')
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  // 티스토리용 포맷 (HTML 기반, 이모지로 시각적 강조)
  toTistory(article) {
    let content = article.content;
    // h2에 이모지 추가
    content = content.replace(/<h2>/g, '<h2>📌 ');
    // strong에 색상 강조 (티스토리는 인라인 스타일 허용)
    content = content.replace(
      /<strong>/g,
      '<strong style="color:#2c5aa0;">'
    );
    // 서두에 요약 박스 추가
    const summaryBox = `<blockquote style="background:#f5f5f5;padding:16px;border-left:4px solid #2c5aa0;margin-bottom:24px;"><strong>핵심 요약</strong><br>${article.summary || ''}</blockquote>\n`;
    return summaryBox + content;
  },

  // 네이버 블로그용 포맷 (이모지 친화적, 짧은 문단, 이모지 소제목)
  async toNaverBlog(article) {
    // Claude로 네이버 블로그 스타일에 맞게 재작성
    const rawText = this.stripHtml(article.content);
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: `당신은 빌사남(김윤수) 스타일로 네이버 블로그 글을 쓰는 칼럼니스트입니다.
원본 내용을 네이버 블로그에 최적화된 형식으로 재구성합니다.

[네이버 블로그 특징]
- 짧은 문단 (2-3줄마다 줄바꿈)
- 이모지로 포인트 강조 (과하지 않게)
- 소제목은 🏢 💰 📊 같은 이모지로 시작
- 친근한 톤이지만 전문성 유지
- 핵심 문장은 '✔️' 또는 '💡'로 표시
- 마지막에 "더 자세한 내용은 댓글/메시지로 문의주세요" 같은 소통 유도`,
        messages: [{
          role: 'user',
          content: `다음 칼럼을 네이버 블로그용으로 재구성해주세요. 내용은 그대로 유지하되 형식만 블로그 스타일로 바꿔주세요.

제목: ${article.title}

${rawText}`
        }]
      });
      return response.content[0].text;
    } catch (err) {
      console.error('네이버 포맷 변환 에러:', err.message);
      return rawText; // 실패시 원본 텍스트
    }
  },

  // 스레드용 포맷 (짧고 임팩트, 가독성 극대화)
  async toThreads(article) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `당신은 스레드 콘텐츠 전문가입니다. 빌사남(상업용 빌딩 전문가)의 긴 칼럼에서 핵심만 뽑아 스레드에 최적화된 짧은 글을 작성합니다.

[스레드 최적화 원칙]
1. 글자수: 450~500자 (꽉 채워서 작성, 500자 초과 금지)
2. 첫 줄이 전부다:
   - 단언 ("건물주 시대는 끝났다.")
   - 질문형 ("지금이 매입 타이밍일까?")
   - 상황 제시 ("시장이 다시 움직이고 있다.")
3. 구조: 훅 → 시장 변화 → 인사이트 → 결론 → 해시태그
4. 가독성 규칙:
   - 한 문장 = 한 줄
   - 문장 사이 빈 줄로 호흡
   - 문장은 15~25자 내외
   - 여러 인사이트를 자연스럽게 이어가기
5. 어조:
   - "~다" 종결 (~입니다 금지)
   - 담백하고 간결하게
   - AI 티 전혀 없이, 사람이 툭 쓴 것처럼
6. 이모지: 사용 금지
7. 해시태그: 절대 사용 금지 (자연스러운 개인 글처럼 보이도록)

[숫자 사용 주의 - 중요]
- 구체적 금리 수치 쓰지 말 것 ("3%", "7%" 같은 표현 금지)
- 이자 차액 금액 쓰지 말 것 ("1억 2천" 같은 표현 금지)
- "금리 대비 절반 수준", "이자 부담이 줄었다" 같은 직접적 금리 비교도 빼기
- 수치가 꼭 필요한 곳만 제한적으로 (연도, 지역 정도)

[대출 관련 내용 강조 - 중요]
빌딩 투자에서 대출은 핵심이다. 다음과 같은 실전 인사이트를 담을 것:
- 은행별 조건 차이 (세 곳 이상 비교해야 함)
- 연초가 대출 한도가 가장 유리한 시기
- 법인 명의 대출이 개인보다 유리한 경우
- 주거래은행만 믿으면 안 됨
- 대출 상담은 지점장급과 직접 하는 게 빠름
- 사전에 신용 관리, 재무 정리 필수
- 무리한 대출은 공실 리스크로 이어짐
- 감당 가능한 한도 안에서 받아야 함

[좋은 예시]
시장이 다시 움직이고 있다.

관망하던 투자자들이 다시 매물을 보기 시작했다.
같은 건물이라도 타이밍이 수익을 결정한다.

빌딩 매입은 결국 대출 싸움이다.
주거래은행만 믿으면 안 된다.
세 곳 이상 비교해야 한 달치 이자가 달라진다.

연초가 가장 유리하다.
은행마다 한도 배정이 새로 시작되는 시점이다.
법인으로 매입한다면 조건이 더 좋아질 수 있다.

중요한 건 많이 빌리는 게 아니다.
감당 가능한 한도 안에서 받아야 한다.

기회는 준비된 사람에게만 보인다.

#빌딩투자 #꼬마빌딩 #빌딩대출 #상업용부동산 #빌딩매입

[나쁜 예시 - 절대 이렇게 쓰지 말 것]
- "금리가 3%대로 내려왔다" (구체적 수치 금지)
- "3년 전 대비 절반 수준" (금리 직접 비교 금지)
- "이자 부담이 줄었다" (금리 관련 직접 언급 금지)
- "안녕하세요 여러분~" (AI 톤 금지)`,
        messages: [{
          role: 'user',
          content: `아래 칼럼의 핵심만 스레드용으로 뽑아주세요.

제목: ${article.title}

${this.stripHtml(article.content)}

요약: ${article.summary || ''}

위 내용을 바탕으로 450~500자 스레드를 작성하세요.
- 구체적 금리 수치(%), 이자 금액, "금리 대비 절반 수준" 같은 금리 비교 표현은 빼세요
- 대신 대출 관련 실전 인사이트를 풍부하게 담으세요 (은행 비교, 연초 타이밍, 법인 매입, 감당 가능한 한도 등)
- 본문만 응답 (제목/설명 없이 바로 스레드 본문)`
        }]
      });
      return response.content[0].text.trim();
    } catch (err) {
      console.error('스레드 포맷 변환 에러:', err.message);
      return `${article.title}\n\n${article.summary || ''}\n\n#빌딩투자 #꼬마빌딩 #상업용부동산`;
    }
  },

  // 링크드인용 포맷 (비즈니스 톤, 1500-2500자, 인사이트 중심)
  async toLinkedIn(article) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system: `당신은 빌사남(상업용 빌딩 투자 전문가)의 링크드인 콘텐츠 작가입니다.
긴 블로그 칼럼을 링크드인에 최적화된 비즈니스 포스트로 재구성합니다.

[링크드인 최적화 원칙]
1. 글자수: 1500~2500자 (링크드인 알고리즘상 긴 글 선호)
2. 첫 3줄이 전부다 (더보기 전까지):
   - 강력한 통찰 또는 질문으로 시작
   - 짧고 명확하게
   - 계속 읽고 싶게 만드는 훅
3. 구조:
   - 훅 (3줄 이내)
   - 짧은 여백 (줄바꿈)
   - 핵심 인사이트 (불릿 리스트 또는 번호)
   - 실전 조언
   - 마무리 (행동 유도 또는 질문)
   - 해시태그
4. 톤:
   - 비즈니스 프로페셔널 (블로그보다 정제된 톤)
   - "~다" 종결 유지 (~입니다 금지)
   - 전문성 + 실무 경험 강조
   - AI 티 전혀 없이
5. 포맷:
   - 짧은 문단 (2~3줄)
   - 문단 사이 빈 줄로 호흡
   - 핵심 문장은 줄 단독으로
   - 이모지는 불릿용으로만 제한적 사용 (▪️ ✔ → 등)
6. 해시태그: 절대 사용 금지 (자연스러운 글로 보이도록)

[좋은 예시 구조]
시장이 다시 움직이고 있다.

관망하던 투자자들이 매물을 다시 보기 시작했다.
하지만 지금 서두르면 안 된다.

[본문 - 3~4개 인사이트 섹션]

▪️ 왜 지금이 준비의 시기인가
...

▪️ 빌딩 매입 전 반드시 확인할 3가지
...

결국 준비된 사람에게만 기회가 보인다.

여러분은 어떤 준비를 하고 계신가요?

#상업용부동산 #빌딩투자 #꼬마빌딩 #부동산투자 #BSN`,
        messages: [{
          role: 'user',
          content: `아래 칼럼을 링크드인용으로 재구성해주세요.

제목: ${article.title}

${this.stripHtml(article.content)}

1500~2500자로, 비즈니스 프로페셔널 톤으로 작성하세요.
본문만 응답 (제목/설명 없이 바로 본문).`
        }]
      });
      return response.content[0].text.trim();
    } catch (err) {
      console.error('링크드인 포맷 변환 에러:', err.message);
      return `${article.title}\n\n${this.stripHtml(article.content).slice(0, 2000)}\n\n#상업용부동산 #빌딩투자 #꼬마빌딩`;
    }
  },

  // 카드뉴스 텍스트 생성 (8장 슬라이드)
  async toCardNews(article) {
    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: `당신은 빌사남(상업용 빌딩 투자 전문가)의 카드뉴스 작가입니다.
긴 칼럼을 8장짜리 카드뉴스 텍스트로 변환합니다.

[카드뉴스 원칙]
1. 총 8장 구성
2. 1장: 표지 (제목 + 부제 + 빌사남)
3. 2~7장: 핵심 내용 (장당 3~5줄, 짧은 문장)
4. 8장: 마무리 + "저장해두고 나중에 다시 보세요" + 빌사남 정보
5. 톤: 사람이 얘기하듯 자연스럽게. AI 티 절대 안 나게.
6. 한 장에 하나의 핵심만.
7. "~다" 체 유지. 과한 이모지 금지.
8. 숫자나 비교가 있으면 크게 강조.
9. 각 장에 어울리는 배경 이미지 키워드도 추천 (Unsplash 검색어).

[출력 형식]
---1장---
(표지 텍스트)
이미지: (Unsplash 검색 키워드)

---2장---
(본문)
이미지: (키워드)

... 8장까지`,
        messages: [{
          role: 'user',
          content: `아래 칼럼을 8장 카드뉴스로 변환해주세요.

제목: ${article.title}

${this.stripHtml(article.content)}

자연스럽고 가독성 좋게, 사람이 얘기하듯 써주세요.`
        }]
      });
      return response.content[0].text.trim();
    } catch (err) {
      console.error('카드뉴스 포맷 변환 에러:', err.message);
      return `카드뉴스 생성 실패: ${err.message}`;
    }
  },

  // 모든 플랫폼 포맷을 한번에 생성
  async generateAllFormats(article) {
    console.log('  🔄 네이버 블로그 포맷 생성...');
    const naver = await this.toNaverBlog(article);

    console.log('  🔄 스레드 포맷 생성...');
    const threads = await this.toThreads(article);

    console.log('  🔄 링크드인 포맷 생성...');
    const linkedin = await this.toLinkedIn(article);

    console.log('  🔄 티스토리 포맷 생성...');
    const tistory = this.toTistory(article);

    console.log('  🔄 카드뉴스 텍스트 생성...');
    const cardnews = await this.toCardNews(article);

    return {
      wordpress: article.content,
      tistory,
      naver,
      threads,
      linkedin,
      cardnews
    };
  }
};

module.exports = Formatter;
