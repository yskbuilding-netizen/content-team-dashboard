// ========================================
// YouTube Module - 영상 대본/제목/설명/태그/쇼츠 자동 생성
// ========================================

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REFERENCES_DIR = path.join(__dirname, 'references');
const COLUMNS_DIR = path.join(__dirname, 'columns');
const STYLE_GUIDE_PATH = path.join(COLUMNS_DIR, '스타일가이드.md');

const YouTube = {
  // 참고자료 폴더에서 자료 읽기
  getReferences(maxCount = 5) {
    if (!fs.existsSync(REFERENCES_DIR)) {
      fs.mkdirSync(REFERENCES_DIR, { recursive: true });
      return '';
    }
    const files = fs.readdirSync(REFERENCES_DIR)
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .filter(f => f !== 'README.txt')
      .map(f => ({ path: path.join(REFERENCES_DIR, f), mtime: fs.statSync(path.join(REFERENCES_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, maxCount);

    if (files.length === 0) return '';

    return files.map(f => {
      const content = fs.readFileSync(f.path, 'utf-8');
      const trimmed = content.length > 5000 ? content.slice(0, 5000) + '\n...(이하 생략)' : content;
      return `--- ${path.basename(f.path)} ---\n${trimmed}`;
    }).join('\n\n');
  },

  // 스타일 가이드 읽기
  getStyleGuide() {
    if (fs.existsSync(STYLE_GUIDE_PATH)) {
      return fs.readFileSync(STYLE_GUIDE_PATH, 'utf-8');
    }
    return '';
  },

  // 유튜브 영상 전체 패키지 생성
  async generatePackage(topic) {
    const styleGuide = this.getStyleGuide();
    const references = this.getReferences();

    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: `당신은 빌사남(김윤수)의 유튜브 영상 대본 작가입니다.
상업용 빌딩 투자 전문 유튜브 채널 '빌사남 TV'의 영상 대본을 작성합니다.

[빌사남 스타일 가이드]
${styleGuide || '상업용 빌딩 전문가. 담백하고 자연스러운 톤. AI 티 절대 금지.'}

[참고자료]
${references || '(참고자료 없음 - 기존 지식 기반으로 작성)'}

[대본 작성 원칙]
- 카메라 앞에서 직접 말하는 톤. 강의가 아니라 대화하듯.
- "~거든요", "~잖아요", "~예요" 같은 자연스러운 말투.
- 과한 존댓말이나 격식체 금지. 편하게 말하는 느낌.
- 구체적 사례, 숫자, 지역명 반드시 포함.
- AI가 쓴 느낌 절대 안 나게. 실제 유튜버가 말하는 것처럼.
- 주택/아파트 이야기 최대한 배제. 상업용 빌딩에 집중.
- "~에 대해 알아보겠습니다" 같은 AI 클리셰 금지.
- 인트로에서 바로 훅. 뜸 들이지 않기.
- 현재 날짜: ${new Date().toISOString().split('T')[0]}`,
        messages: [{
          role: 'user',
          content: `주제: ${topic}

아래 형식으로 유튜브 영상 전체 패키지를 작성해주세요.

[TITLES]
클릭률 높은 제목 3개 (각 줄에 하나씩)

[SCRIPT]
7~10분 분량 대본
- 타임스탬프를 [0:00], [0:30] 형태로 포함
- 인트로(30초) → 본론(3~4개 섹션) → 아웃트로(30초)
- 카메라 앞에서 말하는 것처럼 자연스럽게

[DESCRIPTION]
유튜브 설명란 (타임스탬프 + 링크 + 소개)

[TAGS]
SEO 최적화 태그 20~25개 (쉼표로 구분)

[THUMBNAIL]
썸네일 텍스트 추천 (메인 텍스트 + 서브 텍스트)

[SHORTS]
60초 쇼츠 대본 (본편에서 가장 임팩트 있는 부분 추출)

각 섹션은 반드시 [TITLES], [SCRIPT] 등의 태그로 시작해주세요.`
        }]
      });

      const text = response.content[0].text;

      // 파싱
      const parse = (tag1, tag2) => {
        const regex = new RegExp(`\\[${tag1}\\]\\s*\\n([\\s\\S]*?)(?:\\[${tag2}\\]|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      return {
        success: true,
        topic,
        titles: parse('TITLES', 'SCRIPT'),
        script: parse('SCRIPT', 'DESCRIPTION'),
        description: parse('DESCRIPTION', 'TAGS'),
        tags: parse('TAGS', 'THUMBNAIL'),
        thumbnail: parse('THUMBNAIL', 'SHORTS'),
        shorts: parse('SHORTS', '____END'),
        generatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('YouTube 생성 에러:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 생성된 패키지를 파일로 저장
  savePackage(pkg) {
    const draftsDir = path.join(__dirname, 'drafts');
    if (!fs.existsSync(draftsDir)) fs.mkdirSync(draftsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `youtube_${dateStr}_${pkg.topic.slice(0, 20).replace(/[^\w가-힣]/g, '_')}.json`;
    const filepath = path.join(draftsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(pkg, null, 2), 'utf-8');
    return filepath;
  }
};

module.exports = YouTube;
