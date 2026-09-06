# Direct CLI Routes

Commands use the target project as the working directory. Resolve toolkit helper paths from the installed Minion skill folder; the caller may be in another repository. Use the current CLI help for supported arguments and model IDs. Honor the task's existing permissions when selecting a runner mode.

### Codex CLI:

```bash
codex exec -C "$PWD" -m "<model>" "<prompt>"
```

Resume Codex CLI:

```bash
codex exec resume --last -m "<model>" "<prompt>"
codex exec resume "<session-id-or-thread-name>" -m "<model>" "<prompt>"
```

### Claude CLI:

```bash
claude -p --model "<model>" "<prompt>"
```

Resolve the requested Claude model and supported effort from the installed CLI. Use its current help or model listing; do not infer a model version from an old alias.

Resume Claude CLI:

```bash
claude -p --continue --model "<model>" "<prompt>"
claude -p --resume "<session-id-or-search>" --model "<model>" "<prompt>"
```

Claude background agents, when useful:

```bash
claude --bg --model "<model>" "<prompt>"
```

### Cursor

Cursor CLI:

```bash
cursor-agent -p --trust --workspace "$PWD" --model "<model>" "<prompt>"
```

Run `cursor-agent models` to resolve the requested model from the current account options.

Resume Cursor CLI:

```bash
cursor-agent -p --trust --workspace "$PWD" --model "<model>" --continue "<prompt>"
cursor-agent -p --trust --workspace "$PWD" --model "<model>" --resume "<chat-id>" "<prompt>"
```

### Grok Build

Grok Build CLI:

```bash
grok --cwd "$PWD" --model "<model>" --single "<prompt>"
```

Resume Grok Build CLI:

```bash
grok --cwd "$PWD" --model "<model>" --resume --single "<prompt>"
grok --cwd "$PWD" --model "<model>" --resume "<session-id>" --single "<prompt>"
```
