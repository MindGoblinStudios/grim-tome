# Lock-In Skill

### Purpose
Use `grim:lock-in` to quickly reorient the user after time away, a cold start, or too many active project threads. The output should help the user remember what is going on and immediately restart movement.

### Existing Chat Mode
When invoked inside an ongoing chat, prioritize the current conversation:

- summarize what this chat has been doing,
- identify the current plan and decisions,
- name unresolved questions or blocked items,
- include relevant repo, docs, git, or verification state only when it affects the next move.

### New Chat Mode
When invoked in a new chat, reconstruct project context from nearby surfaces:

- identify the current repo or project,
- inspect local plans, todos, docs, and active git state,
- use recent related unarchived chats when available,
- use archived chats only as background,
- say clearly when chat search is unavailable and continue from repo state, docs, memory, and the current conversation.

### Output Contract
Return a concise focus brief with these sections:

- `Where We Left Off`
- `Current State`
- `Open Loops`
- `Threads To Archive`
- `Next Three Tiny Steps`
- `First 10-Minute Lock-In Step`

### Step Size
The `Next Three Tiny Steps` should be very small, concrete, and startable while cold. Prefer opening one file, running one command, reading one plan section, testing one case, or writing one sentence over broad project moves.

### Guardrails
Do not archive, move, close, or delete chat logs without explicit user approval. If the user sounds overloaded, shorten the brief and bias toward the first physical or coding action.
