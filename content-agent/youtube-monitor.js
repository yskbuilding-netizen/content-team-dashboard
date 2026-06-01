// YouTube 트렌딩 + 빌사남TV 모니터링
// yt-dlp 활용 (시스템에 이미 설치됨)

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '.yt-history.json');
const BSN_CHANNEL = 'https://www.youtube.com/@bsn_';

const YouTubeMonitor = {
  // ── 빌사남TV 최신 영상 5개 ──
  async getBsnLatest(count = 5) {
    try {
      const cmd = `yt-dlp --flat-playlist --print "%(id)s|%(title)s|%(view_count)s|%(upload_date)s" --playlist-end ${count} "${BSN_CHANNEL}/videos"`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
      return output.trim().split('\n').filter(Boolean).map(line => {
        const [id, title, views, date] = line.split('|');
        return {
          id, title,
          views: parseInt(views) || 0,
          date: date || '',
          url: `https://www.youtube.com/watch?v=${id}`
        };
      });
    } catch (e) {
      console.error('BSN 채널 조회 실패:', e.message);
      return [];
    }
  },

  // ── 부동산 키워드 트렌딩 영상 ──
  async getTrending(keyword, count = 5) {
    try {
      const cmd = `yt-dlp --flat-playlist --print "%(id)s|%(title)s|%(view_count)s|%(channel)s" --playlist-end ${count} "ytsearch${count}:${keyword} 부동산 빌딩"`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 45000 });
      return output.trim().split('\n').filter(Boolean).map(line => {
        const [id, title, views, channel] = line.split('|');
        return {
          id, title,
          views: parseInt(views) || 0,
          channel: channel || '',
          url: `https://www.youtube.com/watch?v=${id}`,
          keyword
        };
      }).filter(v => v.views > 1000); // 조회수 1천 이상만
    } catch (e) {
      console.error(`${keyword} 트렌딩 조회 실패:`, e.message);
      return [];
    }
  },

  // ── 부동산 핵심 키워드 트렌딩 종합 ──
  async getAllTrending() {
    const keywords = ['꼬마빌딩', '상업용 빌딩', '강남 빌딩', '빌딩 투자', '건물주'];
    const all = [];
    for (const kw of keywords) {
      const videos = await this.getTrending(kw, 3);
      all.push(...videos);
    }
    // 중복 제거 + 조회수 정렬
    const seen = new Set();
    return all
      .filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true; })
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  },

  // ── 새 영상 알림 ──
  async checkBsnNew() {
    const latest = await this.getBsnLatest(5);
    if (latest.length === 0) return { newVideos: [] };

    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch {}
    }
    const knownIds = new Set(history.map(h => h.id));
    const newVideos = latest.filter(v => !knownIds.has(v.id));

    // 히스토리 업데이트
    const updated = [...latest, ...history].filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i).slice(0, 30);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    return { newVideos, latest };
  }
};

// CLI
if (require.main === module) {
  const arg = process.argv[2];
  (async () => {
    if (arg === 'trending') {
      const t = await YouTubeMonitor.getAllTrending();
      console.log('\n📊 부동산 트렌딩 영상 TOP 10\n');
      t.forEach((v, i) => console.log(`${i+1}. [${v.views.toLocaleString()}회] ${v.title} (${v.channel})`));
    } else if (arg === 'bsn-new') {
      const r = await YouTubeMonitor.checkBsnNew();
      console.log(`\n📺 빌사남TV 새 영상: ${r.newVideos.length}개\n`);
      r.newVideos.forEach(v => console.log(`  - ${v.title}`));
    } else if (arg === 'bsn') {
      const r = await YouTubeMonitor.getBsnLatest(10);
      r.forEach(v => console.log(`[${v.date}] [${v.views.toLocaleString()}] ${v.title}`));
    } else {
      console.log(`사용법:
  node youtube-monitor.js bsn         — 빌사남TV 최신 10개
  node youtube-monitor.js bsn-new     — 빌사남TV 새 영상 체크
  node youtube-monitor.js trending    — 부동산 트렌딩 영상`);
    }
  })();
}

module.exports = YouTubeMonitor;
