const STATE_URL = '/api/workbenches/council-dashboard/state';
const ROSTER_URL = '/api/council/roster';
const SKILLS_URL = '/api/skills';

const memberGrid = document.getElementById('memberGrid');
const guildGrid = document.getElementById('guildGrid');
const managementGrid = document.getElementById('managementGrid');
const guildsSection = document.getElementById('guildsSection');
const managementSection = document.getElementById('managementSection');
const skillList = document.getElementById('skillList');
const skillSearch = document.getElementById('skillSearch');
const skillFilter = document.getElementById('skillFilter');
const skillFilterOptions = document.getElementById('skillFilterOptions');
const toast = document.getElementById('toast');
const appShell = document.querySelector('.app');
const sidebar = document.getElementById('sidebar');
const skillDetail = document.getElementById('skillDetail');
const skillDetailClose = document.getElementById('skillDetailClose');
const skillDetailContent = document.getElementById('skillDetailContent');
const skillDetailSource = document.getElementById('skillDetailSource');

let state = null;
let roster = {
  members: [],
  guilds: [],
  management: [],
  tiers: { roundtable: [], ordinary_full_council_only: [], beta: [] },
  options: { include_beta_by_default: false },
};
let preparedSkills = [];
let skillByNormalized = new Map();
let skillContentCache = new Map();
let lastStateText = '';
let stateRevision = '';
let isSaving = false;
let localChangeAt = 0;
let dirty = false;

const baseFilterOptions = [
  { mode: 'grim', label: 'All Public Skills' },
];

const invocationFilterOptions = [
  { mode: 'all', label: 'Automatic + Manual' },
  { mode: 'automatic', label: 'Automatic' },
  { mode: 'manual', label: 'Manual' },
];

const filterLabel = (mode) => {
  const base = baseFilterOptions.find((entry) => entry.mode === mode);
  if (base) return base.label;
  return String(mode || 'All Public Skills');
};

const invocationFilterLabel = (mode) =>
  invocationFilterOptions.find((entry) => entry.mode === mode)?.label || 'Automatic + Manual';

const GRIM_ROOT_ORDER = ['council', 'dev', 'artifacts', 'media', 'biz', 'me', 'mem', 'ep'];

const grimCategoryRoot = (prefix) => String(prefix || '').split(':')[1] || '';

const sortPrefixesHierarchically = (prefixes) =>
  [...prefixes].sort((left, right) => {
    if (left.startsWith(`${right}:`)) return 1;
    if (right.startsWith(`${left}:`)) return -1;
    return left.localeCompare(right);
  });

const grimCategoryPrefixes = () => {
  const names = preparedSkills
    .filter((entry) => entry.isGrim)
    .map((entry) => String(entry.skill.name || '').trim())
    .filter(Boolean);
  const prefixes = new Set();
  for (const name of names) {
    const parts = name.split(':');
    for (let index = 2; index < parts.length; index += 1) {
      prefixes.add(parts.slice(0, index).join(':'));
    }
  }
  return [...prefixes]
    .filter((prefix) => names.some((name) => name.startsWith(`${prefix}:`)))
    .sort((a, b) => {
      const rootDelta =
        (GRIM_ROOT_ORDER.indexOf(grimCategoryRoot(a)) >= 0
          ? GRIM_ROOT_ORDER.indexOf(grimCategoryRoot(a))
          : GRIM_ROOT_ORDER.length) -
        (GRIM_ROOT_ORDER.indexOf(grimCategoryRoot(b)) >= 0
          ? GRIM_ROOT_ORDER.indexOf(grimCategoryRoot(b))
          : GRIM_ROOT_ORDER.length);
      if (rootDelta !== 0) return rootDelta;
      if (a.startsWith(`${b}:`)) return 1;
      if (b.startsWith(`${a}:`)) return -1;
      return a.localeCompare(b);
    });
};

const grimCategoryGroups = () => {
  const byRoot = new Map();
  for (const prefix of grimCategoryPrefixes()) {
    const root = grimCategoryRoot(prefix);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(prefix);
  }
  const roots = [...byRoot.keys()].sort((left, right) => {
    const leftIndex = GRIM_ROOT_ORDER.indexOf(left);
    const rightIndex = GRIM_ROOT_ORDER.indexOf(right);
    const leftRank = leftIndex >= 0 ? leftIndex : GRIM_ROOT_ORDER.length;
    const rightRank = rightIndex >= 0 ? rightIndex : GRIM_ROOT_ORDER.length;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
  return roots.map((root) => ({
    root,
    prefixes: sortPrefixesHierarchically(byRoot.get(root)),
  }));
};

const isValidFilterMode = (mode) => {
  const value = String(mode || '').trim();
  if (!value) return false;
  if (value === 'grim') return true;
  if (!value.startsWith('grim:')) return false;
  return preparedSkills.some((entry) => {
    const name = String(entry.skill.name || '');
    return name === value || name.startsWith(`${value}:`);
  });
};

const ensureValidSkillFilter = () => {
  if (!state?.layout) return;
  if (isValidFilterMode(state.layout.skill_filter)) return;
  state.layout.skill_filter = 'grim';
};

const ensureValidInvocationFilter = () => {
  if (!state?.layout) return;
  const mode = String(state.layout.skill_invocation_filter || 'all');
  if (invocationFilterOptions.some((entry) => entry.mode === mode)) {
    state.layout.skill_invocation_filter = mode;
    return;
  }
  state.layout.skill_invocation_filter = 'all';
};

const renderFilterOptions = () => {
  const activeMode = state?.layout?.skill_filter || 'grim';
  const activeInvocationMode = state?.layout?.skill_invocation_filter || 'all';
  const categoryGroups = grimCategoryGroups();
  const baseMarkup = baseFilterOptions
    .map(
      ({ mode, label }) => `
        <button
          class="filter-option"
          type="button"
          role="menuitemradio"
          data-filter-mode="${escapeText(mode)}"
          aria-checked="${mode === activeMode ? 'true' : 'false'}"
        >${escapeText(label)}</button>
      `,
    )
    .join('');

  const categoryMarkup = categoryGroups
    .map(({ prefixes }, groupIndex) => {
      const divider = `<div class="filter-divider" role="separator" aria-hidden="true"></div>`;
      const options = prefixes
        .map((prefix) => {
          const depth = Math.max(0, prefix.split(':').length - 2);
          return `
            <button
              class="filter-option filter-option--category"
              type="button"
              role="menuitemradio"
              data-filter-mode="${escapeText(prefix)}"
              data-filter-depth="${depth}"
              aria-checked="${prefix === activeMode ? 'true' : 'false'}"
            >${escapeText(prefix)}</button>
          `;
        })
        .join('');
      return `${groupIndex === 0 && categoryGroups.length ? divider : ''}${groupIndex > 0 ? divider : ''}${options}`;
    })
    .join('');

  const invocationMarkup = invocationFilterOptions
    .map(
      ({ mode, label }) => `
        <button
          class="filter-option"
          type="button"
          role="menuitemradio"
          data-invocation-mode="${escapeText(mode)}"
          aria-checked="${mode === activeInvocationMode ? 'true' : 'false'}"
        >${escapeText(label)}</button>
      `,
    )
    .join('');

  skillFilterOptions.innerHTML = `
    <div class="filter-section-title" role="presentation">Category</div>
    ${baseMarkup}
    ${categoryMarkup}
    <div class="filter-divider" role="separator" aria-hidden="true"></div>
    <div class="filter-section-title" role="presentation">Invocation</div>
    ${invocationMarkup}
  `;
};

const syncFilterUi = () => {
  const mode = state?.layout?.skill_filter || 'grim';
  const invocationMode = state?.layout?.skill_invocation_filter || 'all';
  skillFilter.dataset.filterMode = mode;
  skillFilter.dataset.invocationMode = invocationMode;
  skillFilter.setAttribute(
    'aria-label',
    `Filter skills: ${filterLabel(mode)}, ${invocationFilterLabel(invocationMode)}`,
  );
  for (const option of skillFilterOptions.querySelectorAll('[data-filter-mode]')) {
    option.setAttribute('aria-checked', String(option.dataset.filterMode === mode));
  }
  for (const option of skillFilterOptions.querySelectorAll('[data-invocation-mode]')) {
    option.setAttribute('aria-checked', String(option.dataset.invocationMode === invocationMode));
  }
};

// Map an absolute skill path from the server into the web route it serves,
// without hardcoding where the repo lives on disk.
const skillWebPath = (absolutePath) => {
  const value = String(absolutePath || '').trim();
  if (!value) return '';
  const skillsIndex = value.indexOf('/skills/');
  if (skillsIndex >= 0) {
    return `/skills/${value.slice(skillsIndex + '/skills/'.length)}`;
  }
  const packsIndex = value.indexOf('/expansionPacks/');
  if (packsIndex >= 0) {
    return `/expansionPacks/${value.slice(packsIndex + '/expansionPacks/'.length)}`;
  }
  if (/^(https?:|data:|blob:|\/skills\/|\/expansionPacks\/)/.test(value)) return value;
  return '';
};

const enrichSkillUrls = (skill) => {
  if (skill?.portrait_url || skill?.icon_url) {
    return { ...skill };
  }
  const icons = Array.isArray(skill?.icons) ? skill.icons : [];
  const iconLarge =
    icons.find((entry) => entry?.label === 'icon_large' && entry?.path) ||
    icons.find((entry) => entry?.path);
  const portraitPath = skill?.skill_dir ? `${skill.skill_dir}/assets/portrait.png` : '';
  return {
    ...skill,
    portrait_url: skillWebPath(portraitPath),
    icon_url: skillWebPath(iconLarge?.path || ''),
  };
};

const normalizeState = (raw) => ({
  version: Number(raw?.version || 1),
  updated_at: raw?.updated_at || '',
  layout: {
    member_columns: Number(raw?.layout?.member_columns || 5),
    sidebar_collapsed: Boolean(raw?.layout?.sidebar_collapsed),
    skill_filter: raw?.layout?.skill_filter || 'grim',
    skill_invocation_filter: raw?.layout?.skill_invocation_filter || 'all',
    sections: {
      members: raw?.layout?.sections?.members !== false,
      guilds: raw?.layout?.sections?.guilds !== false,
      management: raw?.layout?.sections?.management !== false,
    },
  },
});

const escapeText = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return entities[char];
  });

const titleCase = (value) =>
  String(value || '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/^mcp:\s*/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseDescriptionTitle = (description) => {
  const text = String(description || '').trim();
  const match = text.match(/^(?:\([^)]*\):\s*)?([^:]+?)(?:\s*\(([^)]*)\))?:\s*(.+)$/);
  if (!match) return null;
  const rawTitle = match[1].trim();
  const wrappedTitle = rawTitle.match(/^\(([^)]+)\)$/);
  const title = (wrappedTitle?.[1] || rawTitle).trim();
  const role = (match[2] || '').trim();
  const titleWordCount = title.split(/\s+/).filter(Boolean).length;
  if (!role && titleWordCount > 5) return null;
  if (/^use when\b/i.test(title)) return null;
  return { title, role, description: match[3].trim() };
};

const cleanSkillTitle = (skill) => {
  const display = String(skill?.openai_yaml?.interface?.display_name || '').trim();
  if (display && !display.startsWith('grim:')) return display;
  const title = String(skill?.title || '').trim();
  if (title && !title.startsWith('grim:')) return title;
  const parsed = parseDescriptionTitle(skill?.frontmatter?.description || skill?.description);
  if (parsed?.title && !parsed.title.startsWith('grim:')) return parsed.title;
  const name = String(skill?.name || '').trim();
  if (!name.includes(':')) return titleCase(name);
  return titleCase(name.split(':').pop());
};

const cleanSkillDescription = (skill) => {
  const parsed = parseDescriptionTitle(skill?.frontmatter?.description || skill?.description);
  return (
    parsed?.description ||
    skill?.description ||
    skill?.frontmatter?.description ||
    skill?.openai_yaml?.interface?.short_description ||
    ''
  );
};

const cleanLaunchSubtitle = (skill) => {
  const parsed = parseDescriptionTitle(
    skill?.frontmatter?.description ||
      skill?.description ||
      skill?.openai_yaml?.interface?.short_description,
  );
  if (parsed?.description) return parsed.description;
  const title = cleanSkillTitle(skill);
  const short = String(skill?.openai_yaml?.interface?.short_description || '').trim();
  if (short.startsWith(`${title}:`)) return short.slice(title.length + 1).trim();
  return cleanSkillDescription(skill);
};

const cleanSkillRole = (skill) => {
  if (skill?.role) return skill.role;
  const parsed = parseDescriptionTitle(skill?.frontmatter?.description || skill?.description);
  return parsed?.role || '';
};

const skillCommand = (skill) => (skill?.name ? `/${skill.name}` : '');

const isImplicitInvocationDisabled = (skill) =>
  skill?.openai_yaml?.policy?.allow_implicit_invocation === false ||
  skill?.frontmatter?.['disable-model-invocation'] === true ||
  String(skill?.frontmatter?.['disable-model-invocation'] || '').toLowerCase() === 'true';

const skillInvocationMode = (skill) => (isImplicitInvocationDisabled(skill) ? 'manual' : 'automatic');

const skillInvocationTitle = (skill) =>
  skillInvocationMode(skill) === 'manual' ? 'Manual' : 'Automatic';

const revisionFrom = (response) => response.headers.get('X-Workbench-Revision') || '';

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
};

const buildCodexDeepLink = (prompt) => {
  const url = new URL('codex://new');
  url.searchParams.set('prompt', String(prompt || '').trim());
  return url.toString();
};

const openCodexPrompt = async (prompt) => {
  const trimmed = String(prompt || '').trim();
  if (!trimmed) return;
  const event = new CustomEvent('mgd-codex-open-prompt-request', {
    detail: { prompt: trimmed, handled: false },
    cancelable: true,
  });
  window.dispatchEvent(event);
  if (event.detail.handled) {
    showToast(`Sent ${trimmed}`);
    return;
  }
  window.location.href = buildCodexDeepLink(trimmed);
  showToast(`Opened ${trimmed}`);
};


const copySkillCommand = async (command) => {
  const value = String(command || '').trim();
  if (!value) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      showToast(`Copied ${value}`);
      return;
    }
  } catch (_error) {
    // Fall back below.
  }
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(`Copied ${value}`);
  } catch (_error) {
    showToast(value);
  } finally {
    textArea.remove();
  }
};

const renderImage = (src, alt, className, fallbackSrc = '') => {
  const resolved = String(src || '').trim();
  if (!resolved) return '';
  const fallback = String(fallbackSrc || '').trim();
  const fallbackAttr = fallback ? ` data-fallback-src="${escapeText(fallback)}"` : '';
  const onErrorAttr = fallback ? ' onerror="window.__mgdImageFallback(this)"' : '';
  return `<img class="${className}" src="${escapeText(resolved)}" alt="${escapeText(alt)}"${fallbackAttr}${onErrorAttr} />`;
};

window.__mgdImageFallback = (img) => {
  const fallback = img?.dataset?.fallbackSrc;
  if (!fallback || img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = fallback;
};

const renderMemberCard = (skill) => {
  const title = cleanSkillTitle(skill);
  const role = cleanSkillRole(skill);
  const portrait = skill.portrait_url || skill.icon_url || '';
  const fallback = skill.portrait_url && skill.icon_url ? skill.icon_url : '';
  return `
    <div
      class="member-card"
      role="button"
      tabindex="0"
      data-codex-prompt="${escapeText(skillCommand(skill))}"
      aria-label="Open ${escapeText(title)} in Codex"
    >
      <span class="member-image-wrap">${renderImage(portrait, title, 'member-image', fallback)}</span>
      <span class="member-copy">
        <span class="member-name">${escapeText(title)}</span>
        <span class="member-role">${escapeText(role)}</span>
      </span>
      <button
        class="copy-button is-overlay"
        type="button"
        data-copy-prompt="${escapeText(skillCommand(skill))}"
        aria-label="Copy ${escapeText(title)} skill command"
        title="Copy skill command"
      >⧉</button>
    </div>
  `;
};

const skillInitials = (skill) => {
  const title = cleanSkillTitle(skill);
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase();
};

const renderSkillIcon = (skill, isGrim) => {
  const icon = String(skill.icon_url || '').trim();
  const title = cleanSkillTitle(skill);
  if (icon) {
    return `<span class="skill-icon">${renderImage(icon, title, 'skill-icon-image')}</span>`;
  }
  if (!isGrim) {
    return `<span class="skill-icon skill-icon--placeholder is-other" aria-hidden="true"><span class="skill-icon-mark">${escapeText(skillInitials(skill))}</span></span>`;
  }
  return `<span class="skill-icon skill-icon--placeholder is-grim" aria-hidden="true"><span class="skill-icon-mark">§</span></span>`;
};

const renderSkillDetailIcon = (skill, isGrim) => {
  const icon = String(skill.icon_url || '').trim();
  const title = cleanSkillTitle(skill);
  const inner = icon
    ? renderImage(icon, title, 'skill-icon-image')
    : !isGrim
      ? `<span class="skill-icon skill-icon--placeholder is-other" aria-hidden="true"><span class="skill-icon-mark">${escapeText(skillInitials(skill))}</span></span>`
      : `<span class="skill-icon skill-icon--placeholder is-grim" aria-hidden="true"><span class="skill-icon-mark">§</span></span>`;
  return `<div class="skill-detail-icon-large">${inner}</div>`;
};

const formatMetaValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return String(value);
  }
};

const renderMetaRows = (entries) =>
  entries
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(
      ([key, value]) => `
        <div class="skill-detail-meta-row">
          <dt>${escapeText(key)}</dt>
          <dd>${escapeText(formatMetaValue(value))}</dd>
        </div>
      `,
    )
    .join('');

const fetchSkillMarkdown = async (skill) => {
  const cacheKey = skill.href || skill.skill_dir || skill.name;
  if (skillContentCache.has(cacheKey)) return skillContentCache.get(cacheKey);
  const filePath = skill.href || '';
  if (!filePath) throw new Error('Skill file path unavailable');
  const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}&t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Could not load skill file (${response.status})`);
  const text = await response.text();
  skillContentCache.set(cacheKey, text);
  return text;
};

const frontmatterHeroKeys = new Set(['name', 'description']);

const renderSkillDetail = (skill, isGrim, markdownText) => {
  const title = cleanSkillTitle(skill);
  const command = skillCommand(skill);
  const description = cleanSkillDescription(skill);
  const frontmatterRows = renderMetaRows(
    Object.entries(skill.frontmatter || {}).filter(([key]) => !frontmatterHeroKeys.has(key)),
  );
  const invocationMode = skillInvocationMode(skill);
  const invocationTitle = skillInvocationTitle(skill);
  const body = String(markdownText || '').trimEnd();

  skillDetailContent.innerHTML = `
    <div class="skill-detail-hero">
      ${renderSkillDetailIcon(skill, isGrim)}
      <h1 class="skill-detail-title">${escapeText(title)}</h1>
      <p class="skill-detail-command">${escapeText(command)}</p>
      ${description ? `<p class="skill-detail-description">${escapeText(description)}</p>` : ''}
    </div>
    <div class="skill-detail-actions">
      <button class="skill-detail-run" type="button" data-codex-prompt="${escapeText(command)}">Run in Codex</button>
      <button
        class="skill-detail-copy-large"
        type="button"
        data-copy-prompt="${escapeText(command)}"
        aria-label="Copy skill command"
        title="Copy skill command"
      >⧉</button>
    </div>
    <section class="skill-detail-section">
      <h2 class="skill-detail-section-title">Invocation</h2>
      <div class="skill-detail-invocation">
        <span class="skill-detail-invocation-badge is-${escapeText(invocationMode)}">${escapeText(invocationTitle)}</span>
      </div>
    </section>
    ${
      frontmatterRows
        ? `<section class="skill-detail-section"><h2 class="skill-detail-section-title">Front matter</h2><dl class="skill-detail-meta">${frontmatterRows}</dl></section>`
        : ''
    }
    <section class="skill-detail-section">
      <h2 class="skill-detail-section-title">Skill text</h2>
      <pre class="skill-detail-body">${escapeText(body)}</pre>
    </section>
  `;
};

const openSkillDetail = async (skillKey) => {
  const entry = preparedSkills.find(
    (item) => (item.skill.normalized || normalizeName(item.skill.name)) === skillKey,
  );
  const skill = entry?.skill || skillByNormalized.get(skillKey);
  if (!skill) return;

  skillDetail.hidden = false;
  document.body.classList.add('is-skill-detail-open');
  skillDetailSource.textContent = skill.source || 'skill';
  skillDetailContent.innerHTML = '<div class="skill-detail-loading">Loading skill…</div>';

  try {
    const markdownText = await fetchSkillMarkdown(skill);
    renderSkillDetail(skill, entry?.isGrim ?? String(skill.name || '').startsWith('grim:'), markdownText);
  } catch (error) {
    skillDetailContent.innerHTML = `<div class="skill-detail-error">${escapeText(error.message || 'Could not load skill')}</div>`;
  }
};

const closeSkillDetail = () => {
  skillDetail.hidden = true;
  document.body.classList.remove('is-skill-detail-open');
  skillDetailContent.innerHTML = '';
  skillDetailSource.textContent = '';
};

const renderLaunchTile = (skill) => {
  const title = cleanSkillTitle(skill);
  const description = cleanLaunchSubtitle(skill);
  const icon = skill.icon_url || '';
  return `
    <div
      class="launch-tile"
      role="button"
      tabindex="0"
      data-codex-prompt="${escapeText(skillCommand(skill))}"
      aria-label="Open ${escapeText(title)} in Codex"
    >
      <span class="tile-icon">${renderImage(icon, '', '') || '<span>§</span>'}</span>
      <span class="tile-copy">
        <span class="tile-title">${escapeText(title)}</span>
        <span class="tile-description">${escapeText(description)}</span>
      </span>
      <button
        class="copy-button is-overlay"
        type="button"
        data-copy-prompt="${escapeText(skillCommand(skill))}"
        aria-label="Copy ${escapeText(title)} skill command"
        title="Copy skill command"
      >⧉</button>
    </div>
  `;
};

const applyLayout = () => {
  const layout = state.layout;
  document.documentElement.style.setProperty('--member-columns', String(layout.member_columns || 5));
  memberGrid.hidden = !layout.sections.members;
  guildsSection.hidden = !layout.sections.guilds;
  managementSection.hidden = !layout.sections.management;
  appShell.classList.toggle('is-sidebar-collapsed', Boolean(layout.sidebar_collapsed));
  skillFilter.dataset.filterMode = layout.skill_filter;
  skillFilter.setAttribute('aria-label', `Filter skills: ${filterLabel(layout.skill_filter)}`);
  for (const option of skillFilterOptions.querySelectorAll('[data-filter-mode]')) {
    option.setAttribute('aria-checked', String(option.dataset.filterMode === layout.skill_filter));
  }
  syncFilterUi();
};

const renderRoster = () => {
  memberGrid.innerHTML = roster.members.map(renderMemberCard).join('');
  guildGrid.innerHTML = roster.guilds.map(renderLaunchTile).join('');
  managementGrid.innerHTML = roster.management.map(renderLaunchTile).join('');
};

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .trim();

const makeSearchFields = (skill) => ({
  name: normalizeSearchText([skill.name, skill.normalized].filter(Boolean).join(' ')),
  title: normalizeSearchText(cleanSkillTitle(skill)),
  shortDescription: normalizeSearchText(cleanSkillDescription(skill)),
  description: normalizeSearchText(skill.frontmatter?.description || skill.description),
});

const contiguousMatchScore = (text, term) => {
  if (!text || !term) return 0;
  const index = text.indexOf(term);
  if (index < 0) return 0;
  if (index === 0) return 100;
  const previous = text[index - 1];
  if (!previous || /[^a-z0-9]/.test(previous)) return 88;
  return Math.max(46, 76 - Math.min(30, Math.floor(index / 4)));
};

const subsequenceMatchScore = (text, term) => {
  if (!text || term.length < 2) return 0;
  let cursor = 0;
  let start = -1;
  let last = -1;
  for (const char of term) {
    const found = text.indexOf(char, cursor);
    if (found < 0) return 0;
    if (start < 0) start = found;
    last = found;
    cursor = found + 1;
  }
  const span = Math.max(1, last - start + 1);
  return Math.round(10 + (term.length / span) * 22);
};

const fieldTermScore = (text, term) =>
  Math.max(contiguousMatchScore(text, term), subsequenceMatchScore(text, term));

const weightedTermScore = (fields, term) =>
  Math.max(
    fieldTermScore(fields.name, term) * 8,
    fieldTermScore(fields.title, term) * 7,
    fieldTermScore(fields.shortDescription, term) * 5,
    fieldTermScore(fields.description, term) * 2,
  );

const fuzzyScore = (entry, query) => {
  const q = normalizeSearchText(query);
  if (!q) return 1;
  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    const termScore = weightedTermScore(entry.searchFields, term);
    if (termScore <= 0) return 0;
    score += termScore;
  }
  const fields = entry.searchFields;
  score += contiguousMatchScore(fields.name, q) * 12;
  score += contiguousMatchScore(fields.title, q) * 10;
  score += contiguousMatchScore(fields.shortDescription, q) * 7;
  score += contiguousMatchScore(fields.description, q) * 2;
  return score;
};

const rebuildSkillSearch = (skills) => {
  preparedSkills = skills
    .filter(
      (skill) =>
        skill.source === 'repo' &&
        String(skill.name || '').startsWith('grim:'),
    )
    .map((skill) => ({
      skill,
      isGrim: String(skill.name || '').startsWith('grim:'),
      invocationMode: skillInvocationMode(skill),
      searchFields: makeSearchFields(skill),
      sortName: cleanSkillTitle(skill).toLowerCase(),
    }))
    .sort((a, b) => a.sortName.localeCompare(b.sortName));
  skillByNormalized = new Map(preparedSkills.map((entry) => [entry.skill.normalized || normalizeName(entry.skill.name), entry.skill]));
  ensureValidSkillFilter();
  ensureValidInvocationFilter();
  renderFilterOptions();
  syncFilterUi();
};

const filterSkillEntry = (entry) => {
  const mode = state.layout.skill_filter;
  const invocationMode = state.layout.skill_invocation_filter || 'all';
  let matchesCategory = false;
  if (mode === 'all') matchesCategory = true;
  else if (mode === 'other') matchesCategory = !entry.isGrim;
  else if (mode === 'grim') matchesCategory = entry.isGrim;
  else {
    const name = String(entry.skill.name || '');
    matchesCategory = name === mode || name.startsWith(`${mode}:`);
  }
  const matchesInvocation = invocationMode === 'all' || entry.invocationMode === invocationMode;
  return matchesCategory && matchesInvocation;
};

const renderSkills = () => {
  const query = skillSearch.value || '';
  const source = preparedSkills.filter(filterSkillEntry);
  const scoredMatches = source
    .map((entry) => ({ ...entry, score: fuzzyScore(entry, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.sortName.localeCompare(b.sortName));
  const hasQuery = Boolean(query.trim());
  const strongMatches = scoredMatches.filter((entry) => entry.score >= 500);
  const matches = hasQuery ? (strongMatches.length ? strongMatches : scoredMatches.slice(0, 24)) : scoredMatches;

  skillList.innerHTML =
    matches.length === 0
      ? '<div class="empty-state">No matching skills.</div>'
      : matches
          .map(({ skill, isGrim }) => {
            const key = skill.normalized || normalizeName(skill.name);
            const title = cleanSkillTitle(skill);
            return `
              <div class="skill-row" tabindex="0" data-skill-key="${escapeText(key)}">
                ${renderSkillIcon(skill, isGrim)}
                <span class="skill-copy">
                  <span class="skill-name">${escapeText(title)}</span>
                  <span class="skill-description">${escapeText(cleanSkillDescription(skill))}</span>
                </span>
                <button class="copy-button" type="button" data-copy-prompt="${escapeText(skillCommand(skill))}" aria-label="Copy ${escapeText(title)} skill command" title="Copy skill command">⧉</button>
                <span class="skill-chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            `;
          })
          .join('');
};

const saveState = async () => {
  if (!state) return;
  isSaving = true;
  localChangeAt = Date.now();
  state.updated_at = new Date().toISOString();
  const body = JSON.stringify(state, null, 2);
  const headers = { 'Content-Type': 'application/json' };
  if (stateRevision) headers['X-Workbench-Base-Revision'] = stateRevision;
  try {
    const response = await fetch(STATE_URL, { method: 'POST', headers, body });
    if (response.status === 409) {
      stateRevision = revisionFrom(response) || stateRevision;
      throw new Error('State changed on disk. Reload before saving.');
    }
    if (!response.ok) throw new Error(await response.text());
    lastStateText = `${body}\n`;
    stateRevision = revisionFrom(response) || stateRevision;
    dirty = false;
  } finally {
    isSaving = false;
  }
};

const queueSave = () => {
  dirty = true;
  window.clearTimeout(queueSave.timer);
  queueSave.timer = window.setTimeout(() => saveState().catch(() => {}), 180);
};

const loadState = async () => {
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`State load failed: ${response.status}`);
  const text = await response.text();
  lastStateText = text;
  stateRevision = revisionFrom(response);
  state = normalizeState(JSON.parse(text));
  applyLayout();
};

const pollState = async () => {
  if (isSaving || dirty || Date.now() - localChangeAt < 600) return;
  const response = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return;
  const text = await response.text();
  if (text === lastStateText) return;
  lastStateText = text;
  stateRevision = revisionFrom(response) || stateRevision;
  state = normalizeState(JSON.parse(text));
  applyLayout();
  renderSkills();
};

let lastRosterText = '';

const loadRoster = async () => {
  const response = await fetch(`${ROSTER_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Roster load failed: ${response.status}`);
  const text = await response.text();
  if (text === lastRosterText) return;
  lastRosterText = text;
  roster = JSON.parse(text);
  renderRoster();
};

const loadSkills = async () => {
  const response = await fetch(`${SKILLS_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Skills load failed: ${response.status}`);
  const payload = await response.json();
  const skills = (Array.isArray(payload?.skills) ? payload.skills : []).map(enrichSkillUrls);
  rebuildSkillSearch(skills);
  renderSkills();
};

const setFilterMenuOpen = (isOpen) => {
  skillFilterOptions.hidden = !isOpen;
  skillFilter.setAttribute('aria-expanded', String(isOpen));
};

document.body.addEventListener('click', (event) => {
  const copyButton = event.target.closest('[data-copy-prompt]');
  if (copyButton) {
    event.preventDefault();
    event.stopPropagation();
    copySkillCommand(copyButton.dataset.copyPrompt);
    return;
  }

  const skillRow = event.target.closest('[data-skill-key]');
  if (skillRow && skillList.contains(skillRow)) {
    openSkillDetail(skillRow.dataset.skillKey);
    return;
  }

  const promptButton = event.target.closest('[data-codex-prompt]');
  if (promptButton) openCodexPrompt(promptButton.dataset.codexPrompt);
});

skillDetailClose.addEventListener('click', closeSkillDetail);
skillDetail.addEventListener('click', (event) => {
  if (event.target === skillDetail) {
    closeSkillDetail();
  }
});

skillSearch.addEventListener('input', renderSkills);
skillFilter.addEventListener('click', (event) => {
  event.stopPropagation();
  setFilterMenuOpen(skillFilterOptions.hidden);
});
skillFilterOptions.addEventListener('click', (event) => {
  const categoryOption = event.target.closest('[data-filter-mode]');
  const invocationOption = event.target.closest('[data-invocation-mode]');
  if (!categoryOption && !invocationOption) return;
  event.stopPropagation();
  if (categoryOption) {
    state.layout.skill_filter = categoryOption.dataset.filterMode || 'all';
  }
  if (invocationOption) {
    state.layout.skill_invocation_filter = invocationOption.dataset.invocationMode || 'all';
  }
  applyLayout();
  renderSkills();
  queueSave();
});
document.addEventListener('click', () => {
  setFilterMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!skillDetail.hidden) {
      closeSkillDetail();
      return;
    }
    setFilterMenuOpen(false);
  }
});

skillList.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const skillRow = event.target.closest('[data-skill-key]');
  if (!skillRow || event.target.closest('[data-copy-prompt]')) return;
  event.preventDefault();
  openSkillDetail(skillRow.dataset.skillKey);
});

document.body.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.target.closest('button, input, textarea')) return;
  const promptButton = event.target.closest('[data-codex-prompt]');
  if (!promptButton) return;
  event.preventDefault();
  openCodexPrompt(promptButton.dataset.codexPrompt);
});

const init = async () => {
  await loadState();
  await Promise.all([loadRoster(), loadSkills()]);
  window.setInterval(() => pollState().catch(() => {}), 1500);
  window.setInterval(() => loadRoster().catch(() => {}), 8000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadRoster().catch(() => {});
      loadSkills().catch(() => {});
    }
  });
};

init().catch((error) => {
  showToast(error.message || 'Council Dashboard failed to load');
});
