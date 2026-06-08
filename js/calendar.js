// ========================================
// Calendar Module - 월간 달력
// PD 선택 + 업무유형(일반/업로드/촬영) + 서버 공유
// ========================================
var Calendar = {
  month: null,

  COLORS: {'기획':'#667eea','촬영':'#ff4444','편집':'#ff8a00','업로드':'#48cae4','미팅':'#9b59b6','마케팅':'#e1306c','기타':'#888'},

  _timeOptions: function() {
    var opts = '';
    for (var h = 6; h <= 23; h++) {
      for (var m = 0; m < 60; m += 30) {
        var hh = (h < 10 ? '0' : '') + h;
        var mm = m === 0 ? '00' : '30';
        var ampm = h < 12 ? '오전' : '오후';
        var h12 = h <= 12 ? h : h - 12;
        if (h12 === 0) h12 = 12;
        var label = ampm + ' ' + h12 + ':' + mm;
        opts += '<option value="' + hh + ':' + mm + '">' + label + '</option>';
      }
    }
    return opts;
  },
  EMOJI: {'기획':'📋','촬영':'🎬','편집':'✂️','업로드':'📤','미팅':'💬','마케팅':'📣','기타':'📌'},
  PDS: ['양승주','배미진','조성우'],

  init: function() {
    var now = new Date();
    this.month = new Date(now.getFullYear(), now.getMonth(), 1);
    var prev = document.getElementById('prev-week');
    var next = document.getElementById('next-week');
    if (prev) prev.onclick = function() { Calendar.go(-1); };
    if (next) next.onclick = function() { Calendar.go(1); };
    this.render();
  },

  go: function(dir) {
    this.month.setMonth(this.month.getMonth() + dir);
    this.render();
  },

  render: function() {
    var y = this.month.getFullYear();
    var m = this.month.getMonth();
    var label = document.getElementById('cal-week-label');
    if (label) label.textContent = y + '년 ' + (m+1) + '월';

    var grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.className = 'calendar-grid calendar-grid-month';
    grid.innerHTML = '';

    var days = ['월','화','수','목','금','토','일'];
    for (var h = 0; h < 7; h++) {
      var hdr = document.createElement('div');
      hdr.className = 'month-day-header';
      if (h === 5) hdr.style.color = '#4a90e2';
      if (h === 6) hdr.style.color = '#ff4444';
      hdr.textContent = days[h];
      grid.appendChild(hdr);
    }

    var first = new Date(y, m, 1);
    var last = new Date(y, m+1, 0);
    var today = Storage.formatDate(new Date());
    var startDow = first.getDay() - 1;
    if (startDow < 0) startDow = 6;

    for (var e = 0; e < startDow; e++) {
      var emp = document.createElement('div');
      emp.className = 'month-day empty';
      grid.appendChild(emp);
    }

    for (var d = 1; d <= last.getDate(); d++) {
      var date = new Date(y, m, d);
      var ds = Storage.formatDate(date);
      var dow = date.getDay();
      var isToday = ds === today;
      var tasks = Storage.getTasksByDate(ds);

      var cell = document.createElement('div');
      cell.className = 'month-day' + (isToday ? ' today' : '');

      var num = document.createElement('div');
      num.className = 'month-day-num' + (isToday ? ' today-num' : '');
      if (dow === 0) num.style.color = '#ff4444';
      if (dow === 6) num.style.color = '#4a90e2';
      num.textContent = d;
      cell.appendChild(num);

      // 시간순 정렬
      tasks.sort(function(a, b) {
        var ta = a.time || '99:99';
        var tb = b.time || '99:99';
        return ta.localeCompare(tb);
      });

      var list = document.createElement('div');
      list.className = 'month-day-tasks';

      for (var t = 0; t < Math.min(tasks.length, 4); t++) {
        var task = tasks[t];
        var color = this.COLORS[task.category] || '#888';
        var chip = document.createElement('div');
        chip.className = 'month-task-chip';
        chip.style.cssText = 'background:' + color + '22;border-left:3px solid ' + color;

        // 시간 뱃지 (있으면)
        if (task.time) {
          var timeBadge = document.createElement('span');
          timeBadge.className = 'month-task-time';
          timeBadge.style.cssText = 'background:' + color + '33;color:' + color + ';';
          var tp = task.time.split(':'); var th = parseInt(tp[0]);
          var tap = th < 12 ? '오전' : '오후'; var th12 = th <= 12 ? th : th - 12; if(th12===0) th12=12;
          timeBadge.textContent = tap + th12 + ':' + tp[1];
          chip.appendChild(timeBadge);
        }

        var txt = document.createElement('span');
        txt.className = 'month-task-text';
        var pdTag = task.pd ? ' [' + task.pd + ']' : '';
        var display = (task.categoryEmoji||'📌') + ' ' + (task.text.length > 10 ? task.text.slice(0,10)+'…' : task.text) + pdTag;
        txt.textContent = display;
        txt.style.cursor = 'pointer';
        (function(tid) {
          txt.onclick = function(ev) { ev.stopPropagation(); Calendar.openEdit(tid); };
        })(task.id);
        chip.appendChild(txt);

        var del = document.createElement('span');
        del.className = 'month-task-del';
        del.textContent = '✕';
        (function(id) {
          del.onclick = function(ev) {
            ev.stopPropagation();
            Storage.deleteTask(id);
            Calendar.render();
          };
        })(task.id);
        chip.appendChild(del);
        list.appendChild(chip);
      }
      if (tasks.length > 4) {
        var more = document.createElement('div');
        more.className = 'month-task-more';
        more.textContent = '+' + (tasks.length-4);
        list.appendChild(more);
      }
      cell.appendChild(list);

      (function(dateStr) {
        cell.onclick = function(ev) {
          if (ev.target.closest('.month-task-chip')) return;
          Calendar.openAdd(dateStr);
        };
      })(ds);

      grid.appendChild(cell);
    }

    var total = startDow + last.getDate();
    var rem = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (var r = 0; r < rem; r++) {
      var e2 = document.createElement('div');
      e2.className = 'month-day empty';
      grid.appendChild(e2);
    }

    // PD별 업무 요약 아래에 표시
    this.renderPdList(y, m);
    // 서버 동기화
    Storage.syncFromServer().then(function() { Calendar.renderPdList(Calendar.month.getFullYear(), Calendar.month.getMonth()); }).catch(function(){});
  },

  renderPdList: function(y, m) {
    var el = document.getElementById('cal-pd-summary');
    if (!el) {
      var grid = document.getElementById('calendar-grid');
      if (!grid) return;
      var div = document.createElement('div');
      div.id = 'cal-pd-summary';
      div.style.cssText = 'margin-top:16px;';
      grid.parentNode.insertBefore(div, grid.nextSibling);
      el = div;
    }
    var allTasks = Storage.getTasks();
    var monthTasks = allTasks.filter(function(t) {
      var d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === y && d.getMonth() === m;
    });
    if (monthTasks.length === 0) { el.innerHTML = ''; return; }

    var colors = Calendar.COLORS;
    var dayN = ['일','월','화','수','목','금','토'];
    var pdMap = {};
    monthTasks.forEach(function(t) {
      var pd = t.pd || '';
      if (!pd) return;
      // 복수 PD 지원 (쉼표 구분)
      var names = pd.split(/[,、]\s*/);
      names.forEach(function(name) {
        name = name.trim();
        if (!name) return;
        if (!pdMap[name]) pdMap[name] = [];
        pdMap[name].push(t);
      });
    });
    var pds = Object.keys(pdMap).sort();
    if (pds.length === 0) { el.innerHTML = ''; return; }

    el.innerHTML = '<h3 style="font-size:17px;font-weight:700;margin:0 0 14px;">👥 PD별 ' + (m+1) + '월 업무</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;">' +
      pds.map(function(pd) {
        var tasks = pdMap[pd].sort(function(a,b) { return a.date.localeCompare(b.date); });
        return '<div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;">' +
          '<div style="font-weight:800;font-size:17px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">' +
            '<span style="background:#667eea;color:#fff;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;">' + pd.charAt(0) + '</span>' +
            pd + ' <span style="font-size:13px;color:#667eea;font-weight:600;margin-left:auto;">' + tasks.length + '건</span></div>' +
          tasks.map(function(t) {
            var d = new Date(t.date + 'T00:00:00');
            var c = colors[t.category] || '#888';
            var timeStr = '';
            if (t.time) {
              var p = t.time.split(':'); var h = parseInt(p[0]); var ampm = h < 12 ? '오전' : '오후';
              var h12 = h <= 12 ? h : h - 12; if (h12===0) h12=12;
              timeStr = ampm + h12 + ':' + p[1];
              if (t.timeEnd) {
                var p2 = t.timeEnd.split(':'); var h2 = parseInt(p2[0]); var ap2 = h2 < 12 ? '오전' : '오후';
                var h22 = h2 <= 12 ? h2 : h2 - 12; if (h22===0) h22=12;
                timeStr += '~' + ap2 + h22 + ':' + p2[1];
              }
            }
            return '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;font-size:14px;border-bottom:1px solid #ffffff08;">' +
              '<span style="min-width:55px;color:#8a8aa8;font-size:13px;">' + (d.getMonth()+1) + '/' + d.getDate() + '(' + dayN[d.getDay()] + ')</span>' +
              (timeStr ? '<span style="color:' + c + ';font-size:12px;font-weight:700;background:' + c + '15;padding:2px 6px;border-radius:4px;">' + timeStr + '</span>' : '') +
              '<span style="color:' + c + ';font-size:15px;">' + (t.categoryEmoji||'📌') + '</span>' +
              '<span onclick="Calendar.openEdit(\'' + t.id + '\')" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;font-weight:500;" title="클릭하여 수정">' + t.text + '</span>' +
              '<span onclick="Storage.deleteTask(\'' + t.id + '\');Calendar.render();" style="cursor:pointer;color:#666;font-size:12px;opacity:0.3;padding:4px;" onmouseover="this.style.opacity=1;this.style.color=\'#ff4444\'" onmouseout="this.style.opacity=0.3;this.style.color=\'#666\'">✕</span>' +
            '</div>';
          }).join('') +
        '</div>';
      }).join('') +
      '</div>';
  },

  openAdd: function(dateStr) {
    var d = dateStr || Storage.formatDate(new Date());
    var modal = document.getElementById('cal-add-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cal-add-modal';
      modal.className = 'modal-overlay';
      modal.style.display = 'none';
      modal.onclick = function(ev) { if (ev.target === modal) modal.style.display = 'none'; };

      var pdChecks = Calendar.PDS.map(function(p) {
        return '<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid #333;border-radius:16px;cursor:pointer;font-size:13px;color:#ccc;">' +
          '<input type="checkbox" class="cal-pd-check" value="'+p+'" style="accent-color:#667eea;"> '+p+'</label>';
      }).join(' ');

      modal.innerHTML =
        '<div class="modal" style="max-width:440px;width:92%;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
            '<h2 style="margin:0;font-size:17px;">📌 업무 추가</h2>' +
            '<button onclick="document.getElementById(\'cal-add-modal\').style.display=\'none\'" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">✕</button>' +
          '</div>' +
          '<div style="margin-bottom:10px;">' +
            '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">날짜</label>' +
            '<input type="date" id="cal-a-date" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;box-sizing:border-box;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-end;">' +
            '<div style="flex:1;">' +
              '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">시작</label>' +
              '<select id="cal-a-time" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;">' +
                '<option value="">시간 선택</option>' +
                Calendar._timeOptions() +
              '</select>' +
            '</div>' +
            '<span style="padding-bottom:12px;color:#666;">~</span>' +
            '<div style="flex:1;">' +
              '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">종료</label>' +
              '<select id="cal-a-time-end" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;">' +
                '<option value="">시간 선택</option>' +
                Calendar._timeOptions() +
              '</select>' +
            '</div>' +
            '<div style="flex:1;">' +
              '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">종일</label>' +
              '<label style="display:flex;align-items:center;gap:6px;padding:10px;border:1px solid #333;border-radius:8px;cursor:pointer;font-size:13px;color:#ccc;">' +
                '<input type="checkbox" id="cal-a-allday" onchange="var s=document.getElementById(\'cal-a-time\');var e=document.getElementById(\'cal-a-time-end\');if(this.checked){s.value=\'\';e.value=\'\';s.disabled=true;e.disabled=true}else{s.disabled=false;e.disabled=false}" style="accent-color:#667eea;"> 종일' +
              '</label>' +
            '</div>' +
          '</div>' +
          '<div style="margin-bottom:10px;">' +
            '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">업무 내용</label>' +
            '<input type="text" id="cal-a-text" placeholder="업무 내용" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;box-sizing:border-box;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
            '<div style="flex:1;">' +
              '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">유형</label>' +
              '<select id="cal-a-cat" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;">' +
                '<option value="업로드">📤 업로드 예정</option>' +
                '<option value="촬영">🎬 촬영</option>' +
                '<option value="편집">✂️ 편집</option>' +
                '<option value="기획">📋 기획</option>' +
                '<option value="미팅">💬 미팅</option>' +
                '<option value="마케팅">📣 마케팅</option>' +
                '<option value="기타">📌 기타</option>' +
              '</select>' +
            '</div>' +
            '<div style="flex:1;">' +
              '<label style="font-size:12px;color:#999;display:block;margin-bottom:3px;">담당 PD (복수 선택 가능)</label>' +
              '<div id="cal-a-pd-area" style="display:flex;gap:6px;flex-wrap:wrap;">' + pdChecks + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
            '<button class="btn btn-secondary" onclick="document.getElementById(\'cal-add-modal\').style.display=\'none\'">취소</button>' +
            '<button class="btn btn-primary" onclick="Calendar.saveAdd()">추가</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }
    document.getElementById('cal-a-date').value = d;
    document.getElementById('cal-a-text').value = '';
    modal.style.display = 'flex';
    setTimeout(function() { document.getElementById('cal-a-text').focus(); }, 100);
  },

  saveAdd: function() {
    var text = document.getElementById('cal-a-text').value.trim();
    var date = document.getElementById('cal-a-date').value;
    var time = document.getElementById('cal-a-time').value || '';
    var timeEnd = document.getElementById('cal-a-time-end').value || '';
    var cat = document.getElementById('cal-a-cat').value;
    var checks = document.querySelectorAll('.cal-pd-check:checked');
    var pds = [];
    checks.forEach(function(c) { pds.push(c.value); });
    var pd = pds.join(', ');
    if (!text) { document.getElementById('cal-a-text').focus(); return; }
    if (!date) { alert('날짜를 선택하세요.'); return; }
    if (!pd) { alert('담당 PD를 선택하세요.'); return; }

    Storage.addTask({
      text: text,
      date: date,
      time: time,
      timeEnd: timeEnd,
      category: cat,
      categoryEmoji: Calendar.EMOJI[cat] || '📌',
      pd: pd
    });

    document.getElementById('cal-add-modal').style.display = 'none';
    Calendar.render();
  },

  openEdit: function(id) {
    var task = Storage.getTasks().find(function(t) { return t.id === id; });
    if (!task) return;
    var modal = document.getElementById('cal-edit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cal-edit-modal';
      modal.className = 'modal-overlay';
      modal.style.display = 'none';
      modal.onclick = function(ev) { if (ev.target === modal) modal.style.display = 'none'; };

      var catOpts = ['업로드','촬영','편집','기획','미팅','마케팅','기타'].map(function(c) {
        return '<option value="'+c+'">'+(Calendar.EMOJI[c]||'📌')+' '+c+'</option>';
      }).join('');

      modal.innerHTML =
        '<div class="modal" style="max-width:440px;width:92%;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
            '<h2 style="margin:0;font-size:17px;">✏️ 업무 수정</h2>' +
            '<button onclick="document.getElementById(\'cal-edit-modal\').style.display=\'none\'" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">✕</button>' +
          '</div>' +
          '<input type="hidden" id="cal-e-id">' +
          '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#999;">날짜</label>' +
            '<input type="date" id="cal-e-date" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;box-sizing:border-box;"></div>' +
          '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
            '<div style="flex:1;"><label style="font-size:12px;color:#999;">시작</label>' +
              '<select id="cal-e-time" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;"><option value="">선택</option>' + Calendar._timeOptions() + '</select></div>' +
            '<div style="flex:1;"><label style="font-size:12px;color:#999;">종료</label>' +
              '<select id="cal-e-time-end" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;"><option value="">선택</option>' + Calendar._timeOptions() + '</select></div>' +
          '</div>' +
          '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#999;">업무 내용</label>' +
            '<input type="text" id="cal-e-text" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;box-sizing:border-box;"></div>' +
          '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
            '<div style="flex:1;"><label style="font-size:12px;color:#999;">유형</label>' +
              '<select id="cal-e-cat" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;">' + catOpts + '</select></div>' +
            '<div style="flex:1;"><label style="font-size:12px;color:#999;">담당 PD</label>' +
              '<input type="text" id="cal-e-pd" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f0f23;color:#e8e8f0;font-size:14px;box-sizing:border-box;" placeholder="양승주, 배미진"></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '<button class="btn btn-secondary" onclick="document.getElementById(\'cal-edit-modal\').style.display=\'none\'">취소</button>' +
            '<button class="btn btn-primary" onclick="Calendar.saveEdit()">저장</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }
    document.getElementById('cal-e-id').value = task.id;
    document.getElementById('cal-e-date').value = task.date;
    document.getElementById('cal-e-time').value = task.time || '';
    document.getElementById('cal-e-time-end').value = task.timeEnd || '';
    document.getElementById('cal-e-text').value = task.text;
    document.getElementById('cal-e-cat').value = task.category || '기타';
    document.getElementById('cal-e-pd').value = task.pd || '';
    modal.style.display = 'flex';
  },

  saveEdit: function() {
    var id = document.getElementById('cal-e-id').value;
    var text = document.getElementById('cal-e-text').value.trim();
    var date = document.getElementById('cal-e-date').value;
    var time = document.getElementById('cal-e-time').value || '';
    var timeEnd = document.getElementById('cal-e-time-end').value || '';
    var cat = document.getElementById('cal-e-cat').value;
    var pd = document.getElementById('cal-e-pd').value.trim();
    if (!text) return;
    Storage.updateTask(id, {
      text: text,
      date: date,
      time: time,
      timeEnd: timeEnd,
      category: cat,
      categoryEmoji: Calendar.EMOJI[cat] || '📌',
      pd: pd
    });
    document.getElementById('cal-edit-modal').style.display = 'none';
    Calendar.render();
    if (window._refreshPdSummary) window._refreshPdSummary();
  },

  // 호환 함수
  refresh: function() { this.render(); },
  openAddModal: function(d) { this.openAdd(d); },
  deleteTask: function(id) { Storage.deleteTask(id); this.render(); }
};
