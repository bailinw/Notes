(function () {
  'use strict';
  var OC = window.OC;

  /* ---------------- 设定列表渲染 ---------------- */
  OC.renderLibrary = async function () {
    var libSearch = document.getElementById('librarySearch');
    var q = libSearch ? libSearch.value.trim().toLowerCase() : '';
    var tab = OC.state.libraryTab;
    var list = [];

    if (tab === 'worldview') list = await OC.DB.listWorldviews();
    else if (tab === 'character') list = await OC.DB.listCharacters();
    else if (tab === 'map') list = await OC.DB.listMaps();

    list = list.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    OC.cardSubtitle._wvMap = await OC.worldviewNameMap();

    var countEl = document.getElementById('count');
    countEl.textContent = list.length ? list.length + ' 条' : '';

    var notesEl = document.getElementById('notes');
    var emptyEl = document.getElementById('empty');
    var msg = OC.EMPTY_MSG[tab];

    if (!list.length) {
      notesEl.innerHTML = '';
      emptyEl.classList.add('show');
      emptyEl.querySelector('p').textContent = q ? '没有找到' + OC.TAB_LABEL[tab] : msg[0];
      emptyEl.querySelector('span').textContent = q ? '换个关键词试试' : msg[1];
      return;
    }

    var filtered = list;
    if (q) filtered = await OC.filterBySearch(list, q);

    if (!filtered.length) {
      notesEl.innerHTML = '';
      emptyEl.classList.add('show');
      emptyEl.querySelector('p').textContent = '没有找到' + OC.TAB_LABEL[tab];
      emptyEl.querySelector('span').textContent = '换个关键词试试';
      return;
    }

    emptyEl.classList.remove('show');
    var frag = document.createDocumentFragment();
    filtered.forEach(function (item) { frag.appendChild(OC.renderCard(item)); });
    notesEl.innerHTML = '';
    notesEl.appendChild(frag);
  };

  OC.filterBySearch = async function (list, q) {
    var tab = OC.state.libraryTab;
    if (tab === 'worldview') {
      return list.filter(function (w) { return ((w.name || '') + ' ' + (w.summary || '') + ' ' + (w.settings || '') + ' ' + ((w.tags || []).join(' '))).toLowerCase().indexOf(q) !== -1; });
    }
    if (tab === 'character') {
      var wvMap = await OC.worldviewNameMap();
      return list.filter(function (ch) {
        var wvName = wvMap[ch.worldviewId] || '未归属';
        return ((ch.name || '') + ' ' + (ch.appearance || '') + ' ' + (ch.personality || '') + ' ' + (ch.background || '') + ' ' + ((ch.tags || []).join(' ')) + ' ' + wvName).toLowerCase().indexOf(q) !== -1;
      });
    }
    if (tab === 'map') {
      var wvMap2 = await OC.worldviewNameMap();
      return list.filter(function (mp) {
        var wvName = wvMap2[mp.worldviewId] || '未归属';
        var placeNames = (mp.places || []).map(function (p) { return p.name; }).join(' ');
        return ((mp.name || '') + ' ' + wvName + ' ' + placeNames).toLowerCase().indexOf(q) !== -1;
      });
    }
    return list;
  };

  OC.renderCard = function (item) {
    var card = document.createElement('article');
    card.className = 'note';
    card.dataset.id = item.id;

    var head = document.createElement('div');
    head.className = 'note-head';

    var title = document.createElement('div');
    title.className = 'note-title';
    title.textContent = item.name || '未命名';

    var time = document.createElement('div');
    time.className = 'note-time';
    time.textContent = OC.formatTime(item.updatedAt);

    head.appendChild(title);
    head.appendChild(time);

    if (OC.state.libraryTab === 'map' && item.imageUrl) {
      var thumb = document.createElement('img');
      thumb.className = 'note-thumb';
      thumb.src = item.imageUrl;
      thumb.alt = '';
      thumb.onerror = function () { thumb.style.display = 'none'; };
      head.insertBefore(thumb, title);
    }

    var preview = document.createElement('p');
    preview.className = 'note-preview';
    preview.textContent = OC.cardSubtitle(item);

    card.appendChild(head);
    card.appendChild(preview);
    return card;
  };

  OC.cardSubtitle = function (item) {
    var tab = OC.state.libraryTab;
    if (tab === 'worldview') return OC.truncate(item.summary, 60) || '暂无简介';
    if (tab === 'character') {
      var wvName = (OC.cardSubtitle._wvMap || {})[item.worldviewId] || '未归属';
      var pers = OC.truncate(item.personality, 40);
      return wvName + (pers ? ' · ' + pers : '');
    }
    if (tab === 'map') {
      var wvName2 = (OC.cardSubtitle._wvMap || {})[item.worldviewId] || '未归属';
      return wvName2 + ' · ' + (item.places || []).length + ' 个地点';
    }
    return '';
  };

  /* ---------------- 编辑器表单生成 ---------------- */
  OC.worldviewForm = function (wv) {
    wv = wv || { name: '', summary: '', settings: '', tags: [] };
    return '<div class="field"><label class="field-label">名称</label><input id="f-name" value="' + OC.esc(wv.name) + '" placeholder="世界观名称" /></div>' +
      '<div class="field"><label class="field-label">简介</label><textarea id="f-summary" placeholder="一句话简介…">' + OC.esc(wv.summary) + '</textarea></div>' +
      '<div class="field"><label class="field-label">详细设定</label><textarea id="f-settings" placeholder="规则、历史、地理…">' + OC.esc(wv.settings) + '</textarea></div>' +
      '<div class="field"><label class="field-label">标签（逗号分隔）</label><input id="f-tags" value="' + OC.esc((wv.tags || []).join(', ')) + '" placeholder="奇幻, 科幻" /></div>';
  };

  OC.characterForm = function (ch, wvs) {
    ch = ch || { name: '', worldviewId: '', age: '', gender: '', appearance: '', personality: '', background: '', tags: [] };
    return '<div class="field"><label class="field-label">名称</label><input id="f-name" value="' + OC.esc(ch.name) + '" placeholder="角色名" /></div>' +
      '<div class="field"><label class="field-label">所属世界观</label><select id="f-worldview">' + OC.worldviewSelectOptions(wvs, ch.worldviewId) + '</select></div>' +
      '<div class="row-2">' +
      '<div class="field"><label class="field-label">年龄</label><input id="f-age" value="' + OC.esc(ch.age) + '" /></div>' +
      '<div class="field"><label class="field-label">性别</label><input id="f-gender" value="' + OC.esc(ch.gender) + '" /></div>' +
      '</div>' +
      '<div class="field"><label class="field-label">外貌</label><textarea id="f-appearance" placeholder="外貌特征…">' + OC.esc(ch.appearance) + '</textarea></div>' +
      '<div class="field"><label class="field-label">性格</label><textarea id="f-personality" placeholder="性格特点…">' + OC.esc(ch.personality) + '</textarea></div>' +
      '<div class="field"><label class="field-label">背景</label><textarea id="f-background" placeholder="角色背景故事…">' + OC.esc(ch.background) + '</textarea></div>' +
      '<div class="field"><label class="field-label">标签（逗号分隔）</label><input id="f-tags" value="' + OC.esc((ch.tags || []).join(', ')) + '" /></div>';
  };

  OC.mapForm = function (mp, wvs) {
    mp = mp || { name: '', worldviewId: '', imageUrl: '', places: [] };
    var placesHtml = '';
    var places = mp.places && mp.places.length ? mp.places : [{ name: '', desc: '' }];
    places.forEach(function (p) { placesHtml += placeRowHtml(p); });
    return '<div class="field"><label class="field-label">名称</label><input id="f-name" value="' + OC.esc(mp.name) + '" placeholder="地图名" /></div>' +
      '<div class="field"><label class="field-label">所属世界观</label><select id="f-worldview">' + OC.worldviewSelectOptions(wvs, mp.worldviewId) + '</select></div>' +
      '<div class="field">' +
      '<label class="field-label">图片链接</label>' +
      '<input id="f-imageurl" value="' + OC.esc(mp.imageUrl || '') + '" placeholder="粘贴图片 URL" />' +
      '<img id="f-imgpreview" class="img-preview" style="display:none;" alt="" />' +
      '</div>' +
      '<div class="field">' +
      '<label class="field-label">地点</label>' +
      '<div id="placeList">' + placesHtml + '</div>' +
      '<button class="add-place" id="addPlace" type="button">+ 添加地点</button>' +
      '</div>';
  };

  function placeRowHtml(p) {
    return '<div class="place">' +
      '<input class="p-name" value="' + OC.esc(p.name) + '" placeholder="地点名" />' +
      '<input class="p-desc" value="' + OC.esc(p.desc) + '" placeholder="描述" />' +
      '<button class="p-del" type="button" aria-label="删除">×</button>' +
      '</div>';
  }

  OC.bindMapEvents = function () {
    var formBody = document.getElementById('formBody');
    var imgInput = formBody.querySelector('#f-imageurl');
    var imgPreview = formBody.querySelector('#f-imgpreview');
    function refreshPreview() {
      var url = imgInput.value.trim();
      if (url) { imgPreview.src = url; imgPreview.style.display = 'block'; }
      else { imgPreview.style.display = 'none'; imgPreview.src = ''; }
    }
    imgInput.addEventListener('input', refreshPreview);
    refreshPreview();

    var placeList = formBody.querySelector('#placeList');
    placeList.addEventListener('click', function (e) {
      var del = e.target.closest('.p-del');
      if (del) { var row = del.closest('.place'); if (row) row.remove(); }
    });
    formBody.querySelector('#addPlace').addEventListener('click', function () {
      placeList.insertAdjacentHTML('beforeend', placeRowHtml({ name: '', desc: '' }));
    });
  };

  /* ---------------- @ 提及选择器 ---------------- */
  OC.openMentionSheet = function () {
    var mentionSheet = document.getElementById('mentionSheet');
    var mentionSearch = document.getElementById('mentionSearch');
    mentionSheet.hidden = false;
    mentionSearch.value = '';
    OC.renderMentionList('');
  };

  OC.closeMentionSheet = function () {
    var mentionSheet = document.getElementById('mentionSheet');
    mentionSheet.hidden = true;
  };

  OC.renderMentionList = async function (q) {
    var wvs = await OC.DB.listWorldviews();
    var chs = await OC.DB.listCharacters();
    var mps = await OC.DB.listMaps();

    var groups = [
      { label: '世界观', type: 'worldview', items: wvs },
      { label: '角色', type: 'character', items: chs },
      { label: '地图', type: 'map', items: mps }
    ];

    var html = '';
    var any = false;
    groups.forEach(function (g) {
      var filtered = q ? g.items.filter(function (it) { return (it.name || '').toLowerCase().indexOf(q) !== -1; }) : g.items;
      if (!filtered.length) return;
      any = true;
      html += '<div class="sheet-group">' + g.label + '</div>';
      filtered.forEach(function (it) {
        html += '<div class="sheet-item" data-type="' + g.type + '" data-id="' + it.id + '" data-name="' + OC.esc(it.name) + '">' + OC.esc(it.name || '未命名') + '</div>';
      });
    });

    if (!any) html = '<div style="text-align:center;padding:40px 0;color:var(--label-3);">还没有设定内容</div>';

    var mentionList = document.getElementById('mentionList');
    mentionList.innerHTML = html;
  };
})();