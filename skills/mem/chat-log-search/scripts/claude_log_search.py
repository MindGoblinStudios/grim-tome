#!/usr/bin/env python3
"""Search Claude Code chat logs."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from chat_log_lib import run_cli


if __name__ == "__main__":
    raise SystemExit(run_cli("claude", "Search Claude Code chat logs"))
