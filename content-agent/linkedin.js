// ========================================
// LinkedIn API Module - 게시물 자동 발행
// ========================================

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_USER_ID = process.env.LINKEDIN_USER_ID; // URN ID (person:xxxx 형태)
const LINKEDIN_ORG_ID = process.env.LINKEDIN_ORG_ID;   // 선택: 회사 페이지 ID

const LinkedIn = {
  isConfigured() {
    return !!(LINKEDIN_ACCESS_TOKEN && LINKEDIN_USER_ID);
  },

  // 내 정보 조회 (토큰 테스트용)
  async getMe() {
    if (!LINKEDIN_ACCESS_TOKEN) {
      return { success: false, error: 'LINKEDIN_ACCESS_TOKEN 미설정' };
    }
    try {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}` }
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }
      const data = await res.json();
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // 게시물 작성 (개인 프로필 또는 회사 페이지)
  async publish(text, options = {}) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'LinkedIn API 미설정. .env에 LINKEDIN_ACCESS_TOKEN, LINKEDIN_USER_ID를 추가하세요.'
      };
    }

    // 회사 페이지로 게시할지, 개인으로 게시할지 결정
    const postAs = options.asOrganization && LINKEDIN_ORG_ID
      ? `urn:li:organization:${LINKEDIN_ORG_ID}`
      : `urn:li:person:${LINKEDIN_USER_ID}`;

    const body = {
      author: postAs,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text.slice(0, 3000) // LinkedIn 3000자 제한
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    try {
      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }

      const postId = res.headers.get('x-restli-id') || (await res.json()).id;
      return {
        success: true,
        postId,
        url: `https://www.linkedin.com/feed/update/${postId}/`
      };
    } catch (err) {
      console.error('LinkedIn publish error:', err.message);
      return { success: false, error: err.message };
    }
  }
};

module.exports = LinkedIn;
