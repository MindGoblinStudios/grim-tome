# Local Model Routes

Commands use the target project as the working directory. Resolve toolkit helper paths from the installed Minion skill folder; the caller may be in another repository. Use the current CLI help for supported arguments and model IDs. Honor the task's existing permissions when selecting a runner mode.

## LM Studio Local Route

Use LM Studio when the user explicitly wants a local model,
an offline/private outside opinion,
or a quick local comparison against hosted routes.

Start LM Studio first:

- open LM Studio
- download or load a chat model
- start the local server
- keep the default native REST API URL unless you intentionally changed it

List chat models visible through the native local server:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --list-models
```

Run a local Minion prompt:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --model "<lm-studio-model-id>" "<prompt>"
```

If exactly one model is loaded in LM Studio,
the helper can usually infer it:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py "<prompt>"
```

Use the OpenAI-compatible endpoint instead when you specifically need that compatibility path:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --api-mode openai --model "<lm-studio-model-id>" "<prompt>"
```

Resume LM Studio helper:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --conversation "<name>" --model "<lm-studio-model-id>" "<prompt>"
python3 skills/dev/minion/scripts/lmstudio_minion.py --conversation "<name>" "<next prompt>"
```

List saved LM Studio conversations:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --list-conversations
```

Reset a saved LM Studio conversation:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --conversation "<name>" --reset-conversation --model "<lm-studio-model-id>" "<prompt>"
```

LM Studio conversations are saved under:

```bash
.agents/minion/lmstudio/<name>.json
```

### LM Studio Notes

The helper uses LM Studio's native v1 REST API by default.
Native mode calls:

- `GET /api/v1/models`
- `POST /api/v1/chat`

Native saved conversations store LM Studio's `response_id`
and resume with `previous_response_id`.

Default local base URL:

```bash
http://127.0.0.1:1234/api/v1
```

OpenAI-compatible fallback base URL:

```bash
http://127.0.0.1:1234/v1
```

Optional defaults:

```bash
LMSTUDIO_API_MODE=native|openai
LMSTUDIO_BASE_URL
LMSTUDIO_MODEL
LMSTUDIO_API_KEY
LM_API_TOKEN
```

Native-only useful flags:

```bash
--context-length 8000
--no-store
```

## Ollama Local Route

Use Ollama when the user explicitly wants a local model through Ollama,
or Ollama is the local runtime already installed on the machine.

Check that Ollama is available and see what models are pulled:

```bash
ollama list
```

Run a one-shot local Minion prompt directly through the CLI:

```bash
ollama run "<ollama-model>" "<prompt>"
```

Pull a model first if it is not installed yet:

```bash
ollama pull "<ollama-model>"
```

### Ollama Via The Local Helper

Ollama serves an OpenAI-compatible endpoint,
so the LM Studio helper works against it with a base URL override.
This gives you saved conversations and resume support:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --api-mode openai --base-url http://127.0.0.1:11434/v1 --model "<ollama-model>" "<prompt>"
```

Resume an Ollama conversation:

```bash
python3 skills/dev/minion/scripts/lmstudio_minion.py --api-mode openai --base-url http://127.0.0.1:11434/v1 --conversation "<name>" --model "<ollama-model>" "<prompt>"
python3 skills/dev/minion/scripts/lmstudio_minion.py --api-mode openai --conversation "<name>" "<next prompt>"
```

### Ollama Notes

- Default local endpoint: `http://127.0.0.1:11434`
- OpenAI-compatible base URL: `http://127.0.0.1:11434/v1`
- The Ollama server usually starts automatically with the desktop app; otherwise run `ollama serve`.
- Do not hard-code model recommendations here. Use `ollama list` on the active machine and route by task.
- The same caution as LM Studio applies: for high-risk review or final decisions, compare against a stronger hosted route.
