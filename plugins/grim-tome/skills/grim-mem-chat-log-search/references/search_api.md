# Chat Log Search API

All scripts share the same CLI flags via `chat_log_lib.py`.

## Scripts

| Script | Provider |
|---|---|
| `chat_log_search.py` | Codex + Claude + Cursor |
| `codex_log_search.py` | Codex only |
| `claude_log_search.py` | Claude Code only |
| `cursor_log_search.py` | Cursor only |

## Positional

| Argument | Required | Description |
|---|---|---|
| `query` | yes*, | Search string or regex (`--regex`). *Optional when `--match-all` is set. |

---

## Source layer (`--source`)

Controls **where** logs are read from.

| Value | Meaning |
|---|---|
| `history` | Fast prompt index only (`~/.codex/history.jsonl`, `~/.claude/history.jsonl`) |
| `sessions` | Full session / transcript logs |
| `both` | History index + session logs |

Cursor has no history index; `history` returns nothing for Cursor-only scripts.

See also: `search_layers.md`

---

## Detail layer (`--detail`)

Controls **what kind of content** is extracted from each source.

| Value | Includes | Excludes |
|---|---|---|
| `prompts` | user prompts | assistant, tools, thinking |
| `messages` | user + assistant visible text | tools, thinking, raw events |
| `final` | user + last assistant reply per turn | intermediate tool-step chatter, thinking |
| `tools` | tool inputs + outputs | normal prose |
| `full` | text, tools, reasoning, raw events | — |

Default: `prompts`

---

## Result count & recency

These flags control **how many results** come back and **how recent** they are.

| Flag | Default | Description |
|---|---|---|
| `--limit N` | `50` | Return at most **N results after sorting**. With default `--order recent`, this means the **N newest matching records**. |
| `--all` | off | Return **all** matches (same as `--limit 0`). |
| `--order recent` | **yes** | Newest matches first (recommended default). |
| `--order oldest` | — | Oldest matches first. |
| `--limit-units records` | **yes** | `--limit` counts individual records. |
| `--limit-units turns` | — | For `--detail final`, `--limit` counts **turns** (user + final assistant pairs). |
| `--recent-window N` | off | Only search within the **last N raw records/lines** per history file or session before matching. Useful for “look back 200 messages, then search”. |

### Typical recency patterns

```bash
# Default: 50 newest matches
python3 skills/mem/chat-log-search/scripts/claude_log_search.py "council" --source history

# Last 10 matching messages only
python3 skills/mem/chat-log-search/scripts/claude_log_search.py "council" --source both --detail messages --limit 10

# All matches, newest first
python3 skills/mem/chat-log-search/scripts/codex_log_search.py "memory" --source sessions --detail final --all

# Search only within the last 100 raw session records per file
python3 skills/mem/chat-log-search/scripts/cursor_log_search.py "paywall" --source sessions --recent-window 100

# Last 5 clean turns (user + final assistant)
python3 skills/mem/chat-log-search/scripts/claude_log_search.py "posthog" --source sessions --detail final --limit 5 --limit-units turns
```

### Dump recent messages without a keyword

```bash
python3 skills/mem/chat-log-search/scripts/cursor_log_search.py --match-all --source sessions --detail messages --limit 20
```

---

## Filtering

| Flag | Description |
|---|---|
| `--after YYYY-MM-DD` | Include records on/after date (UTC). |
| `--before YYYY-MM-DD` | Include records on/before date (UTC, inclusive). |
| `--session-id SUBSTR` | Only sessions whose id contains substring. |
| `--match-all` | Skip query filtering; return all records allowed by `--source` / `--detail`. |
| `--exclude-approval-review` | Codex/all-provider only: skip Guardian approval-review session logs identified from session metadata. Normal tasks, normal subagents, and history-index prompts remain searchable. |

---

## Search behavior

| Flag | Description |
|---|---|
| `--regex` | Treat `query` as a regular expression. |
| `--case-sensitive` | Case-sensitive match (default: insensitive). |

---

## Output

| Flag | Default | Description |
|---|---|---|
| `--json` | off | Structured JSON array of records. |
| `--snippet N` | `200` | Max characters per line in human output. |

Human output columns:

`timestamp | provider | source | detail | kind | role | session_id | snippet`

JSON record fields:

- `provider`, `source`, `detail`, `kind`, `role`
- `session_id`, `timestamp`, `text`, `file`, `meta`

---

## Provider-specific flags

### Codex (`codex_log_search.py`, all-provider script)

| Flag | Description |
|---|---|
| `--no-archived` | Skip `~/.codex/archived_sessions/`. |
| `--exclude-approval-review` | Skip Guardian approval-review session logs. |
| `--codex-home PATH` | Override Codex home (default `~/.codex` or `$CODEX_HOME`). |

### Claude (`claude_log_search.py`)

| Flag | Description |
|---|---|
| `--claude-home PATH` | Override Claude home (default `~/.claude` or `$CLAUDE_HOME`). |

### Cursor (`cursor_log_search.py`)

| Flag | Description |
|---|---|
| `--include-store-db` | Also scan `~/.cursor/chats/**/store.db` (slower). |
| `--cursor-home PATH` | Override Cursor home (default `~/.cursor` or `$CURSOR_HOME`). |

### All providers (`chat_log_search.py`)

Supports Codex + Claude + Cursor flags together (`--no-archived`, `--exclude-approval-review`, `--include-cursor-store-db`, etc.).

---

## Quick reference matrix

| Goal | Example flags |
|---|---|
| Fast recent prompt hits | `--source history --detail prompts` |
| Recent readable transcript | `--source sessions --detail messages --limit 20` |
| Recent clean decisions | `--source sessions --detail final --limit 10 --limit-units turns` |
| User conversations without approval-review noise | `--source sessions --detail final --exclude-approval-review` |
| Tool/MCP audit | `--source sessions --detail tools --all` |
| Full dump | `--source both --detail full --all` |
| Narrow scan depth | `--recent-window 200` |
| Single session | `--session-id 019c3042 --source sessions --detail full` |

---

## Related docs

- Log paths & formats: `log_locations.md`
- Source/detail layer guide: `search_layers.md`
