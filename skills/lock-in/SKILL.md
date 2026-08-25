---
name: grim:lock-in
description: "Reorient after time away by recapping current or related project chats, plans, open loops, and the next three tiny restart steps."
disable-model-invocation: true
---
# Lock In

Use when the user wants to refocus after being AFK, returning the next day, resuming an interrupted project, or merging open chat context into one thread. The goal is to re-trigger the user's mental context quickly enough that they can start moving again without a large planning ceremony.

## Prompt

Re-download the task into the user's brain.

Start with the narrowest live context and widen only as needed:

- In an existing chat, summarize the current conversation, decisions, active plan, unresolved questions, and any code/docs state that matters.
- In a new chat, identify the current repo/project, inspect local plans/todos/docs and git state, then use recent related unarchived chats to reconstruct what is going on across threads.
- Use existing memory/search skills or the harness's chat history search when helpful. Prefer current unarchived context first; use archived chats only as background.
- If chat search is unavailable or cannot see the needed threads, say that clearly and continue from repo state, docs, memory, and the current conversation.

Return a concise focus brief with:

- `Where We Left Off`
- `Current State`
- `Open Loops`
- `Threads To Archive`
- `Next Three Tiny Steps`
- `First 10-Minute Lock-In Step`

For `Next Three Tiny Steps`, make each step immediate, concrete, and small enough to do while cold-starting. Prefer actions like opening one file, running one command, reading one plan section, or writing one sentence over broad project moves.

Do not archive or move chat logs without explicit user approval. If the user is overwhelmed, keep the brief shorter and bias toward the first physical or coding move.
