#!/usr/bin/env python3
"""Download and optimize dataset card images into local static assets.

Examples:
  python3 scripts/localize_images.py --dry-run
  python3 scripts/localize_images.py --dataset paintings --rewrite-json
  python3 scripts/localize_images.py --dataset battles --limit 10 --force

Actual image conversion requires Pillow:
  python3 -m pip install -r requirements.txt
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import posixpath
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any


REMOTE_RE = re.compile(r"^https?://", re.IGNORECASE)
SLUG_RE = re.compile(r"[^a-zA-Z0-9._-]+")
USER_AGENT = "SophismImageLocalizer/1.0 (+https://localhost)"


@dataclass(frozen=True)
class ImageTask:
  dataset_id: str
  dataset_path: Path
  card_id: str
  title: str
  source_url: str
  output_path: Path
  local_src: str


@dataclass
class ImageResult:
  task: ImageTask
  status: str
  message: str = ""
  bytes_written: int = 0


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description="Download remote card images, resize/compress them, and optionally rewrite dataset JSON.",
  )
  parser.add_argument("--manifest", default="data/datasets.json", help="Path to data/datasets.json.")
  parser.add_argument(
    "--dataset",
    action="append",
    default=[],
    help="Dataset id to process. Repeatable. Defaults to all manifest datasets.",
  )
  parser.add_argument("--assets-dir", default="assets/images", help="Output root for optimized images.")
  parser.add_argument("--long-edge", type=int, default=1400, help="Maximum long edge in pixels.")
  parser.add_argument("--quality", type=int, default=82, help="Output quality, 1-100.")
  parser.add_argument("--format", choices=["webp", "jpeg"], default="webp", help="Optimized output format.")
  parser.add_argument("--workers", type=int, default=8, help="Concurrent download/convert workers.")
  parser.add_argument("--timeout", type=float, default=30.0, help="HTTP timeout in seconds.")
  parser.add_argument("--retries", type=int, default=3, help="Retries for transient HTTP/download failures.")
  parser.add_argument("--retry-delay", type=float, default=5.0, help="Initial retry delay in seconds.")
  parser.add_argument("--request-delay", type=float, default=0.0, help="Delay before each download request.")
  parser.add_argument("--limit", type=int, default=0, help="Limit tasks per run, useful for smoke tests.")
  parser.add_argument("--force", action="store_true", help="Re-download/reprocess existing local files.")
  parser.add_argument(
    "--rewrite-json",
    action="store_true",
    help="Rewrite image.src to the local asset path and preserve the original URL as image.remoteSrc.",
  )
  parser.add_argument("--dry-run", action="store_true", help="Print planned work without downloading.")
  return parser.parse_args()


def read_json(path: Path) -> Any:
  with path.open("r", encoding="utf-8") as handle:
    return json.load(handle)


def write_json(path: Path, value: Any) -> None:
  payload = json.dumps(value, ensure_ascii=False, indent=2)
  path.write_text(f"{payload}\n", encoding="utf-8")


def repo_path_from_manifest_path(root: Path, data_path: str) -> Path:
  return root / data_path.lstrip("/")


def is_remote_url(value: str) -> bool:
  return bool(REMOTE_RE.match(value or ""))


def safe_filename(card_id: str, extension: str) -> str:
  stem = SLUG_RE.sub("-", card_id.strip()).strip("-._").lower()
  return f"{stem or 'card-image'}.{extension}"


def source_extension(url: str) -> str:
  path = urllib.parse.unquote(urllib.parse.urlparse(url).path)
  extension = posixpath.splitext(path)[1].lstrip(".").lower()
  if extension in ("jpg", "jpeg", "png", "gif", "webp", "svg", "tif", "tiff"):
    return "jpg" if extension == "jpeg" else extension
  return ""


def local_src_for(output_path: Path, root: Path) -> str:
  relative = output_path.relative_to(root).as_posix()
  return f"/{relative}"


def image_source_for(card: dict[str, Any]) -> str:
  image = card.get("image") or {}
  src = str(image.get("src") or "").strip()
  remote_src = str(image.get("remoteSrc") or "").strip()
  if is_remote_url(src):
    return src
  if is_remote_url(remote_src):
    return remote_src
  return ""


def build_tasks(
  root: Path,
  manifest_path: Path,
  selected_dataset_ids: set[str],
  assets_dir: Path,
  extension: str,
) -> tuple[list[ImageTask], dict[Path, list[dict[str, Any]]]]:
  manifests = read_json(manifest_path)
  if not isinstance(manifests, list):
    raise ValueError(f"{manifest_path} must contain a manifest array")

  tasks: list[ImageTask] = []
  dataset_cards: dict[Path, list[dict[str, Any]]] = {}

  for manifest in manifests:
    dataset_id = manifest.get("id")
    if selected_dataset_ids and dataset_id not in selected_dataset_ids:
      continue

    data_path = repo_path_from_manifest_path(root, str(manifest.get("dataPath") or ""))
    cards = read_json(data_path)
    if not isinstance(cards, list):
      raise ValueError(f"{data_path} must contain a card array")
    dataset_cards[data_path] = cards

    for card in cards:
      image = card.get("image") or {}
      source_url = image_source_for(card)
      if not source_url:
        continue

      card_id = str(card.get("id") or "").strip()
      task_extension = "svg" if source_extension(source_url) == "svg" else extension
      output_path = assets_dir / str(dataset_id) / safe_filename(card_id, task_extension)
      tasks.append(
        ImageTask(
          dataset_id=str(dataset_id),
          dataset_path=data_path,
          card_id=card_id,
          title=str(card.get("title") or card_id),
          source_url=source_url,
          output_path=output_path,
          local_src=local_src_for(output_path, root),
        )
      )

  return tasks, dataset_cards


def bounded_source_url(url: str, long_edge: int) -> str:
  parsed = urllib.parse.urlparse(url)
  if parsed.netloc != "commons.wikimedia.org":
    return url
  if "/wiki/Special:FilePath/" not in parsed.path and "/wiki/Special:Redirect/file/" not in parsed.path:
    return url

  query = urllib.parse.parse_qs(parsed.query)
  if "width" not in query:
    query["width"] = [str(long_edge)]

  next_query = urllib.parse.urlencode(query, doseq=True)
  return urllib.parse.urlunparse(parsed._replace(query=next_query))


def fetch_url(url: str, timeout: float, long_edge: int) -> bytes:
  url = bounded_source_url(url, long_edge)
  request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
  with urllib.request.urlopen(request, timeout=timeout) as response:
    return response.read()


def convert_image(raw: bytes, output_path: Path, *, long_edge: int, quality: int, output_format: str) -> int:
  if output_path.suffix.lower() == ".svg":
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output_path.parent, delete=False) as temp:
      temp_path = Path(temp.name)
      temp.write(raw)
    try:
      os.replace(temp_path, output_path)
    finally:
      if temp_path.exists():
        temp_path.unlink()
    return output_path.stat().st_size

  try:
    from PIL import Image, ImageOps
  except ModuleNotFoundError as exc:
    raise RuntimeError("Pillow is required. Run: python3 -m pip install -r requirements.txt") from exc

  with Image.open(BytesIO(raw)) as image:
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
      image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    width, height = image.size
    max_edge = max(width, height)
    if max_edge > long_edge:
      scale = long_edge / max_edge
      next_size = (max(1, round(width * scale)), max(1, round(height * scale)))
      image = image.resize(next_size, Image.Resampling.LANCZOS)

    save_kwargs: dict[str, Any] = {"quality": quality, "optimize": True}
    if output_format == "webp":
      save_kwargs.update({"method": 6})
      save_format = "WEBP"
    else:
      if image.mode == "RGBA":
        background = Image.new("RGB", image.size, (255, 249, 236))
        background.paste(image, mask=image.getchannel("A"))
        image = background
      save_kwargs.update({"progressive": True})
      save_format = "JPEG"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output_path.parent, delete=False) as temp:
      temp_path = Path(temp.name)
    try:
      image.save(temp_path, save_format, **save_kwargs)
      os.replace(temp_path, output_path)
    finally:
      if temp_path.exists():
        temp_path.unlink()

  return output_path.stat().st_size


def process_task(
  task: ImageTask,
  *,
  timeout: float,
  long_edge: int,
  quality: int,
  output_format: str,
  force: bool,
  retries: int,
  retry_delay: float,
  request_delay: float,
) -> ImageResult:
  if task.output_path.exists() and not force:
    return ImageResult(task, "skipped", "already exists", task.output_path.stat().st_size)

  attempts = max(1, retries + 1)
  for attempt in range(1, attempts + 1):
    try:
      if request_delay > 0:
        time.sleep(request_delay)
      raw = fetch_url(task.source_url, timeout, long_edge)
      bytes_written = convert_image(
        raw,
        task.output_path,
        long_edge=long_edge,
        quality=quality,
        output_format=output_format,
      )
      return ImageResult(task, "written", bytes_written=bytes_written)
    except (urllib.error.URLError, TimeoutError, RuntimeError, OSError) as error:
      if attempt >= attempts:
        return ImageResult(task, "failed", str(error))
      time.sleep(retry_delay * attempt)

  return ImageResult(task, "failed", "exhausted retries")


def rewrite_cards(dataset_cards: dict[Path, list[dict[str, Any]]], tasks: list[ImageTask], successful: set[tuple[Path, str]]) -> int:
  by_dataset_and_id = {
    (task.dataset_path, task.card_id): task
    for task in tasks
    if (task.dataset_path, task.card_id) in successful
  }
  changed = 0

  for dataset_path, cards in dataset_cards.items():
    dataset_changed = False
    for card in cards:
      task = by_dataset_and_id.get((dataset_path, str(card.get("id") or "")))
      if not task:
        continue

      image = card.setdefault("image", {})
      src = str(image.get("src") or "").strip()
      if is_remote_url(src) and "remoteSrc" not in image:
        image["remoteSrc"] = src
      if image.get("src") != task.local_src:
        image["src"] = task.local_src
        changed += 1
        dataset_changed = True

    if dataset_changed:
      write_json(dataset_path, cards)

  return changed


def main() -> int:
  args = parse_args()
  root = Path.cwd()
  manifest_path = (root / args.manifest).resolve()
  assets_dir = (root / args.assets_dir).resolve()
  extension = "jpg" if args.format == "jpeg" else args.format
  selected_dataset_ids = set(args.dataset)

  tasks, dataset_cards = build_tasks(root, manifest_path, selected_dataset_ids, assets_dir, extension)
  if args.limit:
    tasks = tasks[: args.limit]

  if not tasks:
    print("No remote image tasks found.")
    return 0

  print(f"Planned {len(tasks)} image task(s).", flush=True)
  for task in tasks[:10]:
    print(f"- {task.dataset_id}/{task.card_id}: {task.source_url} -> {task.local_src}", flush=True)
  if len(tasks) > 10:
    print(f"- ... {len(tasks) - 10} more", flush=True)

  if args.dry_run:
    print("Dry run only. Add --rewrite-json to update dataset image.src values after successful conversion.", flush=True)
    return 0

  started = time.time()
  results: list[ImageResult] = []
  with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
    futures = [
      executor.submit(
        process_task,
        task,
        timeout=args.timeout,
        long_edge=args.long_edge,
        quality=args.quality,
        output_format=args.format,
        force=args.force,
        retries=args.retries,
        retry_delay=args.retry_delay,
        request_delay=args.request_delay,
      )
      for task in tasks
    ]
    for future in concurrent.futures.as_completed(futures):
      result = future.result()
      results.append(result)
      detail = f" ({result.bytes_written / 1024:.0f} KB)" if result.bytes_written else ""
      suffix = f": {result.message}" if result.message else ""
      print(f"{result.status.upper():7} {result.task.dataset_id}/{result.task.card_id}{detail}{suffix}", flush=True)

  written = [result for result in results if result.status == "written"]
  skipped = [result for result in results if result.status == "skipped"]
  failed = [result for result in results if result.status == "failed"]
  print(
    f"Finished in {time.time() - started:.1f}s: "
    f"{len(written)} written, {len(skipped)} skipped, {len(failed)} failed.",
    flush=True,
  )

  if args.rewrite_json:
    successful = {
      (result.task.dataset_path, result.task.card_id)
      for result in results
      if result.status in ("written", "skipped")
    }
    changed = rewrite_cards(dataset_cards, tasks, successful)
    print(f"Rewrote {changed} image.src value(s).", flush=True)
  else:
    print("JSON unchanged. Re-run with --rewrite-json to point cards at local assets.", flush=True)

  return 1 if failed else 0


if __name__ == "__main__":
  sys.exit(main())
