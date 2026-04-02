// Unified Social Media API Integration
// YouTube & Instagram 통합 API 관리

class UnifiedSocialAPI {
    constructor() {
        this.platforms = {
            youtube: new YouTubeAPI(),
            instagram: new InstagramAPI()
        };
        this.cache = new Map();
        this.rateLimiter = new RateLimiter();
    }

    // 통합 계정 연결
    async connectAllPlatforms() {
        const results = {};
        
        try {
            // YouTube OAuth
            results.youtube = await this.platforms.youtube.authenticate();
            
            // Instagram OAuth
            results.instagram = await this.platforms.instagram.authenticate();
            
            return {
                success: true,
                platforms: results,
                message: '모든 플랫폼 연결 완료!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 통합 콘텐츠 업로드
    async uploadContent(contentData) {
        const { title, description, media, platforms } = contentData;
        const results = {};

        for (const platform of platforms) {
            try {
                if (platform === 'youtube') {
                    results.youtube = await this.platforms.youtube.uploadVideo({
                        title,
                        description,
                        videoFile: media,
                        privacy: 'public'
                    });
                } else if (platform === 'instagram') {
                    results.instagram = await this.platforms.instagram.uploadPost({
                        caption: `${title}\n\n${description}`,
                        media: media
                    });
                }
            } catch (error) {
                results[platform] = { error: error.message };
            }
        }

        return results;
    }

    // 통합 분석 데이터
    async getUnifiedAnalytics(dateRange = '30days') {
        const analytics = {};

        try {
            // YouTube 분석
            const youtubeData = await this.platforms.youtube.getAnalytics(dateRange);
            analytics.youtube = {
                subscribers: youtubeData.subscriberCount,
                views: youtubeData.viewCount,
                watchTime: youtubeData.estimatedMinutesWatched,
                revenue: youtubeData.estimatedRevenue,
                topVideos: youtubeData.topVideos
            };

            // Instagram 분석
            const instagramData = await this.platforms.instagram.getAnalytics(dateRange);
            analytics.instagram = {
                followers: instagramData.followerCount,
                reach: instagramData.reach,
                impressions: instagramData.impressions,
                engagement: instagramData.engagementRate,
                topPosts: instagramData.topPosts
            };

            // 통합 지표 계산
            analytics.combined = {
                totalFollowers: analytics.youtube.subscribers + analytics.instagram.followers,
                totalEngagement: analytics.youtube.views + analytics.instagram.impressions,
                averageEngagementRate: (
                    (analytics.youtube.views / analytics.youtube.subscribers) +
                    analytics.instagram.engagement
                ) / 2,
                platformComparison: this.calculatePlatformComparison(analytics)
            };

            return analytics;
        } catch (error) {
            throw new Error(`분석 데이터 가져오기 실패: ${error.message}`);
        }
    }

    // 플랫폼 성과 비교
    calculatePlatformComparison(analytics) {
        const youtube = analytics.youtube;
        const instagram = analytics.instagram;

        return {
            betterPerforming: youtube.views > instagram.impressions ? 'YouTube' : 'Instagram',
            growthRates: {
                youtube: this.calculateGrowthRate('youtube'),
                instagram: this.calculateGrowthRate('instagram')
            },
            recommendations: this.generateRecommendations(analytics)
        };
    }

    // 성장률 계산
    async calculateGrowthRate(platform) {
        const currentData = await this.platforms[platform].getAnalytics('7days');
        const previousData = await this.platforms[platform].getAnalytics('14days');
        
        const currentValue = platform === 'youtube' ? currentData.subscriberCount : currentData.followerCount;
        const previousValue = platform === 'youtube' ? previousData.subscriberCount : previousData.followerCount;
        
        return ((currentValue - previousValue) / previousValue * 100).toFixed(2);
    }

    // AI 기반 추천사항 생성
    generateRecommendations(analytics) {
        const recommendations = [];
        
        if (analytics.youtube.views < analytics.instagram.impressions) {
            recommendations.push('YouTube 썸네일 최적화 필요');
            recommendations.push('YouTube 제목에 키워드 추가 권장');
        }
        
        if (analytics.instagram.engagement < 3) {
            recommendations.push('Instagram 스토리 활용도 증가 필요');
            recommendations.push('해시태그 전략 재검토 권장');
        }
        
        return recommendations;
    }

    // 예약 게시 (크로스 플랫폼)
    async schedulePost(postData, scheduleTime) {
        const { title, content, media, platforms } = postData;
        
        return new Promise((resolve) => {
            const scheduledTime = new Date(scheduleTime);
            const now = new Date();
            const delay = scheduledTime.getTime() - now.getTime();
            
            setTimeout(async () => {
                const results = await this.uploadContent({
                    title,
                    description: content,
                    media,
                    platforms
                });
                
                this.notifyScheduledPostComplete(results);
                resolve(results);
            }, delay);
        });
    }

    // 알림 시스템
    notifyScheduledPostComplete(results) {
        const notification = {
            title: '예약 게시 완료',
            message: `게시물이 ${Object.keys(results).join(', ')}에 업로드되었습니다.`,
            timestamp: new Date().toISOString()
        };
        
        // 브라우저 알림
        if ('Notification' in window) {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icons/success.png'
            });
        }
    }
}

// YouTube API 클래스
class YouTubeAPI {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY || '';
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.accessToken = null;
    }

    async authenticate() {
        // YouTube OAuth 2.0 인증
        const authUrl = `https://accounts.google.com/oauth2/auth?` +
            `client_id=${process.env.YOUTUBE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
            `scope=https://www.googleapis.com/auth/youtube&` +
            `response_type=code`;
        
        window.open(authUrl, 'youtube-auth', 'width=500,height=600');
        
        return new Promise((resolve) => {
            window.addEventListener('message', (event) => {
                if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
                    this.accessToken = event.data.accessToken;
                    resolve({ success: true, platform: 'YouTube' });
                }
            });
        });
    }

    async uploadVideo(videoData) {
        const formData = new FormData();
        formData.append('video', videoData.videoFile);
        
        const metadata = {
            snippet: {
                title: videoData.title,
                description: videoData.description,
                tags: videoData.tags || []
            },
            status: {
                privacyStatus: videoData.privacy || 'public'
            }
        };
        
        formData.append('metadata', JSON.stringify(metadata));

        const response = await fetch(`${this.baseUrl}/videos?uploadType=multipart&part=snippet,status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        });

        return await response.json();
    }

    async getAnalytics(period) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - (parseInt(period) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        const response = await fetch(
            `${this.baseUrl}/reports?` +
            `ids=channel==MINE&` +
            `startDate=${startDate}&` +
            `endDate=${endDate}&` +
            `metrics=views,subscribersGained,estimatedMinutesWatched,estimatedRevenue`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            }
        );

        return await response.json();
    }

    async getChannelStats() {
        const response = await fetch(
            `${this.baseUrl}/channels?part=statistics&mine=true`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            }
        );

        const data = await response.json();
        return data.items[0].statistics;
    }
}

// Instagram API 클래스
class InstagramAPI {
    constructor() {
        this.appId = process.env.INSTAGRAM_APP_ID || '';
        this.baseUrl = 'https://graph.instagram.com';
        this.accessToken = null;
    }

    async authenticate() {
        const authUrl = `https://api.instagram.com/oauth/authorize?` +
            `client_id=${this.appId}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
            `scope=user_profile,user_media&` +
            `response_type=code`;
        
        window.open(authUrl, 'instagram-auth', 'width=500,height=600');
        
        return new Promise((resolve) => {
            window.addEventListener('message', (event) => {
                if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
                    this.accessToken = event.data.accessToken;
                    resolve({ success: true, platform: 'Instagram' });
                }
            });
        });
    }

    async uploadPost(postData) {
        // 미디어 업로드
        const mediaResponse = await fetch(`${this.baseUrl}/me/media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_url: postData.media,
                caption: postData.caption,
                access_token: this.accessToken
            })
        });

        const mediaData = await mediaResponse.json();
        
        // 게시물 발행
        const publishResponse = await fetch(`${this.baseUrl}/me/media_publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                creation_id: mediaData.id,
                access_token: this.accessToken
            })
        });

        return await publishResponse.json();
    }

    async getAnalytics(period) {
        const response = await fetch(
            `${this.baseUrl}/me/insights?` +
            `metric=reach,impressions,profile_views&` +
            `period=day&` +
            `access_token=${this.accessToken}`
        );

        return await response.json();
    }

    async getAccountInfo() {
        const response = await fetch(
            `${this.baseUrl}/me?fields=account_type,media_count&access_token=${this.accessToken}`
        );

        return await response.json();
    }
}

// Rate Limiter 클래스
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.limits = {
            youtube: { max: 10000, window: 24 * 60 * 60 * 1000 }, // 하루 10,000 요청
            instagram: { max: 200, window: 60 * 60 * 1000 } // 시간당 200 요청
        };
    }

    async checkLimit(platform) {
        const now = Date.now();
        const limit = this.limits[platform];
        
        if (!this.requests.has(platform)) {
            this.requests.set(platform, []);
        }
        
        const platformRequests = this.requests.get(platform);
        
        // 시간 윈도우 외부 요청 제거
        const validRequests = platformRequests.filter(time => now - time < limit.window);
        this.requests.set(platform, validRequests);
        
        if (validRequests.length >= limit.max) {
            throw new Error(`${platform} API 한도 초과. ${limit.window / (60 * 1000)}분 후 재시도하세요.`);
        }
        
        // 새 요청 추가
        validRequests.push(now);
        return true;
    }
}

// 전역 인스턴스 생성
const socialAPI = new UnifiedSocialAPI();

// 내보내기
window.UnifiedSocialAPI = UnifiedSocialAPI;
window.socialAPI = socialAPI;