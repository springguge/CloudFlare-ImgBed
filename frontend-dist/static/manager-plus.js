(function () {
  const state = {
    open: false,
    currentPath: '',
    items: [],
    selected: new Set(),
    virtualFolders: loadVirtualFolders(),
    query: ''
  };

  const imageExt = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif', 'ico']);
  const videoExt = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

  function isDashboard() {
    return location.pathname.includes('dashboard');
  }

  function loadVirtualFolders() {
    try {
      return JSON.parse(localStorage.getItem('imb.virtualFolders') || '[]');
    } catch {
      return [];
    }
  }

  function saveVirtualFolders() {
    localStorage.setItem('imb.virtualFolders', JSON.stringify(state.virtualFolders));
  }

  function apiPath(path) {
    return encodeURIComponent(path || '').replace(/%2F/g, '/');
  }

  function cleanDir(path) {
    return (path || '').replace(/^\/+/, '').replace(/\/{2,}/g, '/').replace(/\/?$/, path ? '/' : '');
  }

  function fileUrl(name) {
    return `/file/${name}?from=admin`;
  }

  function baseName(path) {
    return (path || '').split('/').filter(Boolean).pop() || path || 'root';
  }

  function ext(name) {
    const dot = (name || '').lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function isImage(item) {
    const type = item.metadata && item.metadata.FileType || '';
    return type.includes('image') || imageExt.has(ext(item.name));
  }

  function isVideo(item) {
    const type = item.metadata && item.metadata.FileType || '';
    return type.includes('video') || videoExt.has(ext(item.name));
  }

  function selectedItems() {
    return state.items.filter(item => state.selected.has(item.id));
  }

  function linkFor(item) {
    if (item.metadata && item.metadata.Channel === 'External' && item.metadata.ExternalLink) {
      return item.metadata.ExternalLink;
    }
    return `${location.origin}/file/${item.name}`;
  }

  function csvCell(value) {
    return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  }

  function notify(message, type) {
    let node = document.querySelector('.imb-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'imb-toast';
      node.style.cssText = 'position:fixed;right:24px;top:24px;z-index:2600;padding:10px 14px;border-radius:8px;color:#fff;font:700 13px system-ui;box-shadow:0 10px 30px rgba(15,23,42,.24)';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.style.background = type === 'error' ? '#dc2626' : '#2563eb';
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.remove(), 2200);
  }

  function build() {
    if (document.querySelector('.imb-launcher')) return;

    const launcher = document.createElement('button');
    launcher.className = 'imb-launcher';
    launcher.textContent = '图片管理器';
    launcher.addEventListener('click', () => openManager());
    document.body.appendChild(launcher);

    const shell = document.createElement('section');
    shell.className = 'imb-shell';
    shell.hidden = true;
    shell.innerHTML = `
      <div class="imb-topbar">
        <div>
          <div class="imb-title">图片管理器</div>
          <div class="imb-path" data-role="path"></div>
        </div>
        <button class="imb-btn" data-action="close">关闭</button>
      </div>
      <div class="imb-toolbar">
        <button class="imb-btn primary" data-action="upload">批量上传</button>
        <button class="imb-btn" data-action="select-all">全选</button>
        <button class="imb-btn" data-action="clear-select">取消选择</button>
        <button class="imb-btn" data-action="refresh">刷新</button>
        <span class="imb-spacer"></span>
        <input class="imb-search" data-role="search" placeholder="搜索当前文件夹">
        <input type="file" data-role="file-input" multiple accept="image/*,video/*" hidden>
      </div>
      <div class="imb-progress"><span data-role="progress"></span></div>
      <div class="imb-main">
        <div class="imb-grid" data-role="grid"></div>
        <div class="imb-statusbar">
          <span data-role="count">0 项</span>
          <span data-role="selected">已选择 0 项</span>
        </div>
      </div>`;
    document.body.appendChild(shell);

    const menu = document.createElement('div');
    menu.className = 'imb-menu';
    menu.hidden = true;
    document.body.appendChild(menu);

    const lightbox = document.createElement('div');
    lightbox.className = 'imb-lightbox';
    lightbox.hidden = true;
    lightbox.innerHTML = '<img alt="">';
    lightbox.addEventListener('click', () => lightbox.hidden = true);
    document.body.appendChild(lightbox);

    shell.addEventListener('click', onShellClick);
    shell.addEventListener('contextmenu', onContextMenu);
    shell.querySelector('[data-role="search"]').addEventListener('input', event => {
      state.query = event.target.value.trim().toLowerCase();
      renderGrid();
    });
    shell.querySelector('[data-role="file-input"]').addEventListener('change', event => uploadFiles(event.target.files));
    document.addEventListener('click', () => menu.hidden = true);
  }

  async function openManager() {
    state.open = true;
    document.querySelector('.imb-shell').hidden = false;
    await refresh();
  }

  function closeManager() {
    state.open = false;
    document.querySelector('.imb-shell').hidden = true;
  }

  async function refresh() {
    const url = `/api/manage/list?dir=${encodeURIComponent(state.currentPath)}&count=1000`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      notify('读取文件列表失败，请确认已登录管理端', 'error');
      return;
    }
    const data = await response.json();
    const folders = new Set(data.directories || []);
    state.virtualFolders.filter(path => cleanDir(path).startsWith(state.currentPath)).forEach(path => {
      const rest = cleanDir(path).slice(state.currentPath.length);
      if (rest && !rest.slice(0, -1).includes('/')) folders.add(cleanDir(path).replace(/\/$/, ''));
    });
    const folderItems = Array.from(folders).map(name => ({
      id: `folder:${name}`,
      name,
      isFolder: true,
      metadata: { FileName: baseName(name) }
    }));
    const fileItems = (data.files || []).map(file => ({
      id: `file:${file.name}`,
      name: file.name,
      isFolder: false,
      metadata: file.metadata || {}
    }));
    state.items = folderItems.concat(fileItems);
    state.selected.clear();
    render();
  }

  function render() {
    const path = document.querySelector('[data-role="path"]');
    path.innerHTML = '';
    const root = document.createElement('button');
    root.textContent = '全部文件';
    root.addEventListener('click', () => navigate(''));
    path.appendChild(root);
    let acc = '';
    state.currentPath.split('/').filter(Boolean).forEach(part => {
      path.append(' / ');
      acc += `${part}/`;
      const btn = document.createElement('button');
      btn.textContent = part;
      btn.addEventListener('click', () => navigate(acc));
      path.appendChild(btn);
    });
    renderGrid();
  }

  function renderGrid() {
    const grid = document.querySelector('[data-role="grid"]');
    const query = state.query;
    const items = query ? state.items.filter(item => baseName(item.name).toLowerCase().includes(query)) : state.items;
    grid.innerHTML = '';
    if (items.length === 0) {
      grid.innerHTML = '<div style="color:#64748b;padding:22px">当前文件夹没有内容</div>';
    }
    items.forEach(item => grid.appendChild(card(item)));
    document.querySelector('[data-role="count"]').textContent = `${items.length} 项`;
    document.querySelector('[data-role="selected"]').textContent = `已选择 ${state.selected.size} 项`;
  }

  function card(item) {
    const node = document.createElement('article');
    node.className = `imb-card${state.selected.has(item.id) ? ' selected' : ''}`;
    node.dataset.id = item.id;
    node.innerHTML = `
      <div class="imb-thumb"></div>
      <label class="imb-name"><input class="imb-check" type="checkbox" ${state.selected.has(item.id) ? 'checked' : ''}><span title="${baseName(item.name)}">${baseName(item.name)}</span></label>`;
    const thumb = node.querySelector('.imb-thumb');
    if (item.isFolder) {
      thumb.innerHTML = '<div class="imb-folder">文件夹</div>';
    } else if (isImage(item)) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = fileUrl(item.name);
      thumb.appendChild(img);
    } else if (isVideo(item)) {
      const video = document.createElement('video');
      video.src = fileUrl(item.name);
      video.muted = true;
      thumb.appendChild(video);
    } else {
      thumb.innerHTML = '<div class="imb-file">文件</div>';
    }
    return node;
  }

  function onShellClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) {
      event.preventDefault();
      handleAction(action);
      return;
    }
    const cardNode = event.target.closest('.imb-card');
    if (!cardNode) return;
    const item = state.items.find(entry => entry.id === cardNode.dataset.id);
    if (!item) return;
    if (event.target.classList.contains('imb-check')) {
      toggle(item);
      return;
    }
    if (item.isFolder) {
      navigate(cleanDir(item.name));
      return;
    }
    if (isImage(item)) {
      const box = document.querySelector('.imb-lightbox');
      box.querySelector('img').src = fileUrl(item.name);
      box.hidden = false;
    } else {
      toggle(item);
    }
  }

  function handleAction(action) {
    if (action === 'close') closeManager();
    if (action === 'upload') document.querySelector('[data-role="file-input"]').click();
    if (action === 'new-folder') createFolder();
    if (action === 'select-all') selectAll();
    if (action === 'clear-select') clearSelection();
    if (action === 'copy') copyLinks();
    if (action === 'export') exportExcel();
    if (action === 'move') moveSelected();
    if (action === 'delete') deleteSelected();
    if (action === 'refresh') refresh();
  }

  function toggle(item) {
    if (state.selected.has(item.id)) state.selected.delete(item.id);
    else state.selected.add(item.id);
    renderGrid();
  }

  function selectAll() {
    const query = state.query;
    const items = query ? state.items.filter(item => baseName(item.name).toLowerCase().includes(query)) : state.items;
    items.forEach(item => state.selected.add(item.id));
    renderGrid();
  }

  function clearSelection() {
    state.selected.clear();
    renderGrid();
  }

  function navigate(path) {
    state.currentPath = cleanDir(path);
    refresh();
  }

  function createFolder() {
    const name = prompt('文件夹名称');
    if (!name) return;
    const cleanName = name.replace(/[\\/:*?"<>|]+/g, '-').trim();
    if (!cleanName) return;
    const folder = cleanDir(`${state.currentPath}${cleanName}`);
    if (!state.virtualFolders.includes(folder)) state.virtualFolders.push(folder);
    saveVirtualFolders();
    refresh();
  }

  async function expandItems(items) {
    let files = [];
    for (const item of items) {
      if (!item.isFolder) {
        files.push(item);
        continue;
      }
      const response = await fetch(`/api/manage/list?dir=${encodeURIComponent(item.name)}&recursive=true&count=-1`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        files = files.concat((data.files || []).map(file => ({
          id: `file:${file.name}`,
          name: file.name,
          isFolder: false,
          metadata: file.metadata || {}
        })));
      }
    }
    return files;
  }

  async function copyLinks(items = selectedItems()) {
    const files = await expandItems(items);
    const links = files.map(linkFor);
    if (!links.length) return notify('请先选择图片文件', 'error');
    await navigator.clipboard.writeText(links.join('\n'));
    notify(`已复制 ${links.length} 条链接`);
  }

  async function exportExcel(items = selectedItems()) {
    const rows = await expandItems(items);
    if (!rows.length) return notify('请先选择要导出的图片', 'error');
    const header = ['文件名', '链接', '类型', '大小MB', '上传时间', '目录'];
    const tableRows = [header].concat(rows.map(item => [
      item.metadata.FileName || baseName(item.name),
      linkFor(item),
      item.metadata.FileType || '',
      item.metadata.FileSize || '',
      item.metadata.TimeStamp ? new Date(Number(item.metadata.TimeStamp)).toLocaleString() : '',
      item.metadata.Directory || state.currentPath
    ]));
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows.map(row => `<tr>${row.map(cell => `<td>${String(cell == null ? '' : cell).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `imgbed-links-${Date.now()}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function moveSelected(items = selectedItems()) {
    if (!items.length) return notify('请先选择文件或文件夹', 'error');
    const target = cleanDir(prompt('移动到哪个文件夹？', state.currentPath) || '');
    if (target === state.currentPath) return;
    for (const item of items) {
      await fetch(`/api/manage/move/${apiPath(item.name)}?folder=${item.isFolder}&dist=${encodeURIComponent(target)}`, { credentials: 'include' });
    }
    notify(`已移动 ${items.length} 项`);
    refresh();
  }

  async function deleteSelected(items = selectedItems()) {
    if (!items.length) return notify('请先选择文件或文件夹', 'error');
    if (!confirm(`确认删除 ${items.length} 项？`)) return;
    for (const item of items) {
      await fetch(`/api/manage/delete/${apiPath(item.name)}?folder=${item.isFolder}`, { credentials: 'include' });
    }
    state.virtualFolders = state.virtualFolders.filter(path => !items.some(item => item.isFolder && cleanDir(path).startsWith(cleanDir(item.name))));
    saveVirtualFolders();
    notify(`已删除 ${items.length} 项`);
    refresh();
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const progress = document.querySelector('[data-role="progress"]');
    let done = 0;
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const url = `/upload?uploadFolder=${encodeURIComponent(state.currentPath.replace(/\/$/, ''))}&returnFormat=default`;
      const response = await fetch(url, { method: 'POST', credentials: 'include', body: form });
      if (!response.ok) notify(`${file.name} 上传失败`, 'error');
      done++;
      progress.style.width = `${Math.round(done / files.length * 100)}%`;
    }
    notify(`已上传 ${done} 个文件`);
    setTimeout(() => progress.style.width = '0', 700);
    refresh();
  }

  function onContextMenu(event) {
    if (!event.target.closest('.imb-shell')) return;
    event.preventDefault();
    const cardNode = event.target.closest('.imb-card');
    const item = cardNode && state.items.find(entry => entry.id === cardNode.dataset.id);
    const menu = document.querySelector('.imb-menu');
    const targetItems = item
      ? (state.selected.has(item.id) ? selectedItems() : [item])
      : [];
    const targetLabel = targetItems.length > 1 ? `选中的 ${targetItems.length} 项` : (item?.isFolder ? '文件夹' : '图片');
    const options = item ? [
      item.isFolder ? ['打开文件夹', () => navigate(cleanDir(item.name))] : ['预览图片', () => {
        if (!isImage(item)) return toggle(item);
        const box = document.querySelector('.imb-lightbox');
        box.querySelector('img').src = fileUrl(item.name);
        box.hidden = false;
      }],
      ['选择/取消选择', () => toggle(item)],
      ['复制当前图片链接', () => copyLinks(targetItems)],
      ['导出链接文件', () => exportExcel(targetItems)],
      [`删除${targetLabel}`, () => deleteSelected(targetItems)]
    ] : [
      ['新建文件夹', createFolder],
      ['批量上传', () => document.querySelector('[data-role="file-input"]').click()],
      ['刷新', refresh]
    ];
    menu.innerHTML = '';
    options.forEach(([label, fn]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.addEventListener('click', event => {
        event.stopPropagation();
        menu.hidden = true;
        fn();
      });
      menu.appendChild(btn);
    });
    menu.style.left = `${Math.min(event.clientX, innerWidth - 190)}px`;
    menu.style.top = `${Math.min(event.clientY, innerHeight - options.length * 42)}px`;
    menu.hidden = false;
  }

  function tick() {
    if (isDashboard()) build();
  }

  tick();
  setInterval(tick, 1000);
})();
