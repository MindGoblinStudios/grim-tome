---
name: grim:mem:dream-sequence
description: "Dream Memory Sequence: Run a periodic memory-consolidation review. Synthesize recent work and chat history, propose durable memory candidates, flag stale or duplicate memory for cleanup, and surface missing-context questions. Never edits memory without user confirmation."
---

# Dream Memory Sequence

## Purpose

Consolidate and improve the memory system, the way sleep consolidates a day's experiences. Run this weekly, or after an intense stretch of work.

Memory flows in one direction: `memory/MEMORY.md` is the fast-capture surface where corrections and preferences land mid-session, and the dream sequence is the consolidation pass. Durable items that have proven themselves get promoted out of memory into the right `docs/` file (or `AGENTS.md`, per `grim:dev:autodocs`), then pruned from memory. Memory stays small; docs accumulate the distilled knowledge.

## Inputs

Review before summarizing:

- `memory/MEMORY.md` (and the project's memory system docs, if any)
- `docs/README.md` and any recently changed docs
- Recent chat or session history from the last 7 to 14 days, when the harness makes it available

## Consolidation Pass

- Revisit the previous consolidation candidates using existing run notes. Check which were applied, superseded, declined, or still need a decision before proposing them again.
- Distill what changed in understanding: a durable lesson, a corrected belief, the intent behind a decision, or missing context that matters next time.
- Check candidates against their canonical home for contradictions and duplication. Preserve sources and uncertainty where they matter, and make the useful context easy to retrieve.
- Reuse relevant evidence and refresh changed or consequential facts. Keep broader cleanup and system experiments with their existing owner unless they affect memory's accuracy or usefulness.
- Keep declined ideas retired unless the user reopens them. Do not invent candidates to fill a report; stay quiet when there is no meaningful update or action.

## Report

Return a report with:

- A synthesis of what changed since the previous pass, highlighting the most important things to remember
- Durable memory candidates, to be added to memory
- Promotion candidates: memory entries that have matured into doc material, with the target `docs/` file for each (prune from memory once promoted)
- Stale, duplicate, or low-signal memory cleanup suggestions
- The top 3 missing-context questions that would help the system better understand the user's life, goals, and projects
- Suggested next steps

## Rules

- Do not silently edit any docs, skills, memory files, commits, or external systems until the user confirms.
- Distill, don't transcribe: one bullet per durable fact. Preserve intent and distinguish observations from decisions.
- Prefer correcting an existing memory entry over adding a near-duplicate.
