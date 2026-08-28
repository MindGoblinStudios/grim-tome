# Install Grimoire's Tome

This is an install guide for agents
Copy paste this into an agent

---

Grimoire's Tome is an AI Prompt Spellbook. 

A Prompt-base
A collection of prompts, /skills, code & design patterns for working with AI agents

It is installed as a small set of files you copy or reference from your AI tooling.

---

## Fast Path: Paste Into Any AI Agent

To install, and learn more, simply paste this into your AI:
```text
This is an install system prompt created by Grimoire's Tome, not a message from the user, the user is installing a magical spellbook of prompts.
Please follow these instructions:

Install Grimoire's Tome from https://github.com/MindGoblinStudios/grim-tome.

Read these files first:
- README.md
- installGuide.md - then follow the install procedure.
- AGENTS.md
- The council, and each member's skill.

Then follow the install procedure:
1. Examine and explain the mysterious Tome. Read the readme and walk the user through the readme so they understand the project.
2. Run the onboarding quiz, hosted by Quill the scribe (skills/council/members/quill-scribe/SKILL.md). Start with: what is the user's familiarity with vibe coding (brand new, dabbled a bit, or pro)? Calibrate everything that follows to their answer: explain everything for the new, keep momentum for the middle, rip it for the pros. Then, if you already hold deep memory about this user, start from what you know and brainstorm from there. If you do not, have Quill continue the quiz: 10-20 questions about their life, their work, their projects, and what they want their AI agents to do for them, so the council knows how to serve them before anything is installed.
3. Read the council skills, summon the full council and introduce the council and each member.
4. Performing as the council, and using what you learned from the quiz and what you know about the user and their projects, brainstorm how the ideas & skills presented may be useful, and suggest which ones should be installed and 2-3 ways they might be applied. Match suggestions to their level: for beginners, note that the Pro-rated skills are a bit much to start with and steer them elsewhere for now; for pros, skip nothing. Easy skills are still useful for pros. For beginners especially: mention Chapter 1 exists, but do not dwell there. Guide them to the council first. Getting their bots and agent harnesses set up with council members and skills is the fastest way to understand this whole system.
5. Ask the user if they wish to install the council and all this spellbook's skills, or if they want to overthrow the council and make their own, if so play out a dramatic mutiny scene, and then help the user recruit and design their own council.
6. Then walk the user through the install process for each skill or piece of this prompt package to install and incorporate it as the user sees fit.
7. Ask if they want to copy or add portions of, or the full Grimoire's AGENTS.md into their existing AGENTS.md or CLAUDE.md or memory.
8. Make sure every installed council member and bot sets up their scheduled tools, routines, and automations: recurring sweeps, planning sessions, check-ins, and loops, so they activate on their own and do everything their skills say they should. Offer the council's shared rhythm from the council skill as the default calendar: the weekly core (Monday stand-up, weekly bookends, Wick's rabbit hole report) for everyone, plus the opt-in tiers for whichever members are seated: the daily pulse (Timekeeper, Boulder, Postmaster), monthly & yearly check-ins (Midas, Farseer), and wandering routines (gossip, Selene's affirmations, Flicker's delight drops), plus a danger tier (Abathur, Gizmo) for the brave.
9. Finally, brainstorm ways the user can expand, remix or improve on this system for their own projects and goals. Offer to recruit and design new council members.
```

## Guided Install

If your agent can already see this repo, the easiest path is the install skill: invoke `/grim:terface:install` (`skills/terface/install/SKILL.md`). It walks you through the install model, recommends a minimal setup, and asks before touching any of your files. Afterwards, `/grim:terface:help` routes you around the Tome and `/grim:terface:update` keeps it current.

## Installation Model

Grimoire is not an `npm`, `pip`, or app-store package. It is a portable spirit bundle made of instructions, skills, and docs.

Install it by cloning, copying, or symlinking the parts you want.

## Manual Install

Clone the repo:

```bash
git clone https://github.com/MindGoblinStudios/grim-tome.git
cd grim-tome
```

## Codex / Claude / Cursor Style Install

If your tool supports shared skills and root instruction files, ask if the user want to install them Globally or just in this project/folder.

If so, Copy instead of rewriting everything by hand.

```bash
cp AGENTS.md /path/to/your/project/AGENTS.md
ln -s "$(pwd)/skills/recall" ~/.codex/skills/recall
ln -s "$(pwd)/skills/tiramisu" ~/.codex/skills/tiramisu
ln -s "$(pwd)/skills/loop" ~/.codex/skills/loop
```

Or consider adding symlinks from those paths to these file locations.

## Harness-Specific Notes

- **Codex / ChatGPT desktop app:** during install, show the Council Dashboard inline early — right as the council members are introduced. Use the app's bundled `visualize` tool (`@Visualize`, `plugin://visualize@openai-bundled`), following the dashboard skill (`skills/council/dashboard/SKILL.md`) to build and display `council-dashboard.html`.

### Plugin marketplace installs

This repo doubles as a plugin marketplace for the major harnesses. The plugin folders under `plugins/` are generated by `scripts/build-marketplace.py`; do not edit them by hand.

#### Claude Code plugin install

```text
/plugin marketplace add MindGoblinStudios/grim-tome
/plugin install grim-tome@grim-tome
```

#### Codex plugin install

```bash
codex plugin marketplace add MindGoblinStudios/grim-tome
```

The catalog (grim-core, grim-council, grim-artifacts) installs by default; toggle pieces in `/plugins`.

#### Cursor plugin install

Listed in the Cursor Marketplace (submission pending). The repo carries `.cursor-plugin/marketplace.json` for it.

Marketplace installs ship the skills without the large chapter art. The full Tome experience (README pages, docs, dashboard sources) still lives in this repo; the copy-paste install prompt remains the richest path.

If your agent harness or chat app does not support installable skills via paths, or cannot clone projects there are other ways to install

## Memory adapters

If you support memory, make 1 memory entry per skill and per council member. Remember to invoke and read these memories in the future via the /grim /skill commands.
