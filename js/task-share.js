// ========================================
// Task Share Module - 업무 내보내기/가져오기
// ========================================
const TaskShare = {
  exportTasks() {
    var tasks = Storage.getTasks();
    var chatHistory = Storage.getChatHistory();
    var data = {
      exportDate: new Date().toISOString(),
      exportBy: '콘텐츠팀',
      tasks: tasks,
      chatHistory: chatHistory
    };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '업무기록_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('업무 기록이 다운로드되었습니다. 팀원에게 파일을 공유하세요!');
  },

  importTasks(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.tasks) {
          alert('올바른 업무 기록 파일이 아닙니다.');
          return;
        }

        // 기존 업무와 합치기 (중복 제거)
        var existingTasks = Storage.getTasks();
        var existingIds = new Set(existingTasks.map(function(t) { return t.id; }));
        var newTasks = data.tasks.filter(function(t) { return !existingIds.has(t.id); });
        var merged = existingTasks.concat(newTasks);
        localStorage.setItem('ct_tasks', JSON.stringify(merged));

        // 채팅 기록도 합치기
        if (data.chatHistory) {
          var existingChat = Storage.getChatHistory();
          var existingChatIds = new Set(existingChat.map(function(c) { return c.id; }));
          var newChat = data.chatHistory.filter(function(c) { return !existingChatIds.has(c.id); });
          var mergedChat = existingChat.concat(newChat);
          localStorage.setItem('ct_chat', JSON.stringify(mergedChat));
        }

        alert('업무 ' + newTasks.length + '건이 추가되었습니다! (총 ' + merged.length + '건)');
        location.reload();
      } catch (err) {
        alert('파일 읽기 실패: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
};
