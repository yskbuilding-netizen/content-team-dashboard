// ========================================
// Threads API Module - Meta 공식 API
// ========================================

const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const THREADS_API = 'https://graph.threads.net/v1.0';

const Threads = {
  // 환경변수 설정 여부 확인
  isConfigured() {
    return !!(THREADS_USER_ID && THREADS_ACCESS_TOKEN);
  },

  // 스레드 게시 (2단계: 컨테이너 생성 → 게시)
  async publish(text) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Threads API 미설정. .env에 THREADS_USER_ID, THREADS_ACCESS_TOKEN을 추가하세요.'
      };
    }

    try {
      // 1단계: 미디어 컨테이너 생성
      const createUrl = `${THREADS_API}/${THREADS_USER_ID}/threads`;
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: text.slice(0, 500), // 스레드 최대 500자
        access_token: THREADS_ACCESS_TOKEN
      });

      const createRes = await fetch(`${createUrl}?${createParams}`, {
        method: 'POST'
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`컨테이너 생성 실패 ${createRes.status}: ${err}`);
      }

      const { id: creationId } = await createRes.json();

      // 2단계: 게시 (잠시 대기 필요)
      await new Promise(r => setTimeout(r, 2000));

      const publishUrl = `${THREADS_API}/${THREADS_USER_ID}/threads_publish`;
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: THREADS_ACCESS_TOKEN
      });

      const publishRes = await fetch(`${publishUrl}?${publishParams}`, {
        method: 'POST'
      });

      if (!publishRes.ok) {
        const err = await publishRes.text();
        throw new Error(`게시 실패 ${publishRes.status}: ${err}`);
      }

      const result = await publishRes.json();
      return {
        success: true,
        threadId: result.id,
        url: `https://www.threads.net/@${process.env.THREADS_USERNAME || 'me'}/post/${result.id}`
      };
    } catch (err) {
      console.error('Threads publish error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 스레드 정보 조회 (연결 테스트용)
  async getMe() {
    if (!this.isConfigured()) {
      return { success: false, error: 'API 미설정' };
    }
    try {
      const res = await fetch(
        `${THREADS_API}/me?fields=id,username,threads_profile_picture_url&access_token=${THREADS_ACCESS_TOKEN}`
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

module.exports = Threads;
