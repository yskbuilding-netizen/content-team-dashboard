// ========================================
// 빌사남 콘텐츠 현황판 + Claude AI 코딩 봇
// ========================================

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const YT_API = 'https://www.googleapis.com/youtube/v3';

// Claude 클라이언트
const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── 사용자별 대화 기록 저장 ──
const chatHistories = new Map();
const MAX_HISTORY = 20; // 최근 20개 메시지까지 기억

function getChatHistory(chatId) {
  if (!chatHistories.has(chatId)) {
    chatHistories.set(chatId, []);
  }
  return chatHistories.get(chatId);
}

function addToHistory(chatId, role, content) {
  const history = getChatHistory(chatId);
  history.push({ role, content });
  // 오래된 메시지 삭제
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// ── 채널 설정 ──
const CHANNELS = {
  bilsanam: { name: '빌사남 TV', search: '빌사남 TV', id: null },
  seoulspace: { name: '서울 스페이스', search: '서울스페이스', id: null }
};

// ── YouTube API 호출 ──
async function ytApi(endpoint, params) {
  params.key = YOUTUBE_API_KEY;
  const url = `${YT_API}/${endpoint}?` + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await fetch(url);
  return res.json();
}

function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

function formatNum(num) {
  if (!num) return '0';
  if (num >= 10000) return (num / 10000).toFixed(1) + '만';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ── 채널 ID 찾기 ──
async function findChannelId(searchQuery) {
  const data = await ytApi('search', { part: 'snippet', q: searchQuery, type: 'channel', maxResults: '1' });
  if (data.items && data.items.length > 0) {
    return data.items[0].id.channelId || data.items[0].snippet.channelId;
  }
  return null;
}

// ── 채널 정보 가져오기 ──
async function getChannelInfo(channelId) {
  const data = await ytApi('channels', { part: 'snippet,statistics,contentDetails', id: channelId });
  if (!data.items || data.items.length === 0) return null;
  const ch = data.items[0];
  return {
    title: ch.snippet.title,
    subscriberCount: Number(ch.statistics.subscriberCount) || 0,
    videoCount: Number(ch.statistics.videoCount) || 0,
    viewCount: Number(ch.statistics.viewCount) || 0,
    uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || ''
  };
}

// ── 최근 영상 가져오기 ──
async function getRecentVideos(channelId, maxResults = 20) {
  const chInfo = await getChannelInfo(channelId);
  if (!chInfo) return { channelInfo: null, videos: [] };

  const playlistData = await ytApi('playlistItems', {
    part: 'snippet,contentDetails', playlistId: chInfo.uploadsPlaylistId, maxResults: String(maxResults)
  });

  const videoIds = (playlistData.items || []).map(i => i.contentDetails.videoId).filter(Boolean);
  if (videoIds.length === 0) return { channelInfo: chInfo, videos: [] };

  const videoData = await ytApi('videos', { part: 'snippet,statistics,contentDetails', id: videoIds.join(',') });

  const videos = (videoData.items || []).map(v => {
    const dur = parseDuration(v.contentDetails.duration);
    return {
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      duration: dur,
      isShort: dur <= 60,
      views: Number(v.statistics.viewCount) || 0,
      likes: Number(v.statistics.likeCount) || 0,
      comments: Number(v.statistics.commentCount) || 0
    };
  });

  return { channelInfo: chInfo, videos };
}

// ── 텔레그램 메시지 전송 ──
async function sendMessage(chatId, text, parseMode = 'HTML') {
  // 텔레그램 메시지 길이 제한 (4096자)
  const maxLen = 4000;
  if (text.length <= maxLen) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
    });
  } else {
    // 긴 메시지는 분할 전송
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
    for (const chunk of chunks) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: parseMode })
      });
    }
  }
}

// ── "입력 중..." 표시 ──
async function sendTyping(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
  });
}

// ── Claude AI 대화 ──
async function handleAI(chatId, userMessage) {
  await sendTyping(chatId);

  addToHistory(chatId, 'user', userMessage);
  const history = getChatHistory(chatId);

  try {
    const response = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: `당신은 텔레그램에서 동작하는 코딩 도우미 AI입니다.
사용자가 코딩 질문을 하면 친절하게 답변하고, 코드를 작성해줍니다.
한국어로 대화하며, 코드 블록은 텔레그램 형식에 맞게 백틱 3개로 감싸서 보냅니다.
간결하지만 정확하게 답변합니다. 일반 대화도 자연스럽게 합니다.`,
      messages: history
    });

    const aiReply = response.content[0].text;
    addToHistory(chatId, 'assistant', aiReply);

    // HTML 파싱 문제를 피하기 위해 일반 텍스트로 전송
    await sendMessage(chatId, aiReply, '');
  } catch (err) {
    console.error('Claude API error:', err.message);
    if (err.message.includes('api_key') || err.message.includes('authentication')) {
      await sendMessage(chatId, '❌ Claude API 키가 설정되지 않았거나 잘못되었습니다.\n.env 파일의 ANTHROPIC_API_KEY를 확인해주세요.', '');
    } else {
      await sendMessage(chatId, '❌ AI 응답 오류: ' + err.message, '');
    }
  }
}

// ── /youtube 명령어 ──
async function handleYoutube(chatId, channelKey) {
  const ch = CHANNELS[channelKey || 'bilsanam'];
  await sendMessage(chatId, '⏳ ' + ch.name + ' 데이터를 불러오는 중...');

  if (!ch.id) {
    ch.id = await findChannelId(ch.search);
    if (!ch.id) { await sendMessage(chatId, '❌ 채널을 찾을 수 없습니다.'); return; }
  }

  const { channelInfo, videos } = await getRecentVideos(ch.id, 20);
  if (!channelInfo) { await sendMessage(chatId, '❌ 채널 정보를 불러올 수 없습니다.'); return; }

  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
  const longCount = videos.filter(v => !v.isShort).length;
  const shortCount = videos.filter(v => v.isShort).length;
  const engRate = totalViews > 0 ? ((totalLikes + videos.reduce((s, v) => s + v.comments, 0)) / totalViews * 100).toFixed(1) : '0';

  const top3 = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);

  let msg = `🎬 <b>${channelInfo.title}</b>\n`;
  msg += `구독자 ${formatNum(channelInfo.subscriberCount)}명 · 영상 ${formatNum(channelInfo.videoCount)}개\n\n`;
  msg += `📊 <b>최근 ${videos.length}개 영상 현황</b>\n`;
  msg += `├ 롱폼 ${longCount}개 · 숏폼 ${shortCount}개\n`;
  msg += `├ 총 조회수: ${formatNum(totalViews)}\n`;
  msg += `├ 평균 조회수: ${formatNum(avgViews)}\n`;
  msg += `└ 참여율: ${engRate}%\n\n`;
  msg += `🏆 <b>TOP 3 영상</b>\n`;
  top3.forEach((v, i) => {
    msg += `${i + 1}. ${v.title.slice(0, 35)}${v.title.length > 35 ? '...' : ''}\n`;
    msg += `   👁 ${formatNum(v.views)} · ❤️ ${formatNum(v.likes)} · 💬 ${formatNum(v.comments)}\n`;
  });

  await sendMessage(chatId, msg);
}

// ── /분석 명령어 ──
async function handleAnalysis(chatId, channelKey) {
  const ch = CHANNELS[channelKey || 'bilsanam'];
  await sendMessage(chatId, '⏳ ' + ch.name + ' 영상 분석 중...');

  if (!ch.id) {
    ch.id = await findChannelId(ch.search);
    if (!ch.id) { await sendMessage(chatId, '❌ 채널을 찾을 수 없습니다.'); return; }
  }

  const { channelInfo, videos } = await getRecentVideos(ch.id, 20);
  if (!channelInfo || videos.length === 0) { await sendMessage(chatId, '❌ 데이터 없음'); return; }

  const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;
  const bottom3 = [...videos].sort((a, b) => a.views - b.views).slice(0, 3);
  const top3 = [...videos].sort((a, b) => b.views - a.views).slice(0, 3);

  const keywords = {};
  top3.forEach(v => {
    v.title.replace(/[[\]()｜|#\d]/g, '').split(/\s+/).filter(w => w.length > 1).forEach(w => {
      keywords[w] = (keywords[w] || 0) + 1;
    });
  });
  const hotWords = Object.entries(keywords).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

  let msg = `🧠 <b>${channelInfo.title} 분석</b>\n\n`;

  msg += `🔴 <b>문제점</b>\n`;
  const totalEng = videos.reduce((s, v) => s + v.likes + v.comments, 0);
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const engRate = totalViews > 0 ? (totalEng / totalViews * 100).toFixed(1) : 0;
  if (engRate < 2) msg += `• 참여율 ${engRate}%로 낮습니다\n`;
  msg += `• 하위 영상: "${bottom3[0].title.slice(0, 25)}..." (${formatNum(bottom3[0].views)}회)\n`;
  msg += `• 평균 조회수: ${formatNum(Math.round(avgViews))}회\n\n`;

  msg += `🚀 <b>추천 콘텐츠</b>\n`;
  msg += `• 인기 키워드: ${hotWords.join(', ')}\n`;
  msg += `• "${hotWords[0] || '부동산'}" 관련 후속 콘텐츠 제작\n`;
  msg += `• TOP1 "${top3[0].title.slice(0, 20)}..." 포맷 반복\n\n`;

  msg += `📈 <b>최근 영상 성과</b>\n`;
  videos.slice(0, 8).forEach(v => {
    const perf = v.views >= avgViews * 1.5 ? '🟢' : v.views >= avgViews ? '🔵' : v.views >= avgViews * 0.5 ? '🟡' : '🔴';
    msg += `${perf} ${v.title.slice(0, 28)}${v.title.length > 28 ? '..' : ''}\n`;
    msg += `   👁 ${formatNum(v.views)} · ❤️ ${formatNum(v.likes)}\n`;
  });

  await sendMessage(chatId, msg);
}

// ── 메시지 처리 ──
async function handleUpdate(update) {
  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();

  if (text === '/start') {
    await sendMessage(chatId,
      '👋 <b>빌사남 AI 코딩 봇</b>\n\n' +
      '💬 <b>AI 대화</b> - 아무 메시지나 보내세요!\n' +
      '코딩 질문, 코드 작성, 일반 대화 모두 가능합니다.\n\n' +
      '📊 <b>유튜브 명령어</b>\n' +
      '/youtube - 빌사남 TV 현황\n' +
      '/서울스페이스 - 서울 스페이스 현황\n' +
      '/분석 - 빌사남 TV 영상 분석\n' +
      '/분석서울 - 서울 스페이스 분석\n\n' +
      '🔧 <b>기타</b>\n' +
      '/reset - 대화 기록 초기화\n' +
      '/help - 도움말'
    );
  }
  else if (text === '/youtube' || text === '/빌사남') {
    await handleYoutube(chatId, 'bilsanam');
  }
  else if (text === '/서울스페이스' || text === '/seoul') {
    await handleYoutube(chatId, 'seoulspace');
  }
  else if (text === '/분석') {
    await handleAnalysis(chatId, 'bilsanam');
  }
  else if (text === '/분석서울') {
    await handleAnalysis(chatId, 'seoulspace');
  }
  else if (text === '/reset') {
    chatHistories.delete(chatId);
    await sendMessage(chatId, '🔄 대화 기록이 초기화되었습니다.');
  }
  else if (text === '/help') {
    await sendMessage(chatId,
      '📋 <b>명령어 목록</b>\n\n' +
      '💬 <b>AI 대화</b>\n' +
      '• 아무 메시지 → Claude AI가 답변\n' +
      '• 코딩 질문, 코드 작성 요청 가능\n' +
      '• 대화 맥락을 기억합니다\n\n' +
      '📊 <b>유튜브</b>\n' +
      '/youtube - 빌사남 TV 현황 요약\n' +
      '/서울스페이스 - 서울 스페이스 현황\n' +
      '/분석 - 빌사남 TV 영상별 분석\n' +
      '/분석서울 - 서울 스페이스 분석\n\n' +
      '🔧 <b>기타</b>\n' +
      '/reset - 대화 기록 초기화\n' +
      '/help - 이 도움말'
    );
  }
  else {
    // 명령어가 아닌 모든 메시지 → Claude AI 대화
    await handleAI(chatId, text);
  }
}

// ── 폴링 방식으로 실행 ──
let lastUpdateId = 0;

async function poll() {
  try {
    const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    const data = await res.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        await handleUpdate(update);
      }
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
  setTimeout(poll, 1000);
}

// 시작
console.log('🤖 빌사남 AI 코딩 봇이 시작되었습니다!');
console.log('텔레그램에서 @Bsn_dashboard_bot 을 검색하여 사용하세요.');
console.log('');
console.log('기능:');
console.log('  💬 Claude AI 대화 (코딩 질문, 코드 작성)');
console.log('  📊 유튜브 채널 분석');
poll();
