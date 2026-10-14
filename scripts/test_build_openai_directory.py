"""Offline checks for the OpenAI plugin directory build."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("directory", Path(__file__).with_name("build-openai-directory.py"))
directory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(directory)


class StripTests(unittest.TestCase):
    def test_md_section_stops_at_same_level_heading(self):
        text = "## Rhythm\nkeep\n### Bell\nask\n#### Rules\nmore\n### Next\nkeep too\n"
        self.assertEqual(directory.drop_md_section(text, "### Bell"), "## Rhythm\nkeep\n### Next\nkeep too\n")

    def test_yaml_item_removal_keeps_neighbors(self):
        text = "routines:\n  - id: a\n    name: A\n\n  # --- one-shots ---\n  - id: bell\n    name: Bell\n\nnotes:\n  - x\n"
        out = directory.drop_yaml_list_item(text, "bell", comment="  # --- one-shots ---")
        self.assertEqual(out, "routines:\n  - id: a\n    name: A\n\nnotes:\n  - x\n")

    def test_missing_targets_fail_loudly(self):
        with self.assertRaises(ValueError):
            directory.drop_md_section("## Other\n", "### Bell")
        with self.assertRaises(ValueError):
            directory.drop_text("nothing here", "Tithe")
        with self.assertRaises(ValueError):
            directory.drop_yaml_list_item("routines: []\n", "bell")


class DirectoryBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        directory.DIST = Path(cls.tmp.name)
        cls.plugin_dir = directory.build_staging()

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_build_is_clean_and_has_one_manifest(self):
        errors, skill_count = directory.validate_plugin(self.plugin_dir)
        self.assertEqual(errors, [])
        self.assertGreater(skill_count, 0)
        self.assertFalse((self.plugin_dir / ".claude-plugin").exists())
        self.assertFalse((self.plugin_dir / ".cursor-plugin").exists())
        manifest = json.loads((self.plugin_dir / ".codex-plugin/plugin.json").read_text())
        self.assertEqual(manifest["version"], directory.builder.VERSION)
        self.assertEqual(manifest["interface"]["logo"], "./assets/logo.png")

    def test_repo_source_keeps_the_tithe_bell(self):
        source = directory.builder.ROOT / "skills/council/council/SKILL.md"
        self.assertIn("### The Tithe Bell", source.read_text())

    def test_zip_has_single_root(self):
        zip_path = Path(self.tmp.name) / "out.zip"
        directory.write_zip(self.plugin_dir, zip_path)
        self.assertEqual(directory.validate_zip(zip_path), [])

    def test_validator_flags_listing_and_monetization_problems(self):
        bad = Path(self.tmp.name) / "bad"
        shutil.copytree(self.plugin_dir, bad)
        manifest_path = bad / ".codex-plugin/plugin.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["interface"]["displayName"] = "A display name far longer than thirty characters"
        manifest["interface"]["websiteURL"] = "http://example.com"
        manifest["interface"]["screenshots"] = ["./assets/logo.png"]
        manifest["extensions"]["com.openai"]["publication"]["countries"] = "TODO"
        manifest_path.write_text(json.dumps(manifest))
        (bad / "skills/grim-council/SKILL.md").write_text("---\nname: grim-council\ndescription: x\n---\nSee buy.stripe.com/abc\n")
        errors = "\n".join(directory.validate_plugin(bad)[0])
        for expected in ("displayName", "websiteURL", "screenshots", "TODO", "countries", "buy.stripe.com"):
            self.assertIn(expected, errors)


if __name__ == "__main__":
    unittest.main()
