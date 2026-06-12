"""Studio — concatenate MP4 clips with per-gap xfade transitions via FFmpeg."""

import json, shutil, subprocess
from pathlib import Path

FFMPEG  = shutil.which("ffmpeg")  or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}

# Maps frontend transition names → FFmpeg xfade transition names
XFADE_MAP = {
    "fade":        "fade",
    "fadeblack":   "fadeblack",
    "dissolve":    "dissolve",
    "wipeleft":    "wipeleft",
    "wiperight":   "wiperight",
    "wipeup":      "wipeup",
    "wipedown":    "wipedown",
    "slideleft":   "slideleft",
    "slideright":  "slideright",
    "zoomin":      "zoomin",
    "circleopen":  "circleopen",
    "pixelize":    "pixelize",
}

CUT_DUR = 0.02   # near-zero xfade for "cut" in a mixed chain


def _is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTS


def _probe(path: Path) -> dict:
    r = subprocess.run(
        [FFPROBE, "-v", "quiet", "-print_format", "json",
         "-show_streams", "-show_format", str(path)],
        capture_output=True, text=True, timeout=30,
    )
    return json.loads(r.stdout)


def _has_audio(info: dict) -> bool:
    return any(s.get("codec_type") == "audio" for s in info.get("streams", []))


def _duration(info: dict) -> float:
    for s in info.get("streams", []):
        if s.get("codec_type") == "video":
            d = s.get("duration")
            if d:
                return float(d)
    d = info.get("format", {}).get("duration")
    return float(d) if d else 0.0


def _image_to_clip(src: Path, duration: float, dst: Path) -> None:
    """Convert a still image to an MP4 clip with Ken Burns zoom effect."""
    frames = max(1, int(duration * 30))
    vf = (
        f"scale=1280:720:force_original_aspect_ratio=decrease,"
        f"pad=1280:720:(ow-iw)/2:(oh-ih)/2,"
        f"zoompan=z='min(zoom+0.0015\\,1.3)':d={frames}"
        f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720,"
        f"setsar=1"
    )
    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", str(src),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-vf", vf,
        "-r", "30",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
        "-movflags", "+faststart",
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
        "-map", "0:v", "-map", "1:a",
        str(dst),
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=300)


def _normalize(src: Path, dst: Path, image_duration: float = 3.0) -> None:
    if _is_image(src):
        _image_to_clip(src, image_duration, dst)
        return

    info = _probe(src)
    vf = (
        "scale=1280:720:force_original_aspect_ratio=decrease,"
        "pad=1280:720:(ow-iw)/2:(oh-ih)/2"
    )
    enc = ["-c:v", "libx264", "-preset", "fast", "-crf", "22",
           "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
           "-movflags", "+faststart"]
    if _has_audio(info):
        cmd = [FFMPEG, "-y", "-i", str(src),
               "-vf", vf, "-r", "30",
               *enc, "-c:a", "aac", "-ar", "44100", "-ac", "2", str(dst)]
    else:
        cmd = [FFMPEG, "-y", "-i", str(src),
               "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
               "-vf", vf, "-r", "30", *enc,
               "-c:a", "aac", "-ar", "44100", "-ac", "2",
               "-map", "0:v", "-map", "1:a", "-shortest", str(dst)]
    subprocess.run(cmd, check=True, capture_output=True, timeout=300)


def render_clips(
    clip_paths: list[Path],
    transitions: list[dict],
    out_dir: Path,
    clip_durations: list[float] | None = None,
) -> Path:
    """Concatenate clips with per-gap transitions.

    clip_durations: per-clip override duration (> 0 means image with custom hold time).
    Each transition dict: {"type": str, "duration": float}
    """
    n = len(clip_paths)
    if n == 0:
        raise ValueError("No clips provided")

    if clip_durations is None:
        clip_durations = []

    out = out_dir / "studio_result.mp4"

    # Normalize all clips → 1280×720 @ 30fps, stereo audio
    normalized: list[Path] = []
    for i, p in enumerate(clip_paths):
        norm = out_dir / f"norm_{i}.mp4"
        dur = clip_durations[i] if i < len(clip_durations) and clip_durations[i] > 0 else 3.0
        _normalize(p, norm, image_duration=dur)
        normalized.append(norm)

    if n == 1:
        shutil.copy(normalized[0], out)
        return out

    # Decide render path
    def _trans(i: int) -> dict:
        return transitions[i] if i < len(transitions) else {"type": "cut", "duration": 0}

    all_cut = all(_trans(i)["type"] == "cut" for i in range(n - 1))

    if all_cut:
        list_file = out_dir / "clips.txt"
        list_file.write_text("\n".join(f"file '{p.as_posix()}'" for p in normalized))
        subprocess.run([
            FFMPEG, "-y", "-f", "concat", "-safe", "0",
            "-i", str(list_file),
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
            "-movflags", "+faststart",
            "-c:a", "aac", str(out),
        ], check=True, capture_output=True, timeout=600)
        return out

    # xfade chain for any non-cut transition
    durations = [_duration(_probe(p)) for p in normalized]

    filter_parts: list[str] = []
    prev_v = "[0:v]"
    prev_a = "[0:a]"
    running = durations[0]

    for i in range(1, n):
        t = _trans(i - 1)
        trans_type = t.get("type", "cut")
        is_cut = trans_type == "cut"

        xfade_name = XFADE_MAP.get(trans_type, "fade") if not is_cut else "fade"
        fd = max(CUT_DUR, float(t.get("duration", CUT_DUR))) if not is_cut else CUT_DUR

        # Clamp duration to avoid exceeding clip length
        max_fd = min(durations[i - 1], durations[i]) * 0.9
        fd = min(fd, max_fd) if max_fd > 0 else fd

        offset = max(0.0, running - fd)
        out_v = "[vfinal]" if i == n - 1 else f"[v{i}]"
        out_a = "[afinal]" if i == n - 1 else f"[a{i}]"

        filter_parts.append(
            f"{prev_v}[{i}:v]xfade=transition={xfade_name}:duration={fd:.3f}:offset={offset:.3f}{out_v}"
        )
        filter_parts.append(
            f"{prev_a}[{i}:a]acrossfade=d={fd:.3f}:c1=tri:c2=tri{out_a}"
        )
        prev_v = out_v
        prev_a = out_a
        running = offset + durations[i]

    cmd = [FFMPEG, "-y"]
    for p in normalized:
        cmd += ["-i", str(p)]
    cmd += [
        "-filter_complex", "; ".join(filter_parts),
        "-map", "[vfinal]", "-map", "[afinal]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
        "-movflags", "+faststart",
        "-c:a", "aac", str(out),
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=600)
    return out
