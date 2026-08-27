# Council Member Media

### Purpose

Define the portable asset bundle for council member portraits, chamber sprites, Codex pets, and media-related artifact behavior.

Read this doc only when creating or updating council member media. Ordinary council chat, check-ins, coding, planning, and persona routing should not need this contract.

### Canonical Paths

- Council roster source: `skills/council/council/SKILL.md`
- Council artifact member media root: `artifacts/council/members/<current-member-name>/`
- Council chamber staged background assets: `artifacts/council/assets/background/`
- Council chamber staged sprite assets: `artifacts/council/assets/sprites/`
- Installed live Codex pets: `${CODEX_HOME:-$HOME/.codex}/pets/<pet-id>/`
- Generated image asset workflow: `docs/media/image-generation-assets.md`



### Bundle Shape

Council member media has five conceptual asset lanes:

- `profile`: profile portrait used in cards, rosters, persona views, and member detail surfaces.
- `2D`: top-down or game-like chamber sprite used in the council chamber artifact.
- `pet`: Codex pet manifest and animated atlas when a member has an actual desktop pet.
- `icon`: larger character/skill-style emblem for future UI use. This is not a priority surface yet.
- `glyph`: tiny symbolic mark for compact UI. This is not a priority surface yet, and may overlap with Codex skill icon behavior.

Do not confuse council `icon`/`glyph` concepts with Codex `agents/openai.yaml` fields.

Codex skill metadata still uses:

- `interface.icon_small`
- `interface.icon_large`

Keep valid skill metadata, but do not block council media work on small-icon display behavior.

Each council member with a pet should have a checked-in bundle:

```text
artifacts/council/members/<member-id>/
  portrait.png
  sprite.gif
  pet.json
  spritesheet.webp
```

Temporary exploration assets can live beside the final bundle during an active generation pass, but should not become durable provenance docs by default:

```text
artifacts/council/members/<member-id>/
  generated/
    profile/
    icon/
    glyph/
```

Final artifact portraits should live at `artifacts/council/members/<current-member-name>/portrait.png`, using the current council display name normalized to lowercase kebab case.

Use the current spelling `Flicker` and folder slug `flicker-whimsy-fairy` for the Whimsy Fairy skill.

Do not use the old loose `artifacts/council/assets/*.jpg` bucket for member portraits.

`pet.json` should keep `spritesheetPath` relative to its own folder, usually:

```json
{
  "id": "<member-id>",
  "displayName": "<Display Name>",
  "description": "<one-line pet description>",
  "spritesheetPath": "spritesheet.webp"
}
```



### Data Contract

`artifacts/council/index.html` owns only the lightweight visual ordering lists for council members, guilds, and council management tiles.

The real council source of truth remains:

- `skills/council/council/SKILL.md` for roster, guild structure, and routing.
- Each member's `SKILL.md` for persona, description, appearance, and behavior.
- `skills/registry.yaml` for machine install/discovery routing.
- Each skill's `agents/openai.yaml` for Codex launcher metadata and icons.

Do not create generated skill metadata snapshots for artifact use, including `skill-index.js`.
Do not mirror full `SKILL.md` bodies into JavaScript.
Use `artifacts/server.js` and its live `/api/skills` scan for the public Tome skill list. The public dashboard must not include private, user-installed, plugin, or system skills.

For council-member cards and council-member rows in the skill sidebar, the artifact should use the member portrait path directly:

```text
./members/<current-member-name>/portrait.png
```

Do not silently fall back to `skills/*/assets/*icon*.png` for council members.

Skill icons are valid Codex metadata, but using them as council portraits caused stale character art to reappear.

### Chamber Artifact

`artifacts/council/index.html` is the council dashboard artifact.

Keep it direct-file driven:

- Use `skills/council/council/SKILL.md` as the roster source.
- Use `artifacts/council/members/<member>/portrait.png` for member images.
- Keep generated or third-party background assets checked in under `artifacts/council/assets/background/` or `artifacts/council/assets/generated/` with their license/source files when applicable.



### Symlink Rule

Do not use symlinks for checked-in council member media bundles.

Use real copied files so the artifact, repo, archives, and future public mirrors are portable.

Symlinks remain appropriate for live install surfaces such as `~/.codex/skills/*`, where the local machine path is intentionally part of the workflow.

### Pet Creation Workflow

1. Generate and validate the pet with `hatch-pet`.
2. Install the live pet under `${CODEX_HOME:-$HOME/.codex}/pets/<pet-id>/`.
3. Copy the installed `pet.json` and `spritesheet.webp` into `artifacts/council/members/<member-id>/`.
4. Copy or update the member `portrait.png` in the same folder.
5. Update the relevant persona `SKILL.md` when the visual identity changes.

