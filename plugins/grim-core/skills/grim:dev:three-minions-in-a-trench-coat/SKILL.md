---
name: grim:dev:three-minions-in-a-trench-coat
description: "Three Minions in a Trench Coat: manual-only multi-model coding council that runs three top Minion routes in parallel, compares their answers, and synthesizes the best final answer."
disable-model-invocation: true
---

# Three Minions in a Trench Coat

Three minions in a trench coat is a multi-model coding council
Imagine sneaking into a theater stacked in a trench coat, combined with sitting in front of a whiteboard brainstorming solutions & talking, or a smaller inner circle of friends late at night around the campfire.

Three minions is designed to runs multiple subagents together

Model Choice:
- Prefer diversity across providers over three near-duplicates from one provider

## Trench Coat Wrapper

If current harness has a subagent tool, first create 1 subagent trench coat wrapper with a medium tier model, in watcher and orchestrator mode, this subagent will then spawn the 3 subagents and manage them and report results back. The goal is to avoid bothering the root agent with smaller details and problems and wasting tokens on details that can be resolved.

As things finish, be sure to pass it back to the parent agent with full handoffs of all crucial information, so the parent agent can review & incorporate all progress and decisions made.

## Relationship To Minion

Use `grim:dev:minion` for subagent protocol, always read this to ensure proper usage of three minions.
