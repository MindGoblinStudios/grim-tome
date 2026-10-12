---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
mutation: true
license: MIT
source_url: https://github.com/cursor/plugins/blob/main/pstack/skills/how/SKILL.md
source_ref: 11713c683fe4add4fd403ea880580abbc9e0875f
original_skill: original/UPSTREAM.md
metadata:
  author: Lauren Tan (poteto)
  pack: pstack
  lifecycle: beta
---

Original skill: [how](https://github.com/cursor/plugins/blob/main/pstack/skills/how/SKILL.md) from pstack by poteto (MIT) — nested copy at [`original/UPSTREAM.md`](original/UPSTREAM.md).

Beta: manual-only; invoke it by name. Mutation: harness-neutral subagent and model routing (no `pstack-models.mdc` rule or pinned model slugs), plus a no-subagent fallback.

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Spawn every explorer and explainer as a **read-only** subagent with your harness's subagent tool. If the harness lets you pick models, use a fast coding model for explorers and your strongest reasoning model for the explainer; otherwise inherit the parent's model. If the harness can't spawn subagents, run the same steps yourself in sequence: explore each angle with `references/explorer-prompt.md` as your checklist, then write the answer with `references/explainer-prompt.md`.

## 1. Assess complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. Spawn one explainer that explores and explains in one pass, built from `references/explainer-prompt.md` without the explorer-findings section. Go to step 4.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): go to step 2.

When in doubt, take the simple path.

## 2. Explore (complex only)

Decompose the question into 2 to 4 angles, each a distinct slice of the subsystem. Spawn all explorers in a single message, each with `references/explorer-prompt.md` and its angle filled in.

## 3. Synthesize (complex only)

Once all explorers have returned, spawn one explainer with `references/explainer-prompt.md` and every explorer's findings filled in.

## 4. Present

Present the explainer's output. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
