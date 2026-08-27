---
name: grim:mem:chat-log-search
description: "(grim:mem:chat-log-search): (Chat Log Search): Search and summarize past Codex Desktop, Claude Code, and Cursor chat logs with layered detail (prompts, messages, final replies, tools, full). Use when asked to find prior conversations, prompts, decisions, tool calls, or to locate a session by keyword/date/session id."
---
# Chat Log Search

Search local Codex, Claude Code, and Cursor chat logs with layered source and detail controls.

## Scripts

| Script | Scope |
|---|---|
| `scripts/chat_log_search.py` | All providers |
| `scripts/codex_log_search.py` | Codex only |
| `scripts/claude_log_search.py` | Claude Code only |
| `scripts/cursor_log_search.py` | Cursor only |

## Source Layers (`--source`)

- `history` — fast prompt index (`~/.codex/history.jsonl`, `~/.claude/history.jsonl`)
- `sessions` — full session / transcript logs
- `both` — history index plus session logs

Cursor has no history index; use `--source sessions` for Cursor.

## Detail Layers (`--detail`)

- `prompts` — user prompts only
- `messages` — user + assistant text, no tools or thinking
- `final` — user prompts + final assistant reply per turn (no intermediate tool-step chatter)
- `tools` — tool inputs and outputs only
- `full` — all extractable events (text, tools, reasoning, raw session events)

## Quick Start

Fast user prompt search (all providers with history indexes):
```bash
python3 skills/mem/chat-log-search/scripts/chat_log_search.py "linear ticket" --source history --detail prompts --limit 20
```

Codex clean transcript (user + final assistant replies):
```bash
python3 skills/mem/chat-log-search/scripts/codex_log_search.py "memory system" --source sessions --detail final --limit 50
```

Claude tool audit:
```bash
python3 skills/mem/chat-log-search/scripts/claude_log_search.py "posthog" --source sessions --detail tools --limit 50
```

Cursor full session dump search:
```bash
python3 skills/mem/chat-log-search/scripts/cursor_log_search.py "paywall" --source sessions --detail full --limit 50
```

Everything across history + sessions:
```bash
python3 skills/mem/chat-log-search/scripts/chat_log_search.py "sentry" --source both --detail full --limit 50
```

JSON output:
```bash
python3 skills/mem/chat-log-search/scripts/claude_log_search.py "council" --source both --detail messages --json
```

## Workflow

1. Start with `--source history --detail prompts` to find candidate sessions quickly.
2. Re-run the matching session with `--source sessions --detail final` for a readable transcript.
3. Use `--detail tools` when debugging agent behavior or MCP/tool usage.
4. Use `--detail full` when you need reasoning, raw events, or complete context.
5. Narrow noisy results with `--after`, `--before`, or `--session-id`.
6. Add `--exclude-approval-review` when mining user conversations or recurring patterns so Guardian assessment sessions do not duplicate injected transcripts.

## Output

- Human-readable default:
  `timestamp | provider | source | detail | kind | role | session_id | snippet`
- JSON records include: `provider`, `source`, `detail`, `kind`, `role`, `session_id`, `timestamp`, `text`, `file`, `meta`

## Recency & limits

- Default: `--limit 50 --order recent` → **50 newest matching records**
- All matches: `--all` or `--limit 0`
- Scan depth: `--recent-window N` → only search last N raw lines/records per file/session
- Turn-based limit: `--detail final --limit-units turns --limit N`

Full option reference: `references/search_api.md`

## Notes

- Read-only. Do not modify files under `~/.codex`, `~/.claude`, or `~/.cursor`.
- Codex archived sessions are included by default; pass `--no-archived` on Codex/all scripts.
- Codex/all-provider scripts support `--exclude-approval-review`. It skips Guardian approval-review session logs from session metadata while preserving normal tasks, normal subagents, and history-index prompts.
- Cursor prefers `agent-transcripts`; pass `--include-store-db` on Cursor/all scripts only if needed.
- Log locations and formats: `references/log_locations.md`
- Detail layer reference: `references/search_layers.md`
