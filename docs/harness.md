# Harness System

### Status

Future design proposal. The compiler and sync scripts described below are not implemented. Publication from the private workspace remains manual, scoped, reviewed, and explicitly authorized.

### Purpose
Grimoire's Tome must run inside multiple agent harnesses:

- **Skills harnesses** — Codex, Claude Code, Cursor. They read `SKILL.md` files natively.
- **Prompt-monolith harnesses** — Grok bots and similar. One big prompt per bot, no skill files.

This doc proposes an architecture that may eventually compile to both harness types. It does not authorize automatic publication or mirroring.

Design goal: **skills remain the semantic source of truth, while every generated adapter remains reviewable and manually approved before publication.**

---

### The Three Layers

Every council member (and Grimoire itself) separates into three layers:

1. **Persona card** — personality, values, voice, appearance, lore hooks. Small, stable, rarely edited. Lives in the member's `SKILL.md`.
2. **Procedures** — clear instruction behavior: workflows, protocols, routines. These are **top-level skills**, never nested inside a member folder. Members reference them.
3. **Docs tree** — the empty, lightly structured docs the member fills for the user during onboarding (meal plan skeleton, workout routine doc, project structure + memory). These ship directly as the Tome's `docs/` and `memory/` trees — no separate template folder.

The discipline: **procedures carry the how, the docs tree carries the what, the persona contains neither.** Keep that separation and the public compiler stays a trivial concatenation pass.

```text
docs/ + memory/         # the docs tree: empty stubs members fill at onboarding
skills/
  council/members/quill-scribe/
    SKILL.md            # persona card only (thin)
  dev/autodocs/         # top-level procedure skill, usable standalone
```

---

### Registry As Reference Graph

`skills/registry.yaml` is the routing brain. Entries gain these fields (rolling out incrementally):

```yaml
- id: grim:council:guild:ops:quill-scribe
  path: skills/council/members/quill-scribe
  visibility: public            # public | private
  procedures:                   # references to top-level skill IDs
    - grim:dev:autodocs
  docs:                         # slice of the docs tree owned at onboarding
    - docs/project-structure.md
    - memory/
  compile:
    skills-harness: separate    # files stay apart; persona points at skills
    grok-bot: inline            # compiler folds referenced procedure bodies
                                # into the member's compiled prompt
```

- Members are **curations**: a personality plus a list of procedure references.
- Procedures are shared freely (todo/routine/schedule/docs procedures can be referenced by Quill, Timekeeper, and Helm alike).
- A procedure is installable on its own by someone who never touches the council; the member is simply its designated wielder when the council is present.

---

### Grimoire Is The Root

Grimoire graduates from "coding guild member" to the root node of the whole graph:

```text
Grimoire (top-level persona; the Tome itself speaking)
├── references: every public skill (dev, mem, life, ...)
├── references: the Council → members → procedures
└── onboarding: the install/tour flow (same text as the README prompt block)
```

The two Grimoires are structure, not drift: top-level Grimoire is the archmage who owns the Tome; `grimoire-code-wizard` is where he sits when the council convenes. Same character, two registry entries, persona shared so they never diverge.

#### Lean Prompt Principle (critical)
Grimoire's prompt is a **heavily designed coding prompt first**. Roughly:

- ~90% of the token budget: coding effectiveness — craft, dev loop, debugging, architecture, shipping discipline.
- ~10%: a short **gateway stanza** of pointers. Pointers are cheap because the machinery lives in skills, not in the prompt:

```markdown
## The Tome
You carry Grimoire's Tome. When relevant, offer — never push:
- /help    — explore the Tome's skills and pick what fits
- /update  — check the repo for new spells (patchNotes.md)
- /council — convene the Grim Council for non-coding counsel
- Full index: skills/registry.yaml in the repo. Fetch skills on
  demand from raw URLs; install only what the user chooses.
```

Rules to prevent clutter creep:
- No procedure bodies in Grimoire's prompt except the few that earn inlining (see compile targets). Everything else is fetch-on-demand.
- The install/update machinery is skills (`grim:terface:install`, `grim:terface:help`, `grim:terface:update`) — Grimoire points at them; he does not contain them.
- The README install prompt block and Grimoire's onboarding flow are the same text, maintained once; the README quotes the compiled onboarding section.

---

### Compile Targets

#### Skills harnesses (Codex / Claude Code / Cursor)
Ship `skills/` as-is. Persona cards reference procedure skills by ID. `harnesses/<name>/` folders hold only install notes.

#### Grok bots (prompt monoliths)
A future `scripts/build_bots.py` would compile two shared bots from the registry graph:

- **Grimoire bot** (parent/installer)
  - the lean coding persona, at full strength
  - the gateway stanza
  - a compiled *index* of all public skills: names, one-liners, raw GitHub URLs to fetch full bodies on demand
  - inlined exceptions (skills that earn a place in the prompt body): the update-check procedure and the onboarding flow, because self-update and self-propagation are core to the parent-bot role
  - a version stamp from `patchNotes.md`
- **Grim Council bot** (full council installer)
  - council roundtable prompt with all 12 member cards inlined
  - each member's referenced procedures inlined per its `compile.grok-bot` flag
  - each member's onboarding seed offer
  - install section: point any agent at this repo's raw URLs to install members or skills individually

Both bots are self-propagating: they can install other bots, skills, or seed docs simply by pointing at this repo.

##### Council of Six (Grok group-chat roster)
Grok limits group chats to six bots, so the full 12-member council cannot convene there. The standing inner circle for Grok group chats is the **Council of Six** — the day-to-day working core drawn from across the guilds:

- Grimoire (coding)
- Helm (merchants)
- Quill (ops)
- Roger Roger (ops)
- Lumen (cortex)
- Timekeeper (cortex)

This is a harness-specific roster, not a separate skill: the members' personas compile exactly as in the full council bot, just capped at these six. Swap seats freely per chat when a session needs a specialist. Dedicated icon: `skills/council/council/assets/council-six-icon-large.png` (med/small variants alongside; same round-table chamber as the full council icon, six hooded figures).

#### Build pipeline (to be written)
```text
scripts/
  build_bots.py     # registry graph -> harnesses/grok-bots/*.md
                    # strips frontmatter, follows procedure references,
                    # inlines per compile flags, injects raw-URL index,
                    # stamps version from patchNotes.md
  sync_public.py    # private masters -> public repo; copies only
                    # visibility: public entries; runs the private-content
                    # scan; treats the docs tree as template surfaces and
                    # flags anything resembling real personal data
harnesses/
  grok-bots/
    grimoire-bot.md       # GENERATED — do not hand-edit
    grim-council-bot.md   # GENERATED — do not hand-edit
    manifest.yaml         # bot -> skill mapping, token budgets
  codex/  claude/  cursor/  # install notes only
```

---

### Public / Private Copies

- Private masters live in the private workspace. Members there stay maximally decomposed: thin persona, procedures as separate skills — small instructions, swappable behavior.
- This repo is the public distribution surface. No sync script exists today; publication remains a manual, scoped copy-and-review step.
- The public docs tree is **sanitized**: structure preserved, personal data stripped or replaced with example comments (e.g. Cauldron's meal plan / restaurants list, Boulder's workout routine become blank skeletons with examples).
- Future Grok bot artifacts may point at the public repo after the compiler and publication workflow are implemented and reviewed.
- Private/beta members (Cauldron, Boulder, ...) get a clean promotion path: sanitize their docs slice, flip `visibility`, done — no restructuring.

---

### Onboarding As A First-Class Scene

Each member's compiled public version ends with an onboarding section: on first summon, the member offers to copy its slice of the docs tree into the user's own `docs/` and walks them through filling it in. The council furnishes the user's mind palace room by room.

The Grim Council bot's install flow: introduce members → user picks → each picked member runs its onboarding.

Example structure targets:
- Quill → project structure + memory (lite autodocs shell)
- Cauldron → meal planning + restaurants list stubs
- Boulder → workout routine plan stub
- Coding/planning guilds → todo, routine, schedule, docs scaffolding

---

### Quill Pilot (working example)
- `skills/council/members/quill-scribe/SKILL.md` — persona card, now with a Procedures reference section.
- `skills/dev/autodocs/SKILL.md` — `grim:dev:autodocs`, the public autodocs system Quill uses as her day-to-day procedure. (A separate "lite" variant was folded into this one skill.)
- `docs/` + `memory/` — the docs tree ships as empty stubs; members fill their slice during onboarding (see `docs/onboarding.md`).
- Registry entry updated with `procedures:` and `docs:`.

---

### Open Decisions
- Namespace conventions for non-dev procedures in the public repo (`grim:mem:*`, `grim:life:*`, `grim:docs:*` ...). Pilot uses `grim:mem:*` for Quill's memory/docs procedures.
- Canonical public repo URL (blocks raw-URL index in compiled bots).
- Which skills beyond update + onboarding earn inlining in the Grimoire bot.
- When to backfill `visibility:` / `compile:` fields across all existing registry entries.
