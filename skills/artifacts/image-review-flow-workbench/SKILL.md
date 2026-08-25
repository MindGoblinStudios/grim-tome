---
name: grim:media:image-review-flow-workbench
description: "Image Review Flow Workbench: Run a Design QA image, video, and asset review board with autosynced JSON state, persistent selection metadata, and follow-up variation/combine prompts."
---

# Image Review Flow Workbench

## Purpose
Use Image Review Flow Workbench when the user wants to explore image or asset concepts through a fast design QA review loop:
- generate four variants at a time;
- show them in the Image Review Flow Workbench artifact;
- let the user heart/select, keep, revise, reject, or mark final images;
- use those selections to make variations, combinations, or refined batches;
- keep exact prompts, critique, QA notes, and batch metadata readable for future agent turns.

Image Review Flow Workbench is the image-generation and candidate-review board for design QA loops.

Video review support:
- The artifact can also display local `.mp4`, `.webm`, `.mov`, and `.m4v` review assets in the same four-up board.
- Store video candidates in `items[].image` with the artifact-relative video path.
- Use this for short trailer, ad, motion, and transition review batches when the review workflow is otherwise the same as image selection.
- Video cards lazily attach their media source and autoplay muted/looped when they are visible or near the viewport, so large boards do not try to load every clip at once.
- Keep every explicit review row to four cards or fewer so Browser annotations, hearts, and fullscreen controls stay easy to target.
- Do not pad a row to four cards. If there is only one unique clip, create a one-card row. If multiple filenames point to the same generated clip or visually identical output, keep one representative item instead of duplicating it.
- Video controls stay hidden until hover or keyboard focus:
  - click the video surface to play or pause;
  - use the center icon to play or pause;
  - use the thin bottom timeline to scrub;
  - use the top-left fullscreen icon to open the full-viewport modal viewer;
  - the fullscreen modal keeps a thin scrubber, current/duration time, and play/pause control available for video review.

## Canonical Paths
App code (in this repo):
- Artifact page: `skills/artifacts/image-review-flow-workbench/artifact/index.html`
- Default state template: `skills/artifacts/image-review-flow-workbench/artifact/state.json`
- Artifact server: `artifacts/server.js`
- Skill source: `skills/artifacts/image-review-flow-workbench/SKILL.md`

Per-project data (in the project the server points at):
- State: `<project-root>/workbench/image-review-flow-workbench/state.json`
- Media: `<project-root>/workbench/image-review-flow-workbench/` — flat, no nested folders

Start and open:
- `node artifacts/server.js --root <project-root>` (run from this repo)
- `http://127.0.0.1:8765/image-review-flow-workbench/`

## Sync Contract
This skill follows the shared Workbench Skill standard in `skills/artifacts/artifacts/references/workbench-skills.md`.

Keep the artifact simple:
- `index.html`
- `styles.css`
- `app.js`
- one tiny server route in `artifacts/server.js`
- one JSON state file at `<project-root>/workbench/image-review-flow-workbench/state.json`

The browser and agents both treat `state.json` as the source of truth.

Required behavior:
- Browser clicks write state immediately through `/api/workbenches/image-review-flow-workbench/state`.
- The artifact polls `state.json` and auto-reloads when an agent edits the file.
- The artifact also scans the flat `workbench/image-review-flow-workbench/` folder and appends untracked media as asset-only rows. Batches and rows are metadata in `state.json`, never folder structure.
- New agent-created review batches should append to the bottom of `state.json` by default, preserving the user's existing review order.
- Keep review batches to a maximum of four items per row. When a review set has more than four assets, split it into multiple bottom-appended rows with clear row labels.
- Review rows should contain the number of unique assets being reviewed, not a fixed count. One unique clip means one item; two unique clips means two items.
- The asset scanner includes images and short video files: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.mp4`, `.webm`, `.mov`, and `.m4v`.
- Agents may update `state.json` directly with generated batches, critique, tags, and image paths.
- Do not add a heavyweight database, build pipeline, framework, or import/export subsystem for this workflow.
- Do not make users press a save or reload button for ordinary state sync.

## Language Contract
Use these meanings when the user asks for image work:

- `make a batch for <concept>` or `do a run for <concept>`:
  - Generate four fresh images for that concept.
  - Treat this as prompt-first concept exploration.
  - Make the four outputs meaningfully different enough to help the user discover what they want.
  - Store the row with `intent: "run"` unless a narrower intent is clearly better.
- `make variations of <concept/image/row>`:
  - Generate four divergent directions.
  - Widen the search space instead of preserving the source tightly.
  - Re-prompt, reinterpret, change style/composition, or move into new territory.
  - Store the row with `intent: "diverge"`.
- `vary image <number>` or `take this image and vary it`:
  - Use the referenced image as the seed/reference.
  - Preserve the core image and make small-to-medium changes.
  - Treat this as image-first iteration, not a totally new prompt exploration.
  - Store the row with `intent: "vary-image"` and include `source_images`.
- `refine image <number>`:
  - Preserve the core image and fix specific critique.
  - Make narrower changes than `vary image`.
  - Use this for cleaner text, less clutter, stronger composition, better contrast, or more product-like polish.
  - Store the row with `intent: "refine"` and include `source_images`.
- `show these videos`, `review these clips`, or `make a trailer review board`:
  - Copy the video files into the project's `workbench/image-review-flow-workbench/` folder.
  - Store each clip in `items[].image` just like an image asset.
  - Use one item per clip, with a maximum of four items per row; split larger clip sets into multiple clearly labeled rows.
  - Do not duplicate a single clip just to fill a row. De-duplicate exact repeats and keep one card when there is only one unique clip to inspect.
  - Use `intent: "video-review"` unless the clips are direct implementation evidence, in which case use `intent: "implementation"`.
  - Keep timing, aspect ratio, model/source, and shot role in `qa_notes` or `tags`.
- `review this full cut`, `compose a trailer iteration`, or `add full video variants`:
  - Add the full composed videos as their own review batch.
  - Also add a companion individual-clips batch for the same iteration whenever clip diagnosis matters.
  - Put new full-cut and individual-clip batches at the bottom of the board.
  - Label every individual clip with:
    - shot number or role;
    - source time range;
    - what the clip is testing;
    - known issues such as cursor baseline, size jump, bad morph, or CTA timing.
  - Put these labels in `prompt_delta`, `critique`, `qa_notes`, and `tags` so they appear in the side metadata.

Do not add UI for these workflow modes by default.

Prefer natural language plus copied image references such as `image 3`, `row 2 image 7`, and persisted `state.json` metadata.

## Annotation Contract
When the user annotates or comments on a gallery image or video in Browser, identify the asset from artifact metadata, not screenshot position.

The artifact should expose these attributes on each `.image-card`, `.image-open`, `img`, and `video`:
- `data-testid="flow-image-<number>"`
- `data-flow-ref="image-<number>"`
- `data-flow-number`
- `data-flow-batch-id`
- `data-flow-batch-index`
- `data-flow-item-index`
- `data-flow-code`
- `data-flow-image`

When resolving an annotation:
1. Start from the Browser comment target selector.
2. Read the selected node's `data-flow-*` attributes if present.
3. If the target lacks them, walk up to the closest `.image-card`.
4. Use `data-flow-number` as the global board image number.
5. Use `data-flow-image` as the exact artifact-relative asset path.
6. Only fall back to visual counting when DOM metadata is unavailable.

Do not treat `article.image-card:nth-of-type(2)` as a global image number.

It means the second card inside that row's local image grid.

## Workflow
1. Read the user's concept and decide the next batch intent:
   - `run`: four fresh concept-exploration images
   - `diverge`: four wildly different directions from a concept, row, or selected image
   - `vary-image`: four image-seeded iterations that preserve the source image
   - `combine`: four concepts combining selected image(s)
   - `refine`: four focused attempts against specific critique
   - `implementation`: reference image plus app screenshot or design QA evidence
2. Generate exactly four images for the batch unless the user asks for a different count.
   - For video review batches, use the exact clip count the user needs to compare.
3. Copy project-bound outputs into `<project-root>/workbench/image-review-flow-workbench/` (flat — use batch-prefixed filenames like `<batch-id>-1.png`, never subfolders).
4. Append a batch to the bottom of `<project-root>/workbench/image-review-flow-workbench/state.json`.
   - If prompt metadata is not ready yet, copying media into the folder is enough.
   - The artifact will auto-create bottom rows for untracked unique assets in groups of four or fewer.
   - Hearting an auto-imported asset saves that row back into `state.json`.
5. Include for every batch:
   - `id`
   - `title`
   - `stage`
   - `intent`
   - `created_at`
   - `prompt`
   - `notes`
   - `next_prompt`
   - four `items` by default for true four-variant image runs, or the explicit unique clip count for video review
6. Give each item:
   - `slot`: `1`, `2`, `3`, or `4`
   - `code`: three short words in kebab case, for example `ember-glass-oracle`
   - `status`: `candidate`, `keep`, `revise`, `reject`, or `final`
   - `image`: artifact-relative image or video path
   - `prompt_delta`: what changed from the batch prompt
   - `critique`: concise visual review
   - `qa_notes`: implementation or comparison notes
   - `hearted`: `false` unless the user already selected it
   - `final`: `false` unless the user approved it as final
   - `tags`: short review tags
7. Open or reference the artifact at:
   `http://127.0.0.1:8765/image-review-flow-workbench/`
   - Prefer [@Browser](plugin://browser@openai-bundled) / `Browser:control-in-app-browser` for local artifact operation when available.
   - The workbench normally auto-reloads from `state.json`; do not manually refresh when sync already applied.
   - When a refresh is needed and the workbench is already open in Cursor Browser, refresh that Cursor Browser tab in place.
   - Do not run the macOS `open` command merely to refresh or foreground an existing workbench.
   - If Cursor Browser is unavailable or blocked and no workbench tab exists, use the user's current default browser only as a fallback.
8. After the user hearts images or asks for changes, read `state.json` before generating the next batch.
9. Use selected items as concrete references:
   - "make variations of batch 2026-06-15-a item 2"
   - "combine batch 1 item 1 with batch 3 item 4"
   - "keep the silhouette from item 3 and the lighting from item 4"

## Artifact Behavior
- Serve the artifact through `node artifacts/server.js --root <project-root>` so click selections persist.
- Direct `file://` opening is preview-only; it cannot write `state.json`.
- The artifact writes only the project's `workbench/image-review-flow-workbench/state.json` through `/api/workbenches/image-review-flow-workbench/state`.
- The artifact automatically reloads when `state.json` changes on disk.
- The artifact scans image and video assets through `/api/workbenches/image-review-flow-workbench/assets`.
- Drop loose images or videos into `<project-root>/workbench/image-review-flow-workbench/` when you want a no-JSON gallery row.
- Keep the UI minimal:
  - simple dark borders;
  - four-up image grid;
  - row metadata and next prompt on the right/top;
  - heart marker in the image corner;
  - status controls for candidate/keep/revise/reject/final;
  - full-size modal viewer with zoom controls.
- Keep video controls quiet:
  - lazily attach video sources only as cards become visible or near-visible;
  - autoplay muted loop for visible or near-visible videos;
  - avoid starting or loading every offscreen video at once on large boards;
  - pause offscreen videos during scroll/resize so large boards stay responsive;
  - pin the top board controls while scrolling so review actions stay reachable;
  - show a page-level play/pause-all video button in the top controls only when videos are present;
  - keep top control icons visually matched in size;
  - no native browser controls on the card;
  - controls appear on hover/focus;
  - video overlays must not block the heart button;
  - center play/pause icon is semi-transparent and has no circular background;
  - bottom timeline is a thin line;
  - fullscreen icon sits in the top-left without a border or circle;
  - fullscreen modal video keeps a minimal bottom timeline, current/duration labels, and scrub support.
- For video review rows:
  - full composed cuts and individual diagnostic clips should be separate batches;
  - append both batches at the bottom;
  - individual clips should be labeled clearly enough that the user can review a single transition without reopening the full cut.

## Image Generation Rules
- Use the `imagegen` skill for generated bitmap assets.
- For exploratory batches, do not preserve rejected prompts in extra markdown files.
- The durable review record is `state.json`.
- Do not claim a final asset is chosen until the user explicitly picks it or approves a selected item as final.
- If generated outputs land in a temporary generation folder, copy selected or project-bound images into the project's workbench folder before referencing them.

## Promotion And Commit Gate
- Generated workbench run assets in `<project-root>/workbench/image-review-flow-workbench/` should stay visible in `git status`.
- Do not add blanket ignore rules that hide workbench run output.
- Do not stage or commit generated run assets unless the user explicitly approves and promotes them.
- Commit only curated finals or review state that points to approved/promoted assets.
- If an asset becomes project-owned, copy or move it to the canonical project asset surface before treating it as finished.

## Verification
- Validate JSON:
  `python3 -m json.tool <project-root>/workbench/image-review-flow-workbench/state.json`
- Check browser JavaScript:
  `node --check skills/artifacts/image-review-flow-workbench/artifact/app.js`
- Check the server:
  `node --check artifacts/server.js`
- Serve and inspect:
  `node artifacts/server.js --root <project-root>`
  then open `http://127.0.0.1:8765/image-review-flow-workbench/`
