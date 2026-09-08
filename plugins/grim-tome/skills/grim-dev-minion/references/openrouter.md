# OpenRouter Routes

Commands use the target project as the working directory. Resolve toolkit helper paths from the installed Minion skill folder; the caller may be in another repository. Use the current CLI help for supported arguments and model IDs. Honor the task's existing permissions when selecting a runner mode.

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

Choose an explicitly requested model or inspect the provider's current catalog. Do not treat a saved leaderboard as a current recommendation.

## OpenRouter Image And Video Notes

OpenRouter image and video generation use dedicated APIs, not the chat completions helper.

Image generation:

- Discover models with `GET /api/v1/images/models`.
- Generate with `POST /api/v1/images`.
- Responses return base64 image bytes under `data[].b64_json`.
- Common normalized fields include `resolution`, `aspect_ratio`, `size`, `quality`, `output_format`, `background`, `output_compression`, `n`, `seed`, `input_references`, `stream`, and `provider.options`.
- Use the model and endpoint records before assuming a parameter is supported.

Current image model examples from the June 25, 2026 catalog check:

- `google/gemini-3.1-flash-image`
- `google/gemini-3-pro-image`
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
- `kwaivgi/kling-v3.0-pro`
- `x-ai/grok-imagine-video`

Use `openrouter_media.py list-images` and `openrouter_media.py list-videos` before picking a model because media catalogs, pricing, and supported parameters move quickly.

## References

- OpenRouter image generation docs: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
- OpenRouter video generation docs: https://openrouter.ai/docs/guides/overview/multimodal/video-generation
- OpenRouter image input docs: https://openrouter.ai/docs/guides/overview/multimodal/images
