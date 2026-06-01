// ========================================
// Cardnews Generator
// 워드프레스 칼럼 → BSN 스타일 카드뉴스 HTML (1장 + 9슬라이드)
// 템플릿: cardnews-21.html 의 비주얼 톤·구조를 학습
// ========================================

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 가장 최근에 만들어진 cardnews-N.html 을 템플릿으로 사용 (가장 최신 디자인 유지)
function pickLatestTemplate() {
  const dir = __dirname;
  const files = fs.readdirSync(dir)
    .filter(f => /^cardnews-\d+\.html$/.test(f) && !f.includes('-embed'))
    .map(f => ({
      name: f,
      num: parseInt(f.match(/cardnews-(\d+)\.html/)[1], 10),
      mtime: fs.statSync(path.join(dir, f)).mtime,
    }))
    .sort((a, b) => b.num - a.num);
  return files[0] ? path.join(dir, files[0].name) : null;
}

const CARDNEWS_SYSTEM = `당신은 빌사남(BSN)의 카드뉴스 디자이너입니다.
인스타그램·블로그에 올릴 단일 HTML 카드뉴스를 만듭니다.

[작성 원칙]
1. 제공된 템플릿 HTML 의 비주얼 톤(다크/크림 팔레트, 골드 액센트 #c9a96e, Noto Sans KR, 깊은 그림자, 셔플 레이아웃)을 그대로 흡수.
2. 카드 사이즈는 432×540px 고정. 가로로 흐르는 갤러리 레이아웃.
3. 표지 1장 + 본문 8~10장 + 마무리 1장 = 총 10~12장 카드.
4. 각 카드는 서로 다른 클래스로 디자인 (c1, c2, c3, ...). 색·레이아웃 변주.
5. 본문 카드는 빌사남 칼럼의 핵심 메시지를 카드 1장당 한 주제씩 깊이 있게.
6. 통계·수치·지역명·금액을 카드 안에 큼지막하게 표시.
7. 마지막 카드는 빌사남 채널 안내(@bsn__official, 빌사남TV) + CTA.
8. html2canvas 라이브러리로 각 카드를 PNG 다운로드 가능하게 (.dl-btn).
9. 상단 툴바: 텍스트 편집 토글(.btn-edit) + 전체 다운로드(.btn-dl-all).

[금지]
- 이모지(💡📊 등) 절대 사용 금지
- "여러분", "함께해요" 같은 친근형 멘트 금지
- 너무 많은 텍스트 (한 카드당 최대 60자 내외 권장)
- 주택·아파트·전세 관련 단어 금지 (상업용 빌딩 전문)

[기술 요구]
- 완성된 HTML 1장으로 출력 (head + body 다 포함)
- 외부 CSS 의존 없이 <style> 인라인
- 한글 폰트는 Google Fonts Noto Sans KR
- html2canvas CDN 포함
- 다운로드 버튼은 각 카드 아래 작게`;

async function generateCardnews({ title, content, summary, tags = [], idea }) {
  const templatePath = pickLatestTemplate();
  if (!templatePath) throw new Error('카드뉴스 템플릿(cardnews-*.html)을 찾을 수 없음');

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  // 토큰 절약을 위해 템플릿이 너무 크면 앞부분만 (스타일+첫 3장 정도가 핵심 톤)
  const templateForPrompt = templateHtml.length > 30000
    ? templateHtml.slice(0, 30000) + '\n\n<!-- ... 이하 생략, 위 톤·구조를 유지하여 새 카드 생성 -->'
    : templateHtml;

  const userMsg = `다음 빌사남 칼럼을 BSN 카드뉴스 HTML로 변환하세요.

[칼럼 제목]
${title}

[핵심 요약]
${summary || ''}

[칼럼 본문 (HTML 가능)]
${content.slice(0, 6000)}

[참고 — 주제 영감 / 핵심 사실]
${idea ? `- 후크: ${idea.hook_reason || ''}
- 앵글: ${idea.angle || ''}
- 핵심 사실: ${(idea.key_facts || []).join(' / ')}` : ''}

[태그]
${tags.join(', ')}

[참고 템플릿 — 이 디자인 톤·구조를 그대로 살릴 것]
\`\`\`html
${templateForPrompt}
\`\`\`

위 칼럼을 10~12장 카드로 압축. 표지 1장 + 본문 8~10장 + 마무리 1장.
완성된 HTML 1장만 출력 (마크다운 fence 없이, <!DOCTYPE html> 로 시작).`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',  // 균형 잡힌 속도·비용·디자인 품질
    max_tokens: 16000,
    system: CARDNEWS_SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  let html = response.content[0].text.trim();
  // 마크다운 fence 제거 (안전장치)
  html = html.replace(/^```html\s*\n?/, '').replace(/\n?```\s*$/, '');
  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<!doctype')) {
    // <html> 부터 시작하는 경우 대비
    const i = html.indexOf('<!');
    if (i > 0) html = html.slice(i);
  }
  return html;
}

module.exports = { generateCardnews, pickLatestTemplate };
