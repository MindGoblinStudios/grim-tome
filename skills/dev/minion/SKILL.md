---
name: grim:dev:minion
description: "Minion: manual-only routing note for using built-in subagents first, or direct Codex, Claude, Cursor, Grok, LM Studio, Ollama, and OpenRouter runners when explicitly requested."
disable-model-invocation: true
---

# Minion

## Routing Rule

Prefer the current host agent's built-in subagent system first.

## Long-Running and Parallel Minions

When this skill is explicitly triggered, ask the user whether they want:
- the host's built-in subagent tool
- a direct CLI Minion
- an LM Studio local Minion
- an Ollama local Minion
- or the OpenRouter helper

Use an external Minion route only when:

- the user asks for a specific CLI/model/harness/agent
- the current host has no useful built-in subagent tool
- a model/provider comparison is the point of the task
- we are trying to get multiple perspectives
- we are doing code review and want other opinions
- or the work needs an outside runner through OpenRouter
- or the work benefits from a local/offline LM Studio or Ollama model

Before launching any outside route, make the route explicit:
- runner
- model
- prompt
- optional: structured output
- whether it may edit files or must stay read-only
- whether this is a new conversation or a resumed one

When running multiple minions in parallel, do not wait for every model before responding.
As soon as one useful review/result comes back, report the current finding to the user and say which minions are still running.
Fold slower minion results into a follow-up when they finish.

Some high-reasoning models can run silently for a long time.
Silence usually means it is still working.
Do not interrupt or kill a minion just because it has not printed output yet.
If you need to check, poll or check the corresponding chat logs.
Poll gently and wait unless the user gives a deadline, asks to stop it, or the command returns a real error.

## Direct CLI Routes

### Codex CLI:

```bash
codex exec -C "$PWD" -s danger-full-access -m "<model>" "<prompt>"
```

Resume Codex CLI:

```bash
codex exec resume --last -m "<model>" "<prompt>"
codex exec resume "<session-id-or-thread-name>" -m "<model>" "<prompt>"
```

### Claude CLI:

```bash
claude -p --permission-mode bypassPermissions --model "<model>" "<prompt>"
```

Claude Opus xhigh route:

```bash
claude -p --permission-mode bypassPermissions --model opus --effort xhigh "<prompt>"
```

Claude model alias notes:

- Use `--model opus` for the current local Claude Code Opus route.
- Use `--effort xhigh` when the user asks for xhigh reasoning.
- `claude-opus-4.8` was rejected by the local Claude CLI on 2026-06-20.
  The CLI reported that Claude Opus 4 was retired and suggested using a newer model.
- Run `claude --help` if a requested alias fails;
  the help text currently lists aliases such as `opus`,
  `sonnet`,
  and `fable`,
  plus full model names such as `claude-fable-5`.

Resume Claude CLI:

```bash
claude -p --continue --permission-mode bypassPermissions --model "<model>" "<prompt>"
claude -p --resume "<session-id-or-search>" --permission-mode bypassPermissions --model "<model>" "<prompt>"
```

Claude background agents, when useful:

```bash
claude --bg --permission-mode bypassPermissions --model "<model>" "<prompt>"
```

### Cursor

Cursor CLI:

```bash
cursor-agent -p --trust --force --sandbox disabled --workspace "$PWD" --model "<model>" "<prompt>"
```

Fast Cursor route:

```bash
cursor-agent -p --trust --force --sandbox disabled --workspace "$PWD" --model composer-2.5-fast "<prompt>"
```

Cursor model notes:

- `composer-2.5-fast`
  - good fast default for quick outside passes
  - passed the local Minion smoke test
- Cursor supports many other model IDs
  - run `cursor-agent models` to list current account options before choosing

Resume Cursor CLI:

```bash
cursor-agent -p --trust --force --sandbox disabled --workspace "$PWD" --model "<model>" --continue "<prompt>"
cursor-agent -p --trust --force --sandbox disabled --workspace "$PWD" --model "<model>" --resume "<chat-id>" "<prompt>"
```

### Grok Build

Grok Build CLI:

```bash
grok --cwd "$PWD" --always-approve --permission-mode bypassPermissions --model "<model>" --single "<prompt>"
```

Resume Grok Build CLI:

```bash
grok --cwd "$PWD" --always-approve --permission-mode bypassPermissions --model "<model>" --resume --single "<prompt>"
grok --cwd "$PWD" --always-approve --permission-mode bypassPermissions --model "<model>" --resume "<session-id>" --single "<prompt>"
```

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

Do not hard-code model recommendations here.
Use LM Studio's loaded model list for the active machine,
then route by task:

- coding review
- writing critique
- brainstorming
- privacy-sensitive local analysis
- fast local sanity check

Local models can be useful but uneven.
For high-risk code review,
security-sensitive work,
or final product decisions,
compare against a stronger hosted route before acting.

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

# OpenRouter

---

OpenRouter helper:

```bash
python3 skills/dev/minion/scripts/openrouter_minion.py --model "<provider/model>" "<prompt>"
```

---

## Media

OpenRouter media helper:

```bash
python3 skills/dev/minion/scripts/openrouter_media.py list-images
python3 skills/dev/minion/scripts/openrouter_media.py list-videos
```

Generate image output:

```bash
python3 skills/dev/minion/scripts/openrouter_media.py image \
  --model "openai/gpt-image-2" \
  --prompt "<image prompt>" \
  --aspect-ratio 9:16 \
  --output output/openrouter/image.png
```

Image-to-image / reference image output:

```bash
python3 skills/dev/minion/scripts/openrouter_media.py image \
  --model "google/gemini-3.1-flash-image" \
  --prompt "<image prompt>" \
  --reference path/to/reference.png \
  --output output/openrouter/image.png
```

Submit and wait for a video job:

```bash
python3 skills/dev/minion/scripts/openrouter_media.py video \
  --model "google/veo-3.1-fast" \
  --prompt "<video prompt>" \
  --first-frame path/to/first-frame.png \
  --resolution 1080p \
  --aspect-ratio 9:16 \
  --duration 8 \
  --wait \
  --output output/openrouter/video.mp4
```

Resume or download a video job later:

```bash
python3 skills/dev/minion/scripts/openrouter_media.py video-status "<job-id-or-polling-url>" --wait --output output/openrouter/video.mp4
```

Thinking-model route with hidden reasoning:

```bash
python3 skills/dev/minion/scripts/openrouter_minion.py --model "<provider/model>" --reasoning-effort medium --reasoning-exclude "<prompt>"
```

Resume OpenRouter helper:

```bash
python3 skills/dev/minion/scripts/openrouter_minion.py --conversation "<name>" --model "<provider/model>" "<prompt>"
python3 skills/dev/minion/scripts/openrouter_minion.py --conversation "<name>" "<next prompt>"
```

If `--model` is omitted, the helper asks for one interactively when stdin is a terminal.

When using `--conversation`, the helper saves the conversation under:

```bash
.agents/minion/openrouter/<name>.json
```

List saved OpenRouter conversations:

```bash
python3 skills/dev/minion/scripts/openrouter_minion.py --list-conversations
```

Reset a saved OpenRouter conversation:

```bash
python3 skills/dev/minion/scripts/openrouter_minion.py --conversation "<name>" --reset-conversation --model "<provider/model>" "<prompt>"
```

## OpenRouter Notes

The helper requires:

```bash
OPENROUTER_API_KEY
```

Optional defaults:

```bash
OPENROUTER_MODEL
OPENROUTER_SITE_URL
OPENROUTER_APP_NAME
```

For thinking models, prefer `--reasoning-exclude` unless the task explicitly needs raw reasoning tokens. Some OpenRouter providers can return `message.reasoning` with no `message.content` when reasoning is included; the helper now fails with a clear rerun hint instead of printing `None`. If hidden reasoning consumes the whole output budget, rerun with a larger `--max-tokens`, lower `--reasoning-effort`, or both.

Preferred OpenRouter coding models:

- `z-ai/glm-5.2`
  - first pick for project-level software engineering and long-context agent work
  - OpenRouter reports a 1M-token context window
  - current catalog benchmark notes include strong coding and Design Arena code/category rankings
- `moonshotai/kimi-k2.7-code`
  - first Kimi pick for coding-focused outside opinions
  - use when you specifically want Moonshot/Kimi behavior
  - current catalog describes it as built for end-to-end programming tasks over long contexts
- `deepseek/deepseek-v4-pro`
  - third coding contender when you want a DeepSeek outside opinion
  - use for comparison against GLM and Kimi before broadening to Claude/GPT/OpenRouter Fusion

Other useful fallback routes:

- `openrouter/fusion`
  - use for multi-model deliberation when the question benefits from routing rather than one model

## OpenRouter Image And Video Notes

OpenRouter image and video generation use dedicated APIs, not the chat completions helper.

Image generation:

- Discover models with `GET /api/v1/images/models`.
- Generate with `POST /api/v1/images`.
- Responses return base64 image bytes under `data[].b64_json`.
- Common normalized fields include `resolution`, `aspect_ratio`, `size`, `quality`, `output_format`, `background`, `output_compression`, `n`, `seed`, `input_references`, `stream`, and `provider.options`.
- Use the model and endpoint records before assuming a parameter is supported.

Current image model examples from the June 25, 2026 catalog check:

- `openai/gpt-image-2`
- `openai/gpt-image-1-mini`
- `openai/gpt-image-1`
- `google/gemini-3.1-flash-image`
- `google/gemini-3-pro-image`
- `sourceful/riverflow-v2.5-pro`
- `x-ai/grok-imagine-image-quality`
- `recraft/recraft-v4.1-pro-vector`

Video generation:

- Discover models with `GET /api/v1/videos/models`.
- Submit jobs with `POST /api/v1/videos`.
- Video is asynchronous: submit, poll `GET /api/v1/videos/{jobId}`, then download from `GET /api/v1/videos/{jobId}/content`.
- Common normalized fields include `duration`, `resolution`, `aspect_ratio`, `size`, `frame_images`, `input_references`, `generate_audio`, `seed`, `callback_url`, and `provider`.
- `frame_images` are first/last exact frames for image-to-video.
- `input_references` are looser style/content references.
- If both are present, `frame_images` wins and the request is image-to-video.

Current video model examples from the June 25, 2026 catalog check:

- `google/veo-3.1-fast`
- `google/veo-3.1`
- `openai/sora-2-pro`
- `bytedance/seedance-2.0`
- `alibaba/wan-2.7`
- `kwaivgi/kling-v3.0-pro`
- `x-ai/grok-imagine-video`
- `alibaba/happyhorse-1.1`

Use `openrouter_media.py list-images` and `openrouter_media.py list-videos` before picking a model because media catalogs, pricing, and supported parameters move quickly.

## References

- OpenRouter image generation docs: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
- OpenRouter video generation docs: https://openrouter.ai/docs/guides/overview/multimodal/video-generation
- OpenRouter image input docs: https://openrouter.ai/docs/guides/overview/multimodal/images
