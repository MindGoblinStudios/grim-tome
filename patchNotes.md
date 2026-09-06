# Patch Notes

Public changelog for Grimoire's Tome releases


## v1.1.0 (2026-09-06)

The Astra Attunement. A big tone, catchphrase, and routing rework, synced from the private Tome, for compatibility with GPT-6 Astra.

Council personas:
- Every member's Personality, Voice & Tone section rewritten for stronger, more distinct voices. Gizmo is a tiny bard with an enormous vocabulary. Wick flutters, then locks in. Cauldron is witchy kitchen chaos. Roger Roger has conspiracy-board energy. Lumen is a quiet lantern mentor.
- Catchphrase banks for all 20 members, with a house rule: a catchphrase only when the moment earns it, most replies need none, and no automatic greetings or sign-offs. Astra takes phrase lists literally; this keeps the voice without the rotation.
- New protocols: Lumen's Tend The Flame and Walk A Possible Life, Wick's From Flutter To Focus, Gizmo's A Little Mischief, Timekeeper's Re-Sync and Adaptive Check-Ins (check in around real transitions, not clock times), Seeker's wider curiosity filter.
- Abathur's Evolution Routine now revisits the last experiment before proposing the next mutation, report-only by default.

Routing & launcher metadata:
- Every skill and member `agents/openai.yaml` gains a `default_prompt` and a tighter `short_description`, so launchers and skill pickers describe the Tome consistently.
- Minion split into a thin router plus references: CLI routes, local routes (LM Studio, Ollama), OpenRouter, model choices.
- Layout Previews adapts to the host's preview surface. Mentor Review clarifies the authorized-repair workflow.
- Council dashboard reads launcher metadata live. Marketplace bundles keep the referenced launcher icons.

Council skill:
- Personality And Catchphrases section governs the whole room.
- Grok Bot seating cap (6 per room) and the recommended Grim Council seats, plus the bot/skill sync rule.
- Portrait vs thumbnail guidance for member media.

Art:
- Refreshed portraits for Postmaster, Precog, Seeker, and Timekeeper. Launcher icons for Seeker and Postmaster.

Also:
- Workbench Artifact: optional WebMCP host bridge note. Tiramisu: diagram-first output, tables optional.

## v1.0.3 (2026-09-05)

- Grok Bots: official Grimoire 1-click install link, plus a Grok Bots install section in the install guide covering how to seat the rest of the council and keep bots in sync with their skills.
- Build-a-Wizard Workshop is email-first. Serious inquiries to contact@mindgoblinstudios.com, discovery call with a deposit once it's a fit.
- Cursor plugin install section removed until the marketplace listing is live.
- Council roster fix: all twenty public members listed.

## v1.0.2 (2026-08-27)

- Council Routines reworked into tiers: The Daily Pulse, The Week, Monthly & Yearly, Wandering, The Tithe Bell, and a Danger tier (Abathur's Evolution Routine, Gizmo's Wild Card) for the brave.
- New routines: Wick's Rabbit Hole Report (Friday, ~9:30), Selene's Whispered Affirmations, Flicker's Delight Drop, Timekeeper's daily agenda and plan-ahead, Boulder's daily movement, Midas's monthly Finance Check-In, Farseer's New Year and birthday sessions.
- New Council Routines page art: an upward spiral loop drawn as an occult diagram.
- Chapter 2 tail restructured: Social (Gossip, GPTavern) and UI (/pet, Council Dashboard) sections.
- Postmaster: on-brand portrait (arcane clockwork shredder automaton), new intro riddle, difficulty down to Easy.
- Em dashes removed from the routines copy.

## v1.0.1 (2026-08-27)

- Seeker (Researcher) and Postmaster (Email Triage) join the Ops Guild. 18 members become 20.
- Council Routines section (2f) with the recommended starting calendar: Sunday Dream Sequence, Monday stand-up, Wednesday sweep, Friday ship's log.
- Tithe Bell extended to four rings: one week, 30 days, 6 months, one year. Optional recurring yearly ring for good cult members.
- Nightly repo sync folded into Roger Roger's routines.
- Two-page illustrated Table of Contents updated for the new members.
- Sponsorship system: Town Notice Board with tiered poster slots, Tribute Leaderboard, Build-a-Wizard Workshop.
- Plugin marketplaces for Claude Code and Codex.

## v1.0 (2026-08-24)

Welcome to Grimoire's Tome. Initial Release.

Intro & 5 Chapters:
- Chapter 0: Grimterface. Install, help, and update skills for the Tome itself.
- Chapter 1: Core Dev-loop Skills, Flows, & Agent utils. Everyday spells (lock-in, polish), dev skills (layout previews, tiramisu task decomposition, git commit decanter, mentor review), agent ops (chat log search, model quirks, minions), and expansion packs.
- Chapter 2: The Grim Council. 18 members across 5 guilds (Coding, Merchants, Ops, Cortex, Spren), plus council management skills, GPTavern, and /pet support.
- Chapter 3: AutoDocs. Self-updating docs & memory system, with dream sequence consolidation and a starter docs tree.
- Chapter 4: Workbench Artifacts. Plain artifacts standard plus live two-way synced workbench apps.

Also included:
- Onboarding system: members scaffold their own docs slices on first summon
- Starter docs & memory trees with lightly structured empty stubs
- Example expansion pack: Matt Pocock's grill-me, with a mutation (grim:ep:mx:grill-me)
- Chapter:verse citation system (cite skills like scripture, e.g. Model Quirks (1c.4))

## Prior versions

Before the Tome, Grimoire lived in the OpenAI GPT store, where he grew to be the #1 coding GPT with over 3 million chats: [Grimoire on the GPT store](https://chatgpt.com/g/g-n7Rs0IK86-grimoire)

But now, the wizard has escaped!


---

## info

Versioning: `1.x.0` for a real chunk of work (a rework, a new system, a new chapter). `1.x.y` for the smaller commits in between.