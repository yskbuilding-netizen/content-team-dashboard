# -*- coding: utf-8 -*-
"""
BSN TV YouTube transcript crawler.
- Downloads Korean subtitles (auto + manual) for all videos since 2023-01-01.
- Converts VTT to plain text and saves per-video .txt files.

Usage:
    python crawl_bsn_tv.py
    python crawl_bsn_tv.py "https://www.youtube.com/@빌사남TV/videos"
"""

import re
import sys
import json
import subprocess
from pathlib import Path

CHANNEL_URL_DEFAULT = "https://www.youtube.com/@bsn_/videos"
DATE_AFTER = "20230101"
LANGS = "ko,ko-KR,ko-orig"
HERE = Path(__file__).parent
# 콘텐츠 에이전트가 참고하는 기존 폴더에 저장
OUT_DIR = HERE.parent / "columns" / "youtube-scripts"
VTT_DIR = OUT_DIR / "_vtt"


def ensure_yt_dlp():
    """Make sure yt-dlp is importable; install if missing."""
    try:
        import yt_dlp  # noqa: F401
        return
    except ImportError:
        pass
    print("[*] Installing yt-dlp ...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-U", "yt-dlp"],
        check=True,
    )


def sanitize(name: str) -> str:
    name = re.sub(r"[\\/:*?\"<>|\n\r\t]", "_", name)
    return name.strip()[:80]


def vtt_to_text(vtt_path: Path) -> str:
    text = vtt_path.read_text(encoding="utf-8", errors="ignore")
    lines, seen = [], set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        if "-->" in line:
            continue
        if re.match(r"^\d+$", line):
            continue
        line = re.sub(r"<[^>]+>", "", line)
        line = re.sub(r"&nbsp;", " ", line)
        line = line.strip()
        if not line or line in seen:
            continue
        seen.add(line)
        lines.append(line)
    return "\n".join(lines)


def download_channel_subs(channel_url: str):
    """Use yt-dlp Python API to iterate channel and save subs."""
    import yt_dlp

    VTT_DIR.mkdir(parents=True, exist_ok=True)

    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": LANGS.split(","),
        "subtitlesformat": "vtt",
        "dateafter": DATE_AFTER,
        "ignoreerrors": True,
        "outtmpl": str(VTT_DIR / "%(upload_date)s_%(title).80B_%(id)s.%(ext)s"),
        "quiet": False,
        "no_warnings": True,
        "match_filter": yt_dlp.utils.match_filter_func(f"upload_date >= {DATE_AFTER}"),
    }

    print(f"[*] Channel: {channel_url}")
    print(f"[*] Filter  : upload_date >= {DATE_AFTER}")
    print(f"[*] Output  : {OUT_DIR}")
    print()

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([channel_url])


def convert_all_vtt():
    """Merge all VTT files in _vtt into single .txt per video."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    vtt_files = sorted(VTT_DIR.glob("*.vtt"))
    if not vtt_files:
        print("[!] No subtitle files found. The channel may block automated access,")
        print("    or no videos have Korean captions.")
        return

    # Group by stem (strip language suffix)
    groups = {}
    for f in vtt_files:
        # file name: 20240115_Title_ABCD1234.ko.vtt  -> base = 20240115_Title_ABCD1234
        base = f.name
        base = re.sub(r"\.(ko|ko-KR|ko-orig|en)\.vtt$", "", base)
        base = re.sub(r"\.vtt$", "", base)
        groups.setdefault(base, []).append(f)

    for base, files in sorted(groups.items()):
        # Prefer manual ko > auto ko > others
        preferred = None
        for want in ("ko.vtt", "ko-KR.vtt", "ko-orig.vtt"):
            for f in files:
                if f.name.endswith(want):
                    preferred = f
                    break
            if preferred:
                break
        if not preferred:
            preferred = files[0]

        body = vtt_to_text(preferred)
        if not body.strip():
            continue

        # Extract video id from base (last underscore segment if 11 chars)
        m = re.match(r"^(\d{8})_(.+)_([A-Za-z0-9_-]{11})$", base)
        if m:
            date, title, vid = m.groups()
            header = (
                f"# {title}\n"
                f"- upload_date: {date}\n"
                f"- video_id: {vid}\n"
                f"- url: https://youtu.be/{vid}\n\n"
            )
        else:
            header = f"# {base}\n\n"

        txt_path = OUT_DIR / f"{base}.txt"
        txt_path.write_text(header + body, encoding="utf-8")
        print(f"  saved: {txt_path.name}")

    # Save an index
    index = []
    for txt in sorted(OUT_DIR.glob("*.txt")):
        index.append(txt.name)
    (OUT_DIR / "_index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main():
    channel_url = sys.argv[1] if len(sys.argv) > 1 else CHANNEL_URL_DEFAULT
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    ensure_yt_dlp()

    try:
        download_channel_subs(channel_url)
    except KeyboardInterrupt:
        print("\n[!] Interrupted by user. Converting what we have...")
    except Exception as e:
        print(f"[!] Download error: {e}")
        print("    Proceeding to convert any VTT files already saved.")

    print("\n[*] Converting VTT -> TXT ...")
    convert_all_vtt()

    print(f"\n[done] Output folder: {OUT_DIR}")


if __name__ == "__main__":
    main()
