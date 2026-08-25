#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const artifactRoot = __dirname;
const codexSkillsRoot = path.join(os.homedir(), '.codex', 'skills');
const pluginCacheRoot = path.join(os.homedir(), '.codex', 'plugins', 'cache');
const repoSkillsRoot = path.join(repoRoot, 'skills');
const expansionPacksRoot = path.join(repoRoot, 'expansionPacks');
const defaultPort = Number(process.env.PORT || 8765);
const defaultHost = process.env.HOST || '127.0.0.1';

// Per-project instancing: workbench state + media live in `<projectRoot>/workbench/<slug>/`,
// while the artifact app code (html/css/js) is served from this repo.
// Run one server per project: `node artifacts/server.js --root <project> [--port N]`.
const rootFlagIndex = process.argv.indexOf('--root');
const projectRoot = path.resolve(
  rootFlagIndex >= 0 ? process.argv[rootFlagIndex + 1] : process.env.WORKBENCH_ROOT || process.cwd()
);
const workbenchDataRoot = path.join(projectRoot, 'workbench');

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/^mcp:\s*/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (value) =>
  String(value || '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

const readTextIfExists = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_error) {
    return '';
  }
};

const parseFrontmatter = (text) => {
  const match = String(text || '').match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    data[field[1]] = field[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return data;
};

const parseDescriptionTitle = (description) => {
  const text = String(description || '').trim();
  const match = text.match(/^(?:\([^)]*\):\s*)?([^:]+?)(?:\s*\(([^)]*)\))?:\s*(.+)$/);
  if (!match) return null;
  const title = match[1].replace(/^\(([^)]+)\)$/, '$1').trim();
  const role = (match[2] || '').trim();
  const titleWordCount = title.split(/\s+/).filter(Boolean).length;
  if (!role && titleWordCount > 5) return null;
  if (/^use when\b/i.test(title)) return null;
  return {
    title,
    role,
    description: match[3].trim(),
  };
};

const parseMarkdownTitle = (text) => {
  const match = String(text || '').match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : '';
};

const parseOpenAIYaml = (skillDir) => {
  const yamlPath = path.join(skillDir, 'agents', 'openai.yaml');
  const text = readTextIfExists(yamlPath);
  if (!text) return null;
  const interfaceData = {};
  for (const key of ['display_name', 'short_description', 'icon_small', 'icon_large']) {
    const match = text.match(new RegExp(`^\\s*${key}:\\s*['"]?([^'"\\n#]+)['"]?\\s*$`, 'm'));
    if (match) interfaceData[key] = match[1].trim();
  }
  const policyData = {};
  const allowImplicitMatch = text.match(/^\s*allow_implicit_invocation:\s*(true|false)\s*$/m);
  if (allowImplicitMatch) policyData.allow_implicit_invocation = allowImplicitMatch[1] === 'true';
  const data = {};
  if (Object.keys(interfaceData).length) data.interface = interfaceData;
  if (Object.keys(policyData).length) data.policy = policyData;
  return Object.keys(data).length ? data : null;
};

const resolveIconPath = (skillDir, value) => {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  return path.resolve(skillDir, value);
};

const discoverIcons = (skillDir, openaiYaml) => {
  const icons = [];
  const addIcon = (label, iconPath) => {
    if (!iconPath || !fs.existsSync(iconPath)) return;
    icons.push({ label, path: iconPath });
  };

  addIcon('icon_small', resolveIconPath(skillDir, openaiYaml?.interface?.icon_small));
  addIcon('icon_large', resolveIconPath(skillDir, openaiYaml?.interface?.icon_large));

  const assetDir = path.join(skillDir, 'assets');
  try {
    for (const entry of fs.readdirSync(assetDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.(png|jpe?g|webp|gif)$/i.test(entry.name)) continue;
      if (!/icon/i.test(entry.name)) continue;
      addIcon('asset', path.join(assetDir, entry.name));
    }
  } catch (_error) {
    // Skills are allowed to have no asset directory.
  }

  const seen = new Set();
  return icons.filter((icon) => {
    if (seen.has(icon.path)) return false;
    seen.add(icon.path);
    return true;
  });
};

const sourceForSkill = (entryPath, realDir) => {
  const normalizedEntry = `${path.resolve(entryPath)}${path.sep}`;
  const normalizedReal = `${path.resolve(realDir)}${path.sep}`;
  if (normalizedEntry.includes(`${path.sep}.system${path.sep}`) || normalizedReal.includes(`${path.sep}.system${path.sep}`)) {
    return 'system';
  }
  if (normalizedReal.startsWith(`${pluginCacheRoot}${path.sep}`)) return 'plugin';
  if (normalizedReal.startsWith(`${repoRoot}${path.sep}`)) return 'repo';
  return 'codex';
};

const readSkill = (entryPath) => {
  let realDir;
  try {
    realDir = fs.realpathSync(entryPath);
  } catch (_error) {
    return null;
  }

  const skillPath = path.join(realDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return null;

  const skillText = readTextIfExists(skillPath);
  const frontmatter = parseFrontmatter(skillText);
  const name = String(frontmatter.name || path.basename(realDir)).trim();
  const parsed = parseDescriptionTitle(frontmatter.description);
  const markdownTitle = parseMarkdownTitle(skillText);
  const openaiYaml = parseOpenAIYaml(realDir);
  const displayName = String(openaiYaml?.interface?.display_name || '').trim();
  const cleanDisplayName = displayName && !displayName.startsWith('grim:') ? displayName : '';
  const description = parsed?.description || frontmatter.description || openaiYaml?.interface?.short_description || '';

  return {
    name,
    normalized: normalizeName(name),
    href: skillPath,
    skill_dir: realDir,
    install_path: path.resolve(entryPath),
    source: sourceForSkill(entryPath, realDir),
    title: cleanDisplayName || parsed?.title || markdownTitle || titleCase(name.split(':').pop()),
    role: parsed?.role || '',
    description,
    icons: discoverIcons(realDir, openaiYaml),
    frontmatter,
    openai_yaml: openaiYaml || undefined,
  };
};

const SKILL_CONTAINER_DIRS = new Set([
  'assets',
  'agents',
  'references',
  'scripts',
  'artifact',
  'original',
  'generated',
  'node_modules',
]);

const scanSkillRoot = (root, options = {}) => {
  const skills = [];
  const visit = (dir, depth = 0) => {
    if (depth > 10) return;

    const skill = readSkill(dir);
    if (skill && dir !== root) skills.push(skill);

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && !options.includeHidden) continue;
      if (SKILL_CONTAINER_DIRS.has(entry.name)) continue;
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      visit(path.join(dir, entry.name), depth + 1);
    }
  };

  visit(root, 0);
  return skills;
};

const loadExpansionPackSkillDirs = () => {
  const skillDirs = [];
  let packEntries = [];
  try {
    packEntries = fs.readdirSync(expansionPacksRoot, { withFileTypes: true });
  } catch (_error) {
    return skillDirs;
  }

  for (const packEntry of packEntries) {
    if (!packEntry.isDirectory()) continue;
    const packRoot = path.join(expansionPacksRoot, packEntry.name);
    const text = readTextIfExists(path.join(packRoot, 'pack.yaml'));
    if (!text) continue;

    let section = '';
    let current = null;
    const flush = () => {
      if (!current?.path) {
        current = null;
        return;
      }
      const isInstalledMutation = section === 'mutations' && current.canonical_id;
      const isPromotedOriginal = section === 'og' && current.promoted === 'true';
      if (isInstalledMutation || isPromotedOriginal) {
        skillDirs.push(path.join(packRoot, current.path));
      }
      current = null;
    };

    for (const rawLine of text.split('\n')) {
      const stripped = rawLine.trim();
      if (stripped === 'og:' || stripped === 'mutations:') {
        flush();
        section = stripped.slice(0, -1);
        continue;
      }
      if (stripped.startsWith('- ')) {
        flush();
        current = {};
        const item = stripped.slice(2);
        const separator = item.indexOf(':');
        if (separator >= 0) {
          current[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
        }
        continue;
      }
      if (current && stripped.includes(':')) {
        const separator = stripped.indexOf(':');
        current[stripped.slice(0, separator).trim()] = stripped.slice(separator + 1).trim();
      }
    }
    flush();
  }

  return skillDirs;
};

const scanExpansionPackSkills = () =>
  loadExpansionPackSkillDirs().map((skillDir) => readSkill(skillDir)).filter(Boolean);

const scanPluginCacheSkills = () => {
  const skills = [];
  const visit = (dir, depth = 0) => {
    if (depth > 7) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    if (path.basename(dir) === 'skills') {
      skills.push(...scanSkillRoot(dir));
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      visit(path.join(dir, entry.name), depth + 1);
    }
  };

  visit(pluginCacheRoot);
  return skills;
};

const loadRosterDisplayOrder = () => {
  const yamlPath = path.join(repoSkillsRoot, 'council', 'council', 'references', 'roster-display-order.yaml');
  const text = readTextIfExists(yamlPath);
  const listBuckets = [
    'members',
    'roundtable',
    'ordinary_full_council_only',
    'beta',
    'guilds',
    'management',
  ];
  const order = Object.fromEntries(listBuckets.map((name) => [name, []]));
  order.include_beta_by_default = false;
  let bucket = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const bucketName = trimmed.endsWith(':') ? trimmed.slice(0, -1) : '';
    if (listBuckets.includes(bucketName)) {
      bucket = bucketName;
      continue;
    }
    const betaDefault = trimmed.match(/^include_beta_by_default:\s*(true|false)$/i);
    if (betaDefault) {
      order.include_beta_by_default = betaDefault[1].toLowerCase() === 'true';
      bucket = null;
      continue;
    }
    const match = line.match(/^\s*-\s*(.+)$/);
    if (!match || !bucket) continue;
    order[bucket].push(match[1].trim().replace(/^['"]|['"]$/g, ''));
  }
  return order;
};

const loadRegistryCouncilIds = () => {
  const yamlPath = path.join(repoSkillsRoot, 'registry.yaml');
  const text = readTextIfExists(yamlPath);
  const ids = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*-\s+id:\s*(.+)$/);
    if (!match) continue;
    const id = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (id.startsWith('grim:council')) ids.push(id);
  }
  return ids;
};

const councilSectionForId = (id) => {
  if (id === 'grim:council') return 'management';
  const parts = String(id || '').slice(5).split(':');
  if (parts.length === 2 && parts[0] === 'council') return 'management';
  if (parts.length === 3 && parts[1] === 'guild') return 'guild';
  if (parts.length === 4 && parts[1] === 'guild') return 'member';
  return null;
};

const skillWebPath = (absolutePath) => {
  const resolved = path.resolve(absolutePath);
  if (resolved.startsWith(`${repoSkillsRoot}${path.sep}`)) {
    return `/skills/${resolved.slice(`${repoSkillsRoot}${path.sep}`.length).split(path.sep).join('/')}`;
  }
  if (resolved.startsWith(`${expansionPacksRoot}${path.sep}`)) {
    return `/expansionPacks/${resolved.slice(`${expansionPacksRoot}${path.sep}`.length).split(path.sep).join('/')}`;
  }
  return '';
};

const assetUrlWithRevision = (absolutePath) => {
  const webPath = skillWebPath(absolutePath);
  if (!webPath) return '';
  try {
    const stat = fs.statSync(absolutePath);
    return `${webPath}?v=${Math.floor(stat.mtimeMs)}`;
  } catch (_error) {
    return webPath;
  }
};

const enrichSkillForClient = (skill) => {
  const portraitPath = path.join(skill.skill_dir, 'assets', 'portrait.png');
  const iconLarge = Array.isArray(skill.icons)
    ? skill.icons.find((entry) => entry?.label === 'icon_large') || skill.icons.find((entry) => entry?.path)
    : null;
  return {
    ...skill,
    portrait_url: fs.existsSync(portraitPath) ? assetUrlWithRevision(portraitPath) : '',
    icon_url: iconLarge?.path ? assetUrlWithRevision(iconLarge.path) : '',
  };
};

const buildCouncilRoster = () => {
  const skills = scanPublicSkills();
  const byName = new Map(skills.map((skill) => [skill.name, skill]));
  const order = loadRosterDisplayOrder();
  const tierIds = {
    roundtable: new Set(order.roundtable),
    ordinary_full_council_only: new Set(order.ordinary_full_council_only),
    beta: new Set(order.beta),
  };
  const tierForId = (id) => {
    if (tierIds.roundtable.has(id)) return 'roundtable';
    if (tierIds.ordinary_full_council_only.has(id)) return 'ordinary_full_council_only';
    if (tierIds.beta.has(id)) return 'beta';
    return '';
  };
  const enrichRosterSkill = (skill) => {
    const councilTier = tierForId(skill.name);
    return {
      ...enrichSkillForClient(skill),
      council_tier: councilTier,
      included_in_full_council_by_default: councilTier !== 'beta',
    };
  };
  const roster = {
    members: [],
    guilds: [],
    management: [],
    tiers: {
      roundtable: [],
      ordinary_full_council_only: [],
      beta: [],
    },
    options: {
      include_beta_by_default: order.include_beta_by_default,
    },
  };
  for (const bucket of ['members', 'guilds', 'management']) {
    for (const id of order[bucket]) {
      const skill = byName.get(id);
      if (!skill) continue;
      roster[bucket].push(bucket === 'members' ? enrichRosterSkill(skill) : enrichSkillForClient(skill));
    }
  }
  for (const tier of ['roundtable', 'ordinary_full_council_only', 'beta']) {
    for (const id of order[tier]) {
      const skill = byName.get(id);
      if (!skill) continue;
      roster.tiers[tier].push(enrichRosterSkill(skill));
    }
  }
  roster.options.ordinary_full_council_eligible_count =
    roster.tiers.roundtable.length + roster.tiers.ordinary_full_council_only.length;
  roster.options.include_beta_eligible_count =
    roster.options.ordinary_full_council_eligible_count + roster.tiers.beta.length;
  return roster;
};

const dedupeSkills = (candidates) => {
  const sourceRank = { repo: 0, codex: 1, plugin: 2, system: 3 };
  const byName = new Map();
  for (const skill of candidates) {
    const key = skill.name.toLowerCase();
    const current = byName.get(key);
    if (!current || sourceRank[skill.source] < sourceRank[current.source]) byName.set(key, skill);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const scanPublicSkills = () =>
  dedupeSkills([
    ...scanSkillRoot(repoSkillsRoot),
    ...scanExpansionPackSkills(),
  ]);

const scanSkills = () =>
  dedupeSkills([
    ...scanPublicSkills(),
    ...scanSkillRoot(codexSkillsRoot),
    ...scanSkillRoot(path.join(codexSkillsRoot, '.system'), { includeHidden: true }),
    ...scanPluginCacheSkills(),
  ]);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
};

const localDevCorsHeaders = (req) => ({
  'Access-Control-Allow-Origin': req.headers.origin || '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Workbench-Base-Revision, If-Match',
  'Access-Control-Expose-Headers':
    'X-Workbench-Revision, Content-Length, Content-Range, Accept-Ranges',
});

const attachLocalDevCors = (req, res) => {
  const corsHeaders = localDevCorsHeaders(req);
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = (statusCode, statusMessage, headers) => {
    if (typeof statusMessage === 'object') {
      headers = statusMessage;
      statusMessage = undefined;
    }
    const mergedHeaders = { ...corsHeaders, ...(headers || {}) };
    return statusMessage === undefined
      ? originalWriteHead(statusCode, mergedHeaders)
      : originalWriteHead(statusCode, statusMessage, mergedHeaders);
  };
};

const send = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

const revisionForText = (text) => crypto.createHash('sha256').update(text).digest('hex');

const readFileText = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_error) {
    return '';
  }
};

const sendJson = (res, status, payload, extraHeaders = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
};

const sendTextFileWithRevision = (res, filePath, type = 'text/plain; charset=utf-8') => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(res, 404, 'Not found');
    return;
  }
  const text = readFileText(filePath);
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Workbench-Revision': revisionForText(text),
  });
  res.end(text);
};

const requestBaseRevision = (req) =>
  String(req.headers['x-workbench-base-revision'] || req.headers['if-match'] || '').replace(/^"|"$/g, '');

const guardWorkbenchWrite = (req, res, filePath) => {
  const expectedRevision = requestBaseRevision(req);
  if (!expectedRevision) return true;
  const currentText = readFileText(filePath);
  const currentRevision = revisionForText(currentText);
  if (expectedRevision === currentRevision) return true;
  sendJson(
    res,
    409,
    {
      ok: false,
      error: 'File changed on disk. Reload before saving or choose overwrite.',
      revision: currentRevision,
    },
    { 'X-Workbench-Revision': currentRevision }
  );
  return false;
};

const isAllowedLocalFile = (filePath) => {
  const resolved = path.resolve(filePath);
  return (
    resolved.startsWith(`${repoRoot}${path.sep}`) ||
    resolved.startsWith(`${codexSkillsRoot}${path.sep}`) ||
    resolved.startsWith(`${pluginCacheRoot}${path.sep}`)
  );
};

const cacheControlFor = (type, filePath = '') => {
  const resolved = filePath ? path.resolve(filePath) : '';
  if (
    resolved.startsWith(`${repoSkillsRoot}${path.sep}`) ||
    resolved.startsWith(`${expansionPacksRoot}${path.sep}`)
  ) {
    return 'no-store';
  }
  return /^(image|video)\//.test(type) ? 'public, max-age=3600' : 'no-store';
};

const serveFile = (req, res, filePath) => {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (_error) {
    send(res, 404, 'Not found');
    return;
  }
  if (!stat.isFile()) {
    send(res, 404, 'Not found');
    return;
  }

  const type = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Cache-Control': cacheControlFor(type, filePath),
    'Content-Length': stat.size,
  };

  if (type.startsWith('video/')) headers['Accept-Ranges'] = 'bytes';

  const rangeHeader = type.startsWith('video/') ? String(req.headers.range || '') : '';
  const rangeMatch = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (rangeMatch) {
    const suffixLength = rangeMatch[1] === '' && rangeMatch[2] !== '' ? Number(rangeMatch[2]) : null;
    const requestedStart = suffixLength ? stat.size - suffixLength : Number(rangeMatch[1] || 0);
    const requestedEnd = suffixLength || rangeMatch[2] === '' ? stat.size - 1 : Number(rangeMatch[2]);
    const start = Math.max(0, requestedStart);
    const end = Math.min(stat.size - 1, requestedEnd);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stat.size) {
      res.writeHead(416, {
        'Content-Range': `bytes */${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheControlFor(type, filePath),
      });
      res.end();
      return;
    }

    res.writeHead(206, {
      ...headers,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
};

const imageAssetPattern = /\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v)$/i;
const editableTextPattern = /\.(md|txt|json)$/i;
const readRequestBody = (req, callback, limit = 2_000_000) => {
  let body = '';
  let finished = false;
  const finish = (error) => {
    if (finished) return;
    finished = true;
    callback(body, error);
  };
  req.on('data', (chunk) => {
    body += chunk;
    if (Buffer.byteLength(body) > limit) {
      finish(new Error('Request body too large'));
      req.destroy();
    }
  });
  req.on('end', () => finish());
  req.on('error', (error) => finish(error));
};

// `root` is the artifact app code (in this repo). `dataDir` is the per-project
// state + media folder: flat files only, no nested folders.
const workbenches = {
  'workbench-artifact': {
    root: path.join(repoRoot, 'skills', 'artifacts', 'workbench-artifact', 'artifact'),
  },
  'image-review-flow-workbench': {
    root: path.join(repoRoot, 'skills', 'artifacts', 'image-review-flow-workbench', 'artifact'),
    assets: true,
  },
  'text-editor-workbench': {
    root: path.join(repoRoot, 'skills', 'artifacts', 'text-editor-workbench', 'artifact'),
    files: true,
  },
  'council-dashboard': {
    root: path.join(repoRoot, 'skills', 'council', 'dashboard', 'artifact'),
    assets: true,
  },
};

for (const [slug, workbench] of Object.entries(workbenches)) {
  workbench.slug = slug;
  workbench.dataDir = path.join(workbenchDataRoot, slug);
  if (workbench.files) workbench.filesRoot = workbench.dataDir;
}

const resolveWorkbench = (slug) => workbenches[slug] || null;

const safeJoin = (root, relativePath = '') => {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, `.${path.sep}${relativePath}`);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;

  const segments = path.relative(resolvedRoot, resolved).split(path.sep).filter(Boolean);
  let cursor = resolvedRoot;
  for (const segment of ['', ...segments]) {
    if (segment) cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) continue;
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) return null;
    } catch (_error) {
      return null;
    }
  }
  return resolved;
};

const safeWorkbenchDataPath = (workbench, relativePath = '') => {
  const projectRelativePath = path.relative(
    projectRoot,
    path.join(workbench.dataDir, relativePath)
  );
  if (projectRelativePath.startsWith('..') || path.isAbsolute(projectRelativePath)) return null;
  return safeJoin(projectRoot, projectRelativePath);
};

const startsWithBytes = (buffer, bytes) =>
  bytes.every((byte, index) => buffer[index] === byte);

const isSupportedUploadBytes = (buffer, mime) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  if (mime === 'image/png') return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === 'image/jpeg') return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
  if (mime === 'image/gif') return buffer.subarray(0, 3).toString('ascii') === 'GIF';
  if (mime === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (mime === 'video/mp4' || mime === 'video/quicktime') return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  if (mime === 'video/webm') return startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
  return false;
};

const statePathForWorkbench = (workbench) => {
  const statePath = safeWorkbenchDataPath(workbench, 'state.json');
  if (!statePath) throw new Error('Workbench state path cannot contain symlinks');
  return statePath;
};

// Lazily create `<projectRoot>/workbench/<slug>/state.json` from the artifact's
// default state template on first read, so fresh projects work with zero setup.
const ensureWorkbenchState = (workbench) => {
  const statePath = statePathForWorkbench(workbench);
  if (fs.existsSync(statePath)) return statePath;
  const defaultText = readFileText(path.join(workbench.root, 'state.json')) || '{}\n';
  fs.mkdirSync(workbench.dataDir, { recursive: true });
  fs.writeFileSync(statePath, defaultText, 'utf8');
  return statePath;
};

// Media lives flat in the workbench data folder: no nested folders, ever.
// A file dropped into the folder shows up on the board with zero code changes.
const scanWorkbenchAssets = (workbench) => {
  const assets = [];
  const dataDir = safeWorkbenchDataPath(workbench);
  if (!dataDir) return assets;
  let entries = [];
  try {
    entries = fs.readdirSync(dataDir, { withFileTypes: true });
  } catch (_error) {
    return assets;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isFile() || !imageAssetPattern.test(entry.name)) continue;
    const stat = fs.statSync(path.join(dataDir, entry.name));
    assets.push({
      path: `./files/${entry.name}`,
      name: entry.name,
      folder: '',
      mtime_ms: stat.mtimeMs,
      size: stat.size,
    });
  }

  return assets.sort((a, b) => a.mtime_ms - b.mtime_ms || a.path.localeCompare(b.path));
};

const scanWorkbenchFiles = (workbench) => {
  const filesRoot = workbench.filesRoot ? safeWorkbenchDataPath(workbench) : null;
  if (!filesRoot) return [];
  const files = [];
  let entries = [];
  try {
    entries = fs.readdirSync(filesRoot, { withFileTypes: true });
  } catch (_error) {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'state.json') continue;
    if (!entry.isFile() || !editableTextPattern.test(entry.name)) continue;
    const stat = fs.statSync(path.join(filesRoot, entry.name));
    files.push({
      path: entry.name,
      absolute_path: path.join(filesRoot, entry.name),
      name: entry.name,
      mtime_ms: stat.mtimeMs,
      size: stat.size,
    });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
};

const handleWorkbenchApi = (req, res, requestUrl) => {
  const apiMatch = requestUrl.pathname.match(/^\/api\/workbenches\/([^/]+)\/([^/]+)$/);
  const slug = apiMatch ? apiMatch[1] : '';
  const action = apiMatch ? apiMatch[2] : '';
  const workbench = resolveWorkbench(slug);
  if (!workbench) return false;
  if (!safeWorkbenchDataPath(workbench)) {
    send(res, 403, 'Forbidden');
    return true;
  }

  if (action === 'state') {
    const statePath = ensureWorkbenchState(workbench);
    if (req.method === 'GET') {
      sendTextFileWithRevision(res, statePath, 'application/json; charset=utf-8');
      return true;
    }
    if (req.method !== 'POST') {
      send(res, 405, 'Method not allowed');
      return true;
    }

    readRequestBody(req, (body, readError) => {
      if (readError) {
        send(res, 413, readError.message);
        return;
      }
      try {
        if (!guardWorkbenchWrite(req, res, statePath)) return;
        const parsed = JSON.parse(body);
        const nextText = `${JSON.stringify(parsed, null, 2)}\n`;
        fs.mkdirSync(workbench.dataDir, { recursive: true });
        fs.writeFileSync(statePath, nextText, 'utf8');
        sendJson(res, 200, { ok: true, revision: revisionForText(nextText) }, {
          'X-Workbench-Revision': revisionForText(nextText),
        });
      } catch (error) {
        send(res, 400, error.message);
      }
    });
    return true;
  }

  if (action === 'upload') {
    if (!workbench.assets) {
      send(res, 403, 'Forbidden');
      return true;
    }
    if (req.method !== 'POST') {
      send(res, 405, 'Method not allowed');
      return true;
    }

    readRequestBody(req, (body, readError) => {
      if (readError) {
        send(res, 413, readError.message);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        const match = String(parsed.data_url || '').match(/^data:([^;]+);base64,([\s\S]+)$/);
        if (!match) throw new Error('Expected a base64 data URL');
        const mime = match[1];
        const media = mime.startsWith('video/') ? 'video' : mime.startsWith('image/') ? 'image' : '';
        if (!media) throw new Error('Only image and video uploads are supported');
        const originalName = path.basename(String(parsed.name || `${media}`));
        const safeStem = originalName
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || media;
        const mimeExtensions = {
          'image/gif': '.gif',
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'video/mp4': '.mp4',
          'video/quicktime': '.mov',
          'video/webm': '.webm',
        };
        const originalExtension = path.extname(originalName).toLowerCase();
        const extension = imageAssetPattern.test(originalExtension) ? originalExtension : mimeExtensions[mime] || (media === 'video' ? '.mp4' : '.png');
        const fileName = `${Date.now()}-${safeStem}${extension}`;
        const filePath = safeWorkbenchDataPath(workbench, fileName);
        if (!filePath) throw new Error('Invalid upload path');
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > 75_000_000) throw new Error('Upload is too large');
        if (!isSupportedUploadBytes(buffer, mime)) throw new Error('Upload bytes do not match the declared media type');
        fs.mkdirSync(workbench.dataDir, { recursive: true });
        fs.writeFileSync(filePath, buffer);
        send(res, 200, JSON.stringify({
          ok: true,
          media,
          path: `./files/${fileName}`,
          name: originalName,
          size: buffer.length,
        }, null, 2), 'application/json; charset=utf-8');
      } catch (error) {
        send(res, 400, error.message);
      }
    }, 105_000_000);
    return true;
  }

  if (action === 'assets') {
    if (req.method !== 'GET') {
      send(res, 405, 'Method not allowed');
      return true;
    }
    send(res, 200, JSON.stringify({ assets: scanWorkbenchAssets(workbench) }, null, 2), 'application/json; charset=utf-8');
    return true;
  }

  if (action === 'files') {
    if (req.method !== 'GET') {
      send(res, 405, 'Method not allowed');
      return true;
    }
    send(res, 200, JSON.stringify({ files: scanWorkbenchFiles(workbench) }, null, 2), 'application/json; charset=utf-8');
    return true;
  }

  if (action === 'file') {
    const filesRoot = workbench.filesRoot ? safeWorkbenchDataPath(workbench) : null;
    const relativeFile = requestUrl.searchParams.get('path') || '';
    if (!filesRoot || path.basename(relativeFile) !== relativeFile || !editableTextPattern.test(relativeFile)) {
      send(res, 403, 'Forbidden');
      return true;
    }
    const filePath = safeJoin(filesRoot, relativeFile);
    if (!filePath) {
      send(res, 403, 'Forbidden');
      return true;
    }

    if (req.method === 'GET') {
      sendTextFileWithRevision(res, filePath, contentTypes[path.extname(filePath).toLowerCase()] || 'text/plain; charset=utf-8');
      return true;
    }
    if (req.method === 'DELETE') {
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
        send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
      } catch (error) {
        send(res, 500, error.message);
      }
      return true;
    }
    if (req.method !== 'POST') {
      send(res, 405, 'Method not allowed');
      return true;
    }

    readRequestBody(req, (body, readError) => {
      if (readError) {
        send(res, 413, readError.message);
        return;
      }
      if (!guardWorkbenchWrite(req, res, filePath)) return;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, body, 'utf8');
      sendJson(res, 200, { ok: true, revision: revisionForText(body) }, {
        'X-Workbench-Revision': revisionForText(body),
      });
    });
    return true;
  }

  return false;
};

const serveWorkbench = (req, res, slug, pathname) => {
  const workbench = resolveWorkbench(slug);
  if (!workbench) return false;
  const routePrefix = `/${slug}`;
  let workbenchPath = pathname.slice(routePrefix.length);
  if (workbenchPath.endsWith('/')) workbenchPath += 'index.html';

  // `/<slug>/files/<name>` serves per-project media/state from the workbench data folder.
  const filesMatch = workbenchPath.match(/^\/files\/([^/]+)$/);
  if (filesMatch) {
    if (!safeWorkbenchDataPath(workbench)) {
      send(res, 403, 'Forbidden');
      return true;
    }
    const dataFilePath = safeWorkbenchDataPath(workbench, filesMatch[1]);
    if (!dataFilePath) {
      send(res, 403, 'Forbidden');
      return true;
    }
    serveFile(req, res, dataFilePath);
    return true;
  }

  const filePath = safeJoin(workbench.root, workbenchPath);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return true;
  }
  serveFile(req, res, filePath);
  return true;
};

const requestHandler = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, localDevCorsHeaders(req));
    res.end();
    return;
  }

  attachLocalDevCors(req, res);

  const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (requestUrl.pathname === '/api/skills') {
    send(
      res,
      200,
      JSON.stringify({ skills: scanPublicSkills().map(enrichSkillForClient) }, null, 2),
      'application/json; charset=utf-8'
    );
    return;
  }

  if (requestUrl.pathname === '/api/council/roster') {
    send(res, 200, JSON.stringify(buildCouncilRoster(), null, 2), 'application/json; charset=utf-8');
    return;
  }

  if (requestUrl.pathname === '/api/workbench-root') {
    sendJson(res, 200, {
      project_root: projectRoot,
      project_name: path.basename(projectRoot),
      workbench_data_root: workbenchDataRoot,
    });
    return;
  }

  if (requestUrl.pathname === '/api/file') {
    const filePath = requestUrl.searchParams.get('path') || '';
    if (!isAllowedLocalFile(filePath)) {
      send(res, 403, 'Forbidden');
      return;
    }
    serveFile(req, res, path.resolve(filePath));
    return;
  }

  if (handleWorkbenchApi(req, res, requestUrl)) return;

  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname.startsWith('/skills/') || pathname.startsWith('/expansionPacks/')) {
    const repoFilePath = path.resolve(repoRoot, `.${pathname}`);
    if (
      repoFilePath.startsWith(`${repoSkillsRoot}${path.sep}`) ||
      repoFilePath.startsWith(`${expansionPacksRoot}${path.sep}`)
    ) {
      serveFile(req, res, repoFilePath);
      return;
    }
    send(res, 403, 'Forbidden');
    return;
  }
  if (pathname === '/') {
    res.writeHead(302, { Location: '/council-dashboard/' });
    res.end();
    return;
  }

  for (const slug of Object.keys(workbenches)) {
    if (pathname === `/${slug}`) pathname = `/${slug}/`;
  }
  const workbenchRoute = pathname.match(/^\/([^/]+)\//);
  if (workbenchRoute && serveWorkbench(req, res, workbenchRoute[1], pathname)) {
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = path.resolve(artifactRoot, `.${pathname}`);
  if (!filePath.startsWith(`${artifactRoot}${path.sep}`)) {
    send(res, 403, 'Forbidden');
    return;
  }
  serveFile(req, res, filePath);
};

if (process.argv.includes('--list-skills')) {
  process.stdout.write(`${JSON.stringify({ skills: scanSkills() }, null, 2)}\n`);
} else {
  const portFlagIndex = process.argv.indexOf('--port');
  const requestedPort = portFlagIndex >= 0 ? Number(process.argv[portFlagIndex + 1]) : defaultPort;
  const hostFlagIndex = process.argv.indexOf('--host');
  const host = hostFlagIndex >= 0 ? process.argv[hostFlagIndex + 1] : defaultHost;
  const portWasExplicit = portFlagIndex >= 0 || Boolean(process.env.PORT);

  const startServer = (port, attemptsLeft) => {
    const server = http.createServer(requestHandler);
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && !portWasExplicit && attemptsLeft > 0) {
        console.log(`Port ${port} is busy, trying ${port + 1}...`);
        startServer(port + 1, attemptsLeft - 1);
        return;
      }
      throw error;
    });
    server.listen(port, host, () => {
      const displayHost = host === '0.0.0.0' ? '<local-ip>' : host;
      console.log(`Artifacts server: http://${displayHost}:${port}/`);
      console.log(`Project root: ${projectRoot}`);
      console.log(`Workbench data: ${workbenchDataRoot}/<workbench-name>/`);
      console.log(`Council dashboard: http://${displayHost}:${port}/council-dashboard/`);
      console.log(`Image review workbench: http://${displayHost}:${port}/image-review-flow-workbench/`);
      console.log(`Text editor workbench: http://${displayHost}:${port}/text-editor-workbench/`);
    });
  };

  startServer(requestedPort, 10);
}
