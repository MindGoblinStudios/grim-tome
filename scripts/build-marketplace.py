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

Skill folders are copied with display images larger than MAX_IMAGE_BYTES stripped,
unless launcher metadata or a pet manifest references them as runtime assets.

Run from the repo root: python3 scripts/build-marketplace.py
"""

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.1.9"
MAX_IMAGE_BYTES = 200 * 1024
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

AUTHOR = {"name": "Mind Goblin Studios", "url": "https://github.com/MindGoblinStudios"}
REPO_URL = "https://github.com/MindGoblinStudios/grim-tome"
OWNER = {"name": "Mind Goblin Studios"}

# OpenAI plugin directory listing for the grim-tome Codex manifest. Field limits:
# https://developers.openai.com/plugins/deploy/submission-errors
# Listing copy must not advertise pricing, subscriptions, or promotions.
TOME_LONG_DESCRIPTION = """Grimoire's Tome is a spellbook of skills for building software with AI. It brings Grimoire, a coding wizard and vibecoding mentor, plus a council of specialist advisors into ChatGPT and Codex.

What it helps with:
- Coding and shipping: plan features, break work into small shippable steps, review finished changes like a senior mentor, write clean commit messages, and keep project docs up to date.
- Learning to vibecode: explanations calibrated to your level, from first project to professional workflow.
- Planning and focus: day planning, long-term planning, focus nudges, and weekly check-ins.
- Business and life operations: advisors for business planning, admin checklists, money reviews, meal planning, fitness, and journaling.
- Workbench artifacts: reusable HTML workbenches for text editing, image review, and layout previews.

How it works:
The Tome is a set of skills. Ask for a skill by name, or ask a council member for help. Council members speak in character, so planning and review feel like a conversation with a team.

Who it is for:
Beginners learning to build with AI agents, solo founders and indie developers, and professional engineers who want repeatable planning, review, and documentation workflows.

Limitations:
- The Tome is made of instructions, reference files, and a few helper scripts. It has no server of its own and does not connect to any account by itself. Some skills work best when the host app already has tools such as a terminal, a browser, or email access, and they use only what you have enabled, for the task you ask for.
- The chat-log search skill reads AI chat logs stored on your own computer, and only when you ask it to search them. The email triage advisor proposes what to archive and changes nothing until you approve.
- Advisor skills for health, money, and business give general guidance, not professional medical, financial, tax, or legal advice.
- Some advanced developer skills run helper scripts or local preview pages and assume a coding agent with file and command access, such as Codex.

Grimoire's Tome is open source under the MIT license."""

TOME_INTERFACE = {
    "displayName": "Grimoire's Tome",
    "shortDescription": "Coding wizard & AI council",
    "longDescription": TOME_LONG_DESCRIPTION,
    "developerName": "Mind Goblin Studios, LLC",
    "category": "Developer Tools",
    "capabilities": [
        "Coding mentor",
        "Code review",
        "Task breakdown",
        "Project documentation",
        "Commit messages",
        "Day and long-term planning",
        "Business planning advisors",
        "Workbench artifacts",
    ],
    "websiteURL": "https://docs.mindgoblinstudios.com/Grimoire-c60389c249ee41b0b125b1678974d7be",
    "supportURL": "https://github.com/MindGoblinStudios/grim-tome/issues",
    "privacyPolicyURL": "https://docs.mindgoblinstudios.com/Grimoire-s-Tome-Plugin-Privacy-Policy-3f7050d4a9b181d0ae07d22c85a5d726",
    "termsOfServiceURL": "https://docs.mindgoblinstudios.com/Grimoire-s-Tome-Plugin-Terms-of-Use-3f7050d4a9b181e3a31ad15aacf58a05",
    "defaultPrompt": [
        "Review my latest changes like a senior engineer mentor would.",
        "Break this feature into small, shippable steps I can build today.",
        "Summon the council to help me plan my week and my side project.",
    ],
    "brandColor": "#1F7A33",
    "brandColorDark": "#4ADE80",
}

PLUGINS = {
    "grim-tome": {
        "displayName": "Grimoire's Tome",
        "description": "The full AI Prompt Spellbook: vibecoding dev flows, the Grim Council of advisors, AutoDocs, and workbench artifacts.",
        "logo": "skills/council/members/grimoire-code-wizard/assets/grimoire-code-wizard-icon-med.png",
        "keywords": ["grimoire", "spellbook", "skills", "council", "vibecoding", "prompts"],
        "match": lambda sid: True,
        "openai_interface": TOME_INTERFACE,
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
            "grim:relic-artifacts",
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
    referenced_assets = set()
    if metadata.is_file():
        for match in re.finditer(r"^  icon_(?:small|large):[ \t]*([^\n]+)$", metadata.read_text(), re.MULTILINE):
            value = match.group(1).strip()
            if value.startswith('"'):
                value = json.loads(value)
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1].replace("''", "'")
            else:
                value = value.split(" #", 1)[0].strip()
            referenced_assets.add((src / value).resolve())

    for manifest in src.rglob("pet.json"):
        value = json.loads(manifest.read_text()).get("spritesheetPath")
        if not isinstance(value, str) or not value.strip() or Path(value).is_absolute():
            raise ValueError(f"{manifest}: spritesheetPath must be a relative file path")
        spritesheet = (manifest.parent / value).resolve()
        if not spritesheet.is_relative_to(src.resolve()) or not spritesheet.is_file():
            raise ValueError(f"{manifest}: spritesheetPath must resolve to a file inside the skill")
        referenced_assets.add(spritesheet)

    def ignore(directory, names):
        skipped = []
        for name in names:
            if name in {"__pycache__", ".pytest_cache"}:
                skipped.append(name)
                continue
            p = Path(directory) / name
            if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES and p.stat().st_size > MAX_IMAGE_BYTES and p.resolve() not in referenced_assets:
                skipped.append(name)
        return skipped

    shutil.copytree(src, dest, ignore=ignore)


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def build_plugin(name: str, skill_entries, plugin_dir: Path = None):
    spec = PLUGINS[name]
    plugin_dir = plugin_dir or ROOT / "plugins" / name
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
    write_json(plugin_dir / ".codex-plugin" / "plugin.json", codex_manifest(spec, manifest, len(skill_entries)))

    readme = f"# {spec['displayName']}\n\n{spec['description']}\n\nGenerated from [Grimoire's Tome]({REPO_URL}) by `scripts/build-marketplace.py`. Do not edit by hand; edit the source skills and rebuild.\n"
    (plugin_dir / "README.md").write_text(readme)


def codex_manifest(spec, manifest, skill_count: int):
    interface = spec.get("openai_interface")
    if not interface:
        return manifest
    logo = f"./{manifest['logo']}"
    return {
        **manifest,
        "skills": "./skills/",
        "interface": {**interface, "composerIcon": logo, "logo": logo},
        "extensions": {
            "com.openai": {
                "publication": {
                    "release_notes": f"Grimoire's Tome {VERSION}: {skill_count} skills including Grimoire the code wizard, the Grim Council of advisors, AutoDocs, mentor review, task decomposition, and workbench artifacts.",
                },
            },
        },
    }


# Skills that never ship in the public Tome, even if they appear in the registry.
EXCLUDED_ID_PREFIXES = ("grim:council:guild:bros",)
EXCLUDED_PATH_PARTS = ("councilActions/guilds/bros",)


def is_excluded(entry) -> bool:
    sid = entry.get("id", "")
    path = entry.get("path", "")
    return sid.startswith(EXCLUDED_ID_PREFIXES) or any(part in path for part in EXCLUDED_PATH_PARTS)


def main():
    entries = [e for e in read_registry() if not is_excluded(e)]
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
