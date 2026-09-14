"""Offline checks for runtime assets in marketplace skill bundles."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("builder", Path(__file__).with_name("build-marketplace.py"))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class BundleAssetsTests(unittest.TestCase):
    def test_referenced_large_icons_survive_display_image_filter(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, dest = Path(tmp) / "source", Path(tmp) / "bundle"
            (source / "agents").mkdir(parents=True)
            (source / "assets").mkdir()
            (source / "agents/openai.yaml").write_text('interface:\n  icon_small: "./assets/small.png"\n  icon_large: ./assets/large.png\n')
            for name in ("small.png", "large.png", "portrait.png"):
                (source / "assets" / name).write_bytes(b"x" * (builder.MAX_IMAGE_BYTES + 1))
            (source / "__pycache__").mkdir()
            (source / "__pycache__/cache.pyc").write_bytes(b"cache")
            builder.copy_skill(source, dest)
            self.assertTrue((dest / "assets/small.png").is_file())
            self.assertTrue((dest / "assets/large.png").is_file())
            self.assertFalse((dest / "assets/portrait.png").exists())
            self.assertFalse((dest / "__pycache__").exists())

    def test_pet_spritesheet_survives_display_image_filter(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, dest = Path(tmp) / "source", Path(tmp) / "bundle"
            pet = source / "assets/pet"
            (pet / "frames").mkdir(parents=True)
            manifest = {"spriteVersionNumber": 2, "spritesheetPath": "frames/spritesheet.webp"}
            (pet / "pet.json").write_text(json.dumps(manifest))
            sprite = b"sprite" * (builder.MAX_IMAGE_BYTES // 6 + 1)
            (pet / "frames/spritesheet.webp").write_bytes(sprite)
            (pet / "unused.webp").write_bytes(sprite)
            builder.copy_skill(source, dest)
            copied_pet = dest / "assets/pet"
            copied_manifest = json.loads((copied_pet / "pet.json").read_text())
            self.assertEqual(copied_manifest, manifest)
            self.assertEqual((copied_pet / copied_manifest["spritesheetPath"]).read_bytes(), sprite)
            self.assertFalse((copied_pet / "unused.webp").exists())

    def test_missing_pet_spritesheet_fails_build(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source"
            source.mkdir()
            (source / "pet.json").write_text(json.dumps({"spritesheetPath": "missing.webp"}))
            with self.assertRaisesRegex(ValueError, "inside the skill"):
                builder.copy_skill(source, Path(tmp) / "bundle")

    def test_pet_spritesheet_cannot_reference_an_external_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source"
            source.mkdir()
            outside = Path(tmp) / "outside.webp"
            outside.write_bytes(b"outside")
            for value in ("../outside.webp", str(outside)):
                with self.subTest(path=value):
                    (source / "pet.json").write_text(json.dumps({"spritesheetPath": value}))
                    with self.assertRaises(ValueError):
                        builder.copy_skill(source, Path(tmp) / "bundle")

if __name__ == "__main__":
    unittest.main()
