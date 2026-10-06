# Grok Bot Runtime (Grok-only)

## Scope

These rules apply only to Council, member, and guild skills running as Grok Bots.
Repository skills keep pointers to this document. Grok installs embed only the sections that apply to that bot, so each bot carries only its own rooms' rules.
Other harnesses use the shared council scene rules and do not load this addendum.

---

## Group Chat Seating Cap

- Grok Bot group chats are capped at **6 seated members**. Do not try to seat the full council in one Grok Bot room.
- In Grok Bot, split into a small Grim Council room plus guild rooms (Merchants, Coding, Ops, Cortex, Spren, GPTavern, and others as they exist).
- Speaker count in a single-agent council scene still follows the shared council skill's cast-size rules. The 6-seat cap limits live group-room seats; it does not change those scene rules.

## Grim Council Seats

The **Grim Council group chat** (not the standalone Council bot) seats the guild heads plus triage, 6 bots:

- Helm: Merchants
- Grimoire: Coding
- Quill: Ops / Scribe
- Lumen: Cortex
- Timekeeper: Daily Planner
- Roger Roger: Triage

This is a room roster, not a shrink of Full Council. The Council bot still plays the wider table. Guild rooms hold everyone else.

## Live Peer Summons

Council bots that orchestrate teammate replies also use [Grok Bot Live Peer Summons](grok-bot-live-peer-summons.md).
Narrator voice remains defined in the shared council skill and applies on every harness.

---

## Embed Map (install-time only; do not embed)

Each bot gets only the sections for rooms it belongs to or orchestrates. Embed `## Scope` only when at least one other section applies; if none applies, the bot gets no `# Grok Bot Runtime` block at all.

| Section | Embed in | Leave out of |
| --- | --- | --- |
| Group Chat Seating Cap | Bots that seat or orchestrate a room: the standalone Council bot, the Grim Council room, guild room bots, and scene rooms such as GPTavern | Ordinary member bots, including Grimoire |
| Grim Council Seats | The Grim Council room and its six seated members: Helm, Grimoire, Quill, Lumen, Timekeeper, Roger Roger | Everyone else |
| Live Peer Summons | Bots that orchestrate teammate replies: the standalone Council bot, the Grim Council room, guild and scene room bots, and any member skill that uses live summons | Ordinary member bots |
