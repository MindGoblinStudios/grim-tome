#!/usr/bin/env python3
"""Build marketplace plugin folders and manifests from skills/registry.yaml.

Generates:
  plugins/grim-tome/       one bundle plugin with every skill (Cursor + Claude Code)
  plugins/grim-core/       Grimterface + dev-loop + memory skills (Codex catalog)
  plugins/grim-council/    the Grim Council: members, guilds, actions, dashboard (Codex catalog)
  plugins/grim-artifacts/  workbench artifact skills (Codex catalog)
  .cursor-plugin/marketplace.json   -> lists grim-tome
  .claude-plugin/marketplace.json   -> lists grim-tome
  .agents/plugins/marketplace.json  -> lists grim-core, grim-council, grim-artifacts (INSTALLED_BY_DEFAULT)

Skill folders are copied with display images larger than MAX_IMAGE_BYTES stripped;
unless launcher metadata references them. Unreferenced large images are display art.

Run from the repo root: python3 scripts/build-marketplace.py
"""

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.1.5"
MAX_IMAGE_BYTES = 200 * 1024
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

AUTHOR = {"name": "Mind Goblin Studios", "url": "https://github.com/MindGoblinStudios"}
REPO_URL = "https://github.com/MindGoblinStudios/grim-tome"
OWNER = {"name": "Mind Goblin Studios"}

PLUGINS = {
    "grim-tome": {
        "displayName": "Grimoire's Tome",
        "description": "The full AI Prompt Spellbook: vibecoding dev flows, the Grim Council of advisors, AutoDocs, and workbench artifacts.",
        "logo": "skills/council/members/grimoire-code-wizard/assets/grimoire-code-wizard-icon-med.png",
        "keywords": ["grimoire", "spellbook", "skills", "council", "vibecoding", "prompts"],
        "match": lambda sid: True,
    },
    "grim-core": {
        "displayName": "Grim Core",
        "description": "Grimoire's Tome core: the Grimterface plus everyday dev-loop skills — lock-in, polish, mentor review, minions, git decanter, autodocs, and more.",
        "logo": "images/expansion-packs-icon-med.png",
        "keywords": ["grimoire", "dev-loop", "skills", "vibecoding"],
        "match": lambda sid: sid.startswith(("grim:terface", "grim:dev", "grim:mem", "grim:media"))
        or sid in ("grim:lock-in", "grim:polish"),
    },
    "grim-council": {
        "displayName": "The Grim Council",
        "description": "A council of AI advisors: Grimoire, the guilds, twenty members, summons, gossip, GPTavern, and the council dashboard.",
        "logo": "skills/council/council/assets/council-icon-med.png",
        "keywords": ["grimoire", "council", "advisors", "roleplay", "life-os"],
        "match": lambda sid: sid.startswith("grim:council"),
    },
    "grim-artifacts": {
        "displayName": "Grim Artifacts",
        "description": "Workbench artifacts: the house standard for interactive HTML artifacts, plus workbench, image-review, and text-editor variants.",
        "logo": "skills/artifacts/workbench-artifact/assets/workbench-artifact-icon-med.png",
        "keywords": ["artifacts", "workbench", "html", "tools"],
        "match": lambda sid: sid in (
            "grim:artifacts",
            "grim:dev:workbench-artifact",
            "grim:media:image-review-flow-workbench",
            "grim:dev:text-editor-workbench",
        ),
    },
}

# Codex catalog plugins; grim-tome is the Cursor/Claude bundle.
CODEX_PLUGINS = ["grim-core", "grim-council", "grim-artifacts"]
BUNDLE_PLUGINS = ["grim-tome"]

# grim-core matcher overlaps grim-artifacts ids (grim:dev:workbench-artifact etc.); resolve
# by giving grim-artifacts priority for its explicit ids.
def plugin_for(sid: str) -> str:
    if PLUGINS["grim-artifacts"]["match"](sid):
        return "grim-artifacts"
    if PLUGINS["grim-council"]["match"](sid):
        return "grim-council"
    if PLUGINS["grim-core"]["match"](sid):
        return "grim-core"
    raise ValueError(f"no plugin group for skill id {sid}")


def read_registry():
    entries = []
    text = (ROOT / "skills" / "registry.yaml").read_text()
    for match in re.finditer(r"- id: (\S+)\n\s+path: (\S+)", text):
        entries.append({"id": match.group(1), "path": match.group(2)})
    return entries


def skill_dir_name(sid: str, plugin: str) -> str:
    # Codex accepts colons, so the Codex catalog keeps the grim: invocation
    # convention. Cursor and Claude Code follow the Agent Skills standard:
    # names are [a-z0-9-] only and must match the folder, so the bundle plugin
    # uses the fully hyphenated slug (grim:dev:autodocs -> grim-dev-autodocs).
    return hyphen_slug(sid) if plugin in BUNDLE_PLUGINS else sid


def hyphen_slug(sid: str) -> str:
    slug = re.sub(r"[^a-z0-9-]+", "-", sid.lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug)


def rewrite_skill_name(skill_md: Path, new_name: str):
    text = skill_md.read_text()
    updated, count = re.subn(r"^name:[ \t]*.+$", f"name: {new_name}", text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise ValueError(f"no frontmatter name in {skill_md}")
    skill_md.write_text(updated)


def copy_skill(src: Path, dest: Path):
    metadata = src / "agents/openai.yaml"
    referenced_icons = set()
    if metadata.is_file():
        for match in re.finditer(r"^  icon_(?:small|large):[ \t]*([^\n]+)$", metadata.read_text(), re.MULTILINE):
            value = match.group(1).strip()
            if value.startswith('"'):
                value = json.loads(value)
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1].replace("''", "'")
            else:
                value = value.split(" #", 1)[0].strip()
            referenced_icons.add((src / value).resolve())

    def ignore(directory, names):
        skipped = []
        for name in names:
            if name in {"__pycache__", ".pytest_cache"}:
                skipped.append(name)
                continue
            p = Path(directory) / name
            if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES and p.stat().st_size > MAX_IMAGE_BYTES and p.resolve() not in referenced_icons:
                skipped.append(name)
        return skipped

    shutil.copytree(src, dest, ignore=ignore)


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def build_plugin(name: str, skill_entries):
    spec = PLUGINS[name]
    plugin_dir = ROOT / "plugins" / name
    if plugin_dir.exists():
        shutil.rmtree(plugin_dir)
    (plugin_dir / "skills").mkdir(parents=True)

    for entry in skill_entries:
        dir_name = skill_dir_name(entry["id"], name)
        dest = plugin_dir / "skills" / dir_name
        copy_skill(ROOT / entry["path"], dest)
        if dir_name != entry["id"]:
            rewrite_skill_name(dest / "SKILL.md", dir_name)

    # Logo
    logo_src = ROOT / spec["logo"]
    logo_dest = plugin_dir / "assets" / ("logo" + logo_src.suffix)
    logo_dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(logo_src, logo_dest)
    logo_rel = f"assets/logo{logo_src.suffix}"

    manifest = {
        "name": name,
        "displayName": spec["displayName"],
        "version": VERSION,
        "description": spec["description"],
        "author": AUTHOR,
        "license": "MIT",
        "homepage": REPO_URL,
        "repository": REPO_URL,
        "keywords": spec["keywords"],
        "logo": logo_rel,
    }
    write_json(plugin_dir / ".cursor-plugin" / "plugin.json", manifest)
    write_json(plugin_dir / ".claude-plugin" / "plugin.json", manifest)
    write_json(plugin_dir / ".codex-plugin" / "plugin.json", manifest)

    readme = f"# {spec['displayName']}\n\n{spec['description']}\n\nGenerated from [Grimoire's Tome]({REPO_URL}) by `scripts/build-marketplace.py`. Do not edit by hand; edit the source skills and rebuild.\n"
    (plugin_dir / "README.md").write_text(readme)


def main():
    entries = read_registry()
    groups = {name: [] for name in PLUGINS}
    for entry in entries:
        groups[plugin_for(entry["id"])].append(entry)
        groups["grim-tome"].append(entry)

    for name in PLUGINS:
        build_plugin(name, groups[name])
        print(f"built plugins/{name}: {len(groups[name])} skills")

    # Cursor marketplace: single bundle plugin.
    write_json(ROOT / ".cursor-plugin" / "marketplace.json", {
        "name": "grim-tome",
        "owner": OWNER,
        "metadata": {"description": "Grimoire's Tome: an AI Prompt Spellbook.", "version": VERSION},
        "plugins": [
            {
                "name": "grim-tome",
                "source": "./plugins/grim-tome",
                "description": PLUGINS["grim-tome"]["description"],
            }
        ],
    })

    # Claude Code marketplace: single bundle plugin.
    write_json(ROOT / ".claude-plugin" / "marketplace.json", {
        "name": "grim-tome",
        "owner": OWNER,
        "metadata": {"description": "Grimoire's Tome: an AI Prompt Spellbook.", "version": VERSION},
        "plugins": [
            {
                "name": "grim-tome",
                "source": "./plugins/grim-tome",
                "description": PLUGINS["grim-tome"]["description"],
                "version": VERSION,
                "author": AUTHOR,
                "license": "MIT",
                "homepage": REPO_URL,
                "category": "skills",
            }
        ],
    })

    # Codex marketplace: split catalog, everything installed by default.
    write_json(ROOT / ".agents" / "plugins" / "marketplace.json", {
        "name": "grim-tome",
        "interface": {"displayName": "Grimoire's Tome"},
        "plugins": [
            {
                "name": name,
                "source": f"./plugins/{name}",
                "description": PLUGINS[name]["description"],
                "category": "skills",
                "policy": {"installation": "INSTALLED_BY_DEFAULT"},
            }
            for name in CODEX_PLUGINS
        ],
    })

    print("wrote .cursor-plugin/, .claude-plugin/, .agents/plugins/ marketplace manifests")


if __name__ == "__main__":
    main()
