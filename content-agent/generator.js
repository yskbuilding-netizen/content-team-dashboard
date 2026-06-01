// ========================================
// Generator Module - Claude API 콘텐츠 생성
// ========================================

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const Researcher = require('./researcher');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COLUMNS_DIR = path.join(__dirname, 'columns');
const STYLE_GUIDE_PATH = path.join(COLUMNS_DIR, '스타일가이드.md');

const Generator = {
  // 스타일 가이드 읽기 (빠른 참조용)
  getStyleGuide() {
    if (fs.existsSync(STYLE_GUIDE_PATH)) {
      return fs.readFileSync(STYLE_GUIDE_PATH, 'utf-8');
    }
    return '';
  },

  // 저장된 칼럼 파일 목록 읽기
  getColumnFiles() {
    if (!fs.existsSync(COLUMNS_DIR)) {
      fs.mkdirSync(COLUMNS_DIR, { recursive: true });
      return [];
    }
    return fs.readdirSync(COLUMNS_DIR)
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .filter(f => f !== '스타일가이드.md') // 스타일 가이드는 별도 처리
      .map(f => path.join(COLUMNS_DIR, f));
  },

  // 칼럼 내용 읽기 (최근 N개, 큰 파일은 앞부분만)
  readColumns(maxCount = 5) {
    const files = this.getColumnFiles();
    const sorted = files
      .map(f => ({ path: f, mtime: fs.statSync(f).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, maxCount);

    return sorted.map(f => {
      const fullContent = fs.readFileSync(f.path, 'utf-8');
      // 큰 파일은 앞부분(8000자)만 사용하여 토큰 절약
      const content = fullContent.length > 8000
        ? fullContent.slice(0, 8000) + '\n\n... (이하 생략)'
        : fullContent;
      return { filename: path.basename(f.path), content };
    });
  },

  // 칼럼 요약 목록 생성 (주제 추천용)
  getColumnSummaries() {
    const columns = this.readColumns(10);
    return columns.map((c, i) =>
      `${i + 1}. [${c.filename}]\n${c.content.slice(0, 300)}...`
    ).join('\n\n');
  },

  // 플랫폼별 콘텐츠 포맷 설정
  PLATFORM_FORMATS: {
    wordpress: {
      name: '워드프레스',
      minLength: 1500,
      maxLength: 3000,
      format: 'HTML',
      style: `
- HTML 형식으로 작성 (h2, h3, p, ul, li, strong, blockquote 태그 사용)
- SEO를 고려한 소제목 구조 (h2 2-3개, h3 적절히)
- 핵심 문장은 <strong>으로 강조
- 통계나 인용은 <blockquote>로 처리
- 문단 사이 적절한 여백
- 마지막에 핵심 요약 또는 독자 질문으로 마무리`
    },
    blog: {
      name: '네이버블로그',
      minLength: 1000,
      maxLength: 2500,
      format: 'TEXT',
      style: `
- 친근하고 읽기 쉬운 문체
- 이모지 적절히 활용
- 소제목에 번호나 이모지 사용
- 핵심 내용 볼드(**) 처리
- 마지막에 공감/댓글 유도 문구`
    },
    threads: {
      name: '스레드',
      minLength: 100,
      maxLength: 500,
      format: 'TEXT',
      style: `
- 짧고 임팩트 있는 문장
- 핵심 수치 1-2개 포함
- 호기심 유발하는 첫 문장
- 해시태그 3-5개 (#부동산 #투자 등)
- 카드뉴스 스타일의 핵심 요약`
    },
    tistory: {
      name: '티스토리',
      minLength: 1500,
      maxLength: 3000,
      format: 'HTML',
      style: `
- HTML 형식으로 작성
- 깊이 있는 분석과 데이터 중심
- 표(table)를 활용한 비교 분석
- 목차 스타일의 소제목 구조
- SEO 최적화된 키워드 배치`
    }
  },

  // 콘텐츠 생성 메인 함수
  async generateContent(topic, platform = 'wordpress', customResearch = null) {
    const styleGuide = this.getStyleGuide();
    const columns = this.readColumns(3);
    const platformConfig = this.PLATFORM_FORMATS[platform] || this.PLATFORM_FORMATS.wordpress;

    // 스타일 가이드 + 칼럼 샘플로 문체 학습
    const columnSamples = columns.length > 0
      ? columns.map(c => `--- ${c.filename} ---\n${c.content}`).join('\n\n')
      : '';

    // 리서치 데이터 수집
    let researchData = customResearch;
    if (!researchData) {
      const research = await Researcher.researchTrend(topic);
      researchData = research.success ? research.research : '';
    }

    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `당신은 '빌사남(김윤수)'의 문체로 글을 쓰는 한국 부동산 전문 칼럼니스트입니다.

[스타일 가이드]
${styleGuide}

[칼럼 샘플 레퍼런스]
${columnSamples || '(스타일 가이드를 기반으로 작성)'}

[핵심 작성 규칙 — AI 느낌 완전 제거]
- 상업용 빌딩만. 주택·아파트·전세 절대 금지.
- 워드프레스/블로그/티스토리: "~예요", "~죠", "~거든요" 친근형
- 스레드/링크드인: "~다", "~한다" 단정형
- 절대 금지 표현: "~입니다", "~해보겠습니다", "~살펴보겠습니다", "분석해보자", "정리해드릴게요" (지나치게 격식)
- 절대 금지 표현 2: 이모지(💡📊🏢 등), "와우", "여러분", "친구들"
- 절대 금지 표현 3: "결국", "마지막으로", "오늘 우리는" 같은 진부한 연결어
- 권장 표현: "현장에서 보면", "필자가 만나본 분들 중", "실제로 ~한 케이스", "근데", "이게", "이런 경우"
- 도입부는 매번 다르게: 매번 같은 패턴 ("요즘 ~ 이슈가 있어요") 금지
- 구체 수치·지역·인물·금액 반드시 포함 (예: 강남, 성수, 한남, 압구정, 도산공원, 명동 / 평당 X억, 매수가 X억)
- 같은 단어 반복 회피 (한 단락 내 같은 단어 3번 이상 금지)
- 슬래시 소제목: / 소제목 / 형태 (워드프레스/티스토리)
- 글자수: ${platformConfig.minLength}~${platformConfig.maxLength}자
- 현재 날짜: ${new Date().toISOString().split('T')[0]}
- 빌사남(김윤수)이 직접 쓴 칼럼처럼. AI가 흉내 낸 게 아니라 본인 글로 읽혀야 함`,
        messages: [{
          role: 'user',
          content: `다음 주제로 ${platformConfig.name}용 칼럼을 작성해주세요.

📌 주제: ${topic}

📊 리서치 데이터:
${researchData || '(별도 리서치 데이터 없음 - 기존 지식 기반으로 작성)'}

📝 플랫폼 포맷 요구사항:
${platformConfig.style}

다음 구조로 응답해주세요:

[TITLE]
(칼럼 제목)

[CONTENT]
(본문 내용 - ${platformConfig.format} 형식)

[TAGS]
(이 글의 주제에 정확히 맞는 태그 7-10개, 쉼표로 구분.
- 매번 다른 글이므로 글 내용에 맞게 태그를 새로 뽑을 것
- 주제 키워드 + 지역명 + 전략/상품명 조합
- 예시: 주제가 '성수동 상권'이면 → 성수동,성수동빌딩,연무장길,성수상권,핫플레이스,빌딩투자,상권분석
- 예시: 주제가 '금리 인하'면 → 금리인하,빌딩대출,꼬마빌딩,담보대출,2026년금리,빌딩투자타이밍
- '빌딩투자', '빌사남' 같은 범용 태그는 1-2개만 포함)

[SUMMARY]
(2-3줄 요약 - SNS 공유용)`
        }]
      });

      const text = response.content[0].text;

      // 파싱
      const titleMatch = text.match(/\[TITLE\]\s*\n([\s\S]*?)\n\[CONTENT\]/);
      const contentMatch = text.match(/\[CONTENT\]\s*\n([\s\S]*?)\n\[TAGS\]/);
      const tagsMatch = text.match(/\[TAGS\]\s*\n([\s\S]*?)\n\[SUMMARY\]/);
      const summaryMatch = text.match(/\[SUMMARY\]\s*\n([\s\S]*?)$/);

      return {
        success: true,
        title: titleMatch ? titleMatch[1].trim() : topic,
        content: contentMatch ? contentMatch[1].trim() : text,
        tags: tagsMatch ? tagsMatch[1].trim().split(/[,，]\s*/) : [],
        summary: summaryMatch ? summaryMatch[1].trim() : '',
        platform,
        topic,
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('Generate error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 생성된 콘텐츠를 임시 파일로 저장
  saveDraft(content) {
    const draftsDir = path.join(__dirname, 'drafts');
    if (!fs.existsSync(draftsDir)) fs.mkdirSync(draftsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `draft_${dateStr}_${content.platform}.json`;
    const filepath = path.join(draftsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(content, null, 2), 'utf-8');
    return filepath;
  },

  // 최신 드래프트 불러오기
  getLatestDraft(platform = 'wordpress') {
    const draftsDir = path.join(__dirname, 'drafts');
    if (!fs.existsSync(draftsDir)) return null;

    const files = fs.readdirSync(draftsDir)
      .filter(f => f.includes(platform) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    return JSON.parse(fs.readFileSync(path.join(draftsDir, files[0]), 'utf-8'));
  }
};

module.exports = Generator;
