# Workbench Skills

### Purpose
Workbench Skills pair a normal skill with a small local browser artifact.

Use this pattern when a workflow benefits from a visual tool that humans and agents can operate together:
- design QA boards
- image review boards
- local canvases
- app minimaps
- planning boards
- visual asset galleries
- short video and motion review boards

### Standard Shape
Keep Workbench Skills simple and inspectable.

App code (in this repo):
- `skills/<skill>/SKILL.md`
- `skills/<skill>/agents/openai.yaml`
- `skills/<skill>/artifact/index.html`
- `skills/<skill>/artifact/styles.css`
- `skills/<skill>/artifact/app.js`
- `skills/<skill>/artifact/state.json` — the default state template that seeds fresh projects
- optional tiny route in `artifacts/server.js`

Per-project data (in the project the server points at):
- `<project-root>/workbench/<workbench-name>/state.json`
- `<project-root>/workbench/<workbench-name>/<media files>`

Use Markdown instead of JSON only when the state is primarily a human-readable prose handoff.

### Flatness Rule
Workbench data folders are flat. One folder, filenames only:
- No nested folders inside `workbench/<workbench-name>/`, ever.
- Batches, rows, groups, and runs are metadata inside `state.json`, never folder structure.
- Dropping a media file into the folder makes it appear on the board on the next poll, with zero code edits.
- Keep the line between "file on disk" and "tile on the board" as direct as possible.

### Per-Project Instancing
State and media live in the target project, not in this repo:
- Start one server per project: `node artifacts/server.js --root <project-root> [--port N]`.
- Root defaults to the current working directory; the port auto-picks the next free one if busy.
- Each server instance serves exactly one project. Two terminals pointed at two roots run two independent workbenches side by side.
- The server creates `workbench/<workbench-name>/` and seeds `state.json` from the artifact's default template on first read.
- The `workbench/` folder is a sibling of `docs/` — project-owned durable files.

### Sync Contract
The state file is the shared handoff surface between the agent and the browser artifact.

Required behavior:
- Browser interactions write state immediately.
- Agent edits to the state file reload automatically in the browser.
- State is readable, diffable, and safe to patch directly.
- Ordinary use does not require manual save or reload buttons.
- The artifact and the skill should document the state file path.

Avoid:
- databases
- generated manifests
- build systems
- framework apps
- heavyweight import/export layers
- hidden browser-only state as the primary source of truth

### State File Rules
The durable file lives in the target project:

```text
<project-root>/workbench/<workbench-name>/state.json
```

For JSON state:
- include a `version` field
- include an `updated_at` field
- keep arrays and objects stable enough for clean diffs
- prefer explicit item IDs or codes over positional-only references
- let agents append or patch records directly

For Markdown state:
- use clear section headers
- keep machine-readable blocks fenced or tagged
- keep prose readable without running the artifact

### Server Contract
Use `artifacts/server.js` or a tiny local server only for what static files cannot do:
- writing state back to disk
- reading local folder data
- serving local assets through `http://127.0.0.1`

Do not introduce a broader backend unless the user explicitly asks or the workflow has outgrown file-backed state.

### Skill Contract
The paired skill should explain:
- when to use the workbench
- artifact URL
- state file path (the per-project `workbench/` path)
- state schema
- how agents should append or patch state
- how to start the server with the project root
- verification commands
- what counts as done
- media support, including any custom video controls or accepted file extensions

### Current Workbenches
- Workbench Artifact: `skills/artifacts/workbench-artifact/SKILL.md` plus `skills/artifacts/workbench-artifact/artifact/`
- Council Dashboard: `skills/council/dashboard/SKILL.md` plus inline and standalone artifact surfaces
- Image Review Flow Workbench: `skills/artifacts/image-review-flow-workbench/SKILL.md` plus `skills/artifacts/image-review-flow-workbench/artifact/`
- Text Editor Workbench: `skills/artifacts/text-editor-workbench/SKILL.md` plus `skills/artifacts/text-editor-workbench/artifact/`
