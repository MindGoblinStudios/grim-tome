# pstack Expansion Pack (Beta)

Four skills from [pstack](https://github.com/cursor/plugins/tree/main/pstack) by [poteto](https://x.com/poteto) (Lauren Tan), installed as a beta expansion pack. MIT licensed; the upstream license ships beside this file as [`LICENSE`](LICENSE). Standalone mirror: [backnotprop/pstack](https://github.com/backnotprop/pstack). Pinned at upstream commit `11713c683fe4add4fd403ea880580abbc9e0875f`.

| Invoke | What it does |
|---|---|
| `/create-verification-skill` | Interviews the repo and generates a project-local `verify-<app>` skill (launch, doctor, drive, evidence, cleanup) plus a feature map, then proves it once end to end. |
| `/maintain-verification-skill` | Keeps that verify skill honest: one source reader per feature, one live pass over every feature, then `clean`, `changed` (one PR of proven fixes), or `blocked`. |
| `/how` | Explains how a subsystem works at senior-engineer onboarding depth: overview, key concepts, flow, where things live, gotchas. |
| `/why` | Investigates why code is shaped the way it is across git history and every available MCP evidence source, with cited, confidence-separated findings. |

### Naming and lifecycle

- These skills keep their **upstream invocation names** (`/how`, not `/grim:ep:beta:how`), so pstack docs and muscle memory still work.
- They are **beta**: manual-only (`disable-model-invocation: true`, `allow_implicit_invocation: false`), and `lifecycle: beta` in `pack.yaml` and each skill's frontmatter metadata. Promotion drops the lifecycle flag and may allow implicit invocation.
- Each is a light mutation (`mutation: true`). The unmodified upstream copy lives at `mutations/<skill>/original/UPSTREAM.md`; reference files are unmodified upstream copies.

### What changed per skill

pstack's other parts (the `pstack-models.mdc` model rule from `/setup-pstack`, `poteto-mode`, `cursor-team-kit`, Cursor-only tool names) are not in the Tome, so references to them were rewritten to work standalone on any harness.

- **create-verification-skill**: `.cursor/skills/verify-<app>/` became `<skills-dir>/verify-<app>/`, with `<skills-dir>` defined as the harness's project skill folder (`.cursor/skills/`, `.claude/skills/`, `.agents/skills/`, or whatever the repo already uses). The pointer to `/maintain-verification-skill` notes it ships in this same pack.
- **maintain-verification-skill**: target lookup no longer assumes `.cursor/skills/verify-*/`; it checks the harness's project skill folder. Added a serial fallback for harnesses without subagents (read each feature yourself, same return shape).
- **how**: dropped the Cursor Task-tool spawn spec (`subagent_type: generalPurpose`), the `pstack-models.mdc` role lines, and the pinned model slugs. Now: read-only subagents via the harness's own tool, fast model for explorers and strongest reasoning model for the explainer when models are selectable, otherwise inherit. Added a no-subagent fallback that runs the same explorer and explainer templates in sequence.
- **why**: same model-routing rewrite (no `pstack-models.mdc`, no pinned slugs) for investigators and synthesizer. `generalPurpose` / `readonly: false` became "spawn subagents that keep tool and MCP access; avoid read-only modes that strip MCP". MCP discovery now uses the harness's tool list or MCP catalog instead of assuming Cursor's `mcps/` directory. Added a no-subagent fallback.

### Upstream updates

Diff `mutations/<skill>/original/UPSTREAM.md` against the new upstream `SKILL.md`, merge deliberately, re-apply the changes above, and bump `default_ref` in `pack.yaml`.
