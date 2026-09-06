"""Offline checks for runtime assets in marketplace skill bundles."""
import importlib.util
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

if __name__ == "__main__":
    unittest.main()
