# Chat Log Locations

## Codex Desktop (`~/.codex`)

- `~/.codex/history.jsonl`
  - Fast index of user prompt text with `session_id` and epoch `ts` (seconds).

- `~/.codex/sessions/YYYY/MM/DD/*.jsonl`
  - Full session event logs, including user and assistant messages.
  - Each file begins with a `session_meta` entry that includes the session id.

- `~/.codex/archived_sessions/*.jsonl`
  - Older session logs that were archived from the main sessions tree.

### Codex session format

- Session logs are JSONL with mixed event types. Use only entries where:
  - `type == "response_item"`
  - `payload.type == "message"`
  - `payload.role` is `user`, `assistant`, or `developer`
- Text content is stored in `payload.content[*].text`.

---

## Claude Code (`~/.claude`)

- `~/.claude/history.jsonl`
  - Fast index of user prompt text with `sessionId`, `project`, and epoch `timestamp` (milliseconds).

- `~/.claude/projects/<encoded-project-path>/*.jsonl`
  - Full session logs for each project.
  - Session id is the JSONL filename stem.

### Claude session format

- Use entries where `type` is `user` or `assistant`.
- Message text lives in `message.content`:
  - string for simple user prompts
  - list of blocks for assistant/tool content (`text`, `tool_use`, `tool_result`, etc.)
- Timestamps are ISO strings on each entry.

---

## Cursor (`~/.cursor`)

- `~/.cursor/projects/<encoded-project>/agent-transcripts/<session-id>/<session-id>.jsonl`
  - Primary Cursor Agent chat logs.
  - Each line is a message with `role` and `message.content`.

- `~/.cursor/chats/<workspace-hash>/<session-id>/store.db` (optional)
  - SQLite blob store used by Cursor chat UI.
  - Searchable with `--include-cursor-store-db` when transcripts are missing.

### Cursor transcript format

- Roles: `user`, `assistant`, `tool`, `system`
- Text lives in `message.content[*].text` or tool-result blocks
- Transcript files usually do not carry per-message timestamps; the script uses nearby `meta.json` or file mtime for date filtering

---

## Notes

- This skill is read-only. Do not modify any files under `~/.codex`, `~/.claude`, or `~/.cursor`.
- Codex archived sessions are included by default; pass `--no-archived` to skip them.
- Cursor has no separate history index; use `--source sessions` for Cursor-only searches.
- Search layer reference: `references/search_layers.md`
- Full CLI/API reference: `references/search_api.md`
