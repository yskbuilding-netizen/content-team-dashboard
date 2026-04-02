// ========================================
// App Module - Main Controller
// ========================================
const App = {
  currentPage: 'dashboard',

  init() {
    this.bindNavigation();
    Chatbot.init();
    Calendar.init();
    Dashboard.init();
    ContentBoard.init();
    Instagram.init();
    TeamSync.init();

    // Check URL hash or default to content-board
    const hash = window.location.hash.slice(1);
    if (['chatbot','calendar','dashboard','content-board','instagram','tiktok','blog','tistory','wordpress','leads','competitors','ads'].includes(hash)) {
      this.switchPage(hash);
    } else {
      this.switchPage('dashboard');
    }

    // Set today's date as default for stat input
    const dateInput = document.getElementById('stat-date');
    if (dateInput) dateInput.value = Storage.formatDate(new Date());
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.switchPage(item.dataset.page);
      });
    });
  },

  switchPage(page) {
    this.currentPage = page;
    window.location.hash = page;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `${page}-page`);
    });

    if (page === 'calendar') { Calendar.refresh(); Chatbot.scrollToBottom(); }
    if (page === 'dashboard') Dashboard.refresh();
    if (page === 'content-board') ContentBoard.refresh();
    if (page === 'instagram') Instagram.refresh();
    if (page === 'chatbot') Chatbot.scrollToBottom();
    if (['leads','competitors','ads'].includes(page)) Marketing.refreshPage(page);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
