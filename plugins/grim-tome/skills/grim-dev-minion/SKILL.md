---
name: grim-dev-minion
description: "Minion: manual-only routing note for using built-in subagents first, or direct Codex, Claude, Cursor, Grok, LM Studio, Ollama, and OpenRouter runners when explicitly requested."
disable-model-invocation: true
---

# Minion

## Choose A Route

Prefer the current host's built-in subagents. Use an outside CLI, local model, or OpenRouter when the user requests that route or the task needs an independent provider.

Before an outside run, state the runner, model, task, permitted files and edits, and whether this starts or resumes a conversation. Follow existing task authorization and host permissions; choosing a runner does not change them.

## Model Choice

Preserve an explicitly requested model and resolve its exact ID from the current host. Otherwise inherit the current host's model and reasoning defaults when appropriate.

Read [model choices](references/model-choices.md) when selecting or comparing routes.

## Coordinate The Work

- Delegate a concrete task with enough context and a clear result.
- Reuse the same agent or conversation for follow-up work when its context is useful.
- Keep file ownership clear. Serialize access to shared simulators, build directories, and UI sessions.
- Report useful results as they arrive and identify remaining work.
- Use the host's completion events or bounded waits. Check status when there is a reason to suspect a stall; silence alone does not prove failure.
- Integrate the results and verify the affected behavior before reporting completion.

## Route Details

Read only the route being used:
- [Direct CLI routes](references/cli-routes.md): Codex, Claude, Cursor, and Grok; fresh and resumed runs.
- [Local routes](references/local-routes.md): LM Studio and Ollama setup, endpoints, and saved conversations.
- [OpenRouter](references/openrouter.md): text, structured results, image/video jobs, and polling.

Resolve helper paths from this skill's installed folder. Keep the runner pointed at the intended project; do not assume the current directory is the toolkit checkout.
