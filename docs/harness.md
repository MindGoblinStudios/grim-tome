# How the Tome Runs on Different Harnesses

Grimoire's Tome is a folder of `SKILL.md` files. Every AI harness reads them a little differently. This doc explains the two shapes the Tome takes and the design rules that let one set of skills serve both.

Install steps for each harness live in [installGuide.md](../installGuide.md).

## Two Kinds of Harness

**Skills harnesses**: Codex / ChatGPT desktop, Claude Code, Cursor, Pi, and any agent that reads skill files natively.

- The Tome ships as-is. `skills/` is the product; the harness loads a `SKILL.md` when its slug is invoked or when the model decides it fits.
- Council members are just skills with a persona. Summon one and the harness reads the member's file; convene the council and it reads the council skill, which hydrates every member.
- Routines run through whatever scheduler the harness provides (Codex automations, Cursor automations, cron). The council skill only defines the calendar.
- Plugin marketplaces (Claude Code, Codex) are a packaging layer over the same files. `scripts/build-marketplace.py` regenerates `plugins/` from `skills/registry.yaml`.

**Prompt-monolith harnesses**: Grok Bots and similar. One big system prompt per bot, no skill files.

- Each council member becomes one bot. The member's `SKILL.md` body is pasted in as the bot's instruction text; the file and the bot are the same document and are updated together.
- Name is the council name only (Helm), title is the role (Biz Manager). Avatar is the member's `thumbnail.png`, falling back to `portrait.png`.
- Group chats cap at six bots, so the full council cannot sit in one room. The recommended Grim Council room is the guild heads plus triage: Grimoire, Helm, Quill, Lumen, Roger Roger, Timekeeper. Guild rooms hold everyone else. Icon: `skills/council/council/assets/council-six-icon-large.png`.
- Non-member skills either install as normal skills where the harness allows it, or fold into the most relevant bot's instructions.
- The official Grimoire Grok Bot is a 1-click install; the rest of the council is seated by hand following the install guide.

## Three Layers

Every council member, and Grimoire himself, separates into three layers. Keep them apart and the same file works in both harness shapes.

1. **Persona card**: personality, voice, appearance, goals, lore hooks. Lives in the member's `SKILL.md`. Small and stable.
2. **Procedures**: workflows, protocols, routines. Shared ones are top-level skills (`grim:dev:autodocs`, `grim:mem:dream-sequence`) that members reference; member-specific ones live in the member's Protocols section. A procedure is installable on its own; the member is its designated wielder when the council is present.
3. **Docs tree**: the empty, lightly structured `docs/` and `memory/` stubs a member fills for the user during onboarding. Ships directly as the Tome's `docs/` and `memory/` folders.

The persona carries the who, procedures carry the how, the docs tree carries the what.

## Lean Prompt Principle

Grimoire's own prompt is a coding prompt first. Roughly 90% of it is craft: dev loop, debugging, architecture, shipping discipline. The last 10% is a short gateway stanza that points at the Tome: `/help` to explore skills, `/update` to check `patchNotes.md`, `/council` for non-coding counsel, `skills/registry.yaml` as the full index. Machinery lives in skills, not in the prompt, so pointers stay cheap and the prompt stays sharp.

The same rule applies to every member: the persona card stays thin, and heavy procedures are referenced rather than inlined, unless a harness (a single Grok Bot) has nowhere else to put them.

## Onboarding As A Scene

Each member's skill ends with an Onboarding section. On first summon, the member offers to scaffold its slice of the docs tree and walk the user through filling it in: Cauldron seeds the meal plan and pantry, Boulder the workout routine, Timekeeper and Precog the scheduling docs, Quill the project structure and memory. When onboarding is complete, the section removes itself from the installed copy. Full flow: [onboarding.md](onboarding.md).

The council furnishes the user's mind palace one room at a time.
