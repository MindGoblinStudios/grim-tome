const STATE_URL = '/api/workbenches/workbench-artifact/state';

const note = document.getElementById('note');

let state = null;
let lastText = '';
let stateRevision = '';
let isSaving = false;
let localChangeAt = 0;
let dirty = false;

const normalizeState = (raw) => ({
  version: Number(raw?.version || 1),
  updated_at: raw?.updated_at || '',
  note: raw?.note || '',
});

const revisionFrom = (response) => response.headers.get('X-Workbench-Revision') || '';

const render = () => {
  note.value = state.note;
};

const load = async () => {
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Load failed: ${response.status}`);
  const text = await response.text();
  lastText = text;
  stateRevision = revisionFrom(response);
  state = normalizeState(JSON.parse(text));
  render();
};

const save = async () => {
  if (!state) return;
  isSaving = true;
  localChangeAt = Date.now();
  state.updated_at = new Date().toISOString();
  const body = JSON.stringify(state, null, 2);
  const headers = { 'Content-Type': 'application/json' };
  if (stateRevision) headers['X-Workbench-Base-Revision'] = stateRevision;
  try {
    const response = await fetch(STATE_URL, {
      method: 'POST',
      headers,
      body,
    });
    if (response.status === 409) {
      stateRevision = revisionFrom(response) || stateRevision;
      throw new Error('State changed on disk. Reload before saving.');
    }
    if (!response.ok) throw new Error(await response.text());
    lastText = `${body}\n`;
    stateRevision = revisionFrom(response) || stateRevision;
    dirty = false;
  } finally {
    isSaving = false;
  }
};

const queueSave = () => {
  state.note = note.value;
  dirty = true;
  window.clearTimeout(queueSave.timer);
  queueSave.timer = window.setTimeout(() => save().catch(() => {}), 180);
};

const poll = async () => {
  if (isSaving || dirty || Date.now() - localChangeAt < 600) return;
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return;
  const text = await response.text();
  if (text === lastText) return;
  lastText = text;
  stateRevision = revisionFrom(response) || stateRevision;
  state = normalizeState(JSON.parse(text));
  render();
};

note.addEventListener('input', queueSave);

load()
  .then(() => window.setInterval(() => poll().catch(() => {}), 1500))
  .catch(() => {});
