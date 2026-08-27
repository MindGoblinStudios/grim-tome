---
name: grim:dev:autodocs
description: Maintain a project's canonical documentation system so durable decisions, workflows, constraints, and lessons remain easy for humans and agents to find. Use when documentation, AGENTS.md routing, remembered corrections, or self-improving project workflows are involved. AutoDocs may read docs for planning context, but it does not authorize creating planning documents.
---

# AutoDocs

## Purpose

Build a small, evolving source-of-truth documentation system that makes future work easier.

Keep documentation:
- concise
- current
- audience-neutral
- easy to find
- safe to share at the repository's intended visibility level

Document durable context that code and live tools do not already explain:
- why a workflow exists
- how to operate it
- important constraints
- decisions and their consequences
- recurring failure modes and prevention notes

## Read Before Writing

Before changing documentation:

1. Read the repository's `AGENTS.md`.
2. Read `docs/README.md` when it exists.
3. Read the relevant existing project docs.
4. Inspect the current code or tool state when the documentation depends on it.
5. Find the smallest canonical document that should own the information.

Do not create a second source of truth when an appropriate document already exists.

## Suggested Documentation Shell

Projects may begin with this small structure and add folders only when needed:

```text
AGENTS.md
docs/
  README.md
  product/
  dev/
  ops/
memory/
  MEMORY.md
```

Recommended ownership:
- `AGENTS.md` — critical instructions and routing that must always be loaded
- `docs/README.md` — documentation index and canonical-location map
- `docs/product/` — product behavior, decisions, and user-facing constraints
- `docs/dev/` — architecture, development workflows, and technical operations
- `docs/ops/` — recurring operational procedures and runbooks
- `memory/MEMORY.md` — optional durable cross-session context that does not belong in product documentation
- skill `references/` — instructions that apply only to one skill

Memory feeds docs, not the other way around: `memory/MEMORY.md` is the fast-capture surface for mid-session corrections and preferences. Periodic consolidation (`grim:mem:dream-sequence`) promotes matured entries into the right canonical doc and prunes them from memory, so memory stays small while docs accumulate the distilled knowledge.

Do not create empty folders merely to satisfy this example.

## Workflow

When durable documentation should change:

1. Search for the current source of truth.
2. Verify the new information against current evidence.
3. Update the smallest canonical surface.
4. Remove or correct conflicting stale guidance.
5. Update `docs/README.md` or `AGENTS.md` routing when discoverability changed.
6. Keep the edit concise and reviewable.
7. Report what changed and what remains unverified.

## Writeback Gate

Before finishing a non-trivial task, ask:

1. Did the work establish or correct a durable preference, constraint, or recurring workflow?
2. Did it change a durable decision, command, path, process, blocker, or prevention rule?
3. Was time lost because documentation or routing was missing, stale, or difficult to find?

If yes, update the smallest appropriate canonical surface.

Ask before writing when the information is:
- sensitive
- ambiguous
- low-confidence
- likely to be temporary
- outside the repository's intended visibility

## AutoDocs Is Not Project Planning

AutoDocs may read existing documentation to recover planning context and constraints.

Do not treat a planning conversation as permission to create planning documents.

Default behavior:
- keep proposed plans in chat
- when the user asks to persist a project plan, prefer the repository's existing planning surface
- if no planning convention exists, default to one project-root `plan.md`
- do not scatter feature plans, roadmaps, or task breakdowns across `docs/`

A proposal becomes durable documentation only when:
- the user explicitly asks to document it
- it corrects an existing source of truth
- or it establishes a lasting workflow or constraint independently of the proposed plan

## Documentation Style

Use ordinary topic-based Markdown:

```markdown
# Title

## Purpose

## Workflow

## Verification
```

Prefer:
- short sections
- bullets for independently editable facts
- exact paths and commands when useful
- explanations of why and how

Avoid:
- duplicating code or live tool data
- long chronological work logs in reference docs
- separate human and agent documentation trees
- secrets, tokens, private account data, or unrelated personal information
- generated indexes that can be derived cheaply from the source tree

## Public Distribution Safety

When publishing AutoDocs as an example or reusable skill:
- publish this generic workflow only
- do not copy the source project's documentation tree
- do not include private routing indexes, filenames, business records, personal notes, or memory
- use placeholder folder examples instead of real private paths
- review the public output independently before release

## Completion Check

Before handing off:
- the canonical document contains the new durable information
- stale conflicting guidance is removed or clearly superseded
- routing still points to the right place
- no private material crossed a repository boundary
- no planning document was created without authorization
