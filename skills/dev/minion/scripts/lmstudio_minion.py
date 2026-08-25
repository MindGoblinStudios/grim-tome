#!/usr/bin/env python3
"""Tiny LM Studio runner for local Minion outside-opinion calls."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request


DEFAULT_NATIVE_BASE_URL = "http://127.0.0.1:1234/api/v1"
DEFAULT_OPENAI_BASE_URL = "http://127.0.0.1:1234/v1"
DEFAULT_CONVERSATION_DIR = os.path.join(".agents", "minion", "lmstudio")
API_MODES = {"native", "openai"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-")
    if not slug:
        raise SystemExit("Conversation name must include at least one letter or number.")
    return slug


def normalize_base_url(value: str) -> str:
    value = value.strip().rstrip("/")
    if not value:
        raise SystemExit("LM Studio base URL must not be empty.")
    return value


def request_json(url: str, payload: dict[str, object] | None = None, timeout: int = 300) -> dict[str, object]:
    headers = {"Content-Type": "application/json"}
    api_key = os.environ.get("LMSTUDIO_API_KEY", "").strip() or os.environ.get("LM_API_TOKEN", "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"LM Studio returned HTTP {error.code} from {url}:\n{body}") from error
    except urllib.error.URLError as error:
        raise SystemExit(
            f"Could not reach LM Studio at {url}. Start LM Studio's local server and try again."
        ) from error
    except json.JSONDecodeError as error:
        raise SystemExit(f"LM Studio returned non-JSON response from {url}.") from error


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def list_native_models(base_url: str, *, loaded_only: bool = False) -> list[str]:
    data = request_json(f"{base_url}/models", timeout=30)
    models = data.get("models", [])
    if not isinstance(models, list):
        raise SystemExit(json.dumps(data, indent=2))

    ids: list[str] = []
    for model in models:
        if not isinstance(model, dict) or model.get("type") != "llm":
            continue
        loaded_instances = model.get("loaded_instances", [])
        loaded_ids: list[str] = []
        if isinstance(loaded_instances, list):
            for instance in loaded_instances:
                if isinstance(instance, dict) and isinstance(instance.get("id"), str):
                    loaded_ids.append(instance["id"])
        if loaded_ids:
            ids.extend(loaded_ids)
        elif not loaded_only and isinstance(model.get("key"), str):
            ids.append(model["key"])
    return dedupe(ids)


def list_openai_models(base_url: str) -> list[str]:
    data = request_json(f"{base_url}/models", timeout=30)
    models = data.get("data", [])
    if not isinstance(models, list):
        raise SystemExit(json.dumps(data, indent=2))
    ids: list[str] = []
    for model in models:
        if isinstance(model, dict) and isinstance(model.get("id"), str):
            ids.append(model["id"])
    return ids


def list_remote_models(base_url: str, api_mode: str, *, loaded_only: bool = False) -> list[str]:
    if api_mode == "native":
        return list_native_models(base_url, loaded_only=loaded_only)
    return list_openai_models(base_url)


def conversation_path(args: argparse.Namespace) -> str | None:
    if args.conversation_file:
        return args.conversation_file
    if args.conversation:
        return os.path.join(DEFAULT_CONVERSATION_DIR, f"{slugify(args.conversation)}.json")
    return None


def load_conversation(path: str | None, reset: bool) -> dict[str, object]:
    if not path or reset or not os.path.exists(path):
        return {"messages": []}
    if os.path.getsize(path) == 0:
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


def resolve_api_mode(args: argparse.Namespace, conversation: dict[str, object]) -> str:
    saved_mode = conversation.get("api_mode")
    if saved_mode is not None and not isinstance(saved_mode, str):
        raise SystemExit("Conversation file has invalid api_mode value.")
    api_mode = args.api_mode or saved_mode or os.environ.get("LMSTUDIO_API_MODE", "native").strip().lower()
    if api_mode not in API_MODES:
        raise SystemExit(f"Unsupported LM Studio API mode: {api_mode}. Expected native or openai.")
    return api_mode


def resolve_base_url(args: argparse.Namespace, conversation: dict[str, object], api_mode: str) -> str:
    saved_url = conversation.get("base_url")
    if saved_url is not None and not isinstance(saved_url, str):
        raise SystemExit("Conversation file has invalid base_url value.")
    default_url = DEFAULT_NATIVE_BASE_URL if api_mode == "native" else DEFAULT_OPENAI_BASE_URL
    return normalize_base_url(args.base_url or os.environ.get("LMSTUDIO_BASE_URL", "").strip() or saved_url or default_url)


def resolve_model(args: argparse.Namespace, conversation: dict[str, object], base_url: str, api_mode: str) -> str:
    saved_model = conversation.get("model")
    if saved_model is not None and not isinstance(saved_model, str):
        raise SystemExit("Conversation file has invalid model value.")
    model = args.model or saved_model or os.environ.get("LMSTUDIO_MODEL", "").strip()
    if model:
        return model
    models = list_remote_models(base_url, api_mode, loaded_only=True)
    if len(models) == 1:
        return models[0]
    all_models = models or list_remote_models(base_url, api_mode)
    if all_models and sys.stdin.isatty():
        print("LM Studio models:")
        for item in all_models:
            print(f"- {item}")
        return input("Model id: ").strip()
    raise SystemExit("Missing model. Pass --model, set LMSTUDIO_MODEL, or load exactly one model in LM Studio.")


def run_native_chat(
    args: argparse.Namespace,
    base_url: str,
    model: str,
    prompt: str,
    conversation: dict[str, object],
    path: str | None,
) -> tuple[str, str | None]:
    payload: dict[str, object] = {
        "model": model,
        "input": prompt,
        "temperature": args.temperature,
        "store": bool(path and not args.no_save and not args.no_store),
    }
    if args.system:
        payload["system_prompt"] = args.system
    if args.context_length:
        payload["context_length"] = args.context_length

    previous_response_id = conversation.get("response_id")
    if previous_response_id is not None and not isinstance(previous_response_id, str):
        raise SystemExit("Conversation file has invalid response_id value.")
    if previous_response_id and not args.reset_conversation:
        payload["previous_response_id"] = previous_response_id

    data = request_json(f"{base_url}/chat", payload=payload)
    output = data.get("output", [])
    if not isinstance(output, list):
        raise SystemExit(json.dumps(data, indent=2))
    messages: list[str] = []
    for item in output:
        if isinstance(item, dict) and item.get("type") == "message" and isinstance(item.get("content"), str):
            messages.append(item["content"])
    content = "\n\n".join(message.strip() for message in messages if message.strip())
    if not content:
        raise SystemExit(json.dumps(data, indent=2))

    response_id = data.get("response_id")
    if response_id is not None and not isinstance(response_id, str):
        raise SystemExit(json.dumps(data, indent=2))
    return content, response_id


def run_openai_chat(args: argparse.Namespace, base_url: str, model: str, prompt: str, conversation: dict[str, object]) -> str:
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
    data = request_json(f"{base_url}/chat/completions", payload=payload)

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise SystemExit(json.dumps(data, indent=2)) from error

    if not isinstance(content, str) or not content.strip():
        raise SystemExit(json.dumps(data, indent=2))
    return content


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prompt", nargs="*", help="Prompt text. Reads stdin when omitted.")
    parser.add_argument("--prompt-file", help="Read prompt text from a file.")
    parser.add_argument("--model", help="LM Studio model id. If omitted, uses LMSTUDIO_MODEL or one loaded model.")
    parser.add_argument("--api-mode", choices=sorted(API_MODES), help="Use LM Studio's native /api/v1 API or OpenAI-compatible /v1 API. Defaults to native.")
    parser.add_argument("--base-url", help="Override LM Studio base URL. Defaults by API mode.")
    parser.add_argument("--system", default="You are a concise coding assistant.")
    parser.add_argument("--max-tokens", type=int, default=4096)
    parser.add_argument("--context-length", type=int, help="Native API context length.")
    parser.add_argument("--temperature", type=float, default=0.2)
    parser.add_argument("--conversation", help="Resume/save a named conversation under .agents/minion/lmstudio/.")
    parser.add_argument("--conversation-file", help="Resume/save an explicit conversation JSON file.")
    parser.add_argument("--reset-conversation", action="store_true", help="Start the named conversation over before sending this prompt.")
    parser.add_argument("--no-store", action="store_true", help="Native API only: do not store the chat in LM Studio.")
    parser.add_argument("--no-save", action="store_true", help="Do not write the conversation after the response.")
    parser.add_argument("--list-conversations", action="store_true", help="List saved LM Studio Minion conversations.")
    parser.add_argument("--list-models", action="store_true", help="List models visible through LM Studio's local server.")
    args = parser.parse_args()

    if args.list_conversations:
        return list_conversations()

    path = conversation_path(args)
    conversation = load_conversation(path, args.reset_conversation)
    api_mode = resolve_api_mode(args, conversation)
    base_url = resolve_base_url(args, conversation, api_mode)
    if args.list_models:
        for model in list_remote_models(base_url, api_mode):
            print(model)
        return 0

    model = resolve_model(args, conversation, base_url, api_mode)
    prompt = read_prompt(args)
    if not prompt:
        raise SystemExit("Prompt must not be empty.")

    saved_messages = conversation.get("messages", [])
    if not isinstance(saved_messages, list):
        raise SystemExit("Conversation file has invalid messages array.")

    response_id: str | None = None
    if api_mode == "native":
        content, response_id = run_native_chat(args, base_url, model, prompt, conversation, path)
    else:
        content = run_openai_chat(args, base_url, model, prompt, conversation)

    print(content)
    if path and not args.no_save:
        saved_messages = conversation.get("messages", [])
        if not isinstance(saved_messages, list):
            raise SystemExit("Conversation file has invalid messages array.")
        conversation["model"] = model
        conversation["system"] = args.system
        conversation["base_url"] = base_url
        conversation["api_mode"] = api_mode
        if response_id:
            conversation["response_id"] = response_id
        conversation["messages"] = [
            *saved_messages,
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": content},
        ]
        save_conversation(path, conversation)
        print(f"Saved LM Studio conversation: {path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
