# Anatomy Expansion Pack (Beta)

[Anatomy](https://github.com/wheresryan22/anatomy) by Ryan ([@wheresryan22](https://x.com/wheresryan22)), installed as a beta expansion pack. MIT licensed; the upstream license ships beside this file as [`LICENSE`](LICENSE) and inside the skill folder. Pinned at upstream commit `689dcf966e63d92be10a5d593c6e19e10acd4422`. Announcement: [x.com/wheresryan22/status/2108948624004526516](https://x.com/wheresryan22/status/2108948624004526516).

| Invoke | What it does |
|---|---|
| `/anatomy` | Describe a machine or a technical idea in a line; the agent builds a crafted, interactive isometric SVG figure of a real physical object whose working is the explanation, with optional WebGL shaders (fire, water, plasma, lamp light) and an optional 3D mode with parts that turn and move. |

### Naming and lifecycle

- Keeps the **upstream invocation name** (`/anatomy`), with `invocation: upstream` in `pack.yaml`, like the pstack pack.
- **Beta**: manual-only (`disable-model-invocation: true`, `allow_implicit_invocation: false`) and `lifecycle: beta` in `pack.yaml` and the skill's frontmatter metadata.
- **Unmodified** (`mutation: false`): the skill body, kit, scripts, references, examples, evals and tests are upstream files, byte for byte.

### What the Tome changed

- `og/anatomy/SKILL.md` frontmatter: added `disable-model-invocation`, `mutation`, `source_url`, `source_ref`, and author/pack/lifecycle metadata; added one attribution line above the title. Everything from the title down is untouched.
- `og/anatomy/agents/openai.yaml`: display name set to the invocation name, a beta launcher blurb, and implicit invocation turned off.
- Left out upstream repo infrastructure that the skill doesn't use: the upstream README (install instructions for standalone use), `.github/` (CI, issue templates, README images), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.

### Requirements

Node.js 20.10+ and Chrome or Chromium for the capture and audit checks. No npm dependencies: the kit uses only Node built-ins. The example pages under `og/anatomy/examples/*/` are generated; rebuild one with `node examples/<name>/build.mjs` (add `--light` for the light theme) from inside `og/anatomy/`.

### Upstream updates

Copy the new upstream files over `og/anatomy/`, re-apply the frontmatter and `agents/openai.yaml` changes above, and bump `default_ref` in `pack.yaml`.
