// 검색 시스템
class SearchSystem {
  constructor() {
    this.searchData = {};
    this.init();
  }

  init() {
    this.createSearchBar();
    this.buildSearchIndex();
  }

  createSearchBar() {
    const searchBar = document.createElement('div');
    searchBar.id = 'global-search';
    searchBar.innerHTML = `
      <style>
        .global-search {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: none;
        }
        
        .search-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          width: 500px;
          max-width: 90vw;
          overflow: hidden;
        }
        
        .search-input {
          width: 100%;
          padding: 16px;
          border: none;
          outline: none;
          font-size: 16px;
          background: transparent;
        }
        
        .search-results {
          max-height: 400px;
          overflow-y: auto;
          border-top: 1px solid #f0f0f0;
        }
        
        .search-result {
          padding: 12px 16px;
          border-bottom: 1px solid #f8f8f8;
          cursor: pointer;
        }
        
        .search-result:hover {
          background: #f8f9fa;
        }
        
        .result-title {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .result-content {
          font-size: 13px;
          color: #666;
        }
        
        .result-meta {
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        }
      </style>
      
      <div class="global-search">
        <div class="search-container">
          <input type="text" class="search-input" placeholder="작업, 메모, 콘텐츠 검색..." id="search-input">
          <div class="search-results" id="search-results"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(searchBar);
    this.attachSearchListeners();
  }

  attachSearchListeners() {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.querySelector('.global-search');
    
    // Ctrl+K로 검색창 열기
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.showSearch();
      }
      if (e.key === 'Escape') {
        this.hideSearch();
      }
    });

    // 검색 입력
    searchInput.addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });

    // 외부 클릭시 닫기
    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        this.hideSearch();
      }
    });
  }

  showSearch() {
    const searchContainer = document.querySelector('.global-search');
    const searchInput = document.getElementById('search-input');
    
    searchContainer.style.display = 'block';
    searchInput.focus();
    searchInput.select();
  }

  hideSearch() {
    document.querySelector('.global-search').style.display = 'none';
  }

  buildSearchIndex() {
    this.searchData = {
      tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
      notes: JSON.parse(localStorage.getItem('chat-messages') || '[]'),
      contents: JSON.parse(localStorage.getItem('content-items') || '[]')
    };
  }

  performSearch(query) {
    if (!query.trim()) {
      document.getElementById('search-results').innerHTML = '';
      return;
    }

    const results = [];
    const queryLower = query.toLowerCase();

    // 작업 검색
    this.searchData.tasks.forEach(task => {
      if (task.title.toLowerCase().includes(queryLower) || 
          (task.description && task.description.toLowerCase().includes(queryLower))) {
        results.push({
          type: 'task',
          title: task.title,
          content: task.description || '',
          meta: `작업 • ${task.platform} • ${task.status}`,
          data: task
        });
      }
    });

    // 메모/채팅 검색
    this.searchData.notes.forEach(note => {
      if (note.text && note.text.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'note',
          title: note.text.substring(0, 50) + '...',
          content: note.text,
          meta: `메모 • ${new Date(note.timestamp).toLocaleDateString()}`,
          data: note
        });
      }
    });

    this.renderResults(results.slice(0, 10)); // 최대 10개만 표시
  }

  renderResults(results) {
    const container = document.getElementById('search-results');
    
    if (results.length === 0) {
      container.innerHTML = '<div class="search-result">검색 결과가 없습니다.</div>';
      return;
    }

    container.innerHTML = results.map(result => `
      <div class="search-result" onclick="searchSystem.selectResult('${result.type}', ${JSON.stringify(result.data).replace(/"/g, '&quot;')})">
        <div class="result-title">${result.title}</div>
        <div class="result-content">${result.content}</div>
        <div class="result-meta">${result.meta}</div>
      </div>
    `).join('');
  }

  selectResult(type, data) {
    this.hideSearch();
    
    if (type === 'task') {
      // 해당 작업으로 이동
      notifications.info('검색 결과', `"${data.title}" 작업을 찾았습니다.`);
    } else if (type === 'note') {
      // 해당 메모로 이동
      notifications.info('검색 결과', '메모를 찾았습니다.');
    }
  }
}

// 전역 인스턴스
const searchSystem = new SearchSystem();
window.searchSystem = searchSystem;