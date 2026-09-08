# Image Review Flow Workbench

### Purpose
Image Review Flow Workbench is the local Design QA image and asset review board.

Use it when the user wants MidJourney-style concept exploration:
- generate four image variants;
- display them in a scrolling local artifact;
- let the user heart, keep, revise, reject, or final promising images;
- read the persisted selections before making variations, combinations, or implementation QA passes.

Use it for short video and motion review too:
- display trailer cuts, generated transition clips, ad variants, and motion tests;
- autoplay muted videos in the board by default;
- hide video controls until hover or keyboard focus;
- let the user compare, heart, keep, revise, reject, or final clips the same way as still images.

### Canonical Surfaces
- Skill: `skills/artifacts/image-review-flow-workbench/SKILL.md`
- Skill metadata: `skills/artifacts/image-review-flow-workbench/agents/openai.yaml`
- Artifact page: `skills/artifacts/image-review-flow-workbench/artifact/index.html`
- Default state template: `skills/artifacts/image-review-flow-workbench/artifact/state.json`
- Per-project state: `<project-root>/workbench/image-review-flow-workbench/state.json`
- Per-project media: `<project-root>/workbench/image-review-flow-workbench/` (flat, no nested folders)
- Artifact server write API: `/api/workbenches/image-review-flow-workbench/state`
- Artifact asset scanner: `/api/workbenches/image-review-flow-workbench/assets`

### Sync Contract
This artifact follows the shared Workbench Skill standard in `skills/artifacts/artifacts/references/workbench-skills.md`.

Keep this workflow small and file-backed.

The browser and agents share one state file:

```text
<project-root>/workbench/image-review-flow-workbench/state.json
```

Required sync behavior:
- Browser clicks write immediately through `/api/workbenches/image-review-flow-workbench/state`.
- The artifact polls `state.json` and auto-reloads agent edits.
- The artifact scans the flat per-project media folder through `/api/workbenches/image-review-flow-workbench/assets`.
- Untracked image and video files appear as media-only rows at the bottom of the board.
- Agent-created review batches should append to the bottom of `state.json` by default.
- Agents can append batches or revise critique directly in `state.json`.
- No manual save or reload button is required for ordinary state changes.
- Do not add a database, framework, build step, or heavy import/export subsystem for this board.

### Operating Contract
Serve through the artifact server:

```bash
node artifacts/server.js --root <project-root>
```

Then open:

```text
http://127.0.0.1:8765/image-review-flow-workbench/
```

Prefer [@Browser](plugin://browser@openai-bundled) / `Browser:control-in-app-browser` for opening, inspecting, and operating the local artifact when available.

If the Browser plugin is unavailable or blocked, open the URL in the user's current default browser.

Direct `file://` opening is only a visual preview because browser file pages cannot write `state.json`.

### Folder Import
Agents can populate the gallery without hand-writing JSON first.

Copy images or videos into the flat per-project folder:

```text
<project-root>/workbench/image-review-flow-workbench/
```

No nested folders: batches and rows are metadata in `state.json`, never folder structure. Use batch-prefixed filenames like `<batch-id>-1.png` to group a run.

The artifact will:
- scan the flat media folder;
- include `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.mp4`, `.webm`, `.mov`, and `.m4v`;
- ignore assets already referenced by `image` or `source_image` in `state.json`;
- append untracked assets as bottom rows in groups of four;
- leave the row prompt empty until an agent or user adds metadata;
- save the auto-imported row into `state.json` when the user hearts an asset.

### Video Controls
Video cards use custom review controls rather than native browser controls.

Default behavior:
- autoplay muted;
- loop;
- play inline in the grid;
- object-fit inside the card without cropping.

Visible controls appear on hover or focus:
- top-left fullscreen icon opens the full-viewport modal viewer;
- clicking the video surface toggles play or pause;
- center play/pause icon toggles play or pause;
- bottom timeline is a thin scrubber line.

Keep these controls visually quiet.

The heart button keeps its visible corner treatment, but play/pause and fullscreen controls should not have circular backgrounds, borders, or native control chrome.

The center play/pause glyph should stay semi-transparent, becoming only slightly stronger on hover or focus.

Video hover overlays must not block the heart button.

### Browser Annotations
When the user annotates a gallery image in Browser, resolve the exact image from artifact metadata.

Each `.image-card`, `.image-open`, and `img` should expose:
- `data-testid="flow-image-<number>"`
- `data-flow-ref="image-<number>"`
- `data-flow-number`
- `data-flow-batch-id`
- `data-flow-batch-index`
- `data-flow-item-index`
- `data-flow-code`
- `data-flow-image`

Use `data-flow-number` as the global board image number and `data-flow-image` as the exact artifact-relative file path.

Do not infer the target from screenshot position when metadata is present.

Do not treat `article.image-card:nth-of-type(2)` as a global image number.

It is only the card position inside that row's local image grid.

### Batch Shape
Each image batch row should contain:
- exactly four items by default;
- a row-level prompt;
- a row-level stage such as `explore`, `refine`, or `implementation`;
- a row-level intent such as `seed`, `variation`, `combine`, or `refine`;
- one `slot` per item from `1` to `4`;
- one three-word `code` per item;
- one status per item from `candidate`, `keep`, `revise`, `reject`, or `final`;
- critique and QA notes when useful;
- artifact-relative image paths like `./files/<batch-id>-1.png` pointing at the flat per-project folder.

Each video review row should contain:
- one item per clip the user needs to compare;
- `intent: "video-review"` unless the row is implementation evidence;
- artifact-relative video paths in `items[].image`;
- shot role, duration, aspect ratio, model/source, and known issues in `qa_notes` or `tags`;
- normal item statuses: `candidate`, `keep`, `revise`, `reject`, or `final`.

For composed trailer or ad iterations:
- add one batch for full composed cuts;
- add a second companion batch for individual diagnostic clips;
- append both batches to the bottom of the board;
- label individual clips with shot role, source time range, test purpose, and known issue.

### Follow-Up Flow
Before generating a follow-up batch:
1. Read `<project-root>/workbench/image-review-flow-workbench/state.json`.
2. Find hearted, kept, revised, or final items and any relevant tags or notes.
3. Generate the next four images from those selected references.
4. Append the new row to `state.json`.
5. Preserve prior rows unless the user explicitly asks to reset the board.

### Promotion And Commit Gate
Generated workbench run assets should remain visible but uncommitted until the user explicitly approves and promotes them.

Rules:
- keep generated run output visible in `git status`;
- do not add blanket ignore rules for workbench run folders;
- do not stage or commit generated run assets by default;
- do not commit review state that promotes unapproved run assets as final;
- commit only curated finals or project-owned assets after explicit approval/promotion.
