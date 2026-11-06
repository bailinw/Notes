(function () {
  'use strict';
  var OC = window.OC;

  /* ---------------- 笔记列表渲染 ---------------- */
  OC.renderNotes = async function () {
    var el = document.getElementById('notesSearch');
    var q = el ? el.value.trim().toLowerCase() : '';
    var list = await OC.DB.listNotes();
    list = list.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    if (q) {
      list = list.filter(function (n) { return ((n.title || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) !== -1; });
    }

    var notesListEl = document.getElementById('notesList');
    var notesEmptyEl = document.getElementById('notesEmpty');

    if (!list.length) {
      notesListEl.innerHTML = '';
      notesEmptyEl.classList.add('show');
      notesEmptyEl.querySelector('p').textContent = q ? '没有找到笔记' : '还没有笔记';
      notesEmptyEl.querySelector('span').textContent = q ? '换个关键词试试' : '点击右下角的 + 开始记录';
      return;
    }

    notesEmptyEl.classList.remove('show');
    var frag = document.createDocumentFragment();
    list.forEach(function (note) { frag.appendChild(OC.renderNoteCard(note)); });
    notesListEl.innerHTML = '';
    notesListEl.appendChild(frag);
  };

  OC.renderNoteCard = function (note) {
    var card = document.createElement('article');
    card.className = 'note';
    card.dataset.id = note.id;

    var head = document.createElement('div');
    head.className = 'note-head';

    var title = document.createElement('div');
    title.className = 'note-title' + (note.title ? '' : ' untitled');
    title.textContent = note.title || '新建笔记';

    var time = document.createElement('div');
    time.className = 'note-time';
    time.textContent = OC.formatTime(note.updatedAt);

    head.appendChild(title);
    head.appendChild(time);

    var preview = document.createElement('p');
    preview.className = 'note-preview';
    preview.innerHTML = OC.renderBodyPreview(note.body, note.mentions);

    card.appendChild(head);
    card.appendChild(preview);
    return card;
  };

  OC.renderBodyPreview = function (body, mentions) {
    body = body || '';
    var parts = [];
    var re = /@([^\s@\uff0c\u3002\uff01\uff1f\u3001,.!?]{1,20})/g;
    var lastIndex = 0;
    var m;
    while ((m = re.exec(body)) !== null) {
      var name = m[1];
      parts.push(OC.esc(body.slice(lastIndex, m.index)));
      if (mentions && mentions[name]) {
        var ent = mentions[name];
        parts.push('<span class="mention" data-type="' + ent.type + '" data-id="' + ent.id + '">@' + OC.esc(name) + '</span>');
      } else {
        parts.push(OC.esc('@' + name));
      }
      lastIndex = re.lastIndex;
    }
    parts.push(OC.esc(body.slice(lastIndex)));
    return parts.join('');
  };
})();