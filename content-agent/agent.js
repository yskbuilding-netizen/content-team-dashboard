// ========================================
// 빌사남 콘텐츠 에이전트
// 텔레그램으로 초안 검토 → 승인 후 워드프레스 발행
// ========================================

// 로컬: 상위 폴더 .env 로드 / Railway: 환경변수 직접 사용
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
require('dotenv').config(); // 같은 폴더에 있으면 로드 (Railway)

const Generator = require('./generator');
const Publisher = require('./publisher');
const Researcher = require('./researcher');
const Formatter = require('./formatter');
const Threads = require('./threads');
const LinkedIn = require('./linkedin');
const YouTube = require('./youtube');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN이 .env에 없습니다!');
  console.error('   .env 경로:', require('path').join(__dirname, '..', '..', '.env'));
  process.exit(1);
}
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// 사용자별 상태 관리
const userStates = new Map();

// ── 텔레그램 메시지 전송 ──
async function sendMessage(chatId, text, options = {}) {
  const maxLen = 4000;
  const parseMode = options.parseMode || '';
  const replyMarkup = options.replyMarkup || null;

  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt === -1) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  for (let i = 0; i < chunks.length; i++) {
    const body = {
      chat_id: chatId,
      text: chunks[i]
    };
    if (parseMode) body.parse_mode = parseMode;
    // 인라인 키보드는 마지막 청크에만
    if (replyMarkup && i === chunks.length - 1) {
      body.reply_markup = JSON.stringify(replyMarkup);
    }

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
}

async function sendTyping(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
  });
}

// ── 콜백 쿼리 응답 ──
async function answerCallback(callbackQueryId, text = '') {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

// ── 명령어 핸들러 ──

async function handleStart(chatId) {
  await sendMessage(chatId, `📝 빌사남 콘텐츠 에이전트

📌 콘텐츠 생성:
/글생성 [주제] - 주제로 칼럼 초안 생성
/추천 - 오늘의 추천 주제 3개
/리서치 [주제] - 부동산 트렌드 리서치

📤 발행:
/발행 - 워드프레스에 임시저장
/발행확정 - 공개 발행
/전체포맷 - 6개 플랫폼 포맷 (카드뉴스 포함)
/스레드발행 - 스레드 자동 발행
/링크드인발행 - 링크드인 자동 발행
/최근글 - 워드프레스 최근 글 목록

🎬 유튜브:
/유튜브 [주제] - 대본+제목+설명+태그+쇼츠 한번에

🔄 자동 발행:
/자동발행 - 매일 오전 자동 콘텐츠 생성 켜기
/자동발행 끄기 - 자동 생성 중지
/지금생성 - 오늘의 주제로 즉시 생성

📚 설정:
/칼럼목록 - 저장된 레퍼런스 칼럼 목록
/도움말 - 전체 명령어 안내

💡 사용법:
1. /자동발행 → 매일 오전 자동으로 초안 생성
2. 텔레그램에서 초안 확인
3. 승인 버튼 클릭 → 워드프레스 발행`);
}

async function handleGenerateContent(chatId, topic) {
  if (!topic) {
    await sendMessage(chatId, '📝 주제를 입력해주세요.\n예: /글생성 2025년 서울 아파트 시장 전망');
    return;
  }

  await sendMessage(chatId, `⏳ "${topic}" 주제로 칼럼을 생성 중입니다...\n\n1️⃣ 리서치 수행 중...`);
  await sendTyping(chatId);

  // 리서치 수행
  const research = await Researcher.researchTrend(topic);

  await sendMessage(chatId, '2️⃣ 리서치 완료! 칼럼 작성 중...');
  await sendTyping(chatId);

  // 콘텐츠 생성
  const result = await Generator.generateContent(
    topic,
    'wordpress',
    research.success ? research.research : null
  );

  if (!result.success) {
    await sendMessage(chatId, `❌ 생성 실패: ${result.error}`);
    return;
  }

  // 드래프트 저장
  const draftPath = Generator.saveDraft(result);

  // 사용자 상태에 현재 드래프트 저장
  userStates.set(chatId, { lastDraft: result, draftPath });

  // 미리보기 전송
  const preview = `✅ 칼럼 초안이 생성되었습니다!

📌 제목: ${result.title}

📝 본문 미리보기:
${stripHtml(result.content).slice(0, 500)}...

🏷️ 태그: ${result.tags.join(', ')}

📋 요약: ${result.summary}

---
아래 버튼으로 다음 액션을 선택하세요.`;

  await sendMessage(chatId, preview, {
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '📄 전문 보기', callback_data: 'view_full' },
          { text: '🔄 다시 생성', callback_data: `regenerate:${topic}` }
        ],
        [
          { text: '✅ 워드프레스 발행', callback_data: 'publish_wp' },
          { text: '❌ 취소', callback_data: 'cancel' }
        ]
      ]
    }
  });
}

async function handleSuggestTopics(chatId) {
  await sendMessage(chatId, '🔍 기존 칼럼을 분석하여 오늘의 추천 주제를 생성 중...');
  await sendTyping(chatId);

  const summaries = Generator.getColumnSummaries();

  if (!summaries || summaries.length < 10) {
    // 칼럼이 없으면 기본 추천
    await sendMessage(chatId, `📋 저장된 칼럼이 부족합니다.
columns/ 폴더에 기존 칼럼 텍스트 파일을 넣어주세요.

그 대신 오늘의 부동산 핫토픽을 추천합니다:

1️⃣ ${Researcher.getRandomHotTopic()}
2️⃣ ${Researcher.getRandomHotTopic()}
3️⃣ ${Researcher.getRandomHotTopic()}

/글생성 [주제] 로 선택하세요!`);
    return;
  }

  const result = await Researcher.suggestTopics(summaries);

  if (!result.success || !result.topics || result.topics.length === 0) {
    await sendMessage(chatId, `❌ 주제 추천 실패. 직접 주제를 입력해주세요.\n/글생성 [주제]`);
    return;
  }

  let msg = '📋 오늘의 추천 주제:\n\n';
  result.topics.forEach((t, i) => {
    msg += `${i + 1}️⃣ ${t.title}\n`;
    msg += `   💡 ${t.keyPoints}\n`;
    msg += `   ⏰ ${t.timeliness}\n`;
    msg += `   🎯 ${t.targetAudience}\n\n`;
  });
  msg += '원하는 주제로 /글생성 [주제] 를 실행하세요!';

  await sendMessage(chatId, msg);
}

async function handleResearch(chatId, topic) {
  if (!topic) {
    await sendMessage(chatId, '🔍 리서치할 주제를 입력해주세요.\n예: /리서치 GTX 노선 수혜 지역');
    return;
  }

  await sendMessage(chatId, `🔍 "${topic}" 리서치 중...`);
  await sendTyping(chatId);

  const result = await Researcher.researchTrend(topic);

  if (!result.success) {
    await sendMessage(chatId, `❌ 리서치 실패: ${result.error}`);
    return;
  }

  await sendMessage(chatId, `📊 리서치 결과: ${topic}\n\n${result.research}`);
}

async function handlePublish(chatId) {
  const state = userStates.get(chatId);

  if (!state || !state.lastDraft) {
    // 파일에서 최신 드래프트 찾기
    const draft = Generator.getLatestDraft('wordpress');
    if (!draft) {
      await sendMessage(chatId, '📭 발행할 초안이 없습니다.\n/글생성 [주제] 로 먼저 초안을 만들어주세요.');
      return;
    }
    userStates.set(chatId, { ...(state || {}), lastDraft: draft });
    await doPublish(chatId, draft);
    return;
  }

  await doPublish(chatId, state.lastDraft);
}

async function doPublish(chatId, draft) {
  await sendMessage(chatId, `📤 워드프레스에 업로드 중...\n제목: ${draft.title}`);
  await sendTyping(chatId);

  const result = await Publisher.publishToWordPress(draft);

  if (!result.success) {
    await sendMessage(chatId, `❌ 발행 실패: ${result.error}`);
    return;
  }

  // 상태에 postId 저장
  const state = userStates.get(chatId) || {};
  state.lastPostId = result.postId;
  userStates.set(chatId, state);

  await sendMessage(chatId, `✅ 워드프레스에 임시저장되었습니다!

📌 제목: ${draft.title}
🔗 미리보기: ${result.postUrl}
✏️ 편집: ${result.editUrl}
📊 상태: 임시저장 (draft)

워드프레스에서 확인 후 /발행확정 을 입력하면 공개 발행됩니다.`, {
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '🌐 공개 발행하기', callback_data: `confirm_publish:${result.postId}` },
          { text: '📝 편집 페이지', url: result.editUrl }
        ]
      ]
    }
  });
}

async function handleConfirmPublish(chatId, postId) {
  if (!postId) {
    const state = userStates.get(chatId);
    postId = state?.lastPostId;
  }

  if (!postId) {
    await sendMessage(chatId, '❌ 발행할 글이 없습니다. /발행 을 먼저 실행해주세요.');
    return;
  }

  await sendMessage(chatId, '🚀 공개 발행 중...');
  const result = await Publisher.publishDraft(postId);

  if (!result.success) {
    await sendMessage(chatId, `❌ 발행 실패: ${result.error}`);
    return;
  }

  await sendMessage(chatId, `🎉 공개 발행 완료!

🔗 ${result.postUrl}

오늘의 콘텐츠가 성공적으로 발행되었습니다!`);
}

async function handleRecentPosts(chatId) {
  await sendTyping(chatId);
  const posts = await Publisher.getRecentPosts(5);

  if (posts.error) {
    await sendMessage(chatId, `❌ 조회 실패: ${posts.error}`);
    return;
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    await sendMessage(chatId, '📭 최근 발행된 글이 없습니다.');
    return;
  }

  let msg = '📋 워드프레스 최근 글:\n\n';
  posts.forEach((p, i) => {
    const status = p.status === 'publish' ? '🟢 공개' : '🟡 임시저장';
    const date = new Date(p.date).toLocaleDateString('ko-KR');
    msg += `${i + 1}. ${status} ${p.title}\n   📅 ${date}\n   🔗 ${p.url}\n\n`;
  });

  await sendMessage(chatId, msg);
}

// 모든 플랫폼용 포맷을 텔레그램으로 전송 (복붙용)
async function handleAllFormats(chatId) {
  const state = userStates.get(chatId);
  const article = state?.lastDraft || Generator.getLatestDraft('wordpress');

  if (!article) {
    await sendMessage(chatId, '📭 변환할 초안이 없습니다. /글생성 [주제] 로 먼저 생성해주세요.');
    return;
  }

  await sendMessage(chatId, `🔄 4개 플랫폼용 포맷 생성 중...\n\n📌 제목: ${article.title}\n\n잠시만 기다려주세요 (30~60초)`);
  await sendTyping(chatId);

  const formats = await Formatter.generateAllFormats(article);

  // 상태에 저장
  state && (state.allFormats = formats);
  userStates.set(chatId, state || { lastDraft: article, allFormats: formats });

  // 1. 티스토리용 (복붙용)
  await sendMessage(chatId, `📋 [티스토리용] HTML 포맷\n━━━━━━━━━━━━━━━━━━\n아래 내용을 복사해서 티스토리 글쓰기 'HTML' 모드에 붙여넣으세요.`);
  await sendMessage(chatId, `제목: ${article.title}\n\n${formats.tistory}`);

  // 2. 네이버 블로그용
  await sendMessage(chatId, `📋 [네이버 블로그용] 텍스트 포맷\n━━━━━━━━━━━━━━━━━━\n아래 내용을 복사해서 네이버 블로그에 붙여넣으세요.`);
  await sendMessage(chatId, `제목: ${article.title}\n\n${formats.naver}`);

  // 3. 스레드용 (500자 압축)
  await sendMessage(chatId, `📋 [스레드용] 500자 압축\n━━━━━━━━━━━━━━━━━━`);
  await sendMessage(chatId, formats.threads, {
    replyMarkup: {
      inline_keyboard: Threads.isConfigured()
        ? [[{ text: '🚀 스레드 자동 발행', callback_data: 'publish_threads' }]]
        : [[{ text: '⚠️ 스레드 API 미설정 (복붙하세요)', callback_data: 'cancel' }]]
    }
  });

  // 4. 링크드인용 (비즈니스 톤)
  await sendMessage(chatId, `📋 [링크드인용] 비즈니스 포스트\n━━━━━━━━━━━━━━━━━━`);
  await sendMessage(chatId, formats.linkedin, {
    replyMarkup: {
      inline_keyboard: LinkedIn.isConfigured()
        ? [[{ text: '🚀 링크드인 자동 발행', callback_data: 'publish_linkedin' }]]
        : [[{ text: '⚠️ 링크드인 API 미설정 (복붙하세요)', callback_data: 'cancel' }]]
    }
  });

  // 5. 카드뉴스 텍스트
  await sendMessage(chatId, `📋 [카드뉴스] 8장 슬라이드 텍스트\n━━━━━━━━━━━━━━━━━━\nCanva/미리캔버스에서 아래 텍스트로 카드뉴스를 만드세요.`);
  await sendMessage(chatId, formats.cardnews);

  await sendMessage(chatId, `✅ 모든 포맷 생성 완료!

📌 발행 방법:
• 워드프레스: /발행 명령어 (자동)
• 스레드: ${Threads.isConfigured() ? '위 버튼 클릭 (자동)' : '위 내용 복붙'}
• 링크드인: ${LinkedIn.isConfigured() ? '위 버튼 클릭 (자동)' : '위 내용 복붙'}
• 티스토리: 위 HTML 복붙
• 네이버 블로그: 위 텍스트 복붙
• 카드뉴스: 위 텍스트로 Canva/미리캔버스 제작`);
}

async function handlePublishLinkedIn(chatId) {
  const state = userStates.get(chatId);
  const linkedinText = state?.allFormats?.linkedin;

  if (!linkedinText) {
    await sendMessage(chatId, '❌ 발행할 링크드인 내용이 없습니다. /전체포맷 을 먼저 실행해주세요.');
    return;
  }

  if (!LinkedIn.isConfigured()) {
    await sendMessage(chatId, `⚠️ 링크드인 API가 설정되지 않았습니다.

.env 파일에 다음을 추가해주세요:
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_USER_ID=...

설정 방법은 https://www.linkedin.com/developers/apps 에서 앱 생성 후 확인 가능합니다.`);
    return;
  }

  await sendMessage(chatId, '🚀 링크드인에 발행 중...');
  const result = await LinkedIn.publish(linkedinText);

  if (!result.success) {
    await sendMessage(chatId, `❌ 링크드인 발행 실패: ${result.error}`);
    return;
  }

  await sendMessage(chatId, `✅ 링크드인 발행 완료!\n\n🔗 ${result.url || '링크드인에서 확인하세요'}`);
}

async function handlePublishThreads(chatId) {
  const state = userStates.get(chatId);
  const threadsText = state?.allFormats?.threads;

  if (!threadsText) {
    await sendMessage(chatId, '❌ 발행할 스레드 내용이 없습니다. /전체포맷 을 먼저 실행해주세요.');
    return;
  }

  if (!Threads.isConfigured()) {
    await sendMessage(chatId, `⚠️ 스레드 API가 설정되지 않았습니다.

.env 파일에 다음을 추가해주세요:
THREADS_USER_ID=...
THREADS_ACCESS_TOKEN=...

설정 방법은 https://developers.facebook.com 에서 앱 생성 후 확인 가능합니다.`);
    return;
  }

  await sendMessage(chatId, '🚀 스레드에 발행 중...');
  const result = await Threads.publish(threadsText);

  if (!result.success) {
    await sendMessage(chatId, `❌ 스레드 발행 실패: ${result.error}`);
    return;
  }

  await sendMessage(chatId, `✅ 스레드 발행 완료!\n\n🔗 ${result.url || '스레드 앱에서 확인하세요'}`);
}

// 유튜브 영상 패키지 생성
async function handleYouTube(chatId, topic) {
  if (!topic) {
    await sendMessage(chatId, '🎬 유튜브 주제를 입력해주세요.\n예: /유튜브 지금 빌딩 사도 될까');
    return;
  }

  await sendMessage(chatId, `🎬 유튜브 영상 패키지 생성 중...\n\n📌 주제: ${topic}\n\n대본 + 제목 + 설명 + 태그 + 썸네일 + 쇼츠\n약 1~2분 소요`);
  await sendTyping(chatId);

  const result = await YouTube.generatePackage(topic);

  if (!result.success) {
    await sendMessage(chatId, `❌ 생성 실패: ${result.error}`);
    return;
  }

  YouTube.savePackage(result);

  // 1. 제목 추천
  await sendMessage(chatId, `🎬 [제목 추천]\n━━━━━━━━━━━━━━━━━━\n${result.titles}`);

  // 2. 대본
  await sendMessage(chatId, `📝 [영상 대본]\n━━━━━━━━━━━━━━━━━━`);
  // 대본이 길어서 분할 전송
  const scriptParts = result.script.match(/[\s\S]{1,3500}/g) || [result.script];
  for (const part of scriptParts) {
    await sendMessage(chatId, part);
  }

  // 3. 설명란
  await sendMessage(chatId, `📋 [유튜브 설명란]\n━━━━━━━━━━━━━━━━━━\n${result.description}`);

  // 4. 태그
  await sendMessage(chatId, `🏷 [태그 - 복붙용]\n━━━━━━━━━━━━━━━━━━\n${result.tags}`);

  // 5. 썸네일
  await sendMessage(chatId, `🖼 [썸네일 텍스트]\n━━━━━━━━━━━━━━━━━━\n${result.thumbnail}`);

  // 6. 쇼츠
  await sendMessage(chatId, `📱 [쇼츠 대본 60초]\n━━━━━━━━━━━━━━━━━━\n${result.shorts}`);

  await sendMessage(chatId, `✅ 유튜브 패키지 생성 완료!\n\n📁 파일로도 저장됨 (drafts 폴더)`);
}

async function handleColumnList(chatId) {
  const columns = Generator.readColumns(20);

  if (columns.length === 0) {
    await sendMessage(chatId, `📭 저장된 칼럼이 없습니다.

content-agent/columns/ 폴더에 기존 칼럼을 .txt 또는 .md 파일로 넣어주세요.

파일명 예시:
- 서울_아파트_투자전략.txt
- 2025_부동산_전망.md
- 재건축_투자_가이드.txt`);
    return;
  }

  let msg = `📚 저장된 레퍼런스 칼럼 (${columns.length}개):\n\n`;
  columns.forEach((c, i) => {
    msg += `${i + 1}. 📄 ${c.filename}\n   ${c.content.slice(0, 80).replace(/\n/g, ' ')}...\n\n`;
  });
  msg += '이 칼럼들의 스타일을 기반으로 새 글을 생성합니다.';

  await sendMessage(chatId, msg);
}

// ── HTML 태그 제거 유틸 ──
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// ── 콜백 쿼리 (인라인 버튼) 처리 ──
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  await answerCallback(callbackQuery.id);

  if (data === 'view_full') {
    const state = userStates.get(chatId);
    if (state?.lastDraft) {
      const fullText = stripHtml(state.lastDraft.content);
      await sendMessage(chatId, `📄 전문:\n\n${state.lastDraft.title}\n\n${fullText}`);
    }
  }
  else if (data.startsWith('regenerate:')) {
    const topic = data.replace('regenerate:', '');
    await handleGenerateContent(chatId, topic);
  }
  else if (data === 'publish_wp') {
    await handlePublish(chatId);
  }
  else if (data.startsWith('confirm_publish:')) {
    const postId = parseInt(data.replace('confirm_publish:', ''));
    await handleConfirmPublish(chatId, postId);
  }
  else if (data === 'publish_threads') {
    await handlePublishThreads(chatId);
  }
  else if (data === 'publish_linkedin') {
    await handlePublishLinkedIn(chatId);
  }
  else if (data === 'cancel') {
    await sendMessage(chatId, '❌ 취소되었습니다.');
  }
}

// ── 매일 자동 콘텐츠 생성 스케줄러 ──
const DAILY_HOUR = 9; // 매일 오전 9시에 초안 생성
let dailyScheduleEnabled = false;
let dailyChatId = null; // 알림 받을 채팅 ID
let lastDailyRun = null; // 마지막 실행 날짜

// 부동산 관련 일간 주제 풀 (자동 생성시 활용)
const DAILY_TOPICS = [
  '2026년 서울 빌딩 시장 전망과 투자 전략',
  '금리 인하기, 빌딩 투자 타이밍을 잡는 법',
  '상권 양극화 시대, 살아남는 상권의 조건',
  '꼬마빌딩 투자 시 반드시 확인해야 할 5가지',
  '빌딩 리모델링으로 가치를 2배로 올리는 법',
  '법인 vs 개인, 빌딩 매입 주체 선택 가이드',
  '외국인 관광객이 바꾸는 서울 상권 지도',
  '빌딩 대출 전략: 연초가 유리한 이유',
  '공실률 0%를 만드는 임차인 유치 전략',
  '빌딩 매각 시 실제 수익 계산하는 법',
  '용적률 인센티브 3년, 지금 신축해야 하는 이유',
  '성수동, 한남동, 도산공원 상권 비교 분석',
  '빌딩 투자 실패 사례에서 배우는 교훈',
  '자영업 폐업률 100만 시대, 임대 전략은?',
  '강남 빌딩 시장 2026년 상반기 동향',
  '영끌 투자의 함정과 안전한 대출 비율',
  '빌딩 투자를 위한 전문가 네트워크 구축법',
  '노후 건물 매입 후 신축, 수익률 시뮬레이션',
  '서울 핵심 상권별 빌딩 거래 동향 분석',
  '건물주가 알아야 할 2026년 부동산 세금 변화',
  'GTX 개통이 빌딩 상권에 미치는 영향',
  '빌딩 투자 초보가 피해야 할 3가지 실수',
  '상가 공실 시대, 건물주의 생존 전략',
  '리모델링 vs 신축, 어떤 선택이 유리한가',
  '빌딩 매입검토표 작성 실전 가이드',
  '소형 빌딩 투자, 20억대로 시작하는 법',
  '2026년 하반기 빌딩 시장 예측',
  '빌딩 투자에서 환금성이 가장 중요한 이유',
  '명동 상권 부활, 외국인이 만든 기적',
  '빌딩 시공사 선정 시 반드시 확인할 것들',
];

function getTodaysTopic() {
  // 날짜 기반으로 다른 주제 선택 (중복 방지)
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}

async function runDailyGeneration() {
  if (!dailyChatId) return;

  const today = new Date().toISOString().split('T')[0];
  if (lastDailyRun === today) return; // 오늘 이미 실행됨
  lastDailyRun = today;

  const topic = getTodaysTopic();
  console.log(`[${today}] 매일 자동 생성 시작: ${topic}`);

  await sendMessage(dailyChatId, `⏰ 매일 자동 콘텐츠 생성!\n\n📌 오늘의 주제: ${topic}\n\n생성 중입니다...`);
  await handleGenerateContent(dailyChatId, topic);
}

// 매 분마다 스케줄 확인
setInterval(() => {
  if (!dailyScheduleEnabled) return;
  const now = new Date();
  if (now.getHours() === DAILY_HOUR && now.getMinutes() === 0) {
    runDailyGeneration();
  }
}, 60000); // 1분마다 체크

async function handleAutoPublish(chatId, action) {
  if (action === 'on' || action === '시작' || !action) {
    dailyScheduleEnabled = true;
    dailyChatId = chatId;
    await sendMessage(chatId, `✅ 매일 자동 콘텐츠 생성이 활성화되었습니다!

⏰ 매일 오전 ${DAILY_HOUR}시에 자동으로:
1. 부동산 트렌드 리서치
2. 빌사남 스타일 칼럼 초안 생성
3. 텔레그램으로 미리보기 전송
4. 승인 후 워드프레스 발행

📌 오늘의 예정 주제: ${getTodaysTopic()}

/자동발행 끄기 로 중지할 수 있습니다.
/지금생성 으로 즉시 생성도 가능합니다.`);
  } else if (action === 'off' || action === '끄기') {
    dailyScheduleEnabled = false;
    await sendMessage(chatId, '⏹️ 매일 자동 생성이 중지되었습니다.');
  }
}

async function handleGenerateNow(chatId) {
  dailyChatId = chatId;
  const topic = getTodaysTopic();
  await sendMessage(chatId, `🚀 즉시 생성!\n📌 주제: ${topic}`);
  await handleGenerateContent(chatId, topic);
}

// ── 메시지 라우터 ──
async function handleUpdate(update) {
  // 콜백 쿼리 (인라인 버튼 클릭)
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();

  // 명령어 파싱
  const [cmd, ...args] = text.split(' ');
  const argText = args.join(' ').trim();

  switch (cmd) {
    case '/start':
    case '/도움말':
    case '/help':
      await handleStart(chatId);
      break;

    case '/글생성':
    case '/generate':
      await handleGenerateContent(chatId, argText);
      break;

    case '/추천':
    case '/suggest':
      await handleSuggestTopics(chatId);
      break;

    case '/리서치':
    case '/research':
      await handleResearch(chatId, argText);
      break;

    case '/발행':
    case '/publish':
      await handlePublish(chatId);
      break;

    case '/발행확정':
      await handleConfirmPublish(chatId);
      break;

    case '/최근글':
    case '/recent':
      await handleRecentPosts(chatId);
      break;

    case '/칼럼목록':
    case '/columns':
      await handleColumnList(chatId);
      break;

    case '/자동발행':
    case '/auto':
      await handleAutoPublish(chatId, argText);
      break;

    case '/지금생성':
    case '/now':
      await handleGenerateNow(chatId);
      break;

    case '/전체포맷':
    case '/포맷':
    case '/formats':
      await handleAllFormats(chatId);
      break;

    case '/스레드발행':
    case '/threads':
      await handlePublishThreads(chatId);
      break;

    case '/링크드인발행':
    case '/linkedin':
      await handlePublishLinkedIn(chatId);
      break;

    case '/유튜브':
    case '/youtube':
      await handleYouTube(chatId, argText);
      break;

    default:
      // 명령어가 아닌 텍스트 → 해당 주제로 글 생성 제안
      if (!text.startsWith('/')) {
        await sendMessage(chatId, `"${text}" 주제로 칼럼을 생성할까요?`, {
          replyMarkup: {
            inline_keyboard: [[
              { text: '✅ 글 생성', callback_data: `regenerate:${text}` },
              { text: '❌ 취소', callback_data: 'cancel' }
            ]]
          }
        });
      }
      break;
  }
}

// ── 폴링 방식으로 실행 ──
let lastUpdateId = 0;

let pollCount = 0;

async function poll() {
  try {
    const res = await fetch(
      `${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["message","callback_query"]`
    );
    const data = await res.json();

    // 처음 3번은 상태 로그 출력
    if (pollCount < 3) {
      console.log(`[폴링 #${pollCount + 1}] ok=${data.ok}, 메시지 수=${data.result?.length || 0}`);
      if (!data.ok) console.error('  Telegram API 에러:', data.description);
      pollCount++;
    }

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        console.log(`[수신] ${update.message?.text || update.callback_query?.data || '(알 수 없음)'}`);
        try {
          await handleUpdate(update);
        } catch (err) {
          console.error('Handle error:', err.message);
        }
      }
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
  setTimeout(poll, 1000);
}

// ── 시작 (기존 연결 초기화 후 폴링) ──
async function start() {
  // 기존 webhook/polling 충돌 방지: 먼저 초기화
  try {
    console.log('🔄 텔레그램 연결 초기화 중...');
    await fetch(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=true`);
    // 잠시 대기 후 폴링 시작
    await new Promise(r => setTimeout(r, 2000));
    console.log('✅ 텔레그램 연결 준비 완료!');
  } catch (err) {
    console.error('초기화 에러:', err.message);
  }

  console.log('');
  console.log('📝 빌사남 콘텐츠 에이전트가 시작되었습니다!');
  console.log('========================================');
  console.log('');
  console.log('🤖 텔레그램 명령어:');
  console.log('  /글생성 [주제] - 칼럼 초안 생성');
  console.log('  /추천       - 오늘의 추천 주제');
  console.log('  /자동발행    - 매일 자동 콘텐츠 생성');
  console.log('  /지금생성    - 즉시 생성');
  console.log('  /발행       - 워드프레스에 발행');
  console.log('  /칼럼목록    - 레퍼런스 칼럼 확인');
  console.log('');
  console.log(`📂 칼럼 폴더: ${require('path').join(__dirname, 'columns')}`);
  console.log(`🌐 워드프레스: ${process.env.WP_SITE_URL || '(미설정)'}`);
  console.log(`📌 오늘의 주제: ${getTodaysTopic()}`);
  console.log('');
  console.log('💬 텔레그램에서 /start 를 보내보세요!');
  console.log('');

  poll();
}

start();
