// ========================================
// Publisher Module - 워드프레스 REST API 발행
// ========================================

const WP_SITE_URL = process.env.WP_SITE_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

const Publisher = {
  // Base64 인증 헤더 생성
  getAuthHeader() {
    const credentials = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');
    return `Basic ${credentials}`;
  },

  // 워드프레스에 글 발행
  async publishToWordPress(article) {
    const { title, content, tags = [], summary = '' } = article;

    const apiUrl = `${WP_SITE_URL}/wp-json/wp/v2/posts`;

    // 태그 이름으로 태그 ID 가져오기 (없으면 생성)
    const tagIds = await this.getOrCreateTags(tags);

    const postData = {
      title,
      content,
      status: 'draft', // 기본은 임시저장 → 검토 후 publish로 변경
      excerpt: summary,
      tags: tagIds,
      categories: [], // 필요시 카테고리 ID 추가
    };

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify(postData)
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`WordPress API error ${res.status}: ${errBody}`);
      }

      const post = await res.json();
      return {
        success: true,
        postId: post.id,
        postUrl: post.link,
        editUrl: `${WP_SITE_URL}/wp-admin/post.php?post=${post.id}&action=edit`,
        status: post.status
      };
    } catch (err) {
      console.error('WordPress publish error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 임시저장된 글을 발행 상태로 변경
  async publishDraft(postId) {
    const apiUrl = `${WP_SITE_URL}/wp-json/wp/v2/posts/${postId}`;

    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify({ status: 'publish' })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Publish error ${res.status}: ${errBody}`);
      }

      const post = await res.json();
      return {
        success: true,
        postId: post.id,
        postUrl: post.link,
        status: 'publish'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // 태그 이름 → ID 변환 (없으면 생성)
  async getOrCreateTags(tagNames) {
    const ids = [];
    for (const name of tagNames.slice(0, 10)) {
      const trimmed = name.trim().replace(/^#/, '');
      if (!trimmed) continue;

      try {
        // 기존 태그 검색
        const searchRes = await fetch(
          `${WP_SITE_URL}/wp-json/wp/v2/tags?search=${encodeURIComponent(trimmed)}`,
          { headers: { 'Authorization': this.getAuthHeader() } }
        );
        const existing = await searchRes.json();

        if (Array.isArray(existing) && existing.length > 0) {
          ids.push(existing[0].id);
        } else {
          // 새 태그 생성
          const createRes = await fetch(`${WP_SITE_URL}/wp-json/wp/v2/tags`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.getAuthHeader()
            },
            body: JSON.stringify({ name: trimmed })
          });
          if (createRes.ok) {
            const newTag = await createRes.json();
            ids.push(newTag.id);
          }
        }
      } catch (err) {
        console.error(`Tag error (${trimmed}):`, err.message);
      }
    }
    return ids;
  },

  // 최근 발행 글 목록
  async getRecentPosts(count = 5) {
    try {
      const res = await fetch(
        `${WP_SITE_URL}/wp-json/wp/v2/posts?per_page=${count}&status=publish,draft`,
        { headers: { 'Authorization': this.getAuthHeader() } }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const posts = await res.json();
      return posts.map(p => ({
        id: p.id,
        title: p.title.rendered,
        status: p.status,
        date: p.date,
        url: p.link
      }));
    } catch (err) {
      return { error: err.message };
    }
  }
};

module.exports = Publisher;
