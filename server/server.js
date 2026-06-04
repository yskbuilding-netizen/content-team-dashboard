// ========================================
// 빌사남 콘텐츠 현황판 서버 - 실제 API 연결
// - Instagram API 연동
// - AI 콘텐츠 생성기
// - 성과 분석 시스템
// - 팀 업무 실시간 공유
// ========================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const APIManager = require('./api');

const app = express();
app.use(cors());
app.use(express.json());

// API 매니저 초기화
const apiManager = new APIManager();

// 정적 파일 서빙 (현황판 웹페이지) — JS/CSS 캐시 방지
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ── 설정 파일 ──
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {
      instagram: {
        token: 'IGAANypTw4tCJBZAFlBQTBCNlhUN281M0lxMzNUeTB4UDdYNU1JX283T041ZA2lMUFl6RGt5ekw2MWM2MUp2T3VaNlZAESHYzVnBBS3pCVGlxb3ZAHdFRGUklQV1hwSFE5ai01Y1BJRmN6c3pLNTdvUFBvVEd0b3hub00wQlhyVUc5TQZDZD',
        appId: '970478935651362',
        appSecret: '',
        userId: ''
      },
      youtube: {
        apiKey: 'AIzaSyDaZV8Fh6YVdysVTAfABMVRL6nmTV7RkIE'
      }
    };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ── 팀 업무 공유 저장소 ──
const TASKS_FILE = path.join(DATA_DIR, 'team-tasks.json');

function loadTasks() {
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// ── API: 팀 업무 ──
app.get('/api/tasks', (req, res) => {
  res.json(loadTasks());
});

app.post('/api/tasks', (req, res) => {
  var tasks = loadTasks();
  var newTask = req.body;
  newTask.serverTime = new Date().toISOString();
  // 중복 제거
  var exists = tasks.find(function(t) { return t.id === newTask.id; });
  if (!exists) {
    tasks.push(newTask);
    saveTasks(tasks);
  }
  res.json({ ok: true, total: tasks.length });
});

app.post('/api/tasks/sync', (req, res) => {
  var clientTasks = req.body.tasks || [];
  var serverTasks = loadTasks();
  var serverIds = new Set(serverTasks.map(function(t) { return t.id; }));

  // 클라이언트에만 있는 업무 추가
  var added = 0;
  clientTasks.forEach(function(t) {
    if (!serverIds.has(t.id)) {
      serverTasks.push(t);
      added++;
    }
  });

  if (added > 0) saveTasks(serverTasks);
  res.json({ ok: true, tasks: serverTasks, added: added });
});

app.put('/api/tasks/:id', (req, res) => {
  var tasks = loadTasks();
  var idx = tasks.findIndex(function(t) { return t.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  Object.assign(tasks[idx], req.body, { id: req.params.id });
  saveTasks(tasks);
  res.json({ ok: true, task: tasks[idx] });
});

app.delete('/api/tasks/:id', (req, res) => {
  var tasks = loadTasks().filter(function(t) { return t.id !== req.params.id; });
  saveTasks(tasks);
  res.json({ ok: true, total: tasks.length });
});

// ── API: YouTube 프록시 (브라우저 CORS 우회) ──
app.get('/api/youtube/:endpoint', async (req, res) => {
  var config = loadConfig();
  var apiKey = (config.youtube && config.youtube.apiKey) || '';
  if (!apiKey) return res.status(503).json({ error: 'YouTube API 키 없음' });

  var endpoint = req.params.endpoint;
  var allowed = ['search', 'channels', 'playlistItems', 'videos'];
  if (!allowed.includes(endpoint)) return res.status(400).json({ error: '허용되지 않은 엔드포인트' });

  var params = new URLSearchParams(req.query);
  params.set('key', apiKey);
  var url = 'https://www.googleapis.com/youtube/v3/' + endpoint + '?' + params.toString();

  try {
    var response = await fetch(url);
    var data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── API: 대시보드 데이터 (서버사이드 YouTube 캐시) ──
var dashboardCache = { data: null, timestamp: 0 };
var DASH_CACHE_TTL = 10 * 60 * 1000; // 10분

app.get('/api/dashboard-data', async (req, res) => {
  // 캐시 유효하면 바로 반환
  if (dashboardCache.data && (Date.now() - dashboardCache.timestamp < DASH_CACHE_TTL)) {
    return res.json(dashboardCache.data);
  }

  var config = loadConfig();
  var apiKey = (config.youtube && config.youtube.apiKey) || '';
  if (!apiKey) return res.json({ bilsanam: null, seoulspace: null });

  var result = { bilsanam: null, seoulspace: null };
  var channels = [
    { key: 'bilsanam', search: '빌사남 TV' },
    { key: 'seoulspace', search: '서울스페이스' }
  ];

  for (var ch of channels) {
    try {
      // 1. 채널 검색
      var searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(ch.search) + '&type=channel&maxResults=1&key=' + apiKey;
      var searchRes = await fetch(searchUrl);
      var searchData = await searchRes.json();
      if (!searchData.items || !searchData.items[0]) continue;
      var channelId = searchData.items[0].id.channelId;

      // 2. 채널 정보
      var chUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=' + channelId + '&key=' + apiKey;
      var chRes = await fetch(chUrl);
      var chData = await chRes.json();
      if (!chData.items || !chData.items[0]) continue;
      var c = chData.items[0];
      var channelInfo = {
        title: c.snippet.title,
        thumbnail: (c.snippet.thumbnails && c.snippet.thumbnails.medium) ? c.snippet.thumbnails.medium.url : '',
        subscriberCount: Number(c.statistics.subscriberCount) || 0,
        videoCount: Number(c.statistics.videoCount) || 0,
        viewCount: Number(c.statistics.viewCount) || 0
      };
      var uploadsId = c.contentDetails && c.contentDetails.relatedPlaylists ? c.contentDetails.relatedPlaylists.uploads : '';

      // 3. 최근 영상
      var videos = [];
      if (uploadsId) {
        var plUrl = 'https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=' + uploadsId + '&maxResults=10&key=' + apiKey;
        var plRes = await fetch(plUrl);
        var plData = await plRes.json();
        var ids = (plData.items || []).map(function(i) { return i.contentDetails.videoId; }).filter(Boolean);
        if (ids.length > 0) {
          var vUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' + ids.join(',') + '&key=' + apiKey;
          var vRes = await fetch(vUrl);
          var vData = await vRes.json();
          videos = (vData.items || []).map(function(v) {
            return {
              id: v.id, title: v.snippet.title, publishedAt: v.snippet.publishedAt,
              thumbnail: (v.snippet.thumbnails && v.snippet.thumbnails.medium) ? v.snippet.thumbnails.medium.url : '',
              viewCount: Number(v.statistics.viewCount) || 0,
              likeCount: Number(v.statistics.likeCount) || 0,
              commentCount: Number(v.statistics.commentCount) || 0
            };
          });
        }
      }
      result[ch.key] = { channelInfo: channelInfo, videos: videos };
    } catch (e) {
      console.warn(ch.key + ' fetch error:', e.message);
    }
  }

  dashboardCache = { data: result, timestamp: Date.now() };
  res.json(result);
});

// ── API: Instagram 프록시 (브라우저 CORS 우회) ──
app.get('/api/ig/proxy/*', async (req, res) => {
  var config = loadConfig();
  var token = (config.instagram && config.instagram.token) || '';
  if (!token) return res.status(503).json({ error: 'Instagram 토큰 없음' });

  var igPath = req.params[0] || '';
  var params = new URLSearchParams(req.query);
  params.set('access_token', token);

  // IG 토큰이면 graph.instagram.com, FB 토큰이면 graph.facebook.com
  var host = token.startsWith('IGAA') ? 'graph.instagram.com' : 'graph.facebook.com';
  var url = 'https://' + host + '/v19.0/' + igPath + '?' + params.toString();

  try {
    var response = await fetch(url);
    var data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── API: Instagram 토큰 ──
app.get('/api/ig/token', (req, res) => {
  var config = loadConfig();
  res.json({ token: config.instagram.token, userId: config.instagram.userId });
});

app.post('/api/ig/token', (req, res) => {
  var config = loadConfig();
  config.instagram.token = req.body.token;
  if (req.body.userId) config.instagram.userId = req.body.userId;
  if (req.body.appSecret) config.instagram.appSecret = req.body.appSecret;
  saveConfig(config);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════
// 🤖 AI 콘텐츠 생성기 API
// ══════════════════════════════════════════════
app.post('/api/ai/generate', async (req, res) => {
  const { prompt, type } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: '프롬프트가 필요합니다' });
  const result = await apiManager.generateContent(prompt, type);
  res.json(result);
});

// 유튜브/인스타그램 AI 분석 (서버사이드 Claude 호출)
app.post('/api/ai/analyze', async (req, res) => {
  const { prompt, systemPrompt, maxTokens } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: '프롬프트 필요' });

  var key = apiManager.config.anthropic || process.env.ANTHROPIC_API_KEY || '';
  // .env 폴백: 직접 파일에서 읽기
  if (!key || key.length < 20) {
    try {
      var envContent = require('fs').readFileSync(require('path').join(__dirname, '..', '.env'), 'utf8');
      var match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
      if (match) key = match[1].trim();
    } catch(e) {}
  }
  if (!key || key.length < 20) return res.status(503).json({ success: false, error: 'Claude API 키 미설정' });

  try {
    var body = {
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens || 2000,
      messages: [{ role: 'user', content: prompt }]
    };
    if (systemPrompt) body.system = systemPrompt;

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body)
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
    res.json({ success: true, content: data.content[0].text });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Claude API 키 설정
app.post('/api/admin/set-anthropic-key', (req, res) => {
  const { key } = req.body;
  if (!key || !key.startsWith('sk-ant')) return res.status(400).json({ success: false, error: '유효하지 않은 키' });
  try {
    var envPath = require('path').join(__dirname, '..', '.env');
    var envContent = require('fs').existsSync(envPath) ? require('fs').readFileSync(envPath, 'utf8') : '';
    if (envContent.match(/ANTHROPIC_API_KEY=.*/)) {
      envContent = envContent.replace(/ANTHROPIC_API_KEY=.*/, 'ANTHROPIC_API_KEY=' + key);
    } else {
      envContent += '\nANTHROPIC_API_KEY=' + key;
    }
    require('fs').writeFileSync(envPath, envContent);
    apiManager.config.anthropic = key;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════
// 📊 성과 분석 API
// ══════════════════════════════════════════════
app.get('/api/analytics', async (req, res) => {
  const result = await apiManager.getPerformanceAnalytics();
  res.json(result);
});

app.get('/api/analytics/instagram', async (req, res) => {
  const result = await apiManager.getInstagramInsights();
  res.json(result);
});

app.get('/api/analytics/youtube', async (req, res) => {
  const result = await apiManager.getYouTubeAnalytics();
  res.json(result);
});

// ══════════════════════════════════════════════
// 📸 Instagram 실제 게시 API
// ══════════════════════════════════════════════
app.post('/api/instagram/post', async (req, res) => {
  const { mediaUrl, caption } = req.body;
  
  if (!mediaUrl || !caption) {
    return res.status(400).json({ 
      success: false, 
      error: '미디어 URL과 캡션이 필요합니다' 
    });
  }

  const result = await apiManager.postToInstagram(mediaUrl, caption);
  res.json(result);
});

// ── API: Instagram 토큰 갱신 ──
app.post('/api/ig/refresh', async (req, res) => {
  const result = await apiManager.refreshInstagramToken();
  res.json(result);
});

// ── API: Instagram 장기 토큰 교환 ──
app.post('/api/ig/exchange', async (req, res) => {
  var config = loadConfig();
  var shortToken = req.body.token || config.instagram.token;
  var appSecret = req.body.appSecret || config.instagram.appSecret;

  if (!appSecret) {
    res.json({ ok: false, error: 'appSecret이 필요합니다' });
    return;
  }

  try {
    var url = 'https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=' + appSecret + '&access_token=' + shortToken;
    var response = await fetch(url);
    var data = await response.json();

    if (data.access_token) {
      config.instagram.token = data.access_token;
      config.instagram.appSecret = appSecret;
      saveConfig(config);
      res.json({ ok: true, expiresIn: data.expires_in });
    } else {
      res.json({ ok: false, error: data.error ? data.error.message : '교환 실패' });
    }
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ── API: Instagram 프록시 ──
app.get('/api/ig/proxy/*', async (req, res) => {
  var config = loadConfig();
  var igPath = req.params[0];
  var token = config.instagram.token;
  var query = Object.entries(req.query).map(function(e) { return e[0] + '=' + encodeURIComponent(e[1]); }).join('&');

  try {
    var url = 'https://graph.instagram.com/v19.0/' + igPath + '?access_token=' + token + (query ? '&' + query : '');
    var response = await fetch(url);
    var data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ error: { message: err.message } });
  }
});

// ── API: 설정 ──
app.get('/api/config', (req, res) => {
  var config = loadConfig();
  // 시크릿은 숨김
  var safe = JSON.parse(JSON.stringify(config));
  if (safe.instagram.appSecret) safe.instagram.appSecret = '****';
  res.json(safe);
});

app.post('/api/config/ig-secret', (req, res) => {
  var config = loadConfig();
  config.instagram.appSecret = req.body.appSecret;
  saveConfig(config);
  res.json({ ok: true });
});

// ── 토큰 자동 갱신 (매일 체크) ──
async function autoRefreshToken() {
  var config = loadConfig();
  if (!config.instagram.token) return;

  try {
    var url = 'https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' + config.instagram.token;
    var response = await fetch(url);
    var data = await response.json();
    if (data.access_token) {
      config.instagram.token = data.access_token;
      saveConfig(config);
      console.log('✅ Instagram 토큰 자동 갱신 완료 (만료: ' + Math.round(data.expires_in / 86400) + '일 후)');
    }
  } catch (err) {
    console.log('⚠️ 토큰 갱신 실패:', err.message);
  }
}

// 24시간마다 토큰 갱신
setInterval(autoRefreshToken, 24 * 60 * 60 * 1000);

// ── 발행 플랫폼 설정 저장/조회 ──
app.get('/api/publish/config', (req, res) => {
  var config = loadConfig();
  var pub = config.publishing || {};
  var safe = {
    wordpress: pub.wordpress ? { url: pub.wordpress.url, user: pub.wordpress.user, connected: true } : { connected: false },
    threads: pub.threads ? { uid: pub.threads.uid, connected: true } : { connected: false },
    linkedin: pub.linkedin ? { uid: pub.linkedin.uid, connected: true } : { connected: false }
  };
  res.json(safe);
});

app.post('/api/publish/config', (req, res) => {
  var config = loadConfig();
  if (!config.publishing) config.publishing = {};
  var body = req.body;
  if (body.platform === 'wordpress') {
    config.publishing.wordpress = { url: body.url, user: body.user, pass: body.pass };
  } else if (body.platform === 'threads') {
    config.publishing.threads = { uid: body.uid, token: body.token };
  } else if (body.platform === 'linkedin') {
    config.publishing.linkedin = { uid: body.uid, token: body.token };
  } else {
    return res.status(400).json({ error: '알 수 없는 플랫폼' });
  }
  saveConfig(config);
  res.json({ ok: true });
});

// ── WordPress 발행 프록시 ──
app.post('/api/publish/wordpress', async (req, res) => {
  var config = loadConfig();
  var wp = (config.publishing || {}).wordpress;
  if (!wp || !wp.url) return res.status(400).json({ error: 'WordPress 미연결' });

  try {
    var auth = Buffer.from(wp.user + ':' + wp.pass).toString('base64');
    var tagIds = [];

    if (req.body.tags && req.body.tags.length) {
      for (var tag of req.body.tags) {
        try {
          var searchRes = await fetch(wp.url + '/wp-json/wp/v2/tags?search=' + encodeURIComponent(tag));
          var existing = await searchRes.json();
          if (existing.length > 0) {
            tagIds.push(existing[0].id);
          } else {
            var createRes = await fetch(wp.url + '/wp-json/wp/v2/tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
              body: JSON.stringify({ name: tag })
            });
            if (createRes.ok) {
              var newTag = await createRes.json();
              tagIds.push(newTag.id);
            }
          }
        } catch (e) { /* tag 실패는 무시 */ }
      }
    }

    var postRes = await fetch(wp.url + '/wp-json/wp/v2/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
      body: JSON.stringify({
        title: req.body.title || '',
        content: req.body.content || '',
        status: req.body.status || 'draft',
        excerpt: req.body.summary || '',
        tags: tagIds
      })
    });

    if (!postRes.ok) {
      var errBody = await postRes.text();
      throw new Error('WP API ' + postRes.status + ': ' + errBody.slice(0, 200));
    }

    var post = await postRes.json();
    res.json({
      ok: true,
      postId: post.id,
      postUrl: post.link,
      editUrl: wp.url + '/wp-admin/post.php?post=' + post.id + '&action=edit'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Threads 발행 프록시 ──
app.post('/api/publish/threads', async (req, res) => {
  var config = loadConfig();
  var th = (config.publishing || {}).threads;
  if (!th || !th.token) return res.status(400).json({ error: 'Threads 미연결' });

  try {
    var text = (req.body.content || '').slice(0, 500);
    var createParams = new URLSearchParams({
      media_type: 'TEXT',
      text: text,
      access_token: th.token
    });

    var createRes = await fetch('https://graph.threads.net/v1.0/' + th.uid + '/threads?' + createParams, { method: 'POST' });
    if (!createRes.ok) {
      var errBody = await createRes.text();
      throw new Error('컨테이너 생성 실패: ' + errBody.slice(0, 200));
    }
    var container = await createRes.json();

    await new Promise(function(r) { setTimeout(r, 2500); });

    var pubParams = new URLSearchParams({
      creation_id: container.id,
      access_token: th.token
    });
    var pubRes = await fetch('https://graph.threads.net/v1.0/' + th.uid + '/threads_publish?' + pubParams, { method: 'POST' });
    if (!pubRes.ok) {
      var errBody2 = await pubRes.text();
      throw new Error('게시 실패: ' + errBody2.slice(0, 200));
    }
    var result = await pubRes.json();
    res.json({ ok: true, postId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LinkedIn 발행 프록시 ──
app.post('/api/publish/linkedin', async (req, res) => {
  var config = loadConfig();
  var li = (config.publishing || {}).linkedin;
  if (!li || !li.token) return res.status(400).json({ error: 'LinkedIn 미연결' });

  try {
    var body = {
      author: 'urn:li:person:' + li.uid,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: (req.body.content || '').slice(0, 3000) },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };

    var postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + li.token,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(body)
    });

    if (!postRes.ok) {
      var errBody = await postRes.text();
      throw new Error('LinkedIn API ' + postRes.status + ': ' + errBody.slice(0, 200));
    }
    var result = await postRes.json();
    res.json({ ok: true, postId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 전체 플랫폼 일괄 발행 ──
app.post('/api/publish/all', async (req, res) => {
  var results = {};
  var platforms = req.body.platforms || ['wordpress', 'threads', 'linkedin'];
  var data = req.body.data || {};

  for (var platform of platforms) {
    try {
      var pData = data[platform] || data.all || {};
      var innerRes = await fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/publish/' + platform, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pData)
      });
      results[platform] = await innerRes.json();
    } catch (err) {
      results[platform] = { error: err.message };
    }
  }
  res.json(results);
});

// ── 서버 시작 ──
var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('');
  console.log('🚀 빌사남 콘텐츠 현황판 서버가 시작되었습니다!');
  console.log('');
  console.log('📱 현황판 접속: http://localhost:' + PORT);
  console.log('');
  console.log('팀원들에게 이 주소를 공유하세요 (같은 네트워크):');

  // 로컬 IP 찾기
  var os = require('os');
  var interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(function(name) {
    interfaces[name].forEach(function(iface) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log('http://' + iface.address + ':' + PORT);
      }
    });
  });

  console.log('');
  autoRefreshToken();
});
