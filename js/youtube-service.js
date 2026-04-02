// ========================================
// YouTube Data API v3 Service
// 빌사남 TV 채널 연동
// ========================================
const YouTubeService = {
  API_BASE: 'https://www.googleapis.com/youtube/v3',
  DEFAULT_API_KEY: 'AIzaSyDaZV8Fh6YVdysVTAfABMVRL6nmTV7RkIE',
  CHANNEL_NAME: '빌사남 TV',
  CACHE_KEY: 'yt_cache',
  API_KEY_KEY: 'yt_api_key',
  CHANNEL_ID_KEY: 'yt_channel_id',

  getApiKey() {
    return localStorage.getItem(this.API_KEY_KEY) || this.DEFAULT_API_KEY;
  },

  setApiKey(key) {
    localStorage.setItem(this.API_KEY_KEY, key.trim());
  },

  getChannelId() {
    return localStorage.getItem(this.CHANNEL_ID_KEY) || '';
  },

  setChannelId(id) {
    localStorage.setItem(this.CHANNEL_ID_KEY, id);
  },

  isConfigured() {
    return !!this.getApiKey() && !!this.getChannelId();
  },

  async apiCall(endpoint, params) {
    const key = this.getApiKey();
    if (!key) throw new Error('API 키가 설정되지 않았습니다.');

    const url = new URL(`${this.API_BASE}/${endpoint}`);
    params.key = key;
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  },

  // 채널 검색
  async searchChannel(query) {
    const data = await this.apiCall('search', {
      part: 'snippet',
      q: query || this.CHANNEL_NAME,
      type: 'channel',
      maxResults: '5'
    });
    return (data.items || []).map(item => ({
      id: item.id.channelId || item.snippet.channelId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.default?.url || ''
    }));
  },

  // 채널 정보 가져오기
  async getChannelInfo() {
    const channelId = this.getChannelId();
    if (!channelId) throw new Error('채널이 연결되지 않았습니다.');

    const data = await this.apiCall('channels', {
      part: 'snippet,statistics,contentDetails',
      id: channelId
    });

    if (!data.items || data.items.length === 0) throw new Error('채널을 찾을 수 없습니다.');
    const ch = data.items[0];
    return {
      id: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.medium?.url || '',
      subscriberCount: Number(ch.statistics.subscriberCount) || 0,
      videoCount: Number(ch.statistics.videoCount) || 0,
      viewCount: Number(ch.statistics.viewCount) || 0,
      uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || ''
    };
  },

  // 업로드 영상 목록 가져오기 (최대 50개)
  async getRecentVideos(maxResults = 50) {
    const channelInfo = await this.getChannelInfo();
    const playlistId = channelInfo.uploadsPlaylistId;
    if (!playlistId) throw new Error('업로드 재생목록을 찾을 수 없습니다.');

    const data = await this.apiCall('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: String(maxResults)
    });

    const videoIds = (data.items || []).map(item => item.contentDetails.videoId).filter(Boolean);
    if (videoIds.length === 0) return { channelInfo, videos: [] };

    // 영상 상세 정보 (통계 + duration)
    const videoData = await this.apiCall('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(',')
    });

    const videos = (videoData.items || []).map(v => {
      const duration = this.parseDuration(v.contentDetails.duration);
      return {
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        publishedAt: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || '',
        duration: duration, // seconds
        durationText: this.formatDuration(duration),
        isShort: duration <= 60,
        views: Number(v.statistics.viewCount) || 0,
        likes: Number(v.statistics.likeCount) || 0,
        comments: Number(v.statistics.commentCount) || 0
      };
    });

    return { channelInfo, videos };
  },

  // ISO 8601 duration -> seconds
  parseDuration(iso) {
    if (!iso) return 0;
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0);
  },

  formatDuration(seconds) {
    if (seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  // 주간별로 그룹핑
  groupByWeek(videos) {
    const weeks = {};
    videos.forEach(v => {
      const date = new Date(v.publishedAt);
      const weekStart = Storage.getWeekStart(date);
      const weekKey = Storage.formatDate(weekStart);
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekStart: weekKey,
          weekLabel: Storage.getWeekLabel(weekStart),
          videos: [],
          longVideos: [],
          shortVideos: [],
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalDuration: 0
        };
      }
      weeks[weekKey].videos.push(v);
      if (v.isShort) {
        weeks[weekKey].shortVideos.push(v);
      } else {
        weeks[weekKey].longVideos.push(v);
      }
      weeks[weekKey].totalViews += v.views;
      weeks[weekKey].totalLikes += v.likes;
      weeks[weekKey].totalComments += v.comments;
      weeks[weekKey].totalDuration += v.duration;
    });

    // 주차별 정렬 (최신 먼저)
    return Object.values(weeks).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  },

  // 캐시 저장/로드
  saveCache(data) {
    const cache = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  },

  loadCache() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      // 캐시 30분 유효
      if (Date.now() - cache.timestamp > 30 * 60 * 1000) return null;
      return cache.data;
    } catch {
      return null;
    }
  },

  clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
  }
};
