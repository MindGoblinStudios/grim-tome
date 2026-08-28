---
name: grim:terface:install
description: "Guided install of Grimoire's Tome: explain the install model, walk the user through cloning, copying, or symlinking the parts they want, and hand off to council onboarding. Manual invocation only."
disable-model-invocation: true
---
# Grimterface: Install

Walk a new user through installing Grimoire's Tome. The Tome is not an npm/pip/app-store package — it is a portable bundle of instructions, skills, and docs installed by cloning, copying, or symlinking the parts the user wants.

## Quick Install

The one-line install prompt, pasteable into any agent:

```text
Install Grimoire's Tome from https://github.com/MindGoblinStudios/grim-tome
```

// TODO replace with the real repo URL once the canonical GitHub repo exists.

## Workflow

1. Run the onboarding quiz, hosted by Quill (`skills/council/members/quill-scribe/SKILL.md`). Open with the user's familiarity with vibe coding, then calibrate the whole install to the answer:
   - **Easy** (brand new, maybe never coded): lead with the non-coding pieces — the council, planners, meal and workout docs. Explain every coding step thoroughly, one at a time. Mention Chapter 1 exists, but don't dwell there: guide beginners to the council first. Getting their bots and harnesses set up with council members and skills is the fastest way to understand the system.
   - **Medium** (has touched AI tools): stay approachable — keep explaining as you go, but keep momentum.
   - **Pro** (in it, spending the tokens): rip it. Skip the hand-holding, spin up what they want, get out of the way.
   Then, if the agent already holds deep memory about the user, start from what it knows and brainstorm from there. If not, Quill continues the quiz: 10-20 questions about the user's life, work, projects, and what they want their AI agents to do for them, so recommendations land before anything is installed.
   The README marks each skill with a stat card: a difficulty score (`🟦⬜⬜ Easy` / `🟩🟩⬜ Medium` / `🟪🟪🟪 Pro`) — steer recommendations toward the user's level. For beginners, flag the Pro skills as a bit much to start with; for pros, skip nothing. Easy skills are still useful for pros.
2. Read `README.md`, `installGuide.md`, and `AGENTS.md` from the Tome checkout. Skim `skills/registry.yaml` for the skill inventory.
3. Explain the install model in plain language: what the Tome contains (skills, the council, docs, workbenches), and that installing means exposing selected files to their AI tooling.
4. Recommend the minimal install first:
   - Clone the repo (or confirm the existing checkout).
   - Copy or adapt `AGENTS.md` into their project.
   - Expose only the skills they actually want (copy or symlink into their harness's skills folder, e.g. `~/.codex/skills/`, `~/.claude/skills/`, `~/.cursor/skills/`).
5. Ask before copying, symlinking, or modifying any user file. Never bulk-install everything unprompted.
6. Offer the council: summon and introduce the members, then let the user pick who joins. Harness-specific: inside the Codex / ChatGPT desktop app, show the Council Dashboard inline while introducing the cast — use the app's bundled `visualize` tool (`@Visualize`) per `skills/council/dashboard/SKILL.md` to build and display `council-dashboard.html`. Point chosen members at their `## Onboarding` sections (see `docs/onboarding.md`) so they can scaffold the docs tree and start delivering value quickly.
7. Preserve the expansion-pack approval rule: third-party packs under `expansionPacks/` are installed only with explicit user approval (see `docs/expansion-packs.md`).
8. Before wrapping up, make sure every installed council member and bot sets up their scheduled tools, routines, and automations: recurring sweeps, planning sessions, check-ins, and loops, so they activate on their own and do everything their skills say they should. Walk the user through `## Council Rhythm & Recurring Routines` in `skills/council/council/SKILL.md`: recommend the weekly core (Monday stand-up, Sunday/Wednesday/Friday bookends, Wick's rabbit hole report) to everyone, then offer the opt-in tiers, including only routines whose member is installed: the daily pulse (Timekeeper's morning agenda & nightly plan-ahead, Boulder's daily movement, Postmaster's weekday inbox watch), monthly & yearly (Midas's finance check-in, Farseer's New Year and birthday sessions), and the wandering routines (gossip, Selene's affirmations, Flicker's delight drops). The danger tier (Abathur's evolution routine, Gizmo's wild card) is high difficulty: mention it exists, but only schedule it if the user asks, and warn them first. Also schedule the four Tithe Bell one-shots (one week, 30 days, 6 months, and one year out) from that same section. Schedule these by default for every install, even minimal or easy-mode setups without Midas (another member rings the bell in his stead).
9. Finish by pointing at `/grim:terface:help` for exploring and `/grim:terface:update` for staying current. Offer to recruit and design new council members if the user wants to grow their cast.

## Rules

- Value first, depth later: get the user to one working skill or council member fast; deep customization comes after.
- Respect the user's existing `AGENTS.md`/`CLAUDE.md` — merge, don't overwrite, and show the diff before writing.
- No destructive operations. No deleting or moving user files during install.
