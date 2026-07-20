(function () {
  /* ── 标签颜色 ── */
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

  /* ── 状态 ── */
  let ALL = [], activeTag = 'all', kw = '', activeEngine = 'bing', activeEngineUrl = 'https://www.bing.com/search?q={q}';

  /* ── 搜索引擎 ── */
  document.getElementById('engine-tabs').querySelectorAll('.engine-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.engine-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeEngine = btn.dataset.engine;
      activeEngineUrl = btn.dataset.url;
      document.getElementById('search-input').focus();
    });
  });

  function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    window.open(activeEngineUrl.replace('{q}', encodeURIComponent(q)), '_blank');
  }

  document.getElementById('search-btn').addEventListener('click', doSearch);
  document.getElementById('search-input').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  /* ── 书签过滤 ── */
  function filtered() {
    return ALL.filter(b => {
      if (activeTag !== 'all' && !(b.tags || []).includes(activeTag)) return false;
      if (kw && !b.title.toLowerCase().includes(kw) && !(b.description || '').toLowerCase().includes(kw) && !b.url.toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  /* ── 侧栏 ── */
  function renderSidebar() {
    const counts = {};
    ALL.forEach(b => (b.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    if (!Object.keys(counts).length) { document.getElementById('sidebar').innerHTML = ''; return; }

    let h = '<div class="sidebar-section"><div class="sidebar-label">标签</div>';
    h += `<button class="filter-btn${activeTag === 'all' ? ' active' : ''}" data-tag="all">
      <span style="flex:1">全部</span><span class="filter-count">${ALL.length}</span></button>`;
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([tag, n]) => {
      const s = tagColor(tag);
      h += `<button class="filter-btn${activeTag === tag ? ' active' : ''}" data-tag="${esc(tag)}">
        <span class="tag-dot" style="background:${s.bg};outline:1px solid ${s.c}55"></span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tag)}</span>
        <span class="filter-count">${n}</span></button>`;
    });
    h += '</div>';
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = h;
    sidebar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => { activeTag = btn.dataset.tag; renderSidebar(); renderGrid(); });
    });
  }

  /* ── 书签网格 ── */
  function renderGrid() {
    const list = filtered();
    const wrap = document.getElementById('grid-wrap');
    document.getElementById('main-count').textContent = `${list.length} 个书签`;

    if (!list.length) {
      wrap.innerHTML = `<div class="empty">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M10 4h16a2 2 0 0 1 2 2v26l-10-6-10 6V6a2 2 0 0 1 2-2z"/>
        </svg>
        <p>${ALL.length ? '没有匹配的书签' : '还没有书签，前往 /admin 添加'}</p></div>`;
      return;
    }

    const grid = document.createElement('div'); grid.className = 'grid';
    list.forEach(bm => {
      const domain = (() => { try { return new URL(bm.url).hostname; } catch { return ''; } })();
      const iconSrc = bm.icon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '');

      const a = document.createElement('a');
      a.className = 'card'; a.href = bm.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.tabIndex = 0;

      // favicon
      const favicon = document.createElement('div'); favicon.className = 'card-favicon';
      if (iconSrc) {
        const img = document.createElement('img'); img.src = iconSrc; img.alt = '';
        img.onerror = () => { favicon.innerHTML = `<div class="fallback">${(bm.title||'?')[0].toUpperCase()}</div>`; };
        favicon.appendChild(img);
      } else {
        favicon.innerHTML = `<div class="fallback">${(bm.title||'?')[0].toUpperCase()}</div>`;
      }

      const titleWrap = document.createElement('div'); titleWrap.className = 'card-title-wrap';
      titleWrap.innerHTML = `<div class="card-title">${esc(bm.title)}</div><div class="card-domain">${esc(domain)}</div>`;

      const top = document.createElement('div'); top.className = 'card-top';
      top.appendChild(favicon); top.appendChild(titleWrap);

      const desc = document.createElement('div'); desc.className = 'card-desc'; desc.textContent = bm.description || '';

      const tagsRow = document.createElement('div'); tagsRow.className = 'card-tags';
      (bm.tags || []).forEach(t => {
        const s = tagColor(t);
        const span = document.createElement('span'); span.className = 'tag';
        span.textContent = t; span.style.background = s.bg; span.style.color = s.c;
        tagsRow.appendChild(span);
      });

      a.appendChild(top);
      if (bm.description) a.appendChild(desc);
      if ((bm.tags || []).length) a.appendChild(tagsRow);

      grid.appendChild(a);
    });
    wrap.innerHTML = ''; wrap.appendChild(grid);
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  /* ── 初始化 ── */
  (async () => {
    try { const r = await fetch('/api/bookmarks'); ALL = await r.json(); }
    catch { ALL = []; }
    document.getElementById('skeleton').remove();
    renderSidebar();
    renderGrid();
    document.getElementById('topbar-kw').textContent = ALL.length ? `${ALL.length} 个书签` : '';
  })();
})();
