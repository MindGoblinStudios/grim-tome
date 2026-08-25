# Expansion Packs

A pattern for installing **third-party skill packages** alongside your own skills — without losing track of where they came from, or what you've changed.

The Tome ships one working example pack: [`expansionPacks/mattpocock/`](../expansionPacks/mattpocock/) with Matt Pocock's grill-me as the unmodified original (`grim:ep:grill-me`) and a local fork that asks in packs of 10 questions (`grim:ep:mx:grill-me`). Use it as the reference shape when you install your own. See the [Appendix](../README.md#standalone-skills) for more packs & skills worth trying.

### The Problem

You find a great skill someone else published. You install it. Then:

- You tweak it to fit your setup... and now you can't cleanly pull upstream updates.
- Six months later you can't remember which skills are yours and which are borrowed.
- The skill's name collides with your naming scheme, or bakes in the author's brand.

### The Pattern

Each third-party package gets its own pack folder:

```text
expansionPacks/
  <alias>/pack.yaml       # source index: upstream URL, install routing
  <alias>/og/             # unmodified upstream originals (or promoted installs)
  <alias>/mutations/      # your local forks, marked mutation: true
```

The shipped example, concretely:

```text
expansionPacks/mattpocock/
  pack.yaml                       # upstream: github.com/mattpocock/skills
  og/grill-me/                    # grim:ep:grill-me — unmodified, frontier rounds of questions
  mutations/grill-me/             # grim:ep:mx:grill-me — fork, rounds capped at 10, skips accept the rec
```

Rules that keep it sane:

- **Installed skill files live inside the pack folder**, not mixed into `skills/`.
- **Pack aliases are internal source labels** (short, lowercase: `qmd`, `ce`). They never appear in the skill's canonical name.
- Installed expansion-pack skills are namespaced `grim:ep:<skill>`.
- Mutated forks are namespaced `grim:ep:mx:<skill>`.
- Mutation status lives in `SKILL.md` frontmatter: `mutation: true` or `mutation: false`.
- A mutated skill links back to the source URL and to the unmodified copy (the pack's `og/` copy, or an `original/` folder nested in the mutation when the og isn't installed).
- `pack.yaml` remembers which upstream the skill came from; the frontmatter tells agents whether the installed copy is mutated.

### Beta Lifecycle

New or experimental installs use the `beta` namespace segment:

- Stable: `grim:ep:<skill>`
- Beta: `grim:ep:beta:<skill>`

Beta skills stay **manual-only** (no implicit model invocation) until proven. Promotion just removes the `beta` segment — the skill stays inside its source pack. The same convention works for your own first-party skills: `grim:dev:beta:<skill>`, with source folders staying grouped by functional area (`beta` records lifecycle, not location).

### Why Bother

The alias/og/mutations split means you can always diff your fork against upstream, pull updates deliberately, and credit the author. The `grim:ep:` namespace means one glance tells you (and your agent) what's borrowed vs. homegrown.
