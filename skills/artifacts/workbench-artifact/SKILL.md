---
name: grim:dev:workbench-artifact
description: "Workbench Artifact: Create minimal skill-paired browser artifacts with a file-backed data layer, two-way sync, and tiny local server routes."
disable-model-invocation: true
---

# Workbench Artifact

## Purpose
Use this skill when creating or modifying a Workbench Artifact.

Workbench Artifacts combine:
- a normal `SKILL.md`;
- a tiny local browser artifact;
- a text-file data layer agents can patch directly;
- two-way sync between browser UI and files;
- optional host callbacks for Browser, Codex, annotation tools, or an artifact shell.

Keep the default implementation minimal:
- no framework;
- no database;
- no build step;
- no generated manifest;
- no browser-only source of truth.

## Canonical Paths
- Shared standard: `skills/artifacts/artifacts/references/workbench-skills.md`
- Skill source: `skills/artifacts/workbench-artifact/SKILL.md`
- Sample artifact: `skills/artifacts/workbench-artifact/artifact/index.html`
- Default state template: `skills/artifacts/workbench-artifact/artifact/state.json`
- Per-project state: `<project-root>/workbench/workbench-artifact/state.json`
- Served URL: `http://127.0.0.1:8765/workbench-artifact/` (after `node artifacts/server.js --root <project-root>`)

## Minimal Sync Sample
This skill ships the smallest complete sync loop:
- `index.html`
- `styles.css`
- `app.js`
- `state.json`
- generic server route in `artifacts/server.js`

The sample uses:

```text
GET  /api/workbenches/workbench-artifact/state
POST /api/workbenches/workbench-artifact/state
```

Browser edits write the per-project `state.json`.

Agent edits to `state.json` reload automatically in the browser.

State and media live in `<project-root>/workbench/<workbench-name>/`, flat, no nested folders. The artifact's own `state.json` is only the default template that seeds a fresh project.

## The Sync Server
The two-way sync is powered by a small local server: `artifacts/server.js`. It is plumbing — start it for the user, never make the user run it.

- Start one server per project: `node artifacts/server.js --root <project-root> [--port N]`
- Root defaults to the current working directory; the port auto-picks the next free one if 8765 is busy.
- It serves each workbench's app code from the Tome, reads/writes the per-project `workbench/` folder, watches files for hot reload, and exposes the state APIs above.
- Two terminals pointed at two roots = two fully independent workbenches side by side.
- The `workbench/` folder is a sibling of `docs/` — same philosophy: project-owned durable files.
- Media dropped into the folder appears in the workbench on the next poll, zero code edits.

To open a workbench (or any local web app) on your phone over home WiFi, follow the LAN sharing guide in `grim:artifacts` — bind the server to `0.0.0.0` and hit the Mac's LAN IP from the phone.

## New Workbench Checklist
1. Create `skills/<slug>/SKILL.md`.
2. Create `skills/<slug>/agents/openai.yaml`.
3. Create `skills/<slug>/artifact/index.html`.
4. Create `skills/<slug>/artifact/styles.css`.
5. Create `skills/<slug>/artifact/app.js`.
6. Create `skills/<slug>/artifact/state.json`.
7. Add the workbench to `artifacts/server.js`.
8. Add or update `skills/registry.yaml`.
9. Add 128 and 1024 PNG icons under `assets/`.
10. Validate JSON and JavaScript.
11. Serve and inspect the route.

## Verification
- `python3 -m json.tool skills/artifacts/workbench-artifact/artifact/state.json`
- `node --check skills/artifacts/workbench-artifact/artifact/app.js`
- `node --check artifacts/server.js`
- `node artifacts/server.js --root <project-root>`
- open `http://127.0.0.1:8765/workbench-artifact/`
