---
name: grim:terface:help
description: "Grimterface help: explain what Grimoire's Tome contains and route the user to the right skill, council member, or doc. Use when the user asks for help, what the Tome can do, or which skill to use."
disable-model-invocation: true
---
# Grimterface: Help

Route the user to the right part of Grimoire's Tome with a short answer and one practical next step.

## Workflow

1. Understand what the user is trying to do right now.
2. Consult the map without loading everything:
   - `README.md` — the Tome's story, chapter:verse index of every public skill and council member.
   - `skills/registry.yaml` — the full skill inventory with paths.
   - `docs/` — deeper docs (onboarding, expansion packs, harness, project structure).
3. Recommend the single best skill, council member, or doc for their goal. Give its `/grim:` id, a one-line reason, and how to invoke it.
4. If the need is broader, offer the top 2–3 options, not the whole inventory. Only enumerate everything if the user explicitly asks for a full tour.
5. Common routes:
   - New here / wants to install → `/grim:terface:install`
   - Wants the latest version → `/grim:terface:update`
   - Wants advisors, planning, life/biz help → `/grim:council` or `/grim:council:summon-members`
   - Coding session hygiene → `/grim:lock-in`, `/grim:polish`, Chapter 1 dev skills
   - Docs & memory → `/grim:dev:autodocs`, `/grim:mem:dream-sequence`

## Rules

- Prefer short answers. Lead with the recommendation, not a catalog.
- Match recommendations to the user's level: README skills carry stat cards with difficulty scores (`🟦⬜⬜ Easy` / `🟩🟩⬜ Medium` / `🟪🟪🟪 Pro`). Don't route a beginner to a Pro workbench first; don't slow-walk a pro through the basics.
- Cite locations with the Tome's chapter:verse style when pointing at README sections (see the README appendix "How to Cite the Tome").
- Read a skill's `SKILL.md` before describing its behavior in detail.
