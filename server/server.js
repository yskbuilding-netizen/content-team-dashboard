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

// 정적 파일 서빙 (현황판 웹페이지)
app.use(express.static(path.join(__dirname, '..')));

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
  
  if (!prompt) {
    return res.status(400).json({ success: false, error: '프롬프트가 필요합니다' });
  }

  const result = await apiManager.generateContent(prompt, type);
  res.json(result);
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

// ── 서버 실행 ──dConfig();
  var token = config.instagram.token;

  if (!token) {
    res.json({ ok: false, error: '토큰 없음' });
    return;
  }

  try {
    // 장기 토큰으로 교환
    var url = 'https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' + token;
    var response = await fetch(url);
    var data = await response.json();

    if (data.access_token) {
      config.instagram.token = data.access_token;
      saveConfig(config);
      res.json({ ok: true, expiresIn: data.expires_in });
    } else {
      res.json({ ok: false, error: data.error ? data.error.message : '갱신 실패' });
    }
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
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

// ── 서버 시작 ──
var PORT = 3000;
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
        console.log('🌐 http://' + iface.address + ':' + PORT);
      }
    });
  });

  console.log('');
  console.log('Instagram 토큰 자동 갱신: 매일 1회');

  // 첫 실행 시 토큰 갱신 시도
  autoRefreshToken();
});
