(function () {
  const PALETTE = [
    {bg:'#eeedfd',c:'#3730c4'},{bg:'#e1f5ee',c:'#0a6649'},
    {bg:'#faeeda',c:'#7a4a08'},{bg:'#e6f1fb',c:'#1054a0'},
    {bg:'#f3e8ff',c:'#6b21a8'},{bg:'#fde8e8',c:'#9f1239'},
    {bg:'#ecfdf5',c:'#065f46'},{bg:'#fffbeb',c:'#92400e'},
  ];
  const PALETTE_DARK = [
    {bg:'#1e1c3a',c:'#a09bff'},{bg:'#0d2a1f',c:'#4dc494'},
    {bg:'#261d08',c:'#d4a843'},{bg:'#0e1f35',c:'#5fa8ee'},
    {bg:'#2d1a4a',c:'#c084fc'},{bg:'#3b0a0a',c:'#fca5a5'},
    {bg:'#064e3b',c:'#6ee7b7'},{bg:'#451a03',c:'#fcd34d'},
  ];
  const pal = window.matchMedia('(prefers-color-scheme: dark)').matches ? PALETTE_DARK : PALETTE;
  const colorMap = {};
  function tagColor(tag) {
    if (!colorMap[tag]) colorMap[tag] = pal[Object.keys(colorMap).length % pal.length];
    return colorMap[tag];
  }

  let ALL = [], keyword = '', editingId = null, formTags = [], confirmCb = null;

  const $tbody  = document.getElementById('tbody');
  const $search = document.getElementById('search');
  const $count  = document.getElementById('result-count');
  const $modal  = document.getElementById('modal-overlay');
  const $modalTitle = document.getElementById('modal-title');
  const $saveBtn    = document.getElementById('save-btn');
  const $confirm    = document.getElementById('confirm-overlay');
  const $confirmBody= document.getElementById('confirm-body');
  const $confirmOk  = document.getElementById('confirm-ok');
  const $tagWrap    = document.getElementById('tag-wrap');
  const $tagField   = document.getElementById('tag-field');
  const $toast      = document.getElementById('toast');
  const $iconInput      = document.getElementById('f-icon');
  const $iconPreview    = document.getElementById('f-icon-preview');
  const $iconUploadBtn  = document.getElementById('icon-upload-btn');
  const $iconFileInput  = document.getElementById('f-icon-file');

  /* toast */
  let toastTimer;
  function showToast(msg, type = '') {
    clearTimeout(toastTimer);
    $toast.textContent = msg;
    $toast.className = 'toast' + (type ? ' ' + type : '');
    requestAnimationFrame(() => $toast.classList.add('show'));
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 2600);
  }

  /* tag input */
  function renderFormTags() {
    $tagWrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
    formTags.forEach((t, i) => {
      const chip = document.createElement('div'); chip.className = 'tag-chip';
      const s = tagColor(t); chip.style.background = s.bg; chip.style.color = s.c;
      chip.innerHTML = `${esc(t)}<button class="tag-chip-x" type="button">×</button>`;
      chip.querySelector('.tag-chip-x').onclick = () => { formTags.splice(i, 1); renderFormTags(); };
      $tagWrap.insertBefore(chip, $tagField);
    });
  }
  function addFormTag(raw) {
    raw.split(/[,，]+/).map(s => s.trim()).filter(s => s && !formTags.includes(s)).forEach(s => formTags.push(s));
    renderFormTags(); $tagField.value = '';
  }
  $tagField.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); addFormTag($tagField.value); }
    else if (e.key === 'Backspace' && !$tagField.value && formTags.length) { formTags.pop(); renderFormTags(); }
  });
  $tagField.addEventListener('blur', () => { if ($tagField.value.trim()) addFormTag($tagField.value); });

  /* icon field */
  function updateIconPreview() {
    const val = $iconInput.value.trim();
    if (val) { $iconPreview.src = val; $iconPreview.hidden = false; }
    else { $iconPreview.hidden = true; $iconPreview.removeAttribute('src'); }
  }
  $iconPreview.addEventListener('error', () => { $iconPreview.hidden = true; });
  $iconInput.addEventListener('input', updateIconPreview);
  $iconUploadBtn.addEventListener('click', () => $iconFileInput.click());
  $iconFileInput.addEventListener('change', async () => {
    const file = $iconFileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    $iconUploadBtn.disabled = true;
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || res.status); }
      const data = await res.json();
      $iconInput.value = data.url;
      updateIconPreview();
      showToast('图标已上传', 'success');
    } catch (e) { showToast('上传失败：' + e.message, 'error'); }
    finally { $iconUploadBtn.disabled = false; $iconFileInput.value = ''; }
  });

  /* favicon helper */
  function faviconEl(bm) {
    const domain = (() => { try { return new URL(bm.url).hostname; } catch { return ''; } })();
    const src = bm.icon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '');
    const wrap = document.createElement('div'); wrap.className = 'bm-favicon';
    if (src) {
      const img = document.createElement('img'); img.src = src; img.alt = '';
      img.onerror = () => { wrap.innerHTML = (bm.title || '?')[0].toUpperCase(); };
      wrap.appendChild(img);
    } else {
      wrap.textContent = (bm.title || '?')[0].toUpperCase();
    }
    return wrap;
  }

  /* table */
  function filtered() {
    if (!keyword) return ALL;
    const kw = keyword.toLowerCase();
    return ALL.filter(b => b.title.toLowerCase().includes(kw) || (b.description || '').toLowerCase().includes(kw) || b.url.toLowerCase().includes(kw));
  }

  function renderTable() {
    const list = filtered();
    $count.textContent = `共 ${list.length} 个书签`;
    if (!list.length) {
      $tbody.innerHTML = `<tr><td colspan="5"><div class="empty">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M10 4h16a2 2 0 0 1 2 2v26l-10-6-10 6V6a2 2 0 0 1 2-2z"/>
        </svg>
        <p>${ALL.length ? '没有匹配的书签' : '还没有书签，点击「新增书签」开始添加'}</p>
      </div></td></tr>`;
      return;
    }
    $tbody.innerHTML = '';
    list.forEach(bm => {
      const domain = (() => { try { return new URL(bm.url).hostname; } catch { return bm.url; } })();
      const tr = document.createElement('tr');

      /* bookmark cell */
      const tdBm = document.createElement('td');
      const cell = document.createElement('div'); cell.className = 'bm-cell';
      cell.appendChild(faviconEl(bm));
      const info = document.createElement('div');
      info.innerHTML = `<div class="bm-title">${esc(bm.title)}</div><div class="bm-url"><a href="${esc(bm.url)}" target="_blank" rel="noopener">${esc(domain)}</a></div>`;
      cell.appendChild(info); tdBm.appendChild(cell);

      /* tags cell */
      const tdTags = document.createElement('td');
      const tagsDiv = document.createElement('div'); tagsDiv.className = 'tags-cell';
      if ((bm.tags || []).length) {
        bm.tags.forEach(t => {
          const s = tagColor(t);
          const span = document.createElement('span'); span.className = 'tag';
          span.textContent = t; span.style.background = s.bg; span.style.color = s.c;
          tagsDiv.appendChild(span);
        });
      } else {
        tagsDiv.innerHTML = `<span style="color:var(--text3);font-size:12px">—</span>`;
      }
      tdTags.appendChild(tagsDiv);

      /* desc cell */
      const tdDesc = document.createElement('td');
      tdDesc.innerHTML = `<div class="desc-cell">${esc(bm.description || '—')}</div>`;

      /* actions */
      const tdAct = document.createElement('td');
      const acts = document.createElement('div'); acts.className = 'actions';
      const editBtn = document.createElement('button'); editBtn.className = 'icon-btn'; editBtn.title = '编辑';
      editBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M9.5 1.5l2 2L4 11H2V9L9.5 1.5z"/></svg>`;
      editBtn.onclick = () => openModal(bm);
      const delBtn = document.createElement('button'); delBtn.className = 'icon-btn danger'; delBtn.title = '删除';
      delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7"/></svg>`;
      delBtn.onclick = () => confirmDelete(bm);
      acts.appendChild(editBtn); acts.appendChild(delBtn); tdAct.appendChild(acts);

      /* order cell */
      const tdOrder = document.createElement('td');
      tdOrder.style.textAlign = 'center';
      tdOrder.innerHTML = `<span style="font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums">${bm.order ?? 0}</span>`;

      tr.append(tdOrder, tdBm, tdTags, tdDesc, tdAct);
      $tbody.appendChild(tr);
    });
  }

  /* modal */
  window.openModal = function(bm) {
    editingId = bm ? bm.id : null;
    $modalTitle.textContent = bm ? '编辑书签' : '新增书签';
    $saveBtn.textContent    = bm ? '保存修改' : '添加';
    document.getElementById('f-url').value         = bm ? bm.url         : '';
    document.getElementById('f-title').value       = bm ? bm.title       : '';
    document.getElementById('f-description').value = bm ? (bm.description || '') : '';
    $iconInput.value = bm ? (bm.icon || '') : '';
    updateIconPreview();
    document.getElementById('f-order').value       = bm ? (bm.order ?? 0) : 0;
    formTags = bm ? [...(bm.tags || [])] : [];
    $tagField.value = ''; renderFormTags();
    $modal.classList.add('open');
    document.getElementById('f-url').focus();
  };
  window.closeModal = function() { $modal.classList.remove('open'); editingId = null; };

  /* auto-fill title from URL */
  document.getElementById('f-url').addEventListener('blur', async () => {
    const urlVal = document.getElementById('f-url').value.trim();
    const titleVal = document.getElementById('f-title').value.trim();
    if (!urlVal || titleVal) return;
    try {
      const domain = new URL(urlVal).hostname;
      document.getElementById('f-title').value = domain.replace(/^www\./, '');
    } catch { /* invalid url */ }
  });

  window.saveBookmark = async function() {
    if ($tagField.value.trim()) addFormTag($tagField.value);
    const url   = document.getElementById('f-url').value.trim();
    const title = document.getElementById('f-title').value.trim();
    if (!url)   { showToast('请填写链接', 'error'); return; }
    if (!title) { showToast('请填写标题', 'error'); return; }
    const body = {
      url, title,
      description: document.getElementById('f-description').value.trim(),
      tags: formTags,
      icon: document.getElementById('f-icon').value.trim(),
      order: parseInt(document.getElementById('f-order').value, 10) || 0,
    };
    $saveBtn.disabled = true;
    try {
      const res = await fetch(editingId ? `/api/bookmarks/${editingId}` : '/api/bookmarks', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || res.status); }
      closeModal(); await reload();
      showToast(editingId ? '已保存修改' : '书签已添加', 'success');
    } catch (e) { showToast('保存失败：' + e.message, 'error'); }
    finally { $saveBtn.disabled = false; }
  };

  /* confirm delete */
  function confirmDelete(bm) {
    $confirmBody.textContent = `确定要删除「${bm.title}」吗？此操作无法撤销。`;
    confirmCb = async () => {
      try {
        await fetch(`/api/bookmarks/${bm.id}`, { method: 'DELETE' });
        closeConfirm(); await reload(); showToast('已删除', 'success');
      } catch (e) { showToast('删除失败：' + e.message, 'error'); }
    };
    $confirm.classList.add('open'); $confirmOk.focus();
  }
  window.closeConfirm = function() { $confirm.classList.remove('open'); confirmCb = null; };
  $confirmOk.addEventListener('click', () => { if (confirmCb) confirmCb(); });

  /* events */
  $modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });
  $confirm.addEventListener('click', e => { if (e.target === $confirm) closeConfirm(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeConfirm(); } });
  $search.addEventListener('input', () => { keyword = $search.value.trim().toLowerCase(); renderTable(); });

  /* data */
  async function reload() {
    try { const r = await fetch('/api/bookmarks'); ALL = await r.json(); }
    catch { ALL = []; }
    renderTable();
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  reload();
})();
