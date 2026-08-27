const STATE_URL = '/api/workbenches/text-editor-workbench/state';
const FILES_URL = '/api/workbenches/text-editor-workbench/files';
const fileUrl = (path) => `/api/workbenches/text-editor-workbench/file?path=${encodeURIComponent(path)}`;

const shell = document.querySelector('.editor-shell');
const fileList = document.getElementById('fileList');
const editor = document.getElementById('editor');
const conflict = document.getElementById('conflict');
const collapseButton = document.getElementById('collapseButton');
const expandButton = document.getElementById('expandButton');
const reloadButton = document.getElementById('reloadButton');
const overwriteButton = document.getElementById('overwriteButton');
const resizeHandle = document.getElementById('resizeHandle');
const themeToggleButton = document.getElementById('themeToggleButton');
const newNoteButton = document.getElementById('newNoteButton');
const noteMenu = document.getElementById('noteMenu');
const copyNotePathButton = document.getElementById('copyNotePathButton');
const deleteNoteButton = document.getElementById('deleteNoteButton');

let state = null;
let files = [];
let activeText = '';
let lastDiskText = '';
let stateRevision = '';
let fileRevision = '';
let dirty = false;
let conflicted = false;
let isSaving = false;
let contextPath = '';
let chromeTimer = 0;

const setStatus = () => {};

const revisionFrom = (response) => response.headers.get('X-Workbench-Revision') || '';

const copyText = async (text) => {
  noteMenu.dataset.lastCopied = text;
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
};

const normalizeState = (raw) => ({
  version: Number(raw?.version || 1),
  updated_at: raw?.updated_at || '',
  active_file: raw?.active_file || 'newnote.md',
  sidebar_collapsed: Boolean(raw?.sidebar_collapsed),
  sidebar_width: Number(raw?.sidebar_width || 240),
  color_mode: raw?.color_mode || localStorage.getItem('text-editor-workbench-color-mode') || 'light',
  recent_files: Array.isArray(raw?.recent_files) ? raw.recent_files : [],
});

const applyLayout = () => {
  const sidebarWidth = Math.max(160, Math.min(520, Number(state.sidebar_width || 240)));
  document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  document.documentElement.dataset.theme = state.color_mode;
  shell.classList.toggle('is-collapsed', state.sidebar_collapsed);
  themeToggleButton.textContent = state.color_mode === 'dark' ? '☾' : '☼';
  themeToggleButton.setAttribute(
    'aria-label',
    state.color_mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
};

const saveState = async () => {
  state.updated_at = new Date().toISOString();
  localStorage.setItem('text-editor-workbench-color-mode', state.color_mode);
  const headers = { 'Content-Type': 'application/json' };
  if (stateRevision) headers['X-Workbench-Base-Revision'] = stateRevision;
  const response = await fetch(STATE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(state, null, 2),
  });
  if (!response.ok) throw new Error(await response.text());
  stateRevision = revisionFrom(response) || stateRevision;
};

const loadState = async () => {
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  stateRevision = revisionFrom(response);
  state = normalizeState(await response.json());
  applyLayout();
};

const loadFiles = async () => {
  const response = await fetch(`${FILES_URL}?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json();
  files = payload.files || [];
  fileList.innerHTML = files
    .map(
      (file) =>
        `<button class="file-button ${file.path === state.active_file ? 'is-active' : ''}" type="button" data-path="${file.path}">${file.path}</button>`
    )
    .join('');
};

const hideNoteMenu = () => {
  contextPath = '';
  noteMenu.hidden = true;
};

const showEditorChrome = () => {
  shell.classList.remove('is-writing-idle');
  window.clearTimeout(chromeTimer);
};

const scheduleEditorChromeHide = () => {
  showEditorChrome();
  chromeTimer = window.setTimeout(() => {
    if (document.activeElement === editor && noteMenu.hidden) {
      shell.classList.add('is-writing-idle');
    }
  }, 1200);
};

const loadActiveFile = async () => {
  const response = await fetch(`${fileUrl(state.active_file)}&t=${Date.now()}`, { cache: 'no-store' });
  const text = response.ok ? await response.text() : '';
  fileRevision = response.ok ? revisionFrom(response) : '';
  activeText = text;
  lastDiskText = text;
  editor.value = text;
  dirty = false;
  conflicted = false;
  conflict.hidden = true;
  setStatus('Synced');
};

const saveFile = async () => {
  if (conflicted || isSaving) return;
  isSaving = true;
  const text = editor.value;
  const headers = {};
  if (fileRevision) headers['X-Workbench-Base-Revision'] = fileRevision;
  const response = await fetch(fileUrl(state.active_file), { method: 'POST', headers, body: text });
  isSaving = false;
  if (response.status === 409) {
    conflicted = true;
    conflict.hidden = false;
    fileRevision = revisionFrom(response) || fileRevision;
    setStatus('Paused');
    return;
  }
  if (!response.ok) {
    setStatus('Save failed');
    return;
  }
  activeText = text;
  lastDiskText = text;
  fileRevision = revisionFrom(response) || fileRevision;
  dirty = false;
  setStatus('Saved');
};

const queueSave = () => {
  dirty = true;
  window.clearTimeout(queueSave.timer);
  queueSave.timer = window.setTimeout(saveFile, 350);
};

const pollActiveFile = async () => {
  if (!state?.active_file || isSaving) return;
  const response = await fetch(`${fileUrl(state.active_file)}&t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return;
  const diskText = await response.text();
  const diskRevision = revisionFrom(response);
  if (diskText === lastDiskText) return;
  if (dirty && editor.value !== lastDiskText) {
    conflicted = true;
    conflict.hidden = false;
    fileRevision = diskRevision || fileRevision;
    setStatus('Paused');
    return;
  }
  activeText = diskText;
  lastDiskText = diskText;
  fileRevision = diskRevision || fileRevision;
  editor.value = diskText;
  setStatus('Reloaded');
};

const flushPendingSave = async () => {
  window.clearTimeout(queueSave.timer);
  if (!dirty || conflicted || isSaving) return;
  await saveFile();
};

const selectFile = async (path) => {
  if (path === state.active_file) return;
  await flushPendingSave();
  if (conflicted) return;
  hideNoteMenu();
  state.active_file = path;
  state.recent_files = [path, ...state.recent_files.filter((item) => item !== path)].slice(0, 8);
  await saveState();
  await loadFiles();
  await loadActiveFile();
};

const nextNoteName = () => {
  const existing = new Set(files.map((file) => file.path));
  if (!existing.has('newnote.md')) return 'newnote.md';
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `newnote-${index}.md`;
    if (!existing.has(candidate)) return candidate;
  }
  return `newnote-${Date.now()}.md`;
};

const createNote = async () => {
  hideNoteMenu();
  await flushPendingSave();
  if (conflicted) return;
  const path = nextNoteName();
  const response = await fetch(fileUrl(path), { method: 'POST', body: '' });
  if (!response.ok) throw new Error('Create failed');
  await loadFiles();
  await selectFile(path);
  editor.focus();
  scheduleEditorChromeHide();
};

const deleteNote = async (path) => {
  hideNoteMenu();
  if (!path) return;
  await flushPendingSave();
  if (conflicted) return;
  const response = await fetch(fileUrl(path), { method: 'DELETE' });
  if (!response.ok) throw new Error('Delete failed');
  await loadFiles();
  const remaining = files.map((file) => file.path);
  if (!remaining.length) {
    state.active_file = '';
    await createNote();
    return;
  }
  if (state.active_file === path) {
    state.active_file = remaining[0];
    state.recent_files = state.recent_files.filter((item) => item !== path);
    await saveState();
    await loadFiles();
    await loadActiveFile();
    return;
  }
  state.recent_files = state.recent_files.filter((item) => item !== path);
  await saveState();
  await loadFiles();
};

const noteFilePath = (path) => {
  const file = files.find((item) => item.path === path);
  return file?.absolute_path || path;
};

fileList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-path]');
  if (button) selectFile(button.dataset.path).catch((error) => setStatus(error.message));
});

fileList.addEventListener('contextmenu', (event) => {
  const button = event.target.closest('[data-path]');
  if (!button) return;
  event.preventDefault();
  contextPath = button.dataset.path;
  noteMenu.style.left = `${event.clientX}px`;
  noteMenu.style.top = `${event.clientY}px`;
  noteMenu.hidden = false;
});

document.addEventListener('click', (event) => {
  if (!noteMenu.hidden && !noteMenu.contains(event.target)) hideNoteMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideNoteMenu();
});

document.addEventListener('pointermove', () => {
  if (document.activeElement === editor) scheduleEditorChromeHide();
});

document.addEventListener('pointerdown', showEditorChrome);
document.addEventListener('pointerup', () => {
  if (document.activeElement === editor) scheduleEditorChromeHide();
});

editor.addEventListener('focus', scheduleEditorChromeHide);
editor.addEventListener('blur', () => {
  flushPendingSave().finally(showEditorChrome);
});
editor.addEventListener('click', scheduleEditorChromeHide);
editor.addEventListener('keydown', scheduleEditorChromeHide);
editor.addEventListener('input', () => {
  queueSave();
  scheduleEditorChromeHide();
});

newNoteButton.addEventListener('click', () => {
  createNote().catch((error) => setStatus(error.message));
});

copyNotePathButton.addEventListener('click', () => {
  const path = contextPath;
  if (!path) return;
  copyText(noteFilePath(path))
    .then(hideNoteMenu)
    .catch((error) => setStatus(error.message));
});

deleteNoteButton.addEventListener('click', () => {
  deleteNote(contextPath).catch((error) => setStatus(error.message));
});

collapseButton.addEventListener('click', () => {
  state.sidebar_collapsed = true;
  applyLayout();
  saveState().catch(() => {});
});

expandButton.addEventListener('click', () => {
  state.sidebar_collapsed = false;
  applyLayout();
  saveState().catch(() => {});
});

themeToggleButton.addEventListener('click', () => {
  state.color_mode = state.color_mode === 'dark' ? 'light' : 'dark';
  applyLayout();
  saveState().catch(() => {});
});

resizeHandle.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = Number(state.sidebar_width || 240);
  resizeHandle.setPointerCapture(event.pointerId);

  const onMove = (moveEvent) => {
    state.sidebar_width = Math.max(160, Math.min(520, startWidth + moveEvent.clientX - startX));
    applyLayout();
  };

  const onUp = () => {
    resizeHandle.removeEventListener('pointermove', onMove);
    resizeHandle.removeEventListener('pointerup', onUp);
    saveState().catch(() => {});
  };

  resizeHandle.addEventListener('pointermove', onMove);
  resizeHandle.addEventListener('pointerup', onUp);
});

reloadButton.addEventListener('click', () => loadActiveFile().catch((error) => setStatus(error.message)));
overwriteButton.addEventListener('click', () => {
  conflicted = false;
  conflict.hidden = true;
  fileRevision = '';
  saveFile().catch((error) => setStatus(error.message));
});

const flushForPageHide = () => {
  if (!dirty || conflicted || !state?.active_file) return;
  window.clearTimeout(queueSave.timer);
  const headers = {};
  if (fileRevision) headers['X-Workbench-Base-Revision'] = fileRevision;
  fetch(fileUrl(state.active_file), {
    method: 'POST',
    headers,
    body: editor.value,
    keepalive: true,
  }).catch(() => {});
};

window.addEventListener('pagehide', flushForPageHide);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushForPageHide();
});

loadState()
  .then(loadFiles)
  .then(loadActiveFile)
  .then(() => window.setInterval(() => pollActiveFile().catch(() => {}), 1500))
  .catch((error) => setStatus(error.message));
