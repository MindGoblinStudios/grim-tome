# Council Onboarding

How council members help a new user furnish their mind palace, room by room.

### The Goal: Value First, Depth Later

Get the user in quickly, understanding the system, and getting real value out of it as soon as possible — not doing a comprehensive fill-everything-out deep dive up front. That depth of context would be great eventually, and it accumulates naturally through use, but onboarding optimizes for time-to-first-value.

In practice: lead with the user's goals and needs, capture just enough to make the system immediately useful for those, and stop. A few real entries beat a complete but exhausting intake. Customize around what they actually want from the system, and let the rest of the tree fill in later as it becomes relevant.

### The Docs Tree

The Tome ships its `docs/` and `memory/` trees as empty, lightly structured docs — a project structure index, memory file, and stubs for scheduling, meals, food inventory, workouts, business, and finance. Each file is just headings and example comments: something to fill in, not something to read.

One exception ships pre-filled: `docs/personal/scheduling/packing-routine.md`, a worked example of a finished doc. Note that "routine" cuts two ways — the cadence (skincare every night) and the steps themselves (the five products, in order); some are event-triggered rather than scheduled. When interviewing, capture both kinds.

Each council member owns a slice of the tree, declared in their `SKILL.md` under `## Onboarding`:

| Member | Slice |
| --- | --- |
| Quill | `docs/project-structure.md`, `docs/computerUseAppInstructions/`, `docs/browserUseInstructions/`, `memory/` |
| Ledger | `docs/ops/standard-operating-procedures.md` |
| Timekeeper & Precog | `docs/personal/scheduling/` |
| Cauldron | `docs/personal/health/` (meals), `docs/personal/food-inventory/`, `docs/personal/recipes/` |
| Boulder | `docs/personal/workout/` |
| Helm | `docs/biz/business-info.md`, `docs/biz/business-goal-setting.md` |
| Midas | `docs/finance/personal-finance-plan.md` |
| Grimoire | the whole tree, on install |

### The Flow

1. **Check** — on first summon, the member looks for their slice in the user's workspace.
2. **Offer** — if it's missing, offer to copy it over from the Tome's docs tree. Offer, never push.
3. **Interview** — copy the files, then fill the first entries together by asking the user questions in character. Start from their goals and needs, keep it short, and aim for a few real entries the user can see and customize — not blank files, and not an exhaustive intake.
4. **Register** — add one line per new doc to the user's `docs/project-structure.md` index.

### Completion & Self-Removal

Onboarding instructions are disposable scaffolding, just like the empty stubs:

- When a member's slice exists and has real content, onboarding is complete for that member.
- On completion, **delete the `## Onboarding` section from the installed copy** of the member's `SKILL.md`. The instructions remove themselves once used; the repo keeps the master copy.
- Also record `onboarded: <member>` in the user's `memory/MEMORY.md` — the fallback marker if a skill gets reinstalled with its onboarding section intact.
- A member whose slice already exists at first summon skips straight to completion: mark it, remove the section, say nothing.
