// ========================================
// API 통합 관리자 - 실제 작동하는 API 연결
// ========================================

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

class APIManager {
  constructor() {
    this.config = {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      youtube: process.env.YOUTUBE_API_KEY,
      instagram: {
        token: process.env.INSTAGRAM_ACCESS_TOKEN,
        appId: process.env.INSTAGRAM_APP_ID,
        appSecret: process.env.INSTAGRAM_APP_SECRET,
        userId: process.env.INSTAGRAM_USER_ID
      }
    };
  }

  // ═══ AI 콘텐츠 생성기 ═══
  async generateContent(prompt, type = 'general') {
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: this.getPromptTemplate(type, prompt)
        }]
      }, {
        headers: {
          'x-api-key': this.config.anthropic,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });

      return {
        success: true,
        content: response.data.content[0].text,
        tokens: response.data.usage.output_tokens
      };
    } catch (error) {
      console.error('AI 생성 오류:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  getPromptTemplate(type, prompt) {
    const templates = {
      instagram: `인스타그램 게시물 작성해줘. 다음 내용을 바탕으로:
${prompt}

조건:
- 매력적이고 트렌디한 톤
- 해시태그 5-10개 포함
- 이모지 적절히 사용
- 최대 2200자`,

      youtube: `유튜브 콘텐츠 기획서 작성해줘:
${prompt}

포함사항:
- 제목 (클릭 유도하는)
- 썸네일 아이디어
- 영상 구성 (시작-중간-끝)
- 키워드 및 태그`,

      blog: `블로그 포스팅 작성해줘:
${prompt}

구조:
- SEO 친화적 제목
- 소개 문단
- 본문 (소제목 포함)
- 결론 및 CTA`,

      general: prompt
    };

    return templates[type] || templates.general;
  }

  // ═══ Instagram API ═══
  async getInstagramInsights() {
    try {
      const response = await axios.get(`https://graph.instagram.com/me`, {
        params: {
          fields: 'account_type,media_count,followers_count',
          access_token: this.config.instagram.token
        }
      });

      const mediaResponse = await axios.get(`https://graph.instagram.com/me/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
          limit: 10,
          access_token: this.config.instagram.token
        }
      });

      return {
        success: true,
        profile: response.data,
        recentPosts: mediaResponse.data.data
      };
    } catch (error) {
      console.error('Instagram API 오류:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async postToInstagram(mediaUrl, caption) {
    try {
      // 1단계: 미디어 업로드
      const uploadResponse = await axios.post(`https://graph.instagram.com/me/media`, {
        image_url: mediaUrl,
        caption: caption,
        access_token: this.config.instagram.token
      });

      // 2단계: 게시물 퍼블리시
      const publishResponse = await axios.post(`https://graph.instagram.com/me/media_publish`, {
        creation_id: uploadResponse.data.id,
        access_token: this.config.instagram.token
      });

      return {
        success: true,
        postId: publishResponse.data.id
      };
    } catch (error) {
      console.error('Instagram 게시 오류:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // ═══ YouTube API ═══
  async getYouTubeAnalytics() {
    try {
      // 채널 통계 (공개 API)
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
        params: {
          part: 'statistics,snippet',
          mine: true,
          key: this.config.youtube
        }
      });

      return {
        success: true,
        data: response.data.items[0]
      };
    } catch (error) {
      console.error('YouTube API 오류:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ═══ 토큰 갱신 ═══
  async refreshInstagramToken() {
    try {
      const response = await axios.get(`https://graph.instagram.com/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.config.instagram.token
        }
      });

      this.config.instagram.token = response.data.access_token;
      
      return {
        success: true,
        newToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('토큰 갱신 오류:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // ═══ 성과 분석 ═══
  async getPerformanceAnalytics() {
    try {
      const [igData, ytData] = await Promise.all([
        this.getInstagramInsights(),
        this.getYouTubeAnalytics()
      ]);

      // 성과 지표 계산
      const analytics = {
        instagram: {
          followers: igData.success ? igData.profile.followers_count : 0,
          posts: igData.success ? igData.profile.media_count : 0,
          avgLikes: 0,
          avgComments: 0,
          engagement: 0
        },
        youtube: {
          subscribers: ytData.success ? ytData.data.statistics.subscriberCount : 0,
          views: ytData.success ? ytData.data.statistics.viewCount : 0,
          videos: ytData.success ? ytData.data.statistics.videoCount : 0
        },
        overall: {
          totalFollowers: 0,
          totalEngagement: 0,
          growthRate: 0
        }
      };

      // 인스타그램 참여율 계산
      if (igData.success && igData.recentPosts.length > 0) {
        const totalLikes = igData.recentPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
        const totalComments = igData.recentPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
        
        analytics.instagram.avgLikes = Math.round(totalLikes / igData.recentPosts.length);
        analytics.instagram.avgComments = Math.round(totalComments / igData.recentPosts.length);
        analytics.instagram.engagement = ((totalLikes + totalComments) / (analytics.instagram.followers * igData.recentPosts.length) * 100).toFixed(2);
      }

      analytics.overall.totalFollowers = parseInt(analytics.instagram.followers) + parseInt(analytics.youtube.subscribers);

      return {
        success: true,
        analytics: analytics,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('성과 분석 오류:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = APIManager;