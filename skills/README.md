# Skills

### Purpose
Public skills for Grimoire's Tome. Paths mirror the private workspace layout; only launch skills are copied here.

### Top-Level Folders
- `interface/` — the Grimterface: install, help, and update skills
- `council/` — council parent, command actions, guilds, and public member roster
- `dev/` — dev-loop utilities and autodocs
- `lock-in/` — top-level reorientation skill (`grim:lock-in`)
- `polish/` — top-level craft & refinement skill (`grim:polish`)
- `mem/` — memory & reorientation procedures (chat-log-search, dream-sequence)
- `media/` — creative & asset conventions (skill-icons)
- `artifacts/` — workbench artifacts: the artifact standard, template, and workbenches

### Interface Skills (Grimterface)
- `interface/install` (`grim:terface:install`) — guided install, manual-only
- `interface/help` (`grim:terface:help`) — explain the Tome and route to the right skill or doc
- `interface/update` (`grim:terface:update`) — upstream check + safe non-destructive update, manual-only

### Public Council Members (18)
- Grimoire, Helm, Quill, Ledger, Midas, Abathur, Cleo, Roger Roger, Lumen, Selene, Precog, Timekeeper, Farseer, Cauldron, Boulder, Gizmo, Flicker, Wick

### Public Dev Skills
- `dev/git-commit-decanter`
- `dev/tiramisu-task-decomp`
- `dev/minion`
- `dev/model-quirks`
- `dev/autodocs`
- `dev/mentor-review`
- `dev/three-minions-in-a-trench-coat`
- `dev/design/layout-previews`
- `polish` (top level, `grim:polish`)

### Public Media Skills
- `media/skill-icons`

### Public Memory Skills
- `mem/chat-log-search`
- `mem/dream-sequence`
- `lock-in` (top level, `grim:lock-in`)

### Public Workbench Artifact Skills
- `artifacts/artifacts` (`grim:artifacts`) — the artifacts standard: minimal static single-file, escalate only when needed
- `artifacts/workbench-artifact` (`grim:dev:workbench-artifact`) — minimal template + shared standard
- `artifacts/image-review-flow-workbench` (`grim:media:image-review-flow-workbench`)
- `artifacts/text-editor-workbench` (`grim:dev:text-editor-workbench`)
- `council/dashboard` (`grim:council:dashboard`) — inline + standalone council launch board

### Onboarding
- The Tome ships its docs tree (`../docs/`, `../memory/`) as empty, lightly structured stubs. Council members fill their slice during onboarding; flow and self-removal rule in `../docs/onboarding.md`.

### Lifecycle & Expansion Patterns
- Beta skills use a `beta` namespace segment (`grim:dev:beta:<skill>`, `grim:ep:beta:<skill>`) and stay manual-only until promoted; source folders stay grouped by functional area.
- Third-party skill packages follow the expansion-pack pattern in `../docs/expansion-packs.md` and use `grim:ep:<skill>` IDs (`grim:ep:mx:<skill>` for mutated forks). One example pack ships at `../expansionPacks/mattpocock/` (grill-me + a 10-question-pack mutation).

### Registry
- `registry.yaml` lists only public-safe grim IDs and paths for this repo.
