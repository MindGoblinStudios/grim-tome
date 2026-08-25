---
name: grim:ep:mx:grill-me
description: "Grill the user relentlessly about a plan, decision, or idea, in packs of at most 10 questions per round; skipped questions accept the recommended answer. Mutation of Matt Pocock's grilling. Use when the user wants a rapid-fire batch grilling, or mentions \"grill me 10\" or \"10 pack\"."
mutation: true
source_url: https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md
original_skill: original/UPSTREAM.md
---
Original skill: [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) — nested copy at [`original/UPSTREAM.md`](original/UPSTREAM.md), with the promoted pack copy at [`../../og/grill-me/SKILL.md`](../../og/grill-me/SKILL.md).

Mutation: rounds are capped at 10 questions, and skipped questions accept the recommended answer.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask a pack of **at most 10** frontier questions per round — if the frontier is larger, pick the 10 highest-leverage questions and hold the rest for the next round. Number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

The user answers inline by number, in any order, as many as they want. Any question they skip, treat your recommended answer as accepted and say so in the next round's recap.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next pack. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the pack now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
