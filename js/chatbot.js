// ========================================
// Chatbot Module
// ========================================
const Chatbot = {
  categories: [
    { keywords: ['유튜브', 'youtube', '영상', '편집', '촬영', '자막', '썸네일', '쇼츠', 'shorts'], name: '유튜브', emoji: '🎬', color: '#ff4444' },
    { keywords: ['인스타', 'instagram', '릴스', '피드', '스토리', '카드뉴스', '인스타그램'], name: '인스타그램', emoji: '📸', color: '#e1306c' },
    { keywords: ['블로그', '포스팅', '글', '원고', '작성', '기사', '아티클'], name: '블로그', emoji: '📝', color: '#4fc3f7' },
    { keywords: ['기획', '회의', '미팅', '전략', '브리핑', '보고', '리서치', '분석'], name: '기획', emoji: '💼', color: '#ffab40' },
    { keywords: ['디자인', '배너', '로고', '시안', '이미지', '포스터', '그래픽'], name: '디자인', emoji: '🎨', color: '#ab47bc' },
    { keywords: ['광고', '마케팅', '프로모션', '캠페인', '홍보', '협찬', '제휴'], name: '마케팅', emoji: '📢', color: '#66bb6a' },
    { keywords: ['tiktok', '틱톡'], name: '틱톡', emoji: '🎵', color: '#00f2ea' }
  ],

  responses: {
    greeting: [
      '등록 완료! 오늘도 수고하셨어요 💪',
      '저장했습니다! 잘 하고 계시네요 ✨',
      '기록 완료! 꾸준히 하는 게 최고예요 👍',
      '멋져요! 기록해뒀어요 🎯',
      '확인! 잘 저장해뒀습니다 📋'
    ]
  },

  detectCategory(text) {
    const lower = text.toLowerCase();
    for (const cat of this.categories) {
      if (cat.keywords.some(kw => lower.includes(kw))) {
        return cat;
      }
    }
    return { name: '기타', emoji: '📌', color: '#8a8aa8' };
  },

  getResponse(category) {
    const base = this.responses.greeting[Math.floor(Math.random() * this.responses.greeting.length)];
    return `${category.emoji} [${category.name}] ${base}`;
  },

  init() {
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');

    this.loadHistory();
    this.bindEvents();
  },

  loadHistory() {
    const history = Storage.getChatHistory();
    if (history.length === 0) {
      this.showWelcome();
    } else {
      history.forEach(msg => {
        this.renderMessage(msg.text, msg.type, msg.category, msg.timestamp);
      });
      this.scrollToBottom();
    }
  },

  showWelcome() {
    const welcomeText = `안녕하세요! 콘텐츠팀 업무 관리 봇이에요 🤖

오늘 한 업무를 자유롭게 입력해 주세요!

💡 예시:
• "유튜브 영상 편집 완료"
• "인스타 릴스 3개 업로드"
• "블로그 포스팅 초안 작성"

아래 빠른 입력 버튼도 활용해보세요! 👇`;
    this.renderMessage(welcomeText, 'bot', null, new Date().toISOString());
  },

  renderMessage(text, type, category, timestamp) {
    const time = new Date(timestamp);
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${type}`;

    let categoryBadge = '';
    if (category && type === 'user') {
      categoryBadge = `<span class="chat-category-badge">${category.emoji || '📌'} ${category.name || category}</span>`;
    }

    if (type === 'bot') {
      msgDiv.innerHTML = `
        <div class="chat-avatar">🤖</div>
        <div>
          <div class="chat-bubble">${text.replace(/\n/g, '<br>')}</div>
          <div class="chat-meta">${timeStr}</div>
        </div>
      `;
    } else {
      msgDiv.innerHTML = `
        <div>
          <div class="chat-bubble">${text.replace(/\n/g, '<br>')}</div>
          <div class="chat-meta">
            ${categoryBadge}
            ${timeStr}
          </div>
        </div>
      `;
    }

    this.messagesEl.appendChild(msgDiv);
  },

  // URL 추출
  extractUrl(text) {
    const match = text.match(/(https?:\/\/[^\s]+)/);
    return match ? match[1] : '';
  },

  // URL 제거한 텍스트 (표시용)
  cleanText(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
  },

  handleSend() {
    const text = this.inputEl.value.trim();
    if (!text) return;

    // Detect category
    const category = this.detectCategory(text);
    const url = this.extractUrl(text);
    const cleanText = this.cleanText(text);

    // Render & save user message
    const now = new Date().toISOString();
    this.renderMessage(text, 'user', category, now);
    Storage.addChatMessage({ text, type: 'user', category });

    // Save as task (URL 포함)
    Storage.addTask({
      text: cleanText || text,
      url: url,
      category: category.name,
      categoryEmoji: category.emoji
    });

    // 팀 동기화
    if (typeof TeamSync !== 'undefined') TeamSync.onTaskAdded();

    // Clear input
    this.inputEl.value = '';
    this.scrollToBottom();

    // Bot response after delay
    setTimeout(() => {
      let response = this.getResponse(category);
      if (url) response += `\n🔗 링크가 함께 저장되었어요!`;
      this.renderMessage(response, 'bot', null, new Date().toISOString());
      Storage.addChatMessage({ text: response, type: 'bot' });
      this.scrollToBottom();
    }, 400);
  },

  scrollToBottom() {
    setTimeout(() => {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }, 50);
  },

  bindEvents() {
    this.sendBtn.addEventListener('click', () => this.handleSend());

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Quick action buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prefix = btn.dataset.prefix;
        this.inputEl.value = prefix;
        this.inputEl.focus();
      });
    });
  }
};
