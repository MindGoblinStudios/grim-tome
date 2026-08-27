---
name: grim:dev:text-editor-workbench
description: "Text Editor Workbench: Open a minimal browser note editor with a collapsible file sidebar and autosynced Markdown/text files."
disable-model-invocation: true
---

# Text Editor Workbench

## Purpose
Use this skill when the user wants a tiny local note-taking or text-editing artifact.

Notes live in the project the server points at, not in this repo.

Do not expose arbitrary workspace write access by default.

## Canonical Paths
App code (in this repo):
- Skill source: `skills/artifacts/text-editor-workbench/SKILL.md`
- Artifact page: `skills/artifacts/text-editor-workbench/artifact/index.html`
- Default state template: `skills/artifacts/text-editor-workbench/artifact/state.json`

Per-project data (in the project the server points at):
- State: `<project-root>/workbench/text-editor-workbench/state.json`
- Notes: `<project-root>/workbench/text-editor-workbench/` — flat `.md`, `.txt`, and `.json` files

Start and open:
- `node artifacts/server.js --root <project-root>` (run from this repo)
- `http://127.0.0.1:8765/text-editor-workbench/`

## Sync Contract
The workbench has two file layers in the same flat per-project folder:
- `state.json` for UI/session state;
- `.md`, `.txt`, and `.json` note files beside it for content.

Required behavior:
- Browser file selection writes `state.json`.
- Browser edits autosave the active note file.
- The sidebar plus button creates a new `.md` note.
- Right-clicking a note in the sidebar opens copy-path and delete actions for that note.
- While the editor is focused and the pointer is idle, top editor/sidebar controls fade out until the pointer moves again.
- Agent edits to the active note reload automatically.
- If the browser has unsaved text and disk changes, pause and ask the user to reload or overwrite.

## Agent Workflow
1. Read `<project-root>/workbench/text-editor-workbench/state.json` to find `active_file`.
2. Read or patch note files in the same folder.
3. Keep note content plain and diffable.
4. Use the browser artifact only when the human wants an editor UI.

## Verification
- `python3 -m json.tool <project-root>/workbench/text-editor-workbench/state.json`
- `node --check skills/artifacts/text-editor-workbench/artifact/app.js`
- `node --check artifacts/server.js`
- open `http://127.0.0.1:8765/text-editor-workbench/`
