#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

function argument(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

const scriptDir = __dirname;
const dashboardDir = path.resolve(scriptDir, '..');
const templatePath = argument('--template', path.join(dashboardDir, 'inline', 'template.html'));
const rosterPath = argument('--roster');
const skillsPath = argument('--skills');
const outputPath = argument('--output');
const topBackgroundPath = argument(
  '--top-background',
  path.join(dashboardDir, 'artifact', 'assets', 'generated', 'storm-castle-council-room.png'),
);
const bottomBackgroundPath = argument(
  '--bottom-background',
  path.join(dashboardDir, 'inline', 'assets', 'council-dashboard-bottom.jpg'),
);

if (!rosterPath || !skillsPath || !outputPath) {
  console.error('Usage: build-inline-council-dashboard.js --roster <roster.json> --skills <skills.json> --output <fragment.html>');
  process.exit(2);
}

const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
const skillPayload = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');
const imageCacheDir = path.join(os.tmpdir(), 'grim-council-dashboard-images');
fs.mkdirSync(imageCacheDir, { recursive: true });

function commandExists(command) {
  return spawnSync('/usr/bin/env', ['sh', '-c', `command -v ${command}`], { encoding: 'utf8' }).status === 0;
}

const hasMagick = commandExists('magick');

function mimeForExtension(extension) {
  return {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  }[extension.toLowerCase()] || 'application/octet-stream';
}

function rawImageData(input) {
  const mime = mimeForExtension(path.extname(input));
  return `data:${mime};base64,${fs.readFileSync(input).toString('base64')}`;
}

function optimizedImageData(input, kind) {
  if (!input || !fs.existsSync(input)) return '';
  const stat = fs.statSync(input);
  const cacheKey = crypto
    .createHash('sha1')
    .update(`${input}:${stat.mtimeMs}:${stat.size}:${kind}`)
    .digest('hex');
  const extension = kind === 'portrait' || kind === 'skill' ? 'avif' : 'webp';
  const output = path.join(imageCacheDir, `${cacheKey}.${extension}`);

  if (!fs.existsSync(output) && hasMagick) {
    const geometry = kind === 'background' ? '960x960>' : kind === 'skill' ? '160x160>' : '256x256>';
    const quality = kind === 'background' ? '60' : kind === 'portrait' ? '42' : kind === 'skill' ? '44' : '65';
    const result = spawnSync(
      'magick',
      [input, '-auto-orient', '-resize', geometry, '-quality', quality, output],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      console.warn(`Could not optimize ${input}: ${result.stderr || result.stdout}`);
    }
  }

  return fs.existsSync(output) ? rawImageData(output) : rawImageData(input);
}

function iconPath(entry) {
  return (entry.icons || []).find((item) => item.label === 'icon_large')?.path
    || (entry.icons || []).find((item) => item.label === 'icon_small')?.path
    || (entry.icons || [])[0]?.path
    || '';
}

function compactRosterEntry(entry, kind) {
  const portrait = path.join(entry.skill_dir || '', 'assets', 'portrait.png');
  const source = kind === 'members' && fs.existsSync(portrait) ? portrait : iconPath(entry);
  const parts = String(entry.name || '').split(':');
  return {
    id: entry.name,
    title: entry.title,
    role: entry.role || '',
    description: entry.description || '',
    guild: parts[2] === 'guild' ? parts[3] : '',
    tier: entry.council_tier || '',
    includedByDefault: entry.included_in_full_council_by_default !== false,
    image: optimizedImageData(source, kind === 'members' ? 'portrait' : 'launch'),
  };
}

function readOpenAiYaml(entry) {
  const yamlPath = path.join(entry.skill_dir || '', 'agents', 'openai.yaml');
  if (!fs.existsSync(yamlPath)) return '';
  return fs.readFileSync(yamlPath, 'utf8');
}

function yamlValue(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'));
  return match ? match[1].trim() : '';
}

function isManual(entry, openAiYaml) {
  const frontmatter = entry.frontmatter?.['disable-model-invocation'];
  return /allow_implicit_invocation:\s*false\b/.test(openAiYaml)
    || frontmatter === true
    || frontmatter === 'true';
}

function compactSkill(entry) {
  const name = String(entry.name || '').trim();
  const isGrim = name.startsWith('grim:');
  const parts = name.split(':');
  const openAiYaml = readOpenAiYaml(entry);
  const displayName = yamlValue(openAiYaml, 'display_name');
  const shortDescription = yamlValue(openAiYaml, 'short_description');
  const title = displayName && !displayName.startsWith('grim:')
    ? displayName
    : entry.title || parts.at(-1) || name;
  return {
    id: name,
    title,
    description: shortDescription || entry.description || entry.frontmatter?.description || '',
    isGrim,
    category: isGrim && parts.length > 1 ? `grim:${parts[1]}` : 'other',
    invocation: isManual(entry, openAiYaml) ? 'manual' : 'automatic',
    image: optimizedImageData(iconPath(entry), 'skill'),
  };
}

function promptBody(markdown) {
  if (!markdown.startsWith('---')) return markdown.trim();
  const closing = markdown.indexOf('\n---', 3);
  if (closing < 0) return markdown.trim();
  return markdown.slice(closing + 4).trim();
}

function treeLines(directory, prefix = '') {
  const ignored = new Set(['.DS_Store', '.git', '__pycache__', 'node_modules']);
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !ignored.has(entry.name))
    .sort((left, right) => Number(left.isFile()) - Number(right.isFile()) || left.name.localeCompare(right.name));
  const lines = [];
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    lines.push(`${prefix}${isLast ? '└── ' : '├── '}${entry.name}${entry.isDirectory() ? '/' : ''}`);
    if (entry.isDirectory()) {
      lines.push(...treeLines(path.join(directory, entry.name), `${prefix}${isLast ? '    ' : '│   '}`));
    }
  });
  return lines;
}

function skillDetails(entry) {
  const directory = entry.skill_dir || '';
  const skillMarkdown = path.join(directory, 'SKILL.md');
  if (!directory || !fs.existsSync(skillMarkdown)) return null;
  return {
    prompt: promptBody(fs.readFileSync(skillMarkdown, 'utf8')),
    tree: ['.', ...treeLines(directory)].join('\n'),
  };
}

const publicSkills = (skillPayload.skills || []).filter(
  (entry) =>
    entry.source === 'repo' &&
    String(entry.name || '').startsWith('grim:'),
);
const skills = publicSkills.map(compactSkill);
const details = {};
publicSkills.forEach((entry) => {
  const detail = skillDetails(entry);
  if (detail) details[entry.name] = detail;
});

const data = {
  generatedAt: new Date().toISOString(),
  background: optimizedImageData(topBackgroundPath, 'background'),
  members: (roster.members || []).map((entry) => compactRosterEntry(entry, 'members')),
  guilds: (roster.guilds || []).map((entry) => compactRosterEntry(entry, 'guilds')),
  actions: (roster.management || []).map((entry) => compactRosterEntry(entry, 'actions')),
  tiers: {
    roundtable: roster.tiers?.roundtable?.length || 0,
    ordinaryFullCouncilOnly: roster.tiers?.ordinary_full_council_only?.length || 0,
    beta: roster.tiers?.beta?.length || 0,
    includeBetaByDefault: roster.options?.include_beta_by_default === true,
    ordinaryEligible: roster.options?.ordinary_full_council_eligible_count || 0,
    includeBetaEligible: roster.options?.include_beta_eligible_count || 0,
  },
  skills,
};

const compressedDetails = zlib.gzipSync(Buffer.from(JSON.stringify(details))).toString('base64');
const bottomBackground = rawImageData(bottomBackgroundPath);
let output = template
  .replace('__COUNCIL_DASHBOARD_DATA__', JSON.stringify(data))
  .replace('__COUNCIL_SKILL_DETAILS__', compressedDetails)
  .replace('__COUNCIL_DASHBOARD_BOTTOM_BACKGROUND__', bottomBackground);

for (const placeholder of [
  '__COUNCIL_DASHBOARD_DATA__',
  '__COUNCIL_SKILL_DETAILS__',
  '__COUNCIL_DASHBOARD_BOTTOM_BACKGROUND__',
]) {
  if (output.includes(placeholder)) throw new Error(`Unresolved template placeholder: ${placeholder}`);
}

fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(outputPath, output);
const size = Buffer.byteLength(output);
if (size >= 2_000_000) {
  throw new Error(`Inline dashboard is ${size} bytes; reduce image or prompt payload below 2 MB.`);
}
console.log(`Wrote ${outputPath} (${size} bytes, ${data.members.length} members, ${skills.length} skills)`);
