#!/usr/bin/env python3
"""Tiny OpenRouter runner for Minion outside-opinion calls."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request


API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_CONVERSATION_DIR = os.path.join(".agents", "minion", "openrouter")


def slugify(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-")
    if not slug:
        raise SystemExit("Conversation name must include at least one letter or number.")
    return slug


def conversation_path(args: argparse.Namespace) -> str | None:
    if args.conversation_file:
        return args.conversation_file
    if args.conversation:
        return os.path.join(DEFAULT_CONVERSATION_DIR, f"{slugify(args.conversation)}.json")
    return None


def load_conversation(path: str | None, reset: bool) -> dict[str, object]:
    if not path or reset or not os.path.exists(path):
        return {"messages": []}
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise SystemExit(f"Conversation file is not an object: {path}")
    messages = data.get("messages", [])
    if not isinstance(messages, list):
        raise SystemExit(f"Conversation file has invalid messages array: {path}")
    return data


def save_conversation(path: str, data: dict[str, object]) -> None:
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")


def list_conversations() -> int:
    root = DEFAULT_CONVERSATION_DIR
    if not os.path.isdir(root):
        return 0
    for name in sorted(os.listdir(root)):
        if name.endswith(".json"):
            print(os.path.join(root, name))
    return 0


def read_prompt(args: argparse.Namespace) -> str:
    if args.prompt_file:
        with open(args.prompt_file, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    if args.prompt:
        return " ".join(args.prompt).strip()
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    return input("Prompt: ").strip()


def resolve_model(args: argparse.Namespace, conversation: dict[str, object]) -> str:
    saved_model = conversation.get("model")
    if saved_model is not None and not isinstance(saved_model, str):
        raise SystemExit("Conversation file has invalid model value.")
    model = args.model or saved_model or os.environ.get("OPENROUTER_MODEL", "").strip()
    if model:
        return model
    if sys.stdin.isatty():
        return input("OpenRouter model (for example openai/gpt-4.1): ").strip()
    raise SystemExit("Missing model. Pass --model or set OPENROUTER_MODEL.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prompt", nargs="*", help="Prompt text. Reads stdin when omitted.")
    parser.add_argument("--prompt-file", help="Read prompt text from a file.")
    parser.add_argument("--model", help="OpenRouter model id, for example openai/gpt-4.1.")
    parser.add_argument("--system", default="You are a concise coding assistant.")
    parser.add_argument("--max-tokens", type=int, default=4096)
    parser.add_argument("--temperature", type=float, default=0.2)
    parser.add_argument("--reasoning-effort", choices=["none", "minimal", "low", "medium", "high", "xhigh"], default=None)
    parser.add_argument("--reasoning-max-tokens", type=int, default=None, help="Budget reasoning tokens through OpenRouter's reasoning.max_tokens option.")
    parser.add_argument("--reasoning-exclude", action="store_true", help="Let reasoning models think internally, but exclude reasoning tokens from the response.")
    parser.add_argument("--conversation", help="Resume/save a named conversation under .agents/minion/openrouter/.")
    parser.add_argument("--conversation-file", help="Resume/save an explicit conversation JSON file.")
    parser.add_argument("--reset-conversation", action="store_true", help="Start the named conversation over before sending this prompt.")
    parser.add_argument("--no-save", action="store_true", help="Do not write the conversation after the response.")
    parser.add_argument("--list-conversations", action="store_true", help="List saved OpenRouter Minion conversations.")
    args = parser.parse_args()

    if args.list_conversations:
        return list_conversations()

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Missing OPENROUTER_API_KEY.")

    path = conversation_path(args)
    conversation = load_conversation(path, args.reset_conversation)
    model = resolve_model(args, conversation)
    prompt = read_prompt(args)
    if not prompt:
        raise SystemExit("Prompt must not be empty.")

    saved_messages = conversation.get("messages", [])
    if not isinstance(saved_messages, list):
        raise SystemExit("Conversation file has invalid messages array.")
    messages = [
        {"role": "system", "content": args.system},
        *saved_messages,
        {"role": "user", "content": prompt},
    ]

    payload: dict[str, object] = {
        "model": model,
        "messages": messages,
        "max_tokens": args.max_tokens,
        "temperature": args.temperature,
    }
    reasoning: dict[str, object] = {}
    if args.reasoning_effort:
        reasoning["effort"] = args.reasoning_effort
    if args.reasoning_max_tokens is not None:
        reasoning["max_tokens"] = args.reasoning_max_tokens
    if args.reasoning_exclude:
        reasoning["exclude"] = True
    if reasoning:
        payload["reasoning"] = reasoning

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    site_url = os.environ.get("OPENROUTER_SITE_URL", "").strip()
    app_name = os.environ.get("OPENROUTER_APP_NAME", "Mind Goblin Studios Minion").strip()
    if site_url:
        headers["HTTP-Referer"] = site_url
    if app_name:
        headers["X-Title"] = app_name

    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"OpenRouter HTTP {error.code}: {body}") from error

    try:
        message = data["choices"][0]["message"]
        content = message["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise SystemExit(json.dumps(data, indent=2)) from error

    if not isinstance(content, str) or not content.strip():
        reasoning_text = message.get("reasoning")
        if reasoning_text:
            raise SystemExit(
                "OpenRouter returned reasoning tokens but no final content. "
                "Rerun with --reasoning-exclude so thinking stays internal and final content is returned."
            )
        choice = data.get("choices", [{}])[0]
        usage = data.get("usage", {})
        completion_details = usage.get("completion_tokens_details", {}) if isinstance(usage, dict) else {}
        reasoning_tokens = completion_details.get("reasoning_tokens") if isinstance(completion_details, dict) else None
        if choice.get("finish_reason") == "length" or reasoning_tokens:
            raise SystemExit(
                "OpenRouter returned no final content before the token budget ended. "
                "For thinking models, rerun with a larger --max-tokens, a lower --reasoning-effort, "
                "or both. Raw response follows:\n" + json.dumps(data, indent=2)
            )
        raise SystemExit(json.dumps(data, indent=2))

    print(content)
    if path and not args.no_save:
        conversation["model"] = model
        conversation["system"] = args.system
        conversation["messages"] = [
            *saved_messages,
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": content},
        ]
        save_conversation(path, conversation)
        print(f"Saved OpenRouter conversation: {path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
