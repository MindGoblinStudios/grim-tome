const STATE_URL = '/api/workbenches/image-review-flow-workbench/state';
const SAVE_URL = STATE_URL;
const ASSETS_URL = '/api/workbenches/image-review-flow-workbench/assets';

const batchFeed = document.getElementById('batchFeed');
const bootStatus = document.getElementById('bootStatus');
const saveStatus = document.getElementById('saveStatus');
const copyPromptButton = document.getElementById('copyPromptButton');
const openCodexButton = document.getElementById('openCodexButton');
const activeGoal = document.getElementById('activeGoal');
const batchCount = document.getElementById('batchCount');
const selectedCount = document.getElementById('selectedCount');
const finalCount = document.getElementById('finalCount');
const nextPrompt = document.getElementById('nextPrompt');
const imageDialog = document.getElementById('imageDialog');
let dialogImage = document.getElementById('dialogImage');
const imagePan = document.getElementById('imagePan');
const closeDialogButton = document.getElementById('closeDialogButton');
const dialogVideoControls = document.getElementById('dialogVideoControls');
const dialogVideoPlayButton = document.getElementById('dialogVideoPlayButton');
const dialogVideoTimeline = document.getElementById('dialogVideoTimeline');
const dialogVideoCurrentTime = document.getElementById('dialogVideoCurrentTime');
const dialogVideoDuration = document.getElementById('dialogVideoDuration');
const videoPlaybackButton = document.getElementById('videoPlaybackButton');
const themeToggleButton = document.getElementById('themeToggleButton');
const sidebarToggleButton = document.getElementById('sidebarToggleButton');

let state = null;
let lastStateText = '';
let stateRevision = '';
let lastAssetText = '';
let isSaving = false;
let lastLocalChangeAt = 0;
let isSidebarCollapsed = false;
let shouldAutoplayVideos = true;
let videoObserver = null;
let videoSyncFrame = 0;
const storageGet = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (_error) {
    return fallback;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (_error) {
    // Cursor Simple Browser and some embedded webviews block storage.
  }
};

let colorMode = storageGet('image-review-flow-workbench-color-mode', 'dark');

const VIDEO_AUTOPLAY_ROOT_MARGIN_PX = 160;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMediaTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const dialogVideo = () => (dialogImage?.tagName === 'VIDEO' ? dialogImage : null);

const updateDialogVideoControls = () => {
  const video = dialogVideo();
  if (!dialogVideoControls) return;
  dialogVideoControls.hidden = !video;
  if (!video) return;

  const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
  dialogVideoPlayButton.textContent = video.paused ? '▶' : 'Ⅱ';
  dialogVideoPlayButton.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
  dialogVideoTimeline.disabled = !hasDuration;
  dialogVideoCurrentTime.textContent = formatMediaTime(video.currentTime);
  dialogVideoDuration.textContent = formatMediaTime(hasDuration ? video.duration : 0);

  if (hasDuration && !dialogVideoTimeline.matches(':active')) {
    dialogVideoTimeline.value = String(Math.round((video.currentTime / video.duration) * 1000));
  }
};

const setStatus = (message) => {
  saveStatus.textContent = message;
};

const setBootStatus = (message, hide = false) => {
  if (!bootStatus) return;
  bootStatus.textContent = message;
  bootStatus.hidden = hide;
};

const revisionFrom = (response) => response.headers.get('X-Workbench-Revision') || '';

const sidebarIcon = () =>
  isSidebarCollapsed
    ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 6 9 12l6 6"></path></svg>'
    : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"></path></svg>';

const videosOnPage = () => [...document.querySelectorAll('.image-card video')];

const isVideoNearViewport = (video) => {
  const rect = video.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom >= -VIDEO_AUTOPLAY_ROOT_MARGIN_PX && rect.top <= viewportHeight + VIDEO_AUTOPLAY_ROOT_MARGIN_PX;
};

const ensureVideoSource = (video) => {
  if (!video || video.getAttribute('src')) return;
  const source = video.dataset.src;
  if (!source) return;
  video.src = source;
  video.load?.();
};

const updateVideoPlaybackButton = () => {
  const videos = videosOnPage();
  if (!videoPlaybackButton) return;
  videoPlaybackButton.hidden = videos.length === 0;
  if (!videos.length) return;
  videoPlaybackButton.textContent = shouldAutoplayVideos ? 'Ⅱ' : '▶';
  videoPlaybackButton.setAttribute('aria-label', shouldAutoplayVideos ? 'Pause videos' : 'Play videos');
};

const applyColorMode = () => {
  document.documentElement.dataset.theme = colorMode;
  themeToggleButton.textContent = colorMode === 'dark' ? '☾' : '☼';
  themeToggleButton.setAttribute(
    'aria-label',
    colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
};

const applyBoardChrome = () => {
  applyColorMode();
  document.body.classList.toggle('is-sidebar-collapsed', isSidebarCollapsed);
  sidebarToggleButton.innerHTML = sidebarIcon();
  sidebarToggleButton.setAttribute('aria-expanded', isSidebarCollapsed ? 'false' : 'true');
  sidebarToggleButton.setAttribute(
    'aria-label',
    isSidebarCollapsed ? 'Expand prompt sidebars' : 'Collapse prompt sidebars'
  );
  document
    .querySelectorAll('.batch-row')
    .forEach((row) => row.classList.toggle('is-sidebar-collapsed', isSidebarCollapsed));
  updateVideoPlaybackButton();
};

const itemLabel = (batch, item) => `${batch.id} / ${item.slot} / ${item.code}`;
const imageNumber = (batchIndex, itemIndex) =>
  (state?.batches || [])
    .slice(0, batchIndex)
    .reduce((total, batch) => total + (Array.isArray(batch.items) ? batch.items.length : 0), 0) +
  itemIndex +
  1;
const itemRef = (number) => `image ${number}`;
const isSelectedItem = (item) => Boolean(item?.hearted);
const imageRef = (value) => String(value || '').replace(/^\.\//, '');
const isVideoRef = (value) => /\.(mp4|webm|mov|m4v)$/i.test(imageRef(value).split('?')[0]);
const slugify = (value) =>
  String(value || 'inbox')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';

const imagePathSet = (batches) => {
  const paths = new Set();
  (batches || []).forEach((batch) => {
    (batch.items || []).forEach((item) => {
      if (item.image) paths.add(imageRef(item.image));
      if (item.source_image) paths.add(imageRef(item.source_image));
    });
  });
  return paths;
};

const autoBatchId = (folder, chunkIndex) => `folder-${slugify(folder || 'inbox')}-${chunkIndex + 1}`;

const buildAutoBatches = (assets) => {
  const existingImages = imagePathSet(state?.batches || []);
  const seenAssetPaths = new Set();
  const untrackedAssets = (assets || []).filter((asset) => {
    if (!asset.path) return false;
    const ref = imageRef(asset.path);
    if (existingImages.has(ref) || seenAssetPaths.has(ref)) return false;
    seenAssetPaths.add(ref);
    return true;
  });
  const byFolder = new Map();
  untrackedAssets.forEach((asset) => {
    const folder = asset.folder || 'inbox';
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(asset);
  });

  return [...byFolder.entries()].flatMap(([folder, folderAssets]) => {
    const batches = [];
    for (let index = 0; index < folderAssets.length; index += 4) {
      const chunk = folderAssets.slice(index, index + 4);
      batches.push({
        id: autoBatchId(folder, index / 4),
        title: folder,
        stage: 'inbox',
        intent: 'folder-import',
        created_at: new Date(Math.min(...chunk.map((asset) => asset.mtime_ms || Date.now()))).toISOString(),
        prompt: '',
        notes: 'Auto-imported from the workbench media folder.',
        next_prompt: '',
        items: chunk.map((asset, itemIndex) => ({
          slot: itemIndex + 1,
          code: slugify(asset.name),
          status: 'candidate',
          image: asset.path,
          prompt_delta: '',
          critique: '',
          qa_notes: '',
          hearted: false,
          final: false,
          tags: ['folder-import'],
        })),
      });
    }
    return batches;
  });
};

const syncAssetRows = async (options = {}) => {
  try {
    const response = await fetch(`${ASSETS_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return false;
    const text = await response.text();
    const changed = text !== lastAssetText;
    if (!changed && !options.force) return false;
    lastAssetText = text;
    const payload = JSON.parse(text);
    const autoBatches = buildAutoBatches(payload.assets || []);
    if (autoBatches.length) state.batches.push(...autoBatches);
    return changed || autoBatches.length > 0;
  } catch (_error) {
    return false;
  }
};

const normalizeState = (rawState) => {
  const nextState = rawState && typeof rawState === 'object' ? rawState : {};
  nextState.version = Number(nextState.version || 2);
  nextState.title = nextState.title || 'Image Review Flow Workbench';
  nextState.active_goal = nextState.active_goal || 'Review visual candidates and choose favorites.';
  nextState.batches = Array.isArray(nextState.batches) ? nextState.batches : [];
  nextState.batches.forEach((batch) => {
    batch.items = Array.isArray(batch.items) ? batch.items : [];
    batch.items.forEach((item, index) => {
      item.slot = item.slot || index + 1;
      item.hearted = Boolean(item.hearted);
      item.tags = Array.isArray(item.tags) ? item.tags : [];
    });
  });
  return nextState;
};

const selectedItems = () =>
  (state?.batches || []).flatMap((batch, batchIndex) =>
    (batch.items || [])
      .map((item, itemIndex) => ({ batch, batchIndex, item, itemIndex }))
      .filter(({ item }) => isSelectedItem(item))
  );

const buildNextPrompt = () => {
  const selected = selectedItems();
  const batches = state?.batches || [];
  const latestBatch = batches.at(-1);
  const latestBatchIndex = batches.length - 1;
  const sourceItems = selected.length
    ? selected
    : (latestBatch?.items || []).map((item, itemIndex) => ({
        batch: latestBatch,
        batchIndex: latestBatchIndex,
        item,
        itemIndex,
      }));

  const itemLines = sourceItems
    .map(
      ({ batch, batchIndex, item, itemIndex }) =>
        `- image ${imageNumber(batchIndex, itemIndex)}${item.hearted ? ' favorite' : ''}: ${batch.id} / ${item.code}`
    )
    .join('\n');

  return [
    'Use grim:media:image-review-flow-workbench.',
    latestBatch?.prompt ? `Prompt:\n${latestBatch.prompt}` : '',
    itemLines ? `Selected/reference images:\n${itemLines}` : '',
    'Append the next image batch to workbench/image-review-flow-workbench/state.json and preserve favorites.',
  ]
    .filter(Boolean)
    .join('\n\n');
};

const renderSummary = () => {
  const batches = state?.batches || [];
  activeGoal.textContent = state?.active_goal || '';
  batchCount.textContent = String(batches.length);
  selectedCount.textContent = String(selectedItems().length);
  finalCount.textContent = String(
    batches.reduce(
      (total, batch) => total + (batch.items || []).filter((item) => item.final || item.status === 'final').length,
      0
    )
  );
  nextPrompt.value = buildNextPrompt();
};

const renderItem = (batch, item, batchIndex, itemIndex) => {
  const hasImage = Boolean(item.image);
  const isVideo = isVideoRef(item.image);
  const number = imageNumber(batchIndex, itemIndex);
  const flowRef = `image-${number}`;
  const annotationLabel = `image ${number}; batch ${batch.id}; item ${itemIndex + 1}; ${item.code}`;
  const dataAttrs = `
    data-testid="flow-image-${number}"
    data-flow-ref="${escapeHtml(flowRef)}"
    data-flow-number="${number}"
    data-flow-batch-id="${escapeHtml(batch.id)}"
    data-flow-batch-index="${batchIndex}"
    data-flow-item-index="${itemIndex}"
    data-flow-code="${escapeHtml(item.code)}"
    data-flow-image="${escapeHtml(item.image || '')}"
  `;
  const mediaHtml = isVideo
    ? `<video
          ${dataAttrs}
          data-src="${escapeHtml(item.image)}"
          title="${escapeHtml(annotationLabel)}"
          muted
          loop
          playsinline
          preload="metadata"
        ></video>`
    : `<img
          ${dataAttrs}
          src="${escapeHtml(item.image)}"
          alt="${escapeHtml(annotationLabel)}"
          title="${escapeHtml(annotationLabel)}"
          loading="lazy"
        />`;
  const imageHtml = hasImage
    ? isVideo
      ? `<div class="image-open is-video" role="button" tabindex="0" ${dataAttrs} aria-label="Open ${escapeHtml(annotationLabel)}">
          ${mediaHtml}
        </div>`
      : `<button class="image-open" type="button" ${dataAttrs} aria-label="Open ${escapeHtml(annotationLabel)}">
          ${mediaHtml}
        </button>`
    : '<div class="image-open is-empty" aria-hidden="true"><div class="empty-image"></div></div>';
  const heartHtml = hasImage
    ? `<button
        class="heart-button ${item.hearted ? 'is-hearted' : ''}"
        type="button"
        aria-label="${item.hearted ? 'Unfavorite' : 'Favorite'} ${escapeHtml(annotationLabel)}"
        aria-pressed="${item.hearted ? 'true' : 'false'}"
      >♥</button>`
    : '';
  const fullscreenHtml = isVideo
    ? `<button
        class="media-fullscreen-button"
        type="button"
        data-action="fullscreen-video"
        data-testid="flow-video-fullscreen-${number}"
        data-batch-index="${batchIndex}"
        data-item-index="${itemIndex}"
        aria-label="Fullscreen ${escapeHtml(annotationLabel)}"
      >⛶</button>`
    : '';
  const videoControlsHtml = isVideo
    ? `<div class="media-controls" aria-hidden="false">
        <button
          class="media-play-toggle"
          type="button"
          data-action="toggle-video-playback"
          data-testid="flow-video-play-${number}"
          data-batch-index="${batchIndex}"
          data-item-index="${itemIndex}"
          aria-label="Play or pause ${escapeHtml(annotationLabel)}"
        >Ⅱ</button>
        <input
          class="media-timeline"
          type="range"
          min="0"
          max="1000"
          value="0"
          step="1"
          data-action="seek-video"
          data-testid="flow-video-timeline-${number}"
          data-batch-index="${batchIndex}"
          data-item-index="${itemIndex}"
          aria-label="Timeline ${escapeHtml(annotationLabel)}"
        />
      </div>`
    : '';

  return `
    <article
      class="image-card"
      ${dataAttrs}
      data-batch-index="${batchIndex}"
      data-item-index="${itemIndex}"
      aria-label="${escapeHtml(annotationLabel)}"
    >
      ${imageHtml}
      ${heartHtml}
      ${fullscreenHtml}
      ${videoControlsHtml}
    </article>
  `;
};

const renderBatch = (batch, batchIndex) => {
  const items = Array.isArray(batch.items) ? batch.items : [];
  const copyButtons = items
    .map((item, itemIndex) => {
      const number = imageNumber(batchIndex, itemIndex);
      return `
        <button
          class="copy-ref-button ${item.hearted ? 'is-selected' : ''}"
          type="button"
          data-action="copy-image-ref"
          data-batch-index="${batchIndex}"
          data-item-index="${itemIndex}"
          data-image-number="${number}"
          aria-label="Copy ${escapeHtml(itemRef(number))}"
        >${number}</button>
      `;
    })
    .join('');

  return `
    <section class="batch-row ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}" data-batch-id="${escapeHtml(batch.id)}">
      <div class="image-grid">
        ${items.map((item, itemIndex) => renderItem(batch, item, batchIndex, itemIndex)).join('')}
      </div>
      <aside class="prompt-sidebar">
        <div class="prompt-box">${escapeHtml(batch.prompt || '')}</div>
        <div class="sidebar-actions">
          <div class="copy-ref-group">
            ${copyButtons}
          </div>
          <span class="sidebar-action-spacer" aria-hidden="true"></span>
          <button class="copy-prompt-button" type="button" data-action="copy-batch-prompt" aria-label="Copy prompt">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <rect x="9" y="9" width="10" height="10" rx="2"></rect>
              <path d="M5 15V7a2 2 0 0 1 2-2h8"></path>
            </svg>
          </button>
        </div>
      </aside>
    </section>
  `;
};

const render = () => {
  const batches = Array.isArray(state?.batches) ? state.batches : [];
  batchFeed.innerHTML = batches.length
    ? batches.map((batch, batchIndex) => renderBatch(batch, batchIndex)).join('')
    : '';
  applyBoardChrome();
  renderSummary();
  requestAnimationFrame(() => syncVideoCards());
};

const parseStateText = (text) => normalizeState(JSON.parse(text));

const loadState = async (options = {}) => {
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load state: ${response.status}`);
  const text = await response.text();
  state = parseStateText(text);
  lastStateText = text;
  stateRevision = revisionFrom(response);
  await syncAssetRows({ force: true });
  setStatus(options.external ? 'Synced from state.json.' : `Loaded ${state.batches?.length || 0} row(s).`);
  render();
};

const saveState = async () => {
  if (!state) return;
  isSaving = true;
  lastLocalChangeAt = Date.now();
  state.updated_at = new Date().toISOString();
  const body = JSON.stringify(state, null, 2);
  const headers = { 'Content-Type': 'application/json' };
  if (stateRevision) headers['X-Workbench-Base-Revision'] = stateRevision;
  try {
    const response = await fetch(SAVE_URL, {
      method: 'POST',
      headers,
      body,
    });
    if (response.status === 409) {
      stateRevision = revisionFrom(response) || stateRevision;
      throw new Error('State changed on disk. Reload before saving.');
    }
    if (!response.ok) throw new Error(await response.text());
    lastStateText = `${body}\n`;
    stateRevision = revisionFrom(response) || stateRevision;
    setStatus('Saved.');
  } finally {
    isSaving = false;
  }
};

const watchStateFile = async () => {
  if (isSaving || Date.now() - lastLocalChangeAt < 750) return;
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return;
  const text = await response.text();
  const shouldReloadState = text !== lastStateText;
  if (!shouldReloadState) {
    const assetsChanged = await syncAssetRows();
    if (!assetsChanged) return;
    state = parseStateText(lastStateText);
    await syncAssetRows({ force: true });
    render();
    setStatus('Loaded folder images.');
    return;
  }
  state = parseStateText(text);
  lastStateText = text;
  stateRevision = revisionFrom(response) || stateRevision;
  await syncAssetRows({ force: true });
  render();
  setStatus('Reloaded.');
};

const toggleHeart = async (card) => {
  const batch = state.batches[Number(card.dataset.batchIndex)];
  const item = batch?.items?.[Number(card.dataset.itemIndex)];
  if (!item) return;
  item.hearted = !item.hearted;
  render();
  try {
    await saveState();
  } catch (error) {
    setStatus(`Preview-only: ${error.message}`);
  }
};

const showCopyFeedback = (button) => {
  if (!button) return;
  if (!button.dataset.defaultHtml) button.dataset.defaultHtml = button.innerHTML;
  window.clearTimeout(button.copyFeedbackTimer);
  button.classList.add('is-copied');
  button.innerHTML = '<span class="copy-feedback"><span aria-hidden="true">✓</span><span>Copied</span></span>';
  button.copyFeedbackTimer = window.setTimeout(() => {
    button.classList.remove('is-copied');
    button.innerHTML = button.dataset.defaultHtml;
  }, 1100);
};

const fallbackCopyText = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('execCommand failed');
};

const copyText = async (text, successMessage, sourceButton = null) => {
  showCopyFeedback(sourceButton);
  setStatus(successMessage);
  try {
    fallbackCopyText(text);
    return;
  } catch (_error) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_fallbackError) {
      setStatus('Clipboard blocked.');
    }
  }
};

const openImage = (card) => {
  const batch = state.batches[Number(card.dataset.batchIndex)];
  const item = batch?.items?.[Number(card.dataset.itemIndex)];
  if (!item?.image) return;
  const isVideo = isVideoRef(item.image);
  const replacement = isVideo ? document.createElement('video') : document.createElement('img');
  replacement.id = 'dialogImage';
  replacement.src = item.image;
  replacement.title = item.code;
  replacement.dataset.mediaKind = isVideo ? 'video' : 'image';
  if (isVideo) {
    replacement.autoplay = true;
    replacement.loop = true;
    replacement.muted = true;
    replacement.playsInline = true;
  } else {
    replacement.alt = item.code;
  }
  dialogImage.replaceWith(replacement);
  dialogImage = replacement;
  imageDialog.showModal();
  updateDialogVideoControls();
  imagePan.scrollTo({ top: 0, left: 0 });
};

const fullscreenVideo = async (card) => {
  if (!card?.querySelector('video')) return;
  openImage(card);
};

const updateVideoCard = (card) => {
  const video = card?.querySelector('video');
  if (!video) return;
  const playButton = card.querySelector('.media-play-toggle');
  const timeline = card.querySelector('.media-timeline');
  if (playButton) playButton.textContent = video.paused ? '▶' : 'Ⅱ';
  if (timeline && Number.isFinite(video.duration) && video.duration > 0 && !timeline.matches(':active')) {
    timeline.value = String(Math.round((video.currentTime / video.duration) * 1000));
  }
};

const syncSingleVideoCard = (video, options = {}) => {
  const card = video.closest('.image-card');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  const shouldLoad = options.forcePlay || isVideoNearViewport(video);
  if (shouldLoad) ensureVideoSource(video);

  const shouldPlay = shouldAutoplayVideos && video.dataset.userPaused !== 'true' && shouldLoad;
  if (shouldPlay) {
    video.play?.().catch(() => {});
  } else {
    video.pause?.();
  }
  updateVideoCard(card);
};

const syncVisibleVideoPlayback = () => {
  videosOnPage().forEach((video) => syncSingleVideoCard(video));
  updateVideoPlaybackButton();
};

const scheduleVideoPlaybackSync = () => {
  if (videoSyncFrame) return;
  videoSyncFrame = window.requestAnimationFrame(() => {
    videoSyncFrame = 0;
    syncVisibleVideoPlayback();
  });
};

const syncVideoCards = () => {
  if (videoObserver) videoObserver.disconnect();
  const videos = videosOnPage();
  videos.forEach((video) => syncSingleVideoCard(video));

  if ('IntersectionObserver' in window) {
    videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => syncSingleVideoCard(entry.target));
      updateVideoPlaybackButton();
    }, { rootMargin: `${VIDEO_AUTOPLAY_ROOT_MARGIN_PX}px 0px` });
    videos.forEach((video) => videoObserver.observe(video));
  }

  updateVideoPlaybackButton();
};

const setAllVideosPlayback = async (shouldPlay) => {
  shouldAutoplayVideos = shouldPlay;
  videosOnPage().forEach((video) => {
    if (shouldPlay) {
      delete video.dataset.userPaused;
      syncSingleVideoCard(video);
    } else {
      video.dataset.userPaused = 'true';
      video.pause?.();
      updateVideoCard(video.closest('.image-card'));
    }
  });
  updateVideoPlaybackButton();
  window.requestAnimationFrame(updateVideoPlaybackButton);
};

const toggleVideoPlayback = async (card) => {
  const video = card?.querySelector('video');
  if (!video) return;
  if (video.paused) {
    delete video.dataset.userPaused;
    ensureVideoSource(video);
    await video.play?.().catch(() => {});
  } else {
    video.dataset.userPaused = 'true';
    video.pause?.();
  }
  updateVideoCard(card);
  updateVideoPlaybackButton();
};

const seekVideo = (input) => {
  const card = input.closest('.image-card');
  const video = card?.querySelector('video');
  ensureVideoSource(video);
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
  video.currentTime = (Number(input.value) / 1000) * video.duration;
  updateVideoCard(card);
};

const toggleDialogVideoPlayback = async () => {
  const video = dialogVideo();
  if (!video) return;
  if (video.paused) {
    await video.play?.().catch(() => {});
  } else {
    video.pause?.();
  }
  updateDialogVideoControls();
};

const seekDialogVideo = () => {
  const video = dialogVideo();
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
  video.currentTime = (Number(dialogVideoTimeline.value) / 1000) * video.duration;
  updateDialogVideoControls();
};

batchFeed.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    if (actionButton.dataset.action === 'copy-batch-prompt') {
      const batchId = actionButton.closest('.batch-row')?.dataset.batchId;
      const batch = state.batches.find((candidate) => candidate.id === batchId);
      copyText(batch?.prompt || '', 'Copied prompt.', actionButton);
    }
    if (actionButton.dataset.action === 'copy-image-ref') {
      const batch = state.batches[Number(actionButton.dataset.batchIndex)];
      const item = batch?.items?.[Number(actionButton.dataset.itemIndex)];
      if (item) copyText(itemRef(actionButton.dataset.imageNumber), 'Copied.', actionButton);
    }
    if (actionButton.dataset.action === 'fullscreen-video') {
      fullscreenVideo(actionButton.closest('.image-card'));
    }
    if (actionButton.dataset.action === 'toggle-video-playback') {
      toggleVideoPlayback(actionButton.closest('.image-card'));
    }
    return;
  }

  const heartButton = event.target.closest('.heart-button');
  if (heartButton) {
    toggleHeart(heartButton.closest('.image-card'));
    return;
  }

  const imageButton = event.target.closest('.image-open');
  if (imageButton) {
    const card = imageButton.closest('.image-card');
    if (card?.querySelector('video')) {
      toggleVideoPlayback(card);
    } else {
      openImage(card);
    }
  }
});

batchFeed.addEventListener('input', (event) => {
  const input = event.target.closest('[data-action="seek-video"]');
  if (input) seekVideo(input);
});

batchFeed.addEventListener('timeupdate', (event) => {
  const video = event.target.closest?.('video');
  if (video) updateVideoCard(video.closest('.image-card'));
}, true);

batchFeed.addEventListener('play', (event) => {
  const video = event.target.closest?.('video');
  if (video) updateVideoCard(video.closest('.image-card'));
  updateVideoPlaybackButton();
}, true);

batchFeed.addEventListener('pause', (event) => {
  const video = event.target.closest?.('video');
  if (video) updateVideoCard(video.closest('.image-card'));
  updateVideoPlaybackButton();
}, true);

copyPromptButton.addEventListener('click', () => {
  copyText(nextPrompt.value, 'Copied prompt.');
});

videoPlaybackButton.addEventListener('click', () => {
  setAllVideosPlayback(!shouldAutoplayVideos);
});

openCodexButton.addEventListener('click', () => {
  window.location.href = `codex://new?prompt=${encodeURIComponent(nextPrompt.value)}`;
});

themeToggleButton.addEventListener('click', () => {
  colorMode = colorMode === 'dark' ? 'light' : 'dark';
  storageSet('image-review-flow-workbench-color-mode', colorMode);
  applyColorMode();
});

sidebarToggleButton.addEventListener('click', () => {
  isSidebarCollapsed = !isSidebarCollapsed;
  applyBoardChrome();
});

dialogVideoPlayButton.addEventListener('click', toggleDialogVideoPlayback);
dialogVideoTimeline.addEventListener('input', seekDialogVideo);

['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause'].forEach((eventName) => {
  imageDialog.addEventListener(eventName, (event) => {
    if (event.target === dialogVideo()) updateDialogVideoControls();
  }, true);
});

closeDialogButton.addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', (event) => {
  if (event.target === imageDialog) imageDialog.close();
});
imageDialog.addEventListener('close', () => {
  dialogVideo()?.pause?.();
  updateDialogVideoControls();
});
imagePan.addEventListener('click', (event) => {
  if (event.target === imagePan) imageDialog.close();
});

window.addEventListener('scroll', scheduleVideoPlaybackSync, { passive: true });
window.addEventListener('resize', scheduleVideoPlaybackSync);

applyColorMode();
setBootStatus('Loading review state…');

loadState()
  .then(() => {
    setBootStatus('', true);
    window.setInterval(() => {
      watchStateFile().catch((error) => setStatus(`Sync paused: ${error.message}`));
    }, 1500);
  })
  .catch((error) => {
    setStatus(error.message);
    setBootStatus(
      `Load failed: ${error.message}. Open http://127.0.0.1:8765/image-review-flow-workbench/ with node artifacts/server.js running.`
    );
  });
