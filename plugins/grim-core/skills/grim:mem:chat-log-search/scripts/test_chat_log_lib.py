#!/usr/bin/env python3
"""Focused tests for Chat Log Search session filtering."""

import json
import tempfile
import unittest
from pathlib import Path

from chat_log_lib import Detail, is_codex_approval_review_session, iter_codex_sessions


class ApprovalReviewFilterTests(unittest.TestCase):
    def write_session(
        self,
        root: Path,
        session_id: str,
        source: dict,
        text: str,
        base_instructions: str = "",
    ) -> Path:
        path = root / "sessions" / "2026" / "08" / "21" / f"rollout-{session_id}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        records = [
            {
                "timestamp": "2026-08-21T12:00:00Z",
                "type": "session_meta",
                "payload": {
                    "id": session_id,
                    "source": source,
                    "base_instructions": {"text": base_instructions},
                },
            },
            {
                "timestamp": "2026-08-21T12:00:01Z",
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": text}],
                },
            },
        ]
        path.write_text("\n".join(json.dumps(record) for record in records) + "\n")
        return path

    def test_metadata_detection_distinguishes_guardian_from_normal_subagent(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            guardian = self.write_session(
                root,
                "guardian-session",
                {"subagent": {"other": "guardian"}},
                "approval transcript",
            )
            normal = self.write_session(
                root,
                "normal-session",
                {"subagent": {"other": "worker"}},
                "user conversation",
            )
            metadata_fallback = self.write_session(
                root,
                "fallback-session",
                {},
                "approval transcript",
                "You are judging one planned coding-agent action.",
            )

            self.assertTrue(is_codex_approval_review_session(guardian))
            self.assertFalse(is_codex_approval_review_session(normal))
            self.assertTrue(is_codex_approval_review_session(metadata_fallback))

    def test_session_search_excludes_only_approval_reviews_when_requested(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.write_session(
                root,
                "guardian-session",
                {"subagent": {"other": "guardian"}},
                "approval transcript",
            )
            self.write_session(
                root,
                "normal-session",
                {"subagent": {"other": "worker"}},
                "user conversation",
            )

            records = list(
                iter_codex_sessions(
                    root,
                    lambda _text: True,
                    Detail.PROMPTS,
                    None,
                    None,
                    None,
                    True,
                    None,
                    True,
                )
            )

            self.assertEqual([record.session_id for record in records], ["normal-session"])
            self.assertEqual([record.text for record in records], ["user conversation"])


if __name__ == "__main__":
    unittest.main()
