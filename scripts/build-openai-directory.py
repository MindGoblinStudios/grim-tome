#!/usr/bin/env python3
"""Build the OpenAI plugin directory ZIP (ChatGPT + Codex) for grim-tome.

Builds the grim-tome bundle fresh from skills/registry.yaml into
dist/openai-directory/grim-tome/, keeps only the Codex manifest, strips content
the directory forbids (the Tithe Bell's tip-jar asks, GPT-store promotion),
validates the result against OpenAI's documented package rules, and writes
dist/grim-tome-<version>-openai-directory.zip.

The repo's own plugins/ output is untouched; only the directory build is stripped.

Rules: https://developers.openai.com/plugins/deploy/submission-errors
Run from the repo root: python3 scripts/build-openai-directory.py
"""

import importlib.util
import json
import re
import shutil
import struct
import sys
import unicodedata
import zipfile
from pathlib import Path

import yaml

spec = importlib.util.spec_from_file_location("builder", Path(__file__).with_name("build-marketplace.py"))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

PLUGIN = "grim-tome"
DIST = builder.ROOT / "dist"

MAX_ZIP_BYTES = 100 * 1000 * 1000
MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024
MAX_MEMBER_BYTES = 100 * 1024 * 1024
MAX_ENTRIES = 5000
MAX_PATH_SEGMENTS = 20
MAX_IMAGE_BYTES = 5 * 1024 * 1024

CATEGORIES = {
    "Productivity", "Creativity", "Developer Tools", "Business & Operations", "Data & Analytics",
    "Communication", "Education & Research", "Security", "Finance", "Healthcare", "Travel",
    "Entertainment", "Other",
}
LISTING_URLS = ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL")
TEXT_SUFFIXES = {".md", ".yaml", ".yml", ".json", ".py", ".html", ".js", ".mjs", ".css", ".txt", ".svg"}

# Pay asks, checkout links, and storefront promotion the directory forbids.
FORBIDDEN = re.compile(
    r"tithe|tip jar|pay tribute|buy\.stripe\.com|checkout\.stripe\.com|donate\.stripe\.com|"
    r"patreon\.com|ko-fi\.com|buymeacoffee\.com|github\.com/sponsors|paypal\.(?:com|me)|"
    r"gumroad\.com|chatgpt\.com/g/",
    re.IGNORECASE,
)

TITHE_INSTALL_SENTENCES = (
    " Also schedule the three Tithe Bell one-shots (one week, 30 days, and one year out) from that same section."
    " Schedule these by default for every install, even minimal or easy-mode setups without Midas"
    " (another member rings the bell in his stead)."
)
GPT_STORE_LORE = (
    "Originally Grimoire was the #1 coding GPT in the openAI GPT store  \n"
    "With over 3 million chats!\n"
    "[Meet the original Grimoire](https://chatgpt.com/g/g-n7Rs0IK86-grimoire)  \n\n"
)


def drop_text(text: str, snippet: str) -> str:
    if snippet not in text:
        raise ValueError(f"expected text not found: {snippet[:60]!r}")
    return text.replace(snippet, "")


def drop_md_section(text: str, heading: str) -> str:
    """Remove a markdown section from its heading to the next heading of the same or higher level."""
    lines = text.splitlines(keepends=True)
    level = len(heading) - len(heading.lstrip("#"))
    start = next((i for i, line in enumerate(lines) if line.rstrip("\n").startswith(heading)), None)
    if start is None:
        raise ValueError(f"section not found: {heading!r}")
    end = start + 1
    while end < len(lines):
        match = re.match(r"^(#+)\s", lines[end])
        if match and len(match.group(1)) <= level:
            break
        end += 1
    return "".join(lines[:start] + lines[end:])


def drop_yaml_list_item(text: str, item_id: str, comment: str = None) -> str:
    """Remove one `- id: <item_id>` entry (and an optional comment line above it) from a YAML list."""
    lead = rf"(?:{re.escape(comment)}\n)?" if comment else ""
    pattern = rf"(?m)^{lead}(?P<indent>[ \t]*)- id: {re.escape(item_id)}\n(?:(?P=indent)[ \t]+.*\n|[ \t]*\n)*"
    updated, count = re.subn(pattern, "", text, count=1)
    if count != 1:
        raise ValueError(f"YAML item not found: {item_id}")
    return updated


# (path inside the plugin, transform). Every transform fails loudly if its target moved.
STRIPS = [
    ("skills/grim-council/SKILL.md", lambda t: drop_md_section(t, "### The Tithe Bell")),
    (
        "skills/grim-council/references/routines-registry.yaml",
        lambda t: drop_yaml_list_item(t, "midas-tithe-bell", comment="  # --- Install one-shots ---"),
    ),
    ("skills/grim-terface-install/SKILL.md", lambda t: drop_text(t, TITHE_INSTALL_SENTENCES)),
    ("skills/grim-council-guild-coding-grimoire-code-wizard/SKILL.md", lambda t: drop_text(t, GPT_STORE_LORE)),
]


def apply_strips(plugin_dir: Path):
    for rel, transform in STRIPS:
        path = plugin_dir / rel
        path.write_text(transform(path.read_text()))
    registry = plugin_dir / "skills/grim-council/references/routines-registry.yaml"
    yaml.safe_load(registry.read_text())


def build_staging() -> Path:
    plugin_dir = DIST / "openai-directory" / PLUGIN
    entries = [e for e in builder.read_registry() if not builder.is_excluded(e)]
    builder.build_plugin(PLUGIN, entries, plugin_dir)
    # One manifest only: the portal reads .codex-plugin, and the others carry no listing.
    for other in (".claude-plugin", ".cursor-plugin"):
        shutil.rmtree(plugin_dir / other)
    apply_strips(plugin_dir)
    return plugin_dir


# --- validation -------------------------------------------------------------

def supported_text(value: str, multiline: bool = False) -> bool:
    for ch in value:
        if ch == "\n" and multiline:
            continue
        if unicodedata.category(ch) in {"Cc", "Zl", "Zp"}:
            return False
    return True


def https_url(value) -> bool:
    return isinstance(value, str) and re.fullmatch(r"https://[^\s/@:]+(?::\d+)?(?:/\S*)?", value) is not None


def luminance(hex_color: str) -> float:
    channels = []
    for i in (1, 3, 5):
        c = int(hex_color[i:i + 2], 16) / 255
        channels.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def png_size(path: Path):
    head = path.read_bytes()[:24]
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", head[16:24])


def check_text(errors, field, value, limit, multiline=False, required=True):
    if value is None:
        if required:
            errors.append(f"{field} is required")
        return
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{field} must be a non-empty string")
    elif len(value) > limit:
        errors.append(f"{field} is {len(value)} chars (max {limit})")
    elif not supported_text(value, multiline):
        errors.append(f"{field} contains unsupported characters or line breaks")


def check_asset(errors, root: Path, field, value):
    if not isinstance(value, str) or not value.startswith("./"):
        errors.append(f"{field} must be a ./-prefixed path")
        return
    path = (root / value).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        errors.append(f"{field} must reference a file inside the plugin: {value}")
        return
    if path.stat().st_size > MAX_IMAGE_BYTES:
        errors.append(f"{field} exceeds 5 MiB")
    size = png_size(path)
    if size is None:
        errors.append(f"{field} must be a PNG (the only format this validator decodes): {value}")
    elif size[0] != size[1] or not 48 <= size[0] <= 4096:
        errors.append(f"{field} must be square, 48 to 4096 px: {size[0]}x{size[1]}")


def validate_manifest(root: Path, errors):
    path = root / ".codex-plugin" / "plugin.json"
    if not path.is_file():
        errors.append("missing .codex-plugin/plugin.json")
        return {}
    raw = path.read_text()
    if "TODO" in raw:
        errors.append("manifest contains a TODO placeholder")
    m = json.loads(raw)

    name = m.get("name")
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", name):
        errors.append(f"name must be <=64 ASCII letters, digits, _ or -: {name!r}")
    version = m.get("version")
    if not isinstance(version, str) or len(version) > 64 or not re.fullmatch(
        r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?", version
    ):
        errors.append(f"version must be semver: {version!r}")
    check_text(errors, "description", m.get("description"), 1024, multiline=True)
    author = m.get("author")
    if not isinstance(author, dict):
        errors.append("author must be an object")
    else:
        check_text(errors, "author.name", author.get("name"), 120)
        if "url" in author and not https_url(author["url"]):
            errors.append("author.url must be HTTPS")
    if "homepage" in m and not https_url(m["homepage"]):
        errors.append("homepage must be HTTPS")
    if m.get("skills") != "./skills/" or not (root / "skills").is_dir():
        errors.append('skills must be "./skills/" and the directory must exist')
    for key in ("mcpServers", "apps", "hooks"):
        if key in m:
            errors.append(f"skills-only ZIP must not declare {key}")

    ui = m.get("interface")
    if not isinstance(ui, dict):
        errors.append("interface object is required")
        return m
    check_text(errors, "interface.displayName", ui.get("displayName"), 30)
    check_text(errors, "interface.shortDescription", ui.get("shortDescription"), 30)
    check_text(errors, "interface.longDescription", ui.get("longDescription"), 4000, multiline=True)
    check_text(errors, "interface.developerName", ui.get("developerName"), 80)
    if ui.get("category") not in CATEGORIES:
        errors.append(f"interface.category is not a supported category: {ui.get('category')!r}")
    caps = ui.get("capabilities")
    if not isinstance(caps, list) or len(caps) > 20:
        errors.append("interface.capabilities must be a list of at most 20")
    else:
        for i, cap in enumerate(caps):
            check_text(errors, f"interface.capabilities[{i}]", cap, 120)
    for key in LISTING_URLS:
        if key in ui and not (https_url(ui[key]) and len(ui[key]) <= 1024):
            errors.append(f"interface.{key} must be an HTTPS URL of at most 1024 chars")
    prompts = ui.get("defaultPrompt", [])
    prompts = [prompts] if isinstance(prompts, str) else prompts
    if len(prompts) > 3:
        errors.append("interface.defaultPrompt allows at most 3 prompts")
    normalized = [" ".join(unicodedata.normalize("NFKC", p).split()).casefold() for p in prompts]
    if len(set(normalized)) != len(normalized):
        errors.append("interface.defaultPrompt entries must be unique")
    for i, prompt in enumerate(prompts):
        check_text(errors, f"interface.defaultPrompt[{i}]", prompt, 128)
        if "@" in prompt:
            errors.append(f"interface.defaultPrompt[{i}] must not contain @mentions")
    for key, against in (("brandColor", "#FFFFFF"), ("brandColorDark", "#212121")):
        if key in ui:
            if not re.fullmatch(r"#[0-9A-Fa-f]{6}", ui[key]):
                errors.append(f"interface.{key} must be #RRGGBB")
            elif contrast(ui[key], against) < 2:
                errors.append(f"interface.{key} needs 2:1 contrast against {against}")
    for key in ("logo", "composerIcon"):
        check_asset(errors, root, f"interface.{key}", ui.get(key))
    for key in ("logoDark", "composerIconDark"):
        if key in ui:
            check_asset(errors, root, f"interface.{key}", ui[key])
    if "screenshots" in ui:
        errors.append("skills-only ZIP must not include interface.screenshots")

    openai = m.get("extensions", {}).get("com.openai", {})
    review = openai.get("review", {})
    for key in ("test_credentials", "reviewer_instructions"):
        if key in review or key in openai:
            errors.append(f"manifest must not include {key}")
    onboarding = openai.get("onboardingSkill")
    if onboarding is not None and not (root / onboarding).is_file():
        errors.append(f"onboardingSkill must point at a packaged SKILL.md: {onboarding}")
    countries = openai.get("publication", {}).get("countries")
    if countries is not None and not (
        isinstance(countries, list) and all(isinstance(c, str) and re.fullmatch(r"[A-Z]{2}", c) for c in countries)
    ):
        errors.append("publication.countries must be a list of uppercase country codes")
    return m


def validate_agent_metadata(errors, skill: Path):
    path = skill / "agents" / "openai.yaml"
    if not path.exists():
        return
    label = f"{skill.name}/agents/openai.yaml"
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, yaml.YAMLError) as exc:
        errors.append(f"{label}: unreadable YAML ({exc})")
        return
    if not isinstance(data, dict) or not isinstance(data.get("interface"), dict):
        errors.append(f"{label}: needs an interface mapping")
        return
    ui = data["interface"]
    for key in ("display_name", "short_description"):
        if not isinstance(ui.get(key), str) or not ui[key].strip():
            errors.append(f"{label}: interface.{key} is required")
    for key in ("icon_small", "icon_large"):
        if key in ui and (not isinstance(ui[key], str) or not ui[key].strip() or Path(ui[key]).is_absolute()):
            errors.append(f"{label}: interface.{key} must be a relative file path")
    if "brand_color" in ui and not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(ui["brand_color"])):
        errors.append(f"{label}: interface.brand_color must be #RRGGBB")
    if "default_prompt" in ui and (not isinstance(ui["default_prompt"], str) or not ui["default_prompt"].strip()):
        errors.append(f"{label}: interface.default_prompt must be a non-empty string")
    policy = data.get("policy")
    if policy is not None:
        if not isinstance(policy, dict) or set(policy) - {"products", "allow_implicit_invocation"}:
            errors.append(f"{label}: policy may contain only products and allow_implicit_invocation")
        else:
            if "products" in policy and not (
                isinstance(policy["products"], list) and policy["products"] and set(policy["products"]) <= {"CHAT", "CODEX"}
            ):
                errors.append(f"{label}: policy.products must list CHAT and/or CODEX")
            if "allow_implicit_invocation" in policy and not isinstance(policy["allow_implicit_invocation"], bool):
                errors.append(f"{label}: policy.allow_implicit_invocation must be true or false")
    deps = data.get("dependencies")
    if deps is not None and (not isinstance(deps, dict) or set(deps) - {"tools"}):
        errors.append(f"{label}: only dependencies.tools is supported")


def validate_skills(root: Path, plugin_name: str, errors):
    names = {}
    skills_dir = root / "skills"
    for child in sorted(skills_dir.iterdir()):
        if child.is_symlink() or not child.is_dir():
            errors.append(f"skills/{child.name}: must be a real directory")
            continue
        if child.name.startswith("."):
            errors.append(f"skills/{child.name}: hidden skill directory")
            continue
        skill_md = child / "SKILL.md"
        if not skill_md.is_file():
            errors.append(f"skills/{child.name}: missing SKILL.md")
            continue
        for nested in child.rglob("SKILL.md"):
            if nested != skill_md:
                errors.append(f"nested SKILL.md: {nested.relative_to(root)}")
        try:
            text = skill_md.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            errors.append(f"{child.name}: SKILL.md is not UTF-8")
            continue
        match = re.match(r"---\r?\n(.*?)\r?\n---\r?\n?(.*)", text, re.DOTALL)
        if not match:
            errors.append(f"{child.name}: SKILL.md needs closed YAML front matter")
            continue
        try:
            front = yaml.safe_load(match.group(1))
        except yaml.YAMLError as exc:
            errors.append(f"{child.name}: malformed front matter ({exc})")
            continue
        if not isinstance(front, dict):
            errors.append(f"{child.name}: front matter must be a mapping")
            continue
        name = front.get("name")
        check_text(errors, f"{child.name}: name", name, 64)
        check_text(errors, f"{child.name}: description", front.get("description"), 1024, multiline=True)
        if not match.group(2).strip():
            errors.append(f"{child.name}: SKILL.md body is empty")
        if isinstance(name, str):
            identity = f"{plugin_name}:{name}"
            if len(identity) > 64:
                errors.append(f"skill identity {identity} exceeds 64 chars")
            if name in names:
                errors.append(f"duplicate skill name {name} ({names[name]}, {child.name})")
            names[name] = child.name
        validate_agent_metadata(errors, child)
    if not names:
        errors.append("package needs at least one valid skill")
    return len(names)


def validate_plugin(root: Path):
    errors = []
    for forbidden in (".mcp.json", ".app.json", "mcp.json", "hooks"):
        if (root / forbidden).exists():
            errors.append(f"skills-only ZIP must not contain {forbidden}")
    for path in root.rglob("*"):
        if path.is_symlink():
            errors.append(f"symlink not allowed: {path.relative_to(root)}")
        elif path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
            for match in FORBIDDEN.finditer(path.read_text(encoding="utf-8", errors="replace")):
                errors.append(f"forbidden monetization content {match.group(0)!r} in {path.relative_to(root)}")
    manifest = validate_manifest(root, errors)
    skill_count = validate_skills(root, manifest.get("name", PLUGIN), errors)
    return errors, skill_count


def validate_zip(zip_path: Path):
    errors = []
    size = zip_path.stat().st_size
    if size > MAX_ZIP_BYTES:
        errors.append(f"ZIP is {size} bytes (max {MAX_ZIP_BYTES})")
    with zipfile.ZipFile(zip_path) as zf:
        if zf.testzip() is not None:
            errors.append("ZIP has a corrupt member")
        infos = zf.infolist()
        if not infos:
            errors.append("ZIP is empty")
        if len(infos) > MAX_ENTRIES:
            errors.append(f"ZIP has {len(infos)} entries (max {MAX_ENTRIES})")
        total = sum(i.file_size for i in infos)
        if total > MAX_UNCOMPRESSED_BYTES:
            errors.append(f"ZIP extracts to {total} bytes (max {MAX_UNCOMPRESSED_BYTES})")
        seen, top_level = set(), set()
        for info in infos:
            name = info.filename
            parts = name.rstrip("/").split("/")
            if name != name.strip() or "\\" in name or name.startswith("/") or "" in parts or ".." in parts:
                errors.append(f"unsafe ZIP path: {name!r}")
            if len(parts) > MAX_PATH_SEGMENTS:
                errors.append(f"ZIP path deeper than {MAX_PATH_SEGMENTS} segments: {name}")
            if info.file_size > MAX_MEMBER_BYTES:
                errors.append(f"ZIP member over 100 MiB: {name}")
            if info.flag_bits & 0x1:
                errors.append(f"encrypted ZIP member: {name}")
            key = unicodedata.normalize("NFC", name).casefold()
            if key in seen:
                errors.append(f"ZIP path collides after normalization: {name}")
            seen.add(key)
            top_level.add(parts[0])
            if len(parts) == 1 and not name.endswith("/"):
                errors.append(f"sibling file beside the plugin root: {name}")
        if top_level != {PLUGIN}:
            errors.append(f"ZIP must contain exactly one top-level directory {PLUGIN}/, found {sorted(top_level)}")
    return errors


def write_zip(plugin_dir: Path, zip_path: Path):
    zip_path.unlink(missing_ok=True)
    files = sorted(p for p in plugin_dir.rglob("*") if p.is_file() and p.name != ".DS_Store")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in files:
            arcname = f"{PLUGIN}/{path.relative_to(plugin_dir).as_posix()}"
            info = zipfile.ZipInfo(arcname, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zf.writestr(info, path.read_bytes(), compresslevel=9)


def largest_skills(zip_path: Path, count=3):
    sizes = {}
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            parts = info.filename.split("/")
            if len(parts) > 3 and parts[1] == "skills":
                sizes[parts[2]] = sizes.get(parts[2], 0) + info.compress_size
    return sorted(sizes.items(), key=lambda kv: kv[1], reverse=True)[:count]


def main():
    plugin_dir = build_staging()
    errors, skill_count = validate_plugin(plugin_dir)
    zip_path = DIST / f"{PLUGIN}-{builder.VERSION}-openai-directory.zip"
    if not errors:
        write_zip(plugin_dir, zip_path)
        errors = validate_zip(zip_path)
    if errors:
        print("OpenAI directory build failed validation:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
    with zipfile.ZipFile(zip_path) as zf:
        entries = len(zf.infolist())
    print(f"built {zip_path.relative_to(builder.ROOT)}: {skill_count} skills, {entries} files, "
          f"{zip_path.stat().st_size / 1_000_000:.1f} MB")
    print("largest skills (compressed): " + ", ".join(f"{n} {s / 1_000_000:.1f} MB" for n, s in largest_skills(zip_path)))


if __name__ == "__main__":
    main()
