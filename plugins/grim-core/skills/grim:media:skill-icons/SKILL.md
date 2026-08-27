---
name: grim:media:skill-icons
description: "Skill Icons: House rules for generating skill icon assets and saving image prompts. Use whenever creating or updating a skill's icons, icon prompts, or any file under a skill's assets/ or assets/prompts/ folder."
---

# Skill Icons

House rules for skill icon assets and the image prompts that produce them. Follow this skill any time you generate, regenerate, resize, or document a skill icon.

## Required Assets

Every skill ships with real icon assets before it is considered complete:

- `assets/<skill-stem>-icon-small.png` at 128x128
- `assets/<skill-stem>-icon-large.png` at 1024x1024
- `agents/openai.yaml` references both via `interface.icon_small` and `interface.icon_large`

Rules:
- Bitmap PNG only. Never create SVG/vector skill icons, and never point `agents/openai.yaml` at anything but PNG.
- Generate a source image, copy it into the skill's `assets/` folder (optionally under `assets/generated/`), then resize/export the two required sizes.
- Verify icon dimensions before finishing.

## House Style

Grim skill icons share a recognizable look:

- Dark arcane-code artifacts, grimoire/book motifs when appropriate, black leather, antique brass, emerald magical light, parchment or stone textures.
- Premium game-inventory / app-icon feel — dimensional, hand-painted, readable at 128px.
- Represent code/software concepts as magical machinery, spellwork, runes, portals, annotated tomes, or enchanted tools while keeping the practical skill subject readable at small sizes.

Avoid generic SaaS badge styling: no plain office documents, bland browser frames, stock app gradients, corporate glass cards, or cheerful productivity-app visuals unless the skill explicitly needs that contrast.

## Prompt Files

Save the exact prompt used for any kept icon at `assets/prompts/icon-generation-<YYYY-MM-DD>[-<variant>].md`. Keep it minimal — the prompt plus the least metadata possible:

```markdown
# <Skill Name> Icon Prompt

<the exact prompt text: use case, subject, scene, style, composition,
lighting, palette, constraints>
```

Optional additions, only when true:
- `Reference images: <relative repo paths>` — only if reference images were actually used.
- A `V2`/version suffix in the title and filename when iterating.
- Concise crop/export notes when they are required to reproduce the kept asset.

For inherited or imported art whose exact generation prompt is unavailable, do not fabricate one. Save `assets/prompts/icon-provenance-<YYYY-MM-DD>.md` with the source asset, known transformation, and an explicit `Exact prompt: unavailable` line.

Never include:
- Absolute paths, home directories, usernames, or machine-specific paths of any kind.
- Generation-session bookkeeping such as source cache paths or output-filename lists. The kept outputs live next to the prompt in `assets/`; that is the record.

## Workflow

1. Draft the prompt in the house style, scoped to the skill's subject.
2. Generate a 1024x1024 (or larger) bitmap source image.
3. Copy the kept source into `assets/` (or `assets/generated/`), export `-icon-large.png` (1024x1024) and `-icon-small.png` (128x128).
4. Wire both icons into `agents/openai.yaml` under `interface.icon_small` / `interface.icon_large`.
5. Save the prompt file in the minimal format above.
6. Verify dimensions and that no personal or machine paths leaked into any committed file.
