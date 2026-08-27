#!/usr/bin/env python3
"""OpenRouter image/video helper for Minion media runs."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


API_BASE = "https://openrouter.ai/api/v1"
IMAGE_MODELS_URL = f"{API_BASE}/images/models"
VIDEO_MODELS_URL = f"{API_BASE}/videos/models"
IMAGES_URL = f"{API_BASE}/images"
VIDEOS_URL = f"{API_BASE}/videos"


def api_key(required: bool) -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if required and not key:
        raise SystemExit("Missing OPENROUTER_API_KEY.")
    return key


def headers(required_auth: bool, content_type: bool = True) -> dict[str, str]:
    result: dict[str, str] = {}
    key = api_key(required_auth)
    if key:
        result["Authorization"] = f"Bearer {key}"
    if content_type:
        result["Content-Type"] = "application/json"
    site_url = os.environ.get("OPENROUTER_SITE_URL", "").strip()
    app_name = os.environ.get("OPENROUTER_APP_NAME", "Mind Goblin Studios Minion").strip()
    if site_url:
        result["HTTP-Referer"] = site_url
    if app_name:
        result["X-Title"] = app_name
    return result


def request_json(url: str, *, method: str = "GET", payload: dict[str, Any] | None = None, required_auth: bool = False, timeout: int = 120) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers(required_auth), method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"OpenRouter HTTP {error.code}: {body}") from error


def download(url: str, *, required_auth: bool = True, timeout: int = 120) -> bytes:
    request = urllib.request.Request(url, headers=headers(required_auth, content_type=False), method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"OpenRouter HTTP {error.code}: {body}") from error


def print_models(kind: str, models: list[dict[str, Any]], as_json: bool) -> int:
    if as_json:
        print(json.dumps({"data": models}, indent=2))
        return 0
    for model in models:
        if kind == "image":
            architecture = model.get("architecture") or {}
            params = model.get("supported_parameters") or {}
            print(
                f"{model.get('id')}\t{model.get('name')}\t"
                f"in={','.join(architecture.get('input_modalities') or [])}\t"
                f"out={','.join(architecture.get('output_modalities') or [])}\t"
                f"params={','.join(sorted(params.keys()))}\t"
                f"stream={model.get('supports_streaming')}"
            )
        else:
            print(
                f"{model.get('id')}\t{model.get('name')}\t"
                f"res={','.join(model.get('supported_resolutions') or [])}\t"
                f"ratios={','.join(model.get('supported_aspect_ratios') or [])}\t"
                f"sizes={','.join(model.get('supported_sizes') or [])}\t"
                f"passthrough={','.join(model.get('allowed_passthrough_parameters') or [])}"
            )
    return 0


def data_url(value: str) -> str:
    if value.startswith(("http://", "https://", "data:")):
        return value
    path = Path(value).expanduser()
    if not path.exists():
        raise SystemExit(f"Image file does not exist: {path}")
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def image_reference(value: str) -> dict[str, Any]:
    return {"type": "image_url", "image_url": {"url": data_url(value)}}


def add_common_media_options(payload: dict[str, Any], args: argparse.Namespace) -> None:
    for key in ["resolution", "aspect_ratio", "size", "seed"]:
        value = getattr(args, key, None)
        if value is not None:
            payload[key] = value
    if getattr(args, "provider_json", None):
        payload["provider"] = json.loads(args.provider_json)


def image_output_path(base: str, index: int, count: int, output_format: str | None) -> Path:
    path = Path(base).expanduser()
    ext = (output_format or path.suffix.lstrip(".") or "png").lower()
    if path.is_dir():
        return path / (f"openrouter-image-{index + 1:02d}.{ext}")
    if count <= 1:
        return path if path.suffix else path.with_suffix(f".{ext}")
    return path.with_name(f"{path.stem}-{index + 1:02d}.{ext}")


def cmd_list_images(args: argparse.Namespace) -> int:
    data = request_json(IMAGE_MODELS_URL, required_auth=False, timeout=30)
    return print_models("image", data.get("data", []), args.json)


def cmd_list_videos(args: argparse.Namespace) -> int:
    data = request_json(VIDEO_MODELS_URL, required_auth=False, timeout=30)
    return print_models("video", data.get("data", []), args.json)


def cmd_image(args: argparse.Namespace) -> int:
    payload: dict[str, Any] = {"model": args.model, "prompt": args.prompt}
    add_common_media_options(payload, args)
    for key in ["quality", "output_format", "background", "output_compression", "n"]:
        value = getattr(args, key, None)
        if value is not None:
            payload[key] = value
    if args.reference:
        payload["input_references"] = [image_reference(value) for value in args.reference]
    data = request_json(IMAGES_URL, method="POST", payload=payload, required_auth=True, timeout=args.timeout)
    images = data.get("data") or []
    if not isinstance(images, list) or not images:
        raise SystemExit(json.dumps(data, indent=2))
    for index, image in enumerate(images):
        if not isinstance(image, dict):
            raise SystemExit(json.dumps(data, indent=2))
        out = image_output_path(args.output, index, len(images), args.output_format)
        out.parent.mkdir(parents=True, exist_ok=True)
        if image.get("b64_json"):
            out.write_bytes(base64.b64decode(image["b64_json"]))
        elif image.get("url"):
            out.write_bytes(download(image["url"], required_auth=False, timeout=args.timeout))
        else:
            raise SystemExit(json.dumps(data, indent=2))
        print(out)
    usage = data.get("usage")
    if usage:
        print(json.dumps({"usage": usage}, indent=2), file=sys.stderr)
    return 0


def video_payload(args: argparse.Namespace) -> dict[str, Any]:
    payload: dict[str, Any] = {"model": args.model, "prompt": args.prompt}
    add_common_media_options(payload, args)
    for key in ["duration", "generate_audio", "callback_url"]:
        value = getattr(args, key, None)
        if value is not None:
            payload[key] = value
    frame_images = []
    for frame_type, values in [("first_frame", args.first_frame or []), ("last_frame", args.last_frame or [])]:
        for value in values:
            frame = image_reference(value)
            frame["frame_type"] = frame_type
            frame_images.append(frame)
    if frame_images:
        payload["frame_images"] = frame_images
    if args.reference:
        payload["input_references"] = [image_reference(value) for value in args.reference]
    return payload


def poll_video(job_or_url: str, interval: float, timeout: float) -> dict[str, Any]:
    if job_or_url.startswith("http"):
        url = job_or_url
    else:
        url = f"{VIDEOS_URL}/{urllib.parse.quote(job_or_url)}"
    deadline = time.monotonic() + timeout
    while True:
        data = request_json(url, required_auth=True, timeout=120)
        status = data.get("status")
        print(f"video status: {status}", file=sys.stderr)
        if status in {"completed", "failed", "cancelled", "expired"}:
            return data
        if time.monotonic() >= deadline:
            raise SystemExit("Timed out waiting for video job. Rerun video-status later.")
        time.sleep(interval)


def cmd_video(args: argparse.Namespace) -> int:
    data = request_json(VIDEOS_URL, method="POST", payload=video_payload(args), required_auth=True, timeout=args.timeout)
    print(json.dumps(data, indent=2))
    if args.job_file:
        Path(args.job_file).expanduser().write_text(json.dumps(data, indent=2) + "\n")
    if not args.wait:
        return 0
    final = poll_video(data.get("polling_url") or data.get("id"), args.poll_interval, args.wait_timeout)
    print(json.dumps(final, indent=2))
    if final.get("status") == "completed" and args.output:
        return download_video(final, args.output, args.timeout)
    return 0


def download_video(status: dict[str, Any], output: str, timeout: int) -> int:
    urls = status.get("unsigned_urls") or []
    if not urls:
        raise SystemExit("Video status does not include unsigned_urls.")
    output_path = Path(output).expanduser()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(download(urls[0], required_auth=True, timeout=timeout))
    print(output_path)
    return 0


def cmd_video_status(args: argparse.Namespace) -> int:
    data = poll_video(args.job, args.poll_interval, args.wait_timeout if args.wait else 0)
    print(json.dumps(data, indent=2))
    if data.get("status") == "completed" and args.output:
        return download_video(data, args.output, args.timeout)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("list-images", help="List OpenRouter image generation models.")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_list_images)

    p = sub.add_parser("list-videos", help="List OpenRouter video generation models.")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_list_videos)

    p = sub.add_parser("image", help="Generate image(s) through /api/v1/images.")
    p.add_argument("--model", required=True)
    p.add_argument("--prompt", required=True)
    p.add_argument("--output", default="openrouter-image.png")
    p.add_argument("--reference", action="append", help="Reference image URL/path/data URL. Repeatable.")
    p.add_argument("--resolution")
    p.add_argument("--aspect-ratio", dest="aspect_ratio")
    p.add_argument("--size")
    p.add_argument("--quality")
    p.add_argument("--output-format", dest="output_format")
    p.add_argument("--background")
    p.add_argument("--output-compression", dest="output_compression", type=int)
    p.add_argument("--n", type=int)
    p.add_argument("--seed", type=int)
    p.add_argument("--provider-json", help="Raw JSON object for the provider field.")
    p.add_argument("--timeout", type=int, default=180)
    p.set_defaults(func=cmd_image)

    p = sub.add_parser("video", help="Submit a video generation job through /api/v1/videos.")
    p.add_argument("--model", required=True)
    p.add_argument("--prompt", required=True)
    p.add_argument("--output", help="Download path when --wait completes.")
    p.add_argument("--job-file", help="Write initial job JSON to this path.")
    p.add_argument("--first-frame", action="append", help="First-frame image URL/path/data URL. Repeatable.")
    p.add_argument("--last-frame", action="append", help="Last-frame image URL/path/data URL. Repeatable.")
    p.add_argument("--reference", action="append", help="Reference image URL/path/data URL. Repeatable.")
    p.add_argument("--duration", type=int)
    p.add_argument("--resolution")
    p.add_argument("--aspect-ratio", dest="aspect_ratio")
    p.add_argument("--size")
    p.add_argument("--generate-audio", dest="generate_audio", action="store_true", default=None)
    p.add_argument("--no-generate-audio", dest="generate_audio", action="store_false")
    p.add_argument("--seed", type=int)
    p.add_argument("--callback-url", dest="callback_url")
    p.add_argument("--provider-json", help="Raw JSON object for the provider field.")
    p.add_argument("--wait", action="store_true")
    p.add_argument("--poll-interval", type=float, default=30)
    p.add_argument("--wait-timeout", type=float, default=1800)
    p.add_argument("--timeout", type=int, default=180)
    p.set_defaults(func=cmd_video)

    p = sub.add_parser("video-status", help="Poll an OpenRouter video job id or polling URL.")
    p.add_argument("job")
    p.add_argument("--output", help="Download path when completed.")
    p.add_argument("--wait", action="store_true")
    p.add_argument("--poll-interval", type=float, default=30)
    p.add_argument("--wait-timeout", type=float, default=1800)
    p.add_argument("--timeout", type=int, default=180)
    p.set_defaults(func=cmd_video_status)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
