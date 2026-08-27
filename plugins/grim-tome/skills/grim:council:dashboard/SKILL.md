---
name: grim:council:dashboard
description: "Council Dashboard: Open the live council launch board either inline in Codex or as the standalone browser workbench."
difficulty: Easy on ChatGPT/Codex via @visualize, Medium on Cursor or agent apps with a built-in browser, Pro elsewhere (standalone / external browser)
disable-model-invocation: true
---

# Council Dashboard

## Purpose
Use Council Dashboard when you want the council launch board:
- member portrait cards
- guild launch tiles
- council management tiles
- live skill search, filtering, selection, and detail views
- council and skill invocation handoff back into chat

The skill owns two separate surfaces that share live repo data:
- **Inline Dashboard:** a mobile-first visualization rendered inside Codex chat
- **Standalone Workbench:** the full browser artifact served locally

Do not rebuild the inline dashboard from memory or from a previous generated fragment.
Always use the checked-in inline template and builder.

## Canonical Name
- Skill ID: `grim:council:dashboard`
- Human name: **Council Dashboard**
- Standalone surface: **Council Dashboard Workbench**

## Data Contract
Council Dashboard does **not** mirror council metadata in checked-in JavaScript.
Both surfaces read current public skill data from the repo and order council entries from `skills/council/council/references/roster-display-order.yaml`.

## Canonical Paths
- Inline template: `skills/council/dashboard/inline/template.html`
- Inline builder: `skills/council/dashboard/scripts/build-inline-council-dashboard.js`
- Inline bottom background: `skills/council/dashboard/inline/assets/council-dashboard-bottom.jpg`
- Standalone page: `skills/council/dashboard/artifact/index.html`
- Standalone state: `skills/council/dashboard/artifact/state.json`
- Standalone assets: `skills/council/dashboard/artifact/assets/`
- Roster API: `/api/council/roster`
- Skills API: `/api/skills`
- Served URL: `http://127.0.0.1:8765/council-dashboard/`

## Data Sources
- **Roster order:** `skills/council/council/references/roster-display-order.yaml`
- **Lifecycle tiers and Beta default:** `skills/council/council/references/roster-display-order.yaml`
- **Public skill index:** live scan of `skills/` plus promoted skills under `expansionPacks/` via `/api/skills`
- **Privacy boundary:** the dashboard excludes private, user-installed, plugin, and system skill directories
- **Titles, roles, descriptions, icons, portraits:** current public skill files
- **Portrait path rule:** `skills/council/members/<slug>/assets/portrait.png` when present
- **Workbench state:** layout preferences only, stored per project at `<project-root>/workbench/council-dashboard/state.json` (seeded from `artifact/state.json`)

Do not add generated skill indexes, hardcoded member lists, or mirrored `SKILL.md` bodies to the artifact layer.
Generated inline fragments are temporary output and stay out of git.

## State Schema
`artifact/state.json` stores standalone layout preferences only:

```json
{
  "version": 1,
  "updated_at": "",
  "layout": {
    "member_columns": 5,
    "sidebar_collapsed": false,
    "skill_filter": "grim",
    "skill_invocation_filter": "all",
    "sections": {
      "members": true,
      "guilds": true,
      "management": true
    }
  }
}
```

## Workflow

### Open Inline Dashboard
When the user asks to open or show the council dashboard inline:
1. Invoke the `visualize` skill and read its full instructions, if available in your harness. In the Codex / ChatGPT desktop app this is the bundled `@Visualize` plugin (`plugin://visualize@openai-bundled`); it renders an HTML file saved under the thread's visualization directory (`~/.codex/visualizations/...`).
2. Start `node artifacts/server.js --root <project-root>` if the live APIs are not already available.
3. Save the live payloads:

```bash
curl -s http://127.0.0.1:8765/api/council/roster -o /tmp/council-dashboard-roster.json
curl -s http://127.0.0.1:8765/api/skills -o /tmp/council-dashboard-skills.json
```

4. Build a new thread-scoped fragment:

```bash
node skills/council/dashboard/scripts/build-inline-council-dashboard.js \
  --roster /tmp/council-dashboard-roster.json \
  --skills /tmp/council-dashboard-skills.json \
  --output <thread-visualization-directory>/council-dashboard.html
```

5. Verify the generated fragment is below 2 MB and its JavaScript parses.
6. Display it with `::codex-inline-vis{file="council-dashboard.html"}`.

The builder injects current:
- council members, guilds, and management options
- public skills and invocation metadata
- skill prompts and file trees
- highest-resolution source portraits and icons, optimized for the inline size limit

### Open Standalone Workbench
1. Serve artifacts: `node artifacts/server.js --root <project-root>`
2. Open `http://127.0.0.1:8765/council-dashboard/` (the server root `/` also lands here)
3. Use the live council gallery and skills sidebar.
4. When council membership changes, update registry and member skill sources rather than UI snapshots.

## Maintenance Duties
The dashboard reads everything live, so keeping it correct means keeping the sources correct:
- When council members or skills change names, descriptions, paths, icons, or roster membership, update `skills/registry.yaml`, the member `SKILL.md`/`openai.yaml` sources, and `roster-display-order.yaml` in the same work chunk.
- Never patch the dashboard UI to compensate for stale source data.

## Verification
- `python3 -m json.tool skills/council/dashboard/artifact/state.json`
- `node --check skills/council/dashboard/artifact/app.js`
- `node --check skills/council/dashboard/scripts/build-inline-council-dashboard.js`
- `node --check artifacts/server.js`
- `curl -s http://127.0.0.1:8765/api/council/roster | python3 -m json.tool | head`
- build a fresh inline fragment and confirm it is below 2 MB
- open `http://127.0.0.1:8765/council-dashboard/`
