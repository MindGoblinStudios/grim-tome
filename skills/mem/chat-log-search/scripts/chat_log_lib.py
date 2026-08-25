#!/usr/bin/env python3
"""Shared chat log search library for Codex, Claude Code, and Cursor."""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Callable, Iterator


PROVIDERS = ("codex", "claude", "cursor")
APPROVAL_REVIEW_SUBAGENTS = {"guardian", "approvals_reviewer"}
APPROVAL_REVIEW_INSTRUCTION_MARKERS = (
    "You are judging one planned coding-agent action.",
)


class Detail(str, Enum):
    PROMPTS = "prompts"
    MESSAGES = "messages"
    FINAL = "final"
    TOOLS = "tools"
    FULL = "full"


DETAIL_HELP = (
    "Detail layer: "
    "prompts (user prompts only), "
    "messages (user + assistant text, no tools/thinking), "
    "final (user + last assistant text per turn), "
    "tools (tool inputs/outputs only), "
    "full (all extractable events)"
)


@dataclass
class SearchRecord:
    provider: str
    source: str
    timestamp: str | None
    session_id: str | None
    role: str
    kind: str
    text: str
    file: str
    detail: str
    meta: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "source": self.source,
            "timestamp": self.timestamp,
            "session_id": self.session_id,
            "role": self.role,
            "kind": self.kind,
            "text": self.text,
            "file": self.file,
            "detail": self.detail,
            "meta": self.meta,
        }


@dataclass
class SearchOptions:
    query: str
    provider: str
    source: str
    detail: Detail
    after_dt: datetime | None
    before_dt: datetime | None
    limit: int | None
    order: str
    limit_units: str
    recent_window: int | None
    match_all: bool
    session_id_filter: str | None
    regex: bool
    case_sensitive: bool
    snippet: int
    json_output: bool
    no_archived: bool
    exclude_approval_review: bool
    include_cursor_store_db: bool
    codex_home: Path
    claude_home: Path
    cursor_home: Path


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)


def parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def epoch_to_dt(ts, millis: bool = False) -> datetime | None:
    if ts is None:
        return None
    try:
        value = float(ts)
        if millis:
            value /= 1000.0
        return datetime.fromtimestamp(value, tz=timezone.utc)
    except Exception:
        return None


def file_mtime_dt(path: Path) -> datetime | None:
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    except OSError:
        return None


def collapse_ws(text: str) -> str:
    return " ".join(text.split())


def snip(text: str, limit: int) -> str:
    if limit <= 0 or len(text) <= limit:
        return text
    return text[: max(0, limit - 1)] + "…"


def make_matcher(query: str, regex: bool, case_sensitive: bool) -> Callable[[str], bool]:
    if regex:
        flags = 0 if case_sensitive else re.IGNORECASE
        pattern = re.compile(query, flags)
        return lambda s: bool(pattern.search(s))
    if case_sensitive:
        return lambda s: query in s
    q = query.lower()
    return lambda s: q in s.lower()


def within_range(ts: datetime | None, after_dt, before_dt) -> bool:
    if ts is None:
        return after_dt is None and before_dt is None
    if after_dt and ts < after_dt:
        return False
    if before_dt and ts >= before_dt:
        return False
    return True


def session_id_matches(session_id: str | None, session_id_filter: str | None) -> bool:
    if not session_id_filter:
        return True
    return bool(session_id and session_id_filter in session_id)


def json_dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def record_matches(record: SearchRecord, matcher: Callable[[str], bool], detail: Detail) -> bool:
    if detail == Detail.PROMPTS and record.role != "user":
        return False
    if detail == Detail.MESSAGES and record.kind not in {"prompt", "text"}:
        return False
    if detail == Detail.TOOLS and record.kind not in {"tool_input", "tool_output"}:
        return False
    return bool(record.text) and matcher(record.text)


def collect_with_limit(iterator: Iterator[SearchRecord], remaining: int | None) -> list[SearchRecord]:
    return list(iterator)


def record_sort_dt(record: SearchRecord) -> datetime:
    ts = parse_iso(record.timestamp)
    if ts is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    return ts


def tail_records(records: list[SearchRecord], recent_window: int | None) -> list[SearchRecord]:
    if recent_window is None or recent_window <= 0:
        return records
    return records[-recent_window:]


def group_turn_records(records: list[SearchRecord]) -> list[list[SearchRecord]]:
    turns: list[list[SearchRecord]] = []
    current: list[SearchRecord] = []
    for record in sorted(records, key=record_sort_dt):
        if record.role == "user" and current:
            turns.append(current)
            current = [record]
        else:
            current.append(record)
    if current:
        turns.append(current)
    return turns


def finalize_results(results: list[SearchRecord], options: SearchOptions) -> list[SearchRecord]:
    if not results:
        return results

    reverse = options.order == "recent"

    if options.detail == Detail.FINAL and options.limit_units == "turns":
        turns = group_turn_records(results)
        turns.sort(key=lambda turn: record_sort_dt(turn[0]), reverse=reverse)
        if options.limit is not None:
            turns = turns[: options.limit] if reverse else turns[-options.limit :]
        flattened = [record for turn in turns for record in turn]
        if options.order == "oldest":
            flattened.sort(key=record_sort_dt)
        return flattened

    results.sort(key=record_sort_dt, reverse=reverse)
    if options.limit is not None:
        results = results[: options.limit] if reverse else results[-options.limit :]
    elif options.order == "oldest":
        results.sort(key=record_sort_dt)
    return results


def print_results(results: list[SearchRecord], json_output: bool, snippet: int) -> None:
    if json_output:
        json.dump([item.to_dict() for item in results], sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
        return
    for item in results:
        text = snip(collapse_ws(item.text), snippet)
        print(
            f"{item.timestamp or ''} | {item.provider} | {item.source} | {item.detail} | "
            f"{item.kind} | {item.role} | {item.session_id or ''} | {text}"
        )


def finalize_final_turn(
    pending_user: SearchRecord | None,
    last_assistant: SearchRecord | None,
    detail: Detail,
) -> list[SearchRecord]:
    if pending_user is None:
        return []
    out = [pending_user]
    if last_assistant is not None:
        out.append(last_assistant)
    for rec in out:
        rec.detail = detail.value
    return out


def split_final_turns(records: list[SearchRecord], detail: Detail) -> list[list[SearchRecord]]:
    pending_user: SearchRecord | None = None
    last_assistant: SearchRecord | None = None
    turns: list[list[SearchRecord]] = []

    for record in records:
        if record.role == "user" and record.kind in {"prompt", "text"}:
            if pending_user is not None:
                turn = finalize_final_turn(pending_user, last_assistant, detail)
                if turn:
                    turns.append(turn)
            pending_user = record
            last_assistant = None
        elif record.role == "assistant" and record.kind == "text" and record.text.strip():
            last_assistant = record

    if pending_user is not None:
        turn = finalize_final_turn(pending_user, last_assistant, detail)
        if turn:
            turns.append(turn)
    return turns


def turn_matches(turn: list[SearchRecord], matcher: Callable[[str], bool], detail: Detail) -> bool:
    return any(record_matches(record, matcher, detail) for record in turn)


def iter_matched_final_turns(
    turns: list[list[SearchRecord]],
    matcher: Callable[[str], bool],
    detail: Detail,
    limit: int | None,
) -> Iterator[SearchRecord]:
    count = 0
    for turn in turns:
        if not turn_matches(turn, matcher, detail):
            continue
        yield from turn
        count += 1
        if limit is not None and count >= limit:
            return


def yield_matched_records(
    raw_records: list[SearchRecord],
    matcher: Callable[[str], bool],
    detail: Detail,
) -> Iterator[SearchRecord]:
    if detail == Detail.FINAL:
        yield from iter_matched_final_turns(split_final_turns(raw_records, detail), matcher, detail, None)
        return
    for record in raw_records:
        if record_matches(record, matcher, detail):
            yield record


def apply_final_turn_filter(records: list[SearchRecord], detail: Detail) -> list[SearchRecord]:
    finalized: list[SearchRecord] = []
    for turn in split_final_turns(records, detail):
        finalized.extend(turn)
    return finalized


# --- Content extraction helpers ---


def join_parts(parts: list[str]) -> str:
    return "\n".join(part for part in parts if part)


def extract_text_blocks(content, include_types: set[str]) -> str:
    if isinstance(content, str):
        return content if "text" in include_types else ""
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        item_type = item.get("type") or "text"
        if item_type in include_types:
            text = item.get("text")
            if text:
                parts.append(text)
    return join_parts(parts)


def extract_tool_blocks(content) -> list[SearchRecord]:
    records: list[SearchRecord] = []
    if not isinstance(content, list):
        return records
    for item in content:
        if not isinstance(item, dict):
            continue
        item_type = item.get("type")
        if item_type in {"tool_use", "tool-call", "tool_call"}:
            name = item.get("name") or item.get("toolName") or "tool"
            payload = item.get("input")
            if payload is None:
                payload = item.get("arguments")
            text = json_dumps(payload) if isinstance(payload, (dict, list)) else str(payload or "")
            records.append(
                SearchRecord(
                    provider="",
                    source="",
                    timestamp=None,
                    session_id=None,
                    role="tool",
                    kind="tool_input",
                    text=f"{name}\n{text}".strip(),
                    file="",
                    detail="",
                    meta={"tool_name": name, "tool_call_id": item.get("id") or item.get("toolCallId")},
                )
            )
        elif item_type in {"tool_result", "tool-result"}:
            name = item.get("name") or item.get("toolName") or "tool"
            result = item.get("content") or item.get("result") or item.get("output")
            if isinstance(result, list):
                text = extract_text_blocks(result, {"text", "output_text"})
            else:
                text = str(result or "")
            records.append(
                SearchRecord(
                    provider="",
                    source="",
                    timestamp=None,
                    session_id=None,
                    role="tool",
                    kind="tool_output",
                    text=f"{name}\n{text}".strip(),
                    file="",
                    detail="",
                    meta={"tool_name": name, "tool_call_id": item.get("tool_use_id") or item.get("toolCallId")},
                )
            )
    return records


def stamp_record(record: SearchRecord, **kwargs) -> SearchRecord:
    for key, value in kwargs.items():
        setattr(record, key, value)
    return record


# --- Codex ---


def iter_codex_history(
    path: Path,
    matcher: Callable[[str], bool],
    detail: Detail,
    after_dt,
    before_dt,
    recent_window: int | None,
) -> Iterator[SearchRecord]:
    if detail not in {Detail.PROMPTS, Detail.FULL}:
        return
    if not path.exists():
        return
    with path.open() as handle:
        lines = handle.readlines()
    if recent_window is not None and recent_window > 0:
        lines = lines[-recent_window:]
    for line in lines:
        obj = _loads_json(line)
        if obj is None:
            continue
        text = obj.get("text") or ""
        if not text or not matcher(text):
            continue
        ts = epoch_to_dt(obj.get("ts"))
        if not within_range(ts, after_dt, before_dt):
            continue
        yield SearchRecord(
            provider="codex",
            source="history",
            timestamp=ts.isoformat() if ts else None,
            session_id=obj.get("session_id"),
            role="user",
            kind="prompt",
            text=text,
            file=str(path),
            detail=detail.value,
        )


def iter_codex_session_records(path: Path, detail: Detail) -> Iterator[SearchRecord]:
    session_id: str | None = None
    with path.open() as handle:
        for line in handle:
            obj = _loads_json(line)
            if obj is None:
                continue
            if obj.get("type") == "session_meta":
                payload = obj.get("payload") or {}
                session_id = payload.get("id") or payload.get("session_id")
                continue
            if obj.get("type") != "response_item":
                continue
            payload = obj.get("payload") or {}
            ts = parse_iso(obj.get("timestamp"))
            timestamp = ts.isoformat() if ts else None
            payload_type = payload.get("type")

            if payload_type == "message":
                role = payload.get("role") or "unknown"
                content = payload.get("content")
                if detail in {Detail.PROMPTS, Detail.MESSAGES, Detail.FINAL, Detail.FULL}:
                    if role == "user":
                        text = extract_text_blocks(content, {"text", "input_text"}) or extract_text_blocks(content, {"text"})
                        if not text and isinstance(content, str):
                            text = content
                        if text:
                            yield stamp_record(
                                SearchRecord("", "session", timestamp, session_id, role, "text", text, str(path), detail.value),
                                provider="codex",
                            )
                    elif role == "assistant" and detail in {Detail.MESSAGES, Detail.FINAL, Detail.FULL}:
                        text = extract_text_blocks(content, {"text", "output_text"})
                        if text:
                            yield stamp_record(
                                SearchRecord("", "session", timestamp, session_id, role, "text", text, str(path), detail.value),
                                provider="codex",
                            )
                if detail in {Detail.TOOLS, Detail.FULL}:
                    for tool_record in extract_tool_blocks(content):
                        yield stamp_record(
                            tool_record,
                            provider="codex",
                            source="session",
                            timestamp=timestamp,
                            session_id=session_id,
                            file=str(path),
                            detail=detail.value,
                        )
            elif payload_type == "function_call" and detail in {Detail.TOOLS, Detail.FULL}:
                name = payload.get("name") or "tool"
                args = payload.get("arguments") or ""
                yield SearchRecord(
                    provider="codex",
                    source="session",
                    timestamp=timestamp,
                    session_id=session_id,
                    role="tool",
                    kind="tool_input",
                    text=f"{name}\n{args}".strip(),
                    file=str(path),
                    detail=detail.value,
                    meta={"tool_name": name, "tool_call_id": payload.get("call_id")},
                )
            elif payload_type == "function_call_output" and detail in {Detail.TOOLS, Detail.FULL}:
                output = payload.get("output") or ""
                yield SearchRecord(
                    provider="codex",
                    source="session",
                    timestamp=timestamp,
                    session_id=session_id,
                    role="tool",
                    kind="tool_output",
                    text=str(output),
                    file=str(path),
                    detail=detail.value,
                    meta={"tool_call_id": payload.get("call_id")},
                )
            elif payload_type == "reasoning" and detail == Detail.FULL:
                text = payload.get("summary") or payload.get("text") or json_dumps(payload)
                yield SearchRecord(
                    provider="codex",
                    source="session",
                    timestamp=timestamp,
                    session_id=session_id,
                    role="assistant",
                    kind="reasoning",
                    text=str(text),
                    file=str(path),
                    detail=detail.value,
                )


def is_codex_approval_review_session(path: Path) -> bool:
    """Return whether Codex session metadata identifies an approval reviewer."""
    try:
        with path.open() as handle:
            for line in handle:
                obj = _loads_json(line)
                if obj is None or obj.get("type") != "session_meta":
                    continue

                payload = obj.get("payload") or {}
                source = payload.get("source") or {}
                subagent = source.get("subagent") if isinstance(source, dict) else None
                if isinstance(subagent, dict) and subagent.get("other") in APPROVAL_REVIEW_SUBAGENTS:
                    return True

                base_instructions = payload.get("base_instructions") or {}
                if isinstance(base_instructions, dict):
                    instruction_text = base_instructions.get("text") or ""
                else:
                    instruction_text = str(base_instructions)
                return any(marker in instruction_text for marker in APPROVAL_REVIEW_INSTRUCTION_MARKERS)
    except OSError:
        return False
    return False


def iter_codex_sessions(
    base_dir: Path,
    matcher: Callable[[str], bool],
    detail: Detail,
    after_dt,
    before_dt,
    session_id_filter: str | None,
    include_archived: bool,
    recent_window: int | None,
    exclude_approval_review: bool,
) -> Iterator[SearchRecord]:
    session_paths: list[Path] = []
    sessions_root = base_dir / "sessions"
    if sessions_root.exists():
        session_paths.extend(sorted(sessions_root.rglob("*.jsonl")))
    if include_archived:
        archived_root = base_dir / "archived_sessions"
        if archived_root.exists():
            session_paths.extend(sorted(archived_root.glob("*.jsonl")))

    for path in session_paths:
        if exclude_approval_review and is_codex_approval_review_session(path):
            continue

        session_id: str | None = None
        raw_records: list[SearchRecord] = []
        for record in iter_codex_session_records(path, detail):
            if session_id is None:
                session_id = record.session_id
            if not session_id_matches(record.session_id, session_id_filter):
                raw_records = []
                break
            ts = parse_iso(record.timestamp) if record.timestamp else None
            if not within_range(ts, after_dt, before_dt):
                continue
            raw_records.append(record)

        if not raw_records:
            continue

        raw_records = tail_records(raw_records, recent_window)
        yield from yield_matched_records(raw_records, matcher, detail)


def search_codex(options: SearchOptions, matcher: Callable[[str], bool]) -> Iterator[SearchRecord]:
    if options.source in {"history", "both"} and options.detail in {Detail.PROMPTS, Detail.FULL}:
        yield from iter_codex_history(
            options.codex_home / "history.jsonl",
            matcher,
            options.detail,
            options.after_dt,
            options.before_dt,
            options.recent_window,
        )

    if options.source in {"sessions", "both"}:
        yield from iter_codex_sessions(
            options.codex_home,
            matcher,
            options.detail,
            options.after_dt,
            options.before_dt,
            options.session_id_filter,
            not options.no_archived,
            options.recent_window,
            options.exclude_approval_review,
        )


# --- Claude ---


def iter_claude_history(
    path: Path,
    matcher: Callable[[str], bool],
    detail: Detail,
    after_dt,
    before_dt,
    recent_window: int | None,
) -> Iterator[SearchRecord]:
    if detail not in {Detail.PROMPTS, Detail.FULL}:
        return
    if not path.exists():
        return
    with path.open() as handle:
        lines = handle.readlines()
    if recent_window is not None and recent_window > 0:
        lines = lines[-recent_window:]
    for line in lines:
        obj = _loads_json(line)
        if obj is None:
            continue
        text = obj.get("display") or ""
        if not text or not matcher(text):
            continue
        ts = epoch_to_dt(obj.get("timestamp"), millis=True)
        if not within_range(ts, after_dt, before_dt):
            continue
        yield SearchRecord(
            provider="claude",
            source="history",
            timestamp=ts.isoformat() if ts else None,
            session_id=obj.get("sessionId"),
            role="user",
            kind="prompt",
            text=text,
            file=str(path),
            detail=detail.value,
            meta={"project": obj.get("project")},
        )


def iter_claude_session_records(path: Path, detail: Detail) -> Iterator[SearchRecord]:
    session_id = path.stem
    with path.open() as handle:
        for line in handle:
            obj = _loads_json(line)
            if obj is None:
                continue
            entry_type = obj.get("type")
            ts = parse_iso(obj.get("timestamp"))
            timestamp = ts.isoformat() if ts else None
            current_session_id = obj.get("sessionId") or session_id

            if entry_type == "user":
                message = obj.get("message") or {}
                content = message.get("content")
                if detail in {Detail.PROMPTS, Detail.MESSAGES, Detail.FINAL, Detail.FULL}:
                    if isinstance(content, str):
                        text = content
                    else:
                        text = extract_text_blocks(content, {"text", "output_text"})
                    if text:
                        yield SearchRecord(
                            provider="claude",
                            source="session",
                            timestamp=timestamp,
                            session_id=current_session_id,
                            role="user",
                            kind="text",
                            text=text,
                            file=str(path),
                            detail=detail.value,
                        )
                if detail in {Detail.TOOLS, Detail.FULL}:
                    for tool_record in extract_tool_blocks(content):
                        yield stamp_record(
                            tool_record,
                            provider="claude",
                            source="session",
                            timestamp=timestamp,
                            session_id=current_session_id,
                            file=str(path),
                            detail=detail.value,
                        )
            elif entry_type == "assistant":
                message = obj.get("message") or {}
                content = message.get("content")
                if detail in {Detail.MESSAGES, Detail.FINAL, Detail.FULL}:
                    text = extract_text_blocks(content, {"text", "output_text"})
                    if text:
                        yield SearchRecord(
                            provider="claude",
                            source="session",
                            timestamp=timestamp,
                            session_id=current_session_id,
                            role="assistant",
                            kind="text",
                            text=text,
                            file=str(path),
                            detail=detail.value,
                        )
                if detail in {Detail.TOOLS, Detail.FULL}:
                    for tool_record in extract_tool_blocks(content):
                        yield stamp_record(
                            tool_record,
                            provider="claude",
                            source="session",
                            timestamp=timestamp,
                            session_id=current_session_id,
                            file=str(path),
                            detail=detail.value,
                        )
                if detail == Detail.FULL:
                    thinking = extract_text_blocks(content, {"thinking"})
                    if thinking:
                        yield SearchRecord(
                            provider="claude",
                            source="session",
                            timestamp=timestamp,
                            session_id=current_session_id,
                            role="assistant",
                            kind="reasoning",
                            text=thinking,
                            file=str(path),
                            detail=detail.value,
                        )
            elif detail == Detail.FULL and entry_type not in {"queue-operation"}:
                yield SearchRecord(
                    provider="claude",
                    source="session",
                    timestamp=timestamp,
                    session_id=current_session_id,
                    role=entry_type,
                    kind="raw",
                    text=json_dumps(obj),
                    file=str(path),
                    detail=detail.value,
                )


def iter_claude_sessions(
    base_dir: Path,
    matcher: Callable[[str], bool],
    detail: Detail,
    after_dt,
    before_dt,
    session_id_filter: str | None,
    recent_window: int | None,
) -> Iterator[SearchRecord]:
    projects_root = base_dir / "projects"
    if not projects_root.exists():
        return
    for path in sorted(projects_root.rglob("*.jsonl")):
        raw_records: list[SearchRecord] = []
        for record in iter_claude_session_records(path, detail):
            if not session_id_matches(record.session_id, session_id_filter):
                raw_records = []
                break
            ts = parse_iso(record.timestamp) if record.timestamp else None
            if not within_range(ts, after_dt, before_dt):
                continue
            raw_records.append(record)
        if not raw_records:
            continue
        raw_records = tail_records(raw_records, recent_window)
        yield from yield_matched_records(raw_records, matcher, detail)


def search_claude(options: SearchOptions, matcher: Callable[[str], bool]) -> Iterator[SearchRecord]:
    if options.source in {"history", "both"} and options.detail in {Detail.PROMPTS, Detail.FULL}:
        yield from iter_claude_history(
            options.claude_home / "history.jsonl",
            matcher,
            options.detail,
            options.after_dt,
            options.before_dt,
            options.recent_window,
        )

    if options.source in {"sessions", "both"}:
        yield from iter_claude_sessions(
            options.claude_home,
            matcher,
            options.detail,
            options.after_dt,
            options.before_dt,
            options.session_id_filter,
            options.recent_window,
        )


# --- Cursor ---


def cursor_session_timestamp(path: Path) -> datetime | None:
    for meta_path in (path.parent / "meta.json", path.with_name("meta.json")):
        if not meta_path.exists():
            continue
        try:
            meta = json.loads(meta_path.read_text())
            ts = epoch_to_dt(meta.get("updatedAtMs") or meta.get("createdAtMs"), millis=True)
            if ts:
                return ts
        except (OSError, json.JSONDecodeError, TypeError):
            pass
    return file_mtime_dt(path)


def iter_cursor_message_records(
    obj: dict,
    path: Path,
    session_id: str,
    timestamp: str | None,
    detail: Detail,
) -> Iterator[SearchRecord]:
    role = obj.get("role") or "unknown"
    content = obj.get("content")
    if "message" in obj:
        message = obj.get("message") or {}
        role = message.get("role") or role
        content = message.get("content")

    if detail in {Detail.PROMPTS, Detail.MESSAGES, Detail.FINAL, Detail.FULL} and role == "user":
        if isinstance(content, str):
            text = content
        else:
            text = extract_text_blocks(content, {"text"})
        if text:
            yield SearchRecord(
                provider="cursor",
                source="session",
                timestamp=timestamp,
                session_id=session_id,
                role="user",
                kind="text",
                text=text,
                file=str(path),
                detail=detail.value,
            )

    if detail in {Detail.MESSAGES, Detail.FINAL, Detail.FULL} and role == "assistant":
        text = extract_text_blocks(content, {"text"})
        if text:
            yield SearchRecord(
                provider="cursor",
                source="session",
                timestamp=timestamp,
                session_id=session_id,
                role="assistant",
                kind="text",
                text=text,
                file=str(path),
                detail=detail.value,
            )
        if detail == Detail.FULL:
            reasoning = extract_text_blocks(content, {"redacted-reasoning", "reasoning", "thinking"})
            if reasoning:
                yield SearchRecord(
                    provider="cursor",
                    source="session",
                    timestamp=timestamp,
                    session_id=session_id,
                    role="assistant",
                    kind="reasoning",
                    text=reasoning,
                    file=str(path),
                    detail=detail.value,
                )

    if detail in {Detail.TOOLS, Detail.FULL}:
        if role == "tool":
            tool_records = extract_tool_blocks(content)
        else:
            tool_records = extract_tool_blocks(content)
        for tool_record in tool_records:
            yield stamp_record(
                tool_record,
                provider="cursor",
                source="session",
                timestamp=timestamp,
                session_id=session_id,
                file=str(path),
                detail=detail.value,
            )

    if detail == Detail.FULL and role == "system":
        text = content if isinstance(content, str) else extract_text_blocks(content, {"text"})
        if text:
            yield SearchRecord(
                provider="cursor",
                source="session",
                timestamp=timestamp,
                session_id=session_id,
                role="system",
                kind="raw",
                text=text,
                file=str(path),
                detail=detail.value,
            )


def collect_cursor_session_records(
    path: Path,
    detail: Detail,
    after_dt,
    before_dt,
    session_id_filter: str | None,
) -> list[SearchRecord]:
    session_id = path.stem
    if not session_id_matches(session_id, session_id_filter):
        return []
    session_ts = cursor_session_timestamp(path)
    if not within_range(session_ts, after_dt, before_dt):
        return []
    timestamp = session_ts.isoformat() if session_ts else None
    raw_records: list[SearchRecord] = []
    with path.open() as handle:
        for line in handle:
            obj = _loads_json(line)
            if obj is None:
                continue
            raw_records.extend(iter_cursor_message_records(obj, path, session_id, timestamp, detail))
    return raw_records


def iter_cursor_transcript_file(
    path: Path,
    detail: Detail,
    after_dt,
    before_dt,
    session_id_filter: str | None,
) -> Iterator[SearchRecord]:
    yield from collect_cursor_session_records(path, detail, after_dt, before_dt, session_id_filter)


def collect_cursor_store_db_records(
    path: Path,
    detail: Detail,
    after_dt,
    before_dt,
    session_id_filter: str | None,
) -> list[SearchRecord]:
    session_id = path.parent.name
    if not session_id_matches(session_id, session_id_filter):
        return []
    session_ts = cursor_session_timestamp(path)
    if not within_range(session_ts, after_dt, before_dt):
        return []
    timestamp = session_ts.isoformat() if session_ts else None
    try:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    except sqlite3.Error:
        return []
    try:
        rows = conn.execute("SELECT data FROM blobs").fetchall()
    finally:
        conn.close()

    raw_records: list[SearchRecord] = []
    for (data,) in rows:
        try:
            obj = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            continue
        raw_records.extend(iter_cursor_message_records(obj, path, session_id, timestamp, detail))
    return raw_records


def iter_cursor_sessions(
    base_dir: Path,
    matcher: Callable[[str], bool],
    detail: Detail,
    after_dt,
    before_dt,
    session_id_filter: str | None,
    include_store_db: bool,
    recent_window: int | None,
) -> Iterator[SearchRecord]:
    projects_root = base_dir / "projects"
    if projects_root.exists():
        for path in sorted(projects_root.glob("**/agent-transcripts/*/*.jsonl")):
            raw_records = collect_cursor_session_records(path, detail, after_dt, before_dt, session_id_filter)
            raw_records = tail_records(raw_records, recent_window)
            if raw_records:
                yield from yield_matched_records(raw_records, matcher, detail)

    if include_store_db:
        chats_root = base_dir / "chats"
        if chats_root.exists():
            for path in sorted(chats_root.glob("**/store.db")):
                raw_records = collect_cursor_store_db_records(path, detail, after_dt, before_dt, session_id_filter)
                raw_records = tail_records(raw_records, recent_window)
                if raw_records:
                    yield from yield_matched_records(raw_records, matcher, detail)


def search_cursor(options: SearchOptions, matcher: Callable[[str], bool]) -> Iterator[SearchRecord]:
    if options.source == "history":
        return
    yield from iter_cursor_sessions(
        options.cursor_home,
        matcher,
        options.detail,
        options.after_dt,
        options.before_dt,
        options.session_id_filter,
        options.include_cursor_store_db,
        options.recent_window,
    )


# --- Shared CLI / orchestration ---


def _loads_json(line: str):
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None


def add_common_arguments(parser: argparse.ArgumentParser, provider: str) -> None:
    parser.add_argument("query", nargs="?", default="", help="Search text or regex")
    parser.add_argument(
        "--source",
        choices=["history", "sessions", "both"],
        default="history",
        help="Log source layer: history index, session logs, or both",
    )
    parser.add_argument(
        "--detail",
        choices=[item.value for item in Detail],
        default=Detail.PROMPTS.value,
        help=DETAIL_HELP,
    )
    parser.add_argument("--after", help="Start date YYYY-MM-DD (UTC)")
    parser.add_argument("--before", help="End date YYYY-MM-DD (UTC, inclusive)")
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Max results to return after sorting (default: 50 most recent). Use 0 for all matches.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Return all matching records (same as --limit 0)",
    )
    parser.add_argument(
        "--order",
        choices=["recent", "oldest"],
        default="recent",
        help="Result ordering by timestamp (default: recent = newest first)",
    )
    parser.add_argument(
        "--limit-units",
        choices=["records", "turns"],
        default="records",
        help="For --detail final, count --limit in turns instead of individual records",
    )
    parser.add_argument(
        "--recent-window",
        type=int,
        default=None,
        help="Only search within the last N raw records/lines per history file or session",
    )
    parser.add_argument(
        "--match-all",
        action="store_true",
        help="Ignore query filtering and return all records allowed by source/detail (query optional)",
    )
    parser.add_argument("--session-id", help="Filter by session id substring")
    parser.add_argument("--regex", action="store_true", help="Treat query as regex")
    parser.add_argument("--case-sensitive", action="store_true")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--snippet", type=int, default=200, help="Max chars per line")
    if provider == "codex":
        parser.add_argument("--no-archived", action="store_true", help="Skip archived Codex sessions")
        parser.add_argument(
            "--exclude-approval-review",
            action="store_true",
            help="Skip Codex Guardian approval-review sessions",
        )
        parser.add_argument("--codex-home", default=os.environ.get("CODEX_HOME") or "~/.codex")
    if provider == "claude":
        parser.add_argument("--claude-home", default=os.environ.get("CLAUDE_HOME") or "~/.claude")
    if provider == "cursor":
        parser.add_argument(
            "--include-store-db",
            action="store_true",
            help="Also scan ~/.cursor/chats/**/store.db (agent-transcripts are preferred)",
        )
        parser.add_argument("--cursor-home", default=os.environ.get("CURSOR_HOME") or "~/.cursor")
    if provider == "all":
        parser.add_argument("--no-archived", action="store_true", help="Skip archived Codex sessions")
        parser.add_argument(
            "--exclude-approval-review",
            action="store_true",
            help="Skip Codex Guardian approval-review sessions",
        )
        parser.add_argument(
            "--include-cursor-store-db",
            action="store_true",
            help="Also scan ~/.cursor/chats/**/store.db",
        )
        parser.add_argument("--codex-home", default=os.environ.get("CODEX_HOME") or "~/.codex")
        parser.add_argument("--claude-home", default=os.environ.get("CLAUDE_HOME") or "~/.claude")
        parser.add_argument("--cursor-home", default=os.environ.get("CURSOR_HOME") or "~/.cursor")


def options_from_args(args: argparse.Namespace, provider: str) -> SearchOptions:
    limit = None if args.all or args.limit == 0 else (args.limit if args.limit > 0 else None)
    recent_window = args.recent_window if args.recent_window and args.recent_window > 0 else None
    return SearchOptions(
        query=args.query or "",
        provider=provider,
        source=args.source,
        detail=Detail(args.detail),
        after_dt=parse_date(args.after) if args.after else None,
        before_dt=parse_date(args.before) + timedelta(days=1) if args.before else None,
        limit=limit,
        order=args.order,
        limit_units=args.limit_units,
        recent_window=recent_window,
        match_all=args.match_all,
        session_id_filter=args.session_id,
        regex=args.regex,
        case_sensitive=args.case_sensitive,
        snippet=args.snippet,
        json_output=args.json,
        no_archived=getattr(args, "no_archived", False),
        exclude_approval_review=getattr(args, "exclude_approval_review", False),
        include_cursor_store_db=getattr(args, "include_store_db", False)
        or getattr(args, "include_cursor_store_db", False),
        codex_home=Path(os.path.expanduser(getattr(args, "codex_home", "~/.codex"))),
        claude_home=Path(os.path.expanduser(getattr(args, "claude_home", "~/.claude"))),
        cursor_home=Path(os.path.expanduser(getattr(args, "cursor_home", "~/.cursor"))),
    )


def run_provider_search(provider: str, options: SearchOptions, *, finalize: bool = True) -> list[SearchRecord]:
    if options.match_all:
        matcher = lambda _text: True
    else:
        matcher = make_matcher(options.query, options.regex, options.case_sensitive)

    if provider == "codex":
        results = list(search_codex(options, matcher))
        return finalize_results(results, options) if finalize else results
    if provider == "claude":
        results = list(search_claude(options, matcher))
        return finalize_results(results, options) if finalize else results
    if provider == "cursor":
        results = list(search_cursor(options, matcher))
        return finalize_results(results, options) if finalize else results

    results: list[SearchRecord] = []
    for current in PROVIDERS:
        scoped = SearchOptions(
            query=options.query,
            provider=current,
            source=options.source,
            detail=options.detail,
            after_dt=options.after_dt,
            before_dt=options.before_dt,
            limit=options.limit,
            order=options.order,
            limit_units=options.limit_units,
            recent_window=options.recent_window,
            match_all=options.match_all,
            session_id_filter=options.session_id_filter,
            regex=options.regex,
            case_sensitive=options.case_sensitive,
            snippet=options.snippet,
            json_output=options.json_output,
            no_archived=options.no_archived,
            exclude_approval_review=options.exclude_approval_review,
            include_cursor_store_db=options.include_cursor_store_db,
            codex_home=options.codex_home,
            claude_home=options.claude_home,
            cursor_home=options.cursor_home,
        )
        results.extend(run_provider_search(current, scoped, finalize=False))
    return finalize_results(results, options) if finalize else results


def run_cli(provider: str, description: str) -> int:
    parser = argparse.ArgumentParser(description=description)
    add_common_arguments(parser, provider)
    args = parser.parse_args()
    if not args.query and not args.match_all:
        print("Query is required unless --match-all is set", file=sys.stderr)
        return 2
    options = options_from_args(args, provider)
    results = run_provider_search(provider, options)
    print_results(results, options.json_output, options.snippet)
    return 0
