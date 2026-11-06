(function () {
  'use strict';

  /* ---------------- Supabase 客户端 ---------------- */
  const SUPABASE_URL = 'https://wkotfzmgjunryporolwj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Y-71alwruk8ImQ_L5RroYg__w5GbnMe';
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------------- 数据层 DB ---------------- */
  const DB = (function () {
    const KEY = 'oc-db-cache';
    const cache = { worldviews: [], characters: [], maps: [], notes: [] };

    function persistCache() {
      try { localStorage.setItem(KEY, JSON.stringify(cache)); }
      catch (e) { console.warn('缓存失败', e); }
    }

    function mapWorldview(row) {
      return { id: row.id, name: row.name, summary: row.summary, settings: row.settings, tags: row.tags ? JSON.parse(row.tags) : [], createdAt: row.created_at, updatedAt: row.updated_at };
    }
    function mapCharacter(row) {
      return { id: row.id, name: row.name, worldviewId: row.worldview_id, age: row.age, gender: row.gender, appearance: row.appearance, personality: row.personality, background: row.background, tags: row.tags ? JSON.parse(row.tags) : [], createdAt: row.created_at, updatedAt: row.updated_at };
    }
    function mapMap(row) {
      return { id: row.id, name: row.name, worldviewId: row.worldview_id, imageUrl: row.image_url, places: row.places || [], createdAt: row.created_at, updatedAt: row.updated_at };
    }
    function mapNote(row) {
      return { id: row.id, title: row.title, body: row.body, mentions: Array.isArray(row.mentions) ? {} : (row.mentions || {}), createdAt: row.created_at, updatedAt: row.updated_at };
    }

    function upsert(arr, rec) {
      const i = arr.findIndex(o => o.id === rec.id);
      if (i >= 0) arr[i] = rec; else arr.push(rec);
    }

    return {
      init: async function () {
        try {
          const raw = localStorage.getItem(KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) {
              cache.worldviews = parsed.worldviews || [];
              cache.characters = parsed.characters || [];
              cache.maps = parsed.maps || [];
              cache.notes = parsed.notes || [];
            }
          }
        } catch (e) { /* ignore */ }

        try {
          const [w, c, m, n] = await Promise.all([
            sb.from('worldviews').select('*').is('deleted_at', null),
            sb.from('characters').select('*').is('deleted_at', null),
            sb.from('maps').select('*').is('deleted_at', null),
            sb.from('notes').select('*').is('deleted_at', null)
          ]);
          if (w.error) throw w.error;
          if (c.error) throw c.error;
          if (m.error) throw m.error;
          if (n.error) throw n.error;
          cache.worldviews = w.data.map(mapWorldview);
          cache.characters = c.data.map(mapCharacter);
          cache.maps = m.data.map(mapMap);
          cache.notes = n.data.map(mapNote);
          persistCache();
        } catch (e) {
          console.warn('拉取最新数据失败，继续使用缓存', e);
        }
      },

      listWorldviews() {
        return cache.worldviews.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      },
      getWorldview(id) {
        return cache.worldviews.find(o => o.id === id) || null;
      },
      saveWorldview(obj) {
        const now = new Date().toISOString();
        const existing = obj.id ? cache.worldviews.find(o => o.id === obj.id) : null;
        const rec = {
          id: obj.id || uid(),
          name: obj.name,
          summary: obj.summary,
          settings: obj.settings,
          tags: obj.tags || [],
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now
        };
        upsert(cache.worldviews, rec);
        persistCache();
        const payload = { name: rec.name, summary: rec.summary, settings: rec.settings, tags: JSON.stringify(rec.tags) };
        if (obj.id) {
          sb.from('worldviews').update(payload).eq('id', obj.id).then(() => {}).catch(e => console.warn('同步世界观失败', e));
        } else {
          payload.id = rec.id;
          sb.from('worldviews').insert(payload).then(() => {}).catch(e => console.warn('同步世界观失败', e));
        }
        return rec;
      },
      deleteWorldview(id) {
        cache.worldviews = cache.worldviews.filter(o => o.id !== id);
        persistCache();
        sb.from('worldviews').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(() => {}).catch(e => console.warn('删除世界观失败', e));
      },

      listCharacters() {
        return cache.characters.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      },
      getCharacter(id) {
        return cache.characters.find(o => o.id === id) || null;
      },
      saveCharacter(obj) {
        const now = new Date().toISOString();
        const existing = obj.id ? cache.characters.find(o => o.id === obj.id) : null;
        const rec = {
          id: obj.id || uid(),
          name: obj.name,
          worldviewId: obj.worldviewId || null,
          age: obj.age,
          gender: obj.gender,
          appearance: obj.appearance,
          personality: obj.personality,
          background: obj.background,
          tags: obj.tags || [],
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now
        };
        upsert(cache.characters, rec);
        persistCache();
        const payload = { name: rec.name, worldview_id: rec.worldviewId, age: rec.age, gender: rec.gender, appearance: rec.appearance, personality: rec.personality, background: rec.background, tags: JSON.stringify(rec.tags) };
        if (obj.id) {
          sb.from('characters').update(payload).eq('id', obj.id).then(() => {}).catch(e => console.warn('同步角色失败', e));
        } else {
          payload.id = rec.id;
          sb.from('characters').insert(payload).then(() => {}).catch(e => console.warn('同步角色失败', e));
        }
        return rec;
      },
      deleteCharacter(id) {
        cache.characters = cache.characters.filter(o => o.id !== id);
        persistCache();
        sb.from('characters').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(() => {}).catch(e => console.warn('删除角色失败', e));
      },

      listMaps() {
        return cache.maps.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      },
      getMap(id) {
        return cache.maps.find(o => o.id === id) || null;
      },
      saveMap(obj) {
        const now = new Date().toISOString();
        const existing = obj.id ? cache.maps.find(o => o.id === obj.id) : null;
        const rec = {
          id: obj.id || uid(),
          name: obj.name,
          worldviewId: obj.worldviewId || null,
          imageUrl: obj.imageUrl,
          places: obj.places || [],
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now
        };
        upsert(cache.maps, rec);
        persistCache();
        const payload = { name: rec.name, worldview_id: rec.worldviewId, image_url: rec.imageUrl, places: rec.places };
        if (obj.id) {
          sb.from('maps').update(payload).eq('id', obj.id).then(() => {}).catch(e => console.warn('同步地图失败', e));
        } else {
          payload.id = rec.id;
          sb.from('maps').insert(payload).then(() => {}).catch(e => console.warn('同步地图失败', e));
        }
        return rec;
      },
      deleteMap(id) {
        cache.maps = cache.maps.filter(o => o.id !== id);
        persistCache();
        sb.from('maps').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(() => {}).catch(e => console.warn('删除地图失败', e));
      },

      listNotes() {
        return cache.notes.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      },
      getNote(id) {
        return cache.notes.find(o => o.id === id) || null;
      },
      saveNote(obj) {
        const now = new Date().toISOString();
        const existing = obj.id ? cache.notes.find(o => o.id === obj.id) : null;
        const rec = {
          id: obj.id || uid(),
          title: obj.title,
          body: obj.body,
          mentions: obj.mentions || {},
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now
        };
        upsert(cache.notes, rec);
        persistCache();
        const payload = { title: rec.title, body: rec.body, mentions: rec.mentions };
        if (obj.id) {
          sb.from('notes').update(payload).eq('id', obj.id).then(() => {}).catch(e => console.warn('同步笔记失败', e));
        } else {
          payload.id = rec.id;
          sb.from('notes').insert(payload).then(() => {}).catch(e => console.warn('同步笔记失败', e));
        }
        return rec;
      },
      deleteNote(id) {
        cache.notes = cache.notes.filter(o => o.id !== id);
        persistCache();
        sb.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(() => {}).catch(e => console.warn('删除笔记失败', e));
      },

      syncWorldviews: async function () {
        try {
          const { data, error } = await sb.from('worldviews').select('*').is('deleted_at', null);
          if (!error && data) { cache.worldviews = data.map(mapWorldview); persistCache(); }
        } catch (e) { console.warn('同步世界观失败', e); }
      },
      syncCharacters: async function () {
        try {
          const { data, error } = await sb.from('characters').select('*').is('deleted_at', null);
          if (!error && data) { cache.characters = data.map(mapCharacter); persistCache(); }
        } catch (e) { console.warn('同步角色失败', e); }
      },
      syncMaps: async function () {
        try {
          const { data, error } = await sb.from('maps').select('*').is('deleted_at', null);
          if (!error && data) { cache.maps = data.map(mapMap); persistCache(); }
        } catch (e) { console.warn('同步地图失败', e); }
      },
      syncNotes: async function () {
        try {
          const { data, error } = await sb.from('notes').select('*').is('deleted_at', null);
          if (!error && data) { cache.notes = data.map(mapNote); persistCache(); }
        } catch (e) { console.warn('同步笔记失败', e); }
      }
    };
  })();

  /* ---------------- 常量与状态 ---------------- */
  const $ = (sel) => document.querySelector(sel);

  const notesListEl  = $('#notesList');
  const notesEmptyEl = $('#notesEmpty');
  const notesSearch  = $('#notesSearch');
  const notesEl     = $('#notes');
  const emptyEl     = $('#empty');
  const countEl     = $('#count');
  const librarySearch = $('#librarySearch');
  const tabsEl      = $('#tabs');
  const pageTitle   = $('#pageTitle');

  const fab         = $('#fab');
  const tabbar      = $('#tabbar');

  const editorEl   = $('#editor');
  const editorBody = $('#editorBody');
  const formBody   = $('#formBody');
  const metaEl     = $('#meta');
  const backBtn    = $('#backBtn');
  const backLabel  = $('#backLabel');
  const doneBtn    = $('#doneBtn');
  const deleteBtn  = $('#deleteBtn');

  const mentionSheet  = $('#mentionSheet');
  const mentionList   = $('#mentionList');
  const mentionSearch = $('#mentionSearch');
  const mentionClose  = $('#mentionClose');

  const state = {
    system: 'notes',
    libraryTab: 'worldview',
    libraryEditing: null,
    noteEditing: null,
    editorMode: null,
    pendingMentions: null
  };
  let saveTimer = null;

  const TAB_LABEL = { worldview: '世界观', character: '角色', map: '地图' };
  const EMPTY_MSG = {
    worldview: ['还没有世界观', '点击右下角的 + 开始构建'],
    character: ['还没有角色', '点击右下角的 + 创建角色'],
    map: ['还没有地图', '点击右下角的 + 创建地图']
  };

  /* ---------------- 工具函数 ---------------- */
  const pad = (n) => String(n).padStart(2, '0');

  function uid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'n' + Date.now().toString(36) + Math.random().toString(16).slice(2);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return '昨天';
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function formatFullTime(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function truncate(s, n) {
    s = (s || '').trim();
    return s.length > n ? s.slice(0, n) + '\u2026' : s;
  }

  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : s;
    return div.innerHTML;
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }

  async function worldviewNameMap() {
    const map = {};
    const wvs = await DB.listWorldviews();
    wvs.forEach(w => { map[w.id] = w.name || '未命名'; });
    return map;
  }

  /* ---------------- 顶级体系切换 ---------------- */
  function switchSystem(sys) {
    state.system = sys;
    document.getElementById('systemNotes').classList.toggle('active', sys === 'notes');
    document.getElementById('systemLibrary').classList.toggle('active', sys === 'library');
    tabbar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.system === sys));
    OC.render();
  }

  function jumpToLibrary(type, id) {
    state.libraryTab = type;
    tabsEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === type));
    pageTitle.textContent = TAB_LABEL[type];
    librarySearch.value = '';
    switchSystem('library');
    openEditor('library', type, id);
  }

  /* ---------------- 总控渲染 ---------------- */
  async function render() {
    if (state.system === 'notes') await OC.renderNotes();
    else await OC.renderLibrary();
  }

  /* ---------------- 编辑器 ---------------- */
  function autoGrowAll() {
    formBody.querySelectorAll('textarea').forEach(t => {
      t.style.height = 'auto';
      t.style.height = t.scrollHeight + 'px';
    });
  }

  function autoGrowNote() {
    const t = document.getElementById('f-body');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }

  function bindAutoGrow() {
    formBody.querySelectorAll('textarea').forEach(t => t.addEventListener('input', autoGrowAll));
  }

  function updateMeta(rec) {
    if (rec) metaEl.textContent = '最后编辑：' + formatFullTime(rec.updatedAt);
  }

  function worldviewSelectOptions(wvs, selectedId) {
    let html = '<option value="">未归属</option>';
    wvs.forEach(w => {
      const sel = w.id === selectedId ? ' selected' : '';
      html += '<option value="' + w.id + '"' + sel + '>' + (w.name || '未命名') + '</option>';
    });
    return html;
  }

  async function openEditor(mode, type, id) {
    state.editorMode = mode;
    editorEl.dataset.mode = mode;

    if (mode === 'note') {
      state.noteEditing = id || null;
      state.pendingMentions = {};
      backLabel.textContent = '笔记';

      const note = id ? await DB.getNote(id) : null;
      if (note && note.mentions) state.pendingMentions = Object.assign({}, note.mentions);

      formBody.innerHTML =
        '<input id="f-title" class="title" placeholder="标题" autocomplete="off" spellcheck="false" value="' + esc(note ? note.title : '') + '">' +
        '<textarea id="f-body" class="content" placeholder="开始输入…" spellcheck="false">' + esc(note ? note.body : '') + '</textarea>' +
        '<div class="editor-toolbar"><button type="button" id="mentionBtn">@ 提及设定</button></div>';

      formBody.querySelector('#f-body').addEventListener('input', autoGrowNote);
      showEditor(note);
      return;
    }

    state.libraryEditing = { type: type, id: id || null };
    state.pendingMentions = null;
    backLabel.textContent = TAB_LABEL[type];

    if (type === 'worldview') {
      const wv = id ? await DB.getWorldview(id) : null;
      formBody.innerHTML = OC.worldviewForm(wv);
      bindAutoGrow();
      showEditor(wv);
    } else if (type === 'character') {
      const ch = id ? await DB.getCharacter(id) : null;
      const wvs = await DB.listWorldviews();
      formBody.innerHTML = OC.characterForm(ch, wvs);
      bindAutoGrow();
      showEditor(ch);
    } else if (type === 'map') {
      const mp = id ? await DB.getMap(id) : null;
      const wvs = await DB.listWorldviews();
      formBody.innerHTML = OC.mapForm(mp, wvs);
      bindAutoGrow();
      OC.bindMapEvents();
      showEditor(mp);
    }
  }

  function showEditor(rec) {
    editorEl.classList.add('open');
    editorEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (rec) updateMeta(rec);
    requestAnimationFrame(() => {
      autoGrowAll();
      if (state.editorMode === 'note') autoGrowNote();
      const first = formBody.querySelector('input, textarea, select');
      if (first && !rec) setTimeout(() => first.focus(), 320);
    });
  }

  function readTags() {
    const el = formBody.querySelector('#f-tags');
    if (!el) return [];
    return el.value.split(/[,，]/).map(t => t.trim()).filter(Boolean);
  }

  async function closeEditor() {
    try {
      await flushSave();
    } catch (e) {
      console.warn('退出时保存失败:', e);
    }
    editorEl.classList.remove('open');
    editorEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.libraryEditing = null;
    state.noteEditing = null;
    state.editorMode = null;
    state.pendingMentions = null;
    OC.render();
  }

  async function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    await saveNow();
  }

  async function parseMentions(body, pending) {
    const result = {};
    const re = /@([^\s@，。！？、,.!?]{1,20})/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      const name = m[1];
      if (result[name]) continue;
      if (pending && pending[name]) { result[name] = pending[name]; continue; }
      const ent = await findEntityByName(name);
      if (ent) result[name] = ent;
    }
    return result;
  }

  async function findEntityByName(name) {
    const wvs = await DB.listWorldviews();
    const w = wvs.find(x => (x.name || '') === name);
    if (w) return { type: 'worldview', id: w.id };
    const chs = await DB.listCharacters();
    const c = chs.find(x => (x.name || '') === name);
    if (c) return { type: 'character', id: c.id };
    const mps = await DB.listMaps();
    const mp = mps.find(x => (x.name || '') === name);
    if (mp) return { type: 'map', id: mp.id };
    return null;
  }

  async function saveNow() {
    if (!state.editorMode) return;

    if (state.editorMode === 'note') {
      const titleEl = document.getElementById('f-title');
      const bodyEl = document.getElementById('f-body');
      const title = titleEl ? titleEl.value : '';
      const body = bodyEl ? bodyEl.value : '';
      const id = state.noteEditing;

      if (!title.trim() && !body.trim()) {
        if (id) await DB.deleteNote(id);
        state.noteEditing = null;
        state.editorMode = null;
        OC.render();
        return;
      }

      const newMentions = await parseMentions(body, state.pendingMentions);
      const rec = await DB.saveNote({ id: id, title: title.trim(), body: body, mentions: newMentions });
      if (rec) {
        if (!id) state.noteEditing = rec.id;
        state.pendingMentions = newMentions;
        updateMeta(rec);
      }
      return;
    }

    const { type, id } = state.libraryEditing;

    if (type === 'worldview') {
      const name = val('#f-name');
      if (!name) {
        if (id) await DB.deleteWorldview(id);
        state.libraryEditing = null;
        state.editorMode = null;
        OC.render();
        return;
      }
      const rec = await DB.saveWorldview({ id: id, name: name, summary: val('#f-summary'), settings: val('#f-settings'), tags: readTags() });
      if (rec) {
        if (!id) state.libraryEditing.id = rec.id;
        updateMeta(rec);
      }
    } else if (type === 'character') {
      const name = val('#f-name');
      if (!name) {
        if (id) await DB.deleteCharacter(id);
        state.libraryEditing = null;
        state.editorMode = null;
        OC.render();
        return;
      }
      const rec = await DB.saveCharacter({
        id: id, name: name, worldviewId: val('#f-worldview') || '',
        age: val('#f-age'), gender: val('#f-gender'),
        appearance: val('#f-appearance'), personality: val('#f-personality'),
        background: val('#f-background'), tags: readTags()
      });
      if (rec) {
        if (!id) state.libraryEditing.id = rec.id;
        updateMeta(rec);
      }
    } else if (type === 'map') {
      const name = val('#f-name');
      if (!name) {
        if (id) await DB.deleteMap(id);
        state.libraryEditing = null;
        state.editorMode = null;
        OC.render();
        return;
      }
      const places = [];
      formBody.querySelectorAll('#placeList .place').forEach(row => {
        const nm = row.querySelector('.p-name').value.trim();
        const ds = row.querySelector('.p-desc').value.trim();
        if (nm || ds) places.push({ id: uid(), name: nm, desc: ds });
      });
      const rec = await DB.saveMap({ id: id, name: name, worldviewId: val('#f-worldview') || '', imageUrl: val('#f-imageurl').trim(), places: places });
      if (rec) {
        if (!id) state.libraryEditing.id = rec.id;
        updateMeta(rec);
      }
    }
  }

  function val(sel) {
    const el = formBody.querySelector(sel);
    return el ? el.value : '';
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await saveNow();
      } catch (e) {
        console.warn('自动保存失败:', e);
      }
    }, 1500);
  }

  /* ---------------- 事件绑定 ---------------- */

  // 底部导航
  tabbar.addEventListener('click', e => {
    const btn = e.target.closest('button[data-system]');
    if (btn) switchSystem(btn.dataset.system);
  });

  // 笔记列表点击（chip 优先跳转，否则打开笔记）
  notesListEl.addEventListener('click', e => {
    const chip = e.target.closest('.mention');
    if (chip) {
      jumpToLibrary(chip.dataset.type, chip.dataset.id);
      return;
    }
    const card = e.target.closest('.note');
    if (card) openEditor('note', null, card.dataset.id);
  });

  // 设定列表点击
  notesEl.addEventListener('click', e => {
    const card = e.target.closest('.note');
    if (card) openEditor('library', state.libraryTab, card.dataset.id);
  });

  // 新建（改为直接打开编辑器，不再等网络）
  fab.addEventListener('click', function () {
    if (state.system === 'notes') {
      openEditor('note', null, null);
    } else {
      openEditor('library', state.libraryTab, null);
    }
  });

  // 表单输入保存（事件委托，两种模式通用）
  formBody.addEventListener('input', function () {
    scheduleSave();
  });

  // 笔记编辑器内的 @ 按钮（事件委托）
  formBody.addEventListener('click', function (e) {
    if (e.target.closest('#mentionBtn')) OC.openMentionSheet();
  });

  // 关闭编辑器（会先保存）
  backBtn.addEventListener('click', closeEditor);
  doneBtn.addEventListener('click', closeEditor);

  // 删除
  deleteBtn.addEventListener('click', async function () {
    if (state.editorMode === 'note') {
      const id = state.noteEditing;
      if (!id) { closeEditor(); return; }
      if (!window.confirm('删除这条笔记？此操作无法撤销。')) return;
      await DB.deleteNote(id);
      state.noteEditing = null;
      state.editorMode = null;
      closeEditor();
    } else if (state.editorMode === 'library') {
      if (!state.libraryEditing) return;
      const { type, id } = state.libraryEditing;
      if (!id) { closeEditor(); return; }
      if (!window.confirm('删除这条' + TAB_LABEL[type] + '？此操作无法撤销。')) return;
      if (type === 'worldview') await DB.deleteWorldview(id);
      else if (type === 'character') await DB.deleteCharacter(id);
      else if (type === 'map') await DB.deleteMap(id);
      state.libraryEditing = null;
      state.editorMode = null;
      closeEditor();
    }
  });

  // 搜索
  notesSearch.addEventListener('input', function () { OC.renderNotes(); });
  librarySearch.addEventListener('input', function () { OC.renderLibrary(); });

  // 设定子 tab 切换
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (tab === state.libraryTab) return;
    state.libraryTab = tab;
    tabsEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    pageTitle.textContent = TAB_LABEL[tab];
    librarySearch.value = '';
    OC.renderLibrary();
  });

  // @ 选择器：搜索
  mentionSearch.addEventListener('input', function () {
    OC.renderMentionList(mentionSearch.value.trim().toLowerCase());
  });

  // @ 选择器：选中一项
  mentionList.addEventListener('click', e => {
    const item = e.target.closest('.sheet-item');
    if (!item) return;
    const type = item.dataset.type;
    const id = item.dataset.id;
    const name = item.dataset.name;

    const bodyEl = document.getElementById('f-body');
    if (!bodyEl) return;

    const start = bodyEl.selectionStart;
    const end = bodyEl.selectionEnd;
    const val = bodyEl.value;
    const insert = '@' + name + ' ';
    bodyEl.value = val.slice(0, start) + insert + val.slice(end);

    if (state.pendingMentions) state.pendingMentions[name] = { type: type, id: id };

    OC.closeMentionSheet();
    bodyEl.focus();
    const pos = start + insert.length;
    bodyEl.setSelectionRange(pos, pos);
    scheduleSave();
  });

  // @ 选择器：关闭
  mentionClose.addEventListener('click', function () { OC.closeMentionSheet(); });
  mentionSheet.addEventListener('click', e => {
    if (e.target === mentionSheet) OC.closeMentionSheet();
  });

  // 快捷键：Esc 退出编辑
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!mentionSheet.hidden) { OC.closeMentionSheet(); return; }
      if (editorEl.classList.contains('open')) closeEditor();
    }
  });

  // 页面隐藏/关闭前保存
  window.addEventListener('pagehide', () => { if (state.editorMode) flushSave(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.editorMode) flushSave();
  });

  /* ---------------- 启动 ---------------- */
  const lockScreen = document.getElementById('lockScreen');
  const sysMain = document.getElementById('sysMain');
  const pwdInput = document.getElementById('pwdInput');
  const unlockBtn = document.getElementById('unlockBtn');
  const btnWrap = document.getElementById('btnWrap');
  const indicatorWrap = document.getElementById('indicatorWrap');
  const btnProgress = document.getElementById('btnProgress');

  const HIDDEN_EMAIL = 'user@myoc.com';
  let appStarted = false;
  let authState = 'idle';

  requestAnimationFrame(function () {
    lockScreen.classList.add('entered');
  });

  async function bootApp() {
    if (appStarted) return;
    appStarted = true;

    // 启动实时订阅
    sb.channel('oc-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, async function (payload) {
        const table = payload.table;
        if (table === 'worldviews') await DB.syncWorldviews();
        else if (table === 'characters') await DB.syncCharacters();
        else if (table === 'maps') await DB.syncMaps();
        else if (table === 'notes') await DB.syncNotes();

        var deleted = false;
        if (state.editorMode === 'note' && state.noteEditing) {
          if (!DB.getNote(state.noteEditing)) deleted = true;
        } else if (state.editorMode === 'library' && state.libraryEditing) {
          var le = state.libraryEditing;
          if (le.id) {
            if (le.type === 'worldview' && !DB.getWorldview(le.id)) deleted = true;
            else if (le.type === 'character' && !DB.getCharacter(le.id)) deleted = true;
            else if (le.type === 'map' && !DB.getMap(le.id)) deleted = true;
          }
        }

        if (deleted) {
          var msg = state.editorMode === 'note' ? '对方已将这条笔记删除' : '对方已将这条设定删除';
          state.editorMode = null;
          closeEditor();
          showToast(msg);
        } else {
          OC.render();
        }
      })
      .subscribe();

    // 只加载数据，不渲染空框架
    await DB.init();
    // 数据加载完毕，渲染一次真实内容
    state.system = 'notes';
    document.getElementById('systemNotes').classList.add('active');
    document.getElementById('systemLibrary').classList.remove('active');
    tabbar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.system === 'notes'));
    OC.render();
  }

  function handleEnter() {
    if (authState !== 'idle') return;

    const val = pwdInput.value.trim();
    if (!val) {
      pwdInput.focus();
      return;
    }

    authState = 'checking';
    pwdInput.blur();

    indicatorWrap.classList.remove('hide-blur');
    btnWrap.className = 'enter-btn-wrap loading';

    // 同时发起真实验证请求
    const authPromise = sb.auth.signInWithPassword({
      email: HIDDEN_EMAIL,
      password: val
    }).catch(function (e) {
      return { data: null, error: e };
    });

    runProgress(authPromise, val);
  }

  function runProgress(authPromise, val) {
    const start = performance.now();
    const MIN = 800;
    const STALL = 0.91 + Math.random() * 0.06; // 随机停滞点：91% ~ 97%
    const CREEP_MS = 1500; // 停滞点后缓慢爬行的基准时长

    let authDone = false;
    let authResult = null;
    authPromise.then(function (r) {
      authDone = true;
      authResult = r;
    });

    let finishStart = null;

    function tick(now) {
      const elapsed = now - start;
      let t;

      if (!finishStart) {
        if (elapsed < MIN) {
          // 阶段一：0 -> 停滞点，匀速推进
          t = (elapsed / MIN) * STALL;
        } else {
          if (!authDone) {
            // 已过最短时间但验证还没回来，在停滞点之上缓慢爬行（每次+1%、+2%）
            const over = elapsed - MIN;
            const creep = Math.min(over / CREEP_MS, 1) * 0.04; // 最多爬 4%
            t = STALL + creep;
          } else {
            // 验证返回，准备直接到 100%
            finishStart = now;
            t = Math.min(STALL + 0.04, 0.99);
          }
        }
      } else {
        // 验证已返回，快速冲到 100%
        const ft = Math.min((now - finishStart) / 200, 1);
        t = Math.min(STALL + 0.04, 0.99) + (1 - Math.min(STALL + 0.04, 0.99)) * ft;
        if (ft >= 1) {
          setProgress(1);
          finish(authResult.data, authResult.error, val);
          return;
        }
      }

      setProgress(t);
      requestAnimationFrame(tick);
    }

    function setProgress(t) {
      unlockBtn.textContent = Math.round(t * 100) + '%';
      btnProgress.style.width = (t * 80) + 'px';
    }

    requestAnimationFrame(tick);
  }

  async function finish(data, error, val) {
    if (!error && data) {
      // 后台静默加载数据，app 保持 opacity:0 不可见
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.style.display = 'block';
      }
      await bootApp();

      // 数据加载完毕，显示成功
      btnWrap.className = 'enter-btn-wrap success';
      unlockBtn.textContent = 'ACCESS GRANTED';
      btnProgress.style.width = '80px';

      setTimeout(function () {
        // 锁屏淡出（此时 app 仍不可见）
        lockScreen.classList.remove('entered');
        lockScreen.classList.add('leaving');
        setTimeout(function () {
          lockScreen.style.display = 'none';
          // 锁屏消失后，app 淡入（opacity 0→1 + blur 8px→0）
          if (appEl) appEl.classList.add('app-visible');
        }, 800);
      }, 400);
    } else {
      const isNetwork = error && (
        error.name === 'AuthRetryableFetchError' ||
        (error.message && /fetch|network|Failed to fetch/i.test(error.message))
      );

      btnWrap.className = 'enter-btn-wrap error';
      unlockBtn.textContent = isNetwork ? '连接失败' : '密码错误';

      sysMain.classList.remove('shake');
      void sysMain.offsetWidth;
      sysMain.classList.add('shake');

      setTimeout(function () {
        indicatorWrap.classList.add('hide-blur');
      }, 300);

      setTimeout(function () {
        sysMain.classList.remove('shake');
        btnWrap.className = 'enter-btn-wrap';
        unlockBtn.textContent = '进入系统';
        pwdInput.value = '';
        pwdInput.focus();

        btnProgress.style.transition = 'none';
        btnProgress.style.width = '0px';
        indicatorWrap.classList.remove('hide-blur');

        setTimeout(function () {
          btnProgress.style.transition = 'width 0.1s linear, opacity 0.2s ease, background 0.3s ease, box-shadow 0.3s ease';
        }, 50);

        authState = 'idle';
      }, isNetwork ? 2000 : 1800);
    }
  }

  unlockBtn.addEventListener('click', handleEnter);
  pwdInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    }
  });

  // 启动：强制清除登录状态
  (async function () {
    await sb.auth.signOut();
    localStorage.removeItem('oc-db-cache');
    lockScreen.style.display = '';
    pwdInput.focus();
  })();

  /* ---------------- 导出全局命名空间 ---------------- */
  window.OC = {
    sb: sb,
    DB: DB,
    state: state,
    render: render,

    // 公共工具函数
    esc: esc,
    formatTime: formatTime,
    truncate: truncate,
    uid: uid,
    worldviewNameMap: worldviewNameMap,
    worldviewSelectOptions: worldviewSelectOptions,
    val: val,
    readTags: readTags,
    TAB_LABEL: TAB_LABEL,
    EMPTY_MSG: EMPTY_MSG,

    // 模块插槽（由 notes.js / library.js 填充）
    renderNotes: null,
    renderNoteCard: null,
    renderBodyPreview: null,
    renderLibrary: null,
    renderCard: null,
    cardSubtitle: null,
    filterBySearch: null,

    worldviewForm: null,
    characterForm: null,
    mapForm: null,
    bindMapEvents: null,

    openMentionSheet: null,
    closeMentionSheet: null,
    renderMentionList: null
  };
})();