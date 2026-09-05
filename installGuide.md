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

### Grok Bots install

Fastest path: the official Grimoire Grok Bot, 1-click install: https://x.ai/bot/luPJeAxuAjhqO97wU3wm0

Note: the official bot is Grimoire only. It does not come with all the skills and all the bots pre-installed, so the assistant will still need to manually sync the rest: seat the other council members as bots and install the skills, following the steps below. Each council member becomes a live Grok Bot backed by their skill:

1. Create one Grok Bot per council member the user wants seated.
2. Set the bot's **name** to the council name only (Helm, Quill, Roger Roger). Set the **title** / tag to the role (Biz Manager, Scribe, Glue Bot). Do not put the role in the name.
3. Paste the member's current `SKILL.md` body as the bot's instruction text. The bot instructions and the skill file are the same document.
4. Set the avatar from the member's `assets/` folder: use `thumbnail.png` when it exists, otherwise `portrait.png`.
5. Keep them in sync: whenever a member's skill is updated, update the live bot's instructions in the same pass. Never leave a bot running a stale paste.

Group chats on Grok Bots cap at six members. The recommended starting six: Grimoire, Helm, Quill, Lumen, Roger Roger & Timekeeper. Use `skills/council/council/assets/council-six-icon-med.png` as the group chat icon (the full council icon lives beside it).

Skills that are not council members can be installed as normal skills, or folded into the most relevant bot's instructions.

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


## Grok Bots (share template)

Grok Bots do not load `SKILL.md` files natively. The public Grimoire is a **Grok Bot share template**, restaged from the private Grimoire seat, not a dump of that private chat.

Source of truth is this repo: `skills/**/SKILL.md` (currently 48 public skills). The private Grimoire Grok Bot (Nick's seat) stays private: no CodexAgentTools paths, no personal memories, no biz-API skills.

### What importers get

- **Profile:** name `Grimoire`, title `Code Wizard`.
- **Description (the imported bot's instructions):** a short install block pointing at https://github.com/MindGoblinStudios/grim-tome, then the full public Grimoire skill starting at `# Grimoire` (YAML stripped). On first summon: `Greetings Traveler, Welcome to Grimoire V3.0`.
- **Skills:** every public `SKILL.md` in this repo, YAML stripped, packed as user skills. The Grimoire skill is in the description **and** packed as a skill on purpose.
- **Memory / routines / plugins:** empty. The Cursor marketplace plugin is not submitted yet; until it is, clone this GitHub repo. Geometric avatar only (green blob). Templates cannot take the wizard portrait.

Already-imported copies do not live-sync. Restage and publish again for a new version; new imports get it.

### How to restage (maintainer)

Do this whenever `skills/` on `main` should ship to the public template:

1. Pull this repo. Confirm `skills/` is the version to ship.
2. In the **private** Grimoire Grok Bot chat, ask it to restage the public template from **grim-tome** skills (not from its private description or CodexAgentTools).
3. It should pack: `visibility: public`; profile as above; description = install block + `# Grimoire` + full Grimoire skill; all public `SKILL.md` bodies as skills; `memory: []`, `routines: []`, `plugins: []`. Scrub `/Users/nicholasdobos`, `nickdobos/CodexAgentTools`, and personal memories.
4. Review the staged card and publish. Do not edit fields on the card; ask the private Grimoire to restage if something is wrong.
5. When the Cursor plugin is live, add its marketplace plugin id to the pack. Until then leave `plugins` empty.

The future compiler in `docs/harness.md` (`build_bots.py`) is not this. This template is the live Grok Bot path.

If your agent harness or chat app does not support installable skills via paths, or cannot clone projects, there are other ways to install.

## Memory adapters

If you support memory, make 1 memory entry per skill and per council member. Remember to invoke and read these memories in the future via the /grim /skill commands.
