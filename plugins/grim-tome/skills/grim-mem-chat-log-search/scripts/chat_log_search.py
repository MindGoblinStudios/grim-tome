#!/usr/bin/env python3
"""Search all local chat logs (Codex, Claude Code, Cursor)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from chat_log_lib import run_cli


if __name__ == "__main__":
    raise SystemExit(run_cli("all", "Search Codex, Claude Code, and Cursor chat logs"))
