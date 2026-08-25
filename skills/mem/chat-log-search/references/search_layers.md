# Search Layers

## Source (`--source`)

| Value | Codex | Claude | Cursor |
|---|---|---|---|
| `history` | `~/.codex/history.jsonl` | `~/.claude/history.jsonl` | not available |
| `sessions` | `~/.codex/sessions/**`, archived | `~/.claude/projects/**/*.jsonl` | `~/.cursor/projects/**/agent-transcripts/**/*.jsonl` |
| `both` | history + sessions | history + sessions | sessions only |

## Detail (`--detail`)

| Value | Includes | Excludes |
|---|---|---|
| `prompts` | user prompts / history index | assistant, tools, thinking |
| `messages` | user + assistant visible text | tools, thinking, raw events |
| `final` | user prompt + last assistant text before next user turn | intermediate assistant/tool steps, thinking |
| `tools` | tool inputs + outputs | normal user/assistant prose |
| `full` | text, tools, reasoning, raw Claude events, system messages | redacted reasoning payload bodies when not decoded |

## Recommended Combos

| Goal | Flags |
|---|---|
| Fast prompt lookup | `--source history --detail prompts` |
| Prompt lookup including session-only user lines | `--source both --detail prompts` |
| Readable back-and-forth | `--source sessions --detail messages` |
| Clean decision transcript | `--source sessions --detail final` |
| Tool/MCP audit | `--source sessions --detail tools` |
| Maximum context | `--source both --detail full` |

## Provider Scripts

- `codex_log_search.py`
- `claude_log_search.py`
- `cursor_log_search.py`
- `chat_log_search.py` (all providers)

All scripts share `chat_log_lib.py`.

Full CLI reference: `references/search_api.md`
