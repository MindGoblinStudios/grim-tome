---
name: grim-dev-agentops-expansion-packs
description: "Expansion Packs: Install third-party skills or whole skill stacks as expansion packs, fork them into grim:ep:mx: mutations, run beta packs, disable them by default, and keep them organized on the skills dashboard."
difficulty: Pro
disable-model-invocation: true
---
# Expansion Packs

Use this skill to bring someone else's skills into the Tome without losing track of where they came from or what you changed. It handles hundreds of skills cleanly: every imported skill is namespaced, provenance-linked, and easy to diff against upstream.

Reference guide (full pattern, folder layout, rationale): `docs/expansion-packs.md`.

## Namespace Tags

| Tag | Meaning | Example |
| --- | --- | --- |
| `grim:` | The Tome's own namespace (or a custom one such as `myName:` or `ABC-stack:`) | `grim:dev:minion` |
| `grim:ep:<skill>` | Imported expansion-pack skill, unmodified | `grim:ep:grill-me` |
| `grim:ep:mx:<skill>` | Mutated local fork of an imported skill | `grim:ep:mx:grill-me` |
| `grim:ep:beta:<skill>` | New or experimental import; manual-only until proven | `grim:ep:beta:<skill>` |
| `og/` | Folder holding the unmodified upstream copy inside a pack | `expansionPacks/mattpocock/og/grill-me/` |

Never put the pack alias or vendor brand in the canonical ID. Do not invent forms such as `grim:ep:og:`, `grim:epmx:`, `grim:mx:` or `grim:mutation:`.

## Pack Layout

```text
expansionPacks/<alias>/
  pack.yaml          # source index: alias, display_name, source_url, default_ref, skills
  og/<skill>/        # unmodified upstream originals (or promoted installs)
  mutations/<skill>/ # local forks, mutation: true, with original/ nested inside
```

- The alias is a short lowercase source label (`mattpocock`, `qmd`, `ce`). Human-facing labels go in `display_name`.
- Installed skill files live inside the pack folder, never under `skills/`.
- Use `expansionPacks/mattpocock/` as the reference shape.

## Workflows

### Install a single skill

1. Resolve the upstream source URL and ref; read its license.
2. Pick or create the pack alias and `expansionPacks/<alias>/pack.yaml`.
3. Copy the upstream skill unchanged into `og/<skill>/`.
4. Rename its frontmatter `name` to `grim:ep:<skill>` (or `grim:ep:beta:<skill>` for a trial), and add `mutation: false` and `source_url: <url>`.
5. Add the entry under `skills.og` in `pack.yaml` with `slug`, `pack_id` (`<alias>:<slug>`), `canonical_id`, `path`, `description`, and `mutation: false`.
6. Keep the upstream license file in the pack.

### Install a whole stack as one pack

Do the single-skill steps for every skill in the stack under one alias and one `pack.yaml`. When the user asks to disable them by default, apply **Disable by default** to each.

### Fork into a mutation

1. Create `mutations/<skill>/`. Copy the upstream skill into an `original` folder inside `mutations/<skill>/`. Name that copy `UPSTREAM.md` instead of `SKILL.md` when the fork is manual-only, so it is not discovered as a second skill.
2. Write the local `SKILL.md` with `name: grim:ep:mx:<skill>`, `mutation: true`, `source_url`, and `original_skill` pointing at the nested upstream copy (`UPSTREAM.md` or `SKILL.md` in the `original` folder).
3. Start the body with a link to the upstream source, the nested original, and the pack's `og/` copy if installed, then one line stating what the mutation changes.
4. Add the entry under `skills.mutations` in `pack.yaml` with `mutation: true`.
5. To retire a mutation without deleting it, replace its `canonical_id` with `retired_id` and record `retired: YYYY-MM-DD`.

### Beta packs and promotion

- New or experimental installs use `grim:ep:beta:<skill>` and stay manual-only.
- The `beta` segment is the only lifecycle marker; do not add separate lifecycle metadata.
- Promotion removes the `beta` segment. The skill stays in its pack; update the registry/symlink name to match.

### Disable by default

Make a skill manual-only (no implicit model invocation):

- `SKILL.md` frontmatter: `disable-model-invocation: true`
- `agents/openai.yaml`: `policy:` → `allow_implicit_invocation: false`

Beta skills are always disabled this way.

### Update from upstream

1. Refresh the `og/` copy and every nested `original` copy from upstream.
2. Diff each original against its mutation.
3. Port wanted upstream changes into the mutation deliberately; never overwrite local changes wholesale.

## Dashboard Organization

The skills dashboard (`grim:council:dashboard`) groups skills by namespace:

- Installed expansion-pack skills always appear in the expansion-pack section.
- Mutations are marked by both the `grim:ep:mx:` namespace and `mutation: true`.
- Inactive upstream originals stay nested or listed in `pack.yaml`; do not surface them as separate tiles.
- Tiles open the local `SKILL.md`, not the external repo.

## Checklist

- Canonical name follows the tags above; frontmatter `name` matches the registered ID.
- `mutation`, `source_url`, and (for mutations) `original_skill` are set.
- `pack.yaml` lists every installed og and mutation entry.
- Beta and disabled skills have both manual-only switches set.
- Upstream license is preserved and the author is credited.
