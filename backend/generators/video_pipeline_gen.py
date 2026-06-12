"""
Video Pipeline generator — FREEGMA backend
Accepts: background images/videos + optional avatar + narration text
Produces: portrait MP4 (1080×1920) with Ken Burns, optional lip-sync avatar, optional subtitles
Based on the local video_pipeline.py, stripped of Claude API calls.
"""

import asyncio
import random
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Optional

COMFYUI_URL       = "http://127.0.0.1:8188"
# VHS extension does not expose POST /upload/audio — copy files directly instead
COMFYUI_INPUT_DIR = Path(r"C:\Users\Fane sefu meu\ComfyUI\input")
IMAGE_W     = 1080
IMAGE_H     = 1920
FPS         = 30
CROSSFADE   = 0.5
LIPSYNC_FPS = 25
AVATAR_D    = 420
AVATAR_B    = 120

KEN_BURNS_STYLES = [
    "z='min(zoom+0.0005,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    "z='if(eq(on,1),1.2,max(zoom-0.0005,1))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    "z='min(zoom+0.0005,1.2)':x='0':y='0'",
    "z='min(zoom+0.0005,1.2)':x='iw-iw/zoom':y='ih-ih/zoom'",
]


# ── Narration parser ──────────────────────────────────────────────────────────

def parse_narration(text: str) -> dict:
    """Parse Hook: + Script: format → {hook, scenes: [{id, narration}]}."""
    text = text.strip()
    hook, body = "", ""

    if "Hook:" in text and "Script:" in text:
        parts = text.split("Script:", 1)
        hook = parts[0].replace("Hook:", "").strip().strip('"\'')
        body = parts[1].strip()
    else:
        paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        hook = paras[0].strip('"\'') if paras else ""
        body = "\n\n".join(paras[1:]) if len(paras) > 1 else ""

    paragraphs = [p.strip().strip('"\'') for p in body.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip().strip('"\'') for p in body.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [hook] if hook else []

    if not paragraphs:
        raise ValueError("Narration must contain at least one paragraph")

    return {"hook": hook, "scenes": [{"id": i + 1, "narration": p} for i, p in enumerate(paragraphs)]}


# ── Audio (TTS) ───────────────────────────────────────────────────────────────

def _tts_edge(text: str, voice: str, out: Path):
    import edge_tts

    async def _run():
        mp3 = out.with_suffix(".mp3")
        await edge_tts.Communicate(text, voice, rate="-5%").save(str(mp3))
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", str(mp3), "-ar", "24000", "-ac", "1", str(out)],
            capture_output=True, text=True,
        )
        mp3.unlink(missing_ok=True)
        if r.returncode != 0:
            raise RuntimeError(f"MP3→WAV: {r.stderr[-300:]}")

    asyncio.run(_run())


def _tts_kokoro(text: str, out: Path):
    from kokoro import KPipeline
    import numpy as np
    import soundfile as sf

    pipe = KPipeline(lang_code="a")
    chunks = [audio for _, _, audio in pipe(text, voice="af_heart", speed=0.95)]
    if not chunks:
        raise RuntimeError("Kokoro produced no audio")
    sf.write(str(out), np.concatenate(chunks), 24000)


def _audio_duration(path: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


# ── Image → portrait canvas ───────────────────────────────────────────────────

def _make_canvas(src: Path, out: Path):
    from PIL import Image, ImageFilter, ImageEnhance

    img = Image.open(src)
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (15, 15, 15))
        bg.paste(img, mask=img.split()[3])
        rgb = bg
    else:
        rgb = img.convert("RGB")

    canvas = Image.new("RGB", (IMAGE_W, IMAGE_H), (10, 10, 10))
    ratio = max(IMAGE_W / rgb.width, IMAGE_H / rgb.height)
    fw, fh = int(rgb.width * ratio), int(rgb.height * ratio)
    fill = rgb.resize((fw, fh), Image.LANCZOS)
    fill = fill.crop(((fw - IMAGE_W) // 2, (fh - IMAGE_H) // 2,
                       (fw - IMAGE_W) // 2 + IMAGE_W, (fh - IMAGE_H) // 2 + IMAGE_H))
    fill = fill.filter(ImageFilter.GaussianBlur(radius=22))
    fill = ImageEnhance.Brightness(fill).enhance(0.38)
    canvas.paste(fill)

    max_h = int(IMAGE_H * 0.62)
    r2 = min((IMAGE_W - 80) / rgb.width, max_h / rgb.height)
    nw, nh = int(rgb.width * r2), int(rgb.height * r2)
    if img.mode == "RGBA":
        fg = img.resize((nw, nh), Image.LANCZOS)
        canvas.paste(fg, ((IMAGE_W - nw) // 2, (max_h - nh) // 2), mask=fg.split()[3])
    else:
        canvas.paste(rgb.resize((nw, nh), Image.LANCZOS),
                     ((IMAGE_W - nw) // 2, (max_h - nh) // 2))

    canvas.save(str(out), "PNG")


# ── Scene clip from image ─────────────────────────────────────────────────────

def _scene_clip(img: Path, duration: float, out: Path, style_idx: int, no_zoom: bool):
    if no_zoom:
        vf = f"scale={IMAGE_W}:{IMAGE_H}:flags=lanczos,format=yuv420p"
    else:
        nf = max(int(duration * FPS), FPS)
        style = KEN_BURNS_STYLES[style_idx % len(KEN_BURNS_STYLES)]
        vf = (f"scale={IMAGE_W}:{IMAGE_H}:flags=lanczos,"
              f"zoompan={style}:d={nf}:s={IMAGE_W}x{IMAGE_H}:fps={FPS},"
              f"format=yuv420p")
    r = subprocess.run(
        ["ffmpeg", "-y", "-loop", "1", "-i", str(img), "-vf", vf,
         "-t", f"{duration:.4f}", "-c:v", "libx264", "-preset", "fast",
         "-crf", "17", "-r", str(FPS), str(out)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"Scene clip: {r.stderr[-400:]}")


def _calc_durations(scenes: list, total_dur: float, fixed: Optional[float]) -> list:
    n = len(scenes)
    if fixed:
        return [fixed + CROSSFADE] * n
    chars = [max(len(s["narration"]), 1) for s in scenes]
    adj = total_dur + (n - 1) * CROSSFADE
    raw = [(c / sum(chars)) * adj for c in chars]
    scale = adj / sum(raw)
    return [max(d * scale, 2.5 + CROSSFADE) for d in raw]


def _xfade_concat(clips: list, durations: list, out: Path):
    if len(clips) == 1:
        shutil.copy(str(clips[0]), str(out))
        return
    cmd = ["ffmpeg", "-y"]
    for c in clips:
        cmd += ["-i", str(c)]
    parts, cum, cur = [], 0.0, "[0:v]"
    for i in range(len(clips) - 1):
        cum += durations[i]
        offset = max(cum - (i + 1) * CROSSFADE, 0.01)
        label = "[vout]" if i == len(clips) - 2 else f"[t{i}]"
        parts.append(
            f"{cur}[{i+1}:v]xfade=transition=fade"
            f":duration={CROSSFADE}:offset={offset:.4f}{label}"
        )
        cur = label
    cmd += ["-filter_complex", ";".join(parts), "-map", "[vout]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "17",
            "-r", str(FPS), "-pix_fmt", "yuv420p", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Xfade concat: {r.stderr[-500:]}")


# ── Background from video clips ───────────────────────────────────────────────

def _video_background(video_paths: list, audio_dur: float, out: Path):
    def dur(p):
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(p)],
            capture_output=True, text=True,
        )
        return float(r.stdout.strip())

    src_durs = [dur(p) for p in video_paths]
    needed = audio_dur + 4
    lines, acc, idx = [], 0.0, 0
    while acc < needed:
        p = video_paths[idx % len(video_paths)]
        lines.append(f"file '{p.resolve().as_posix()}'")
        acc += src_durs[idx % len(video_paths)]
        idx += 1

    concat = out.parent / "_vbg.txt"
    concat.write_text("\n".join(lines), encoding="utf-8")

    vf = (f"scale={IMAGE_W}:{IMAGE_H}:force_original_aspect_ratio=increase,"
          f"crop={IMAGE_W}:{IMAGE_H},format=yuv420p")
    r = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
         "-vf", vf, "-t", str(audio_dur + 2),
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-r", str(FPS), "-an", str(out)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"Video background: {r.stderr[-400:]}")


# ── LatentSync via ComfyUI ────────────────────────────────────────────────────

def _run_lipsync(avatar: Path, audio: Path, out: Path) -> Path:
    import requests

    with open(avatar, "rb") as f:
        resp = requests.post(
            f"{COMFYUI_URL}/upload/image",
            files={"image": (avatar.name, f,
                             "image/png" if avatar.suffix.lower() == ".png" else "image/jpeg")},
            timeout=30,
        )
    resp.raise_for_status()
    avatar_file = resp.json()["name"]

    shutil.copy2(audio, COMFYUI_INPUT_DIR / audio.name)
    audio_file = audio.name

    workflow = {
        "1": {"class_type": "LoadImage", "inputs": {"image": avatar_file}},
        "2": {"class_type": "VHS_LoadAudioUpload",
              "inputs": {"audio": audio_file, "start_time": 0, "duration": 0}},
        "3": {"class_type": "GeekyLatentSyncNode",
              "inputs": {"images": ["1", 0], "audio": ["2", 0],
                         "seed": random.randint(0, 2**32 - 1),
                         "lips_expression": 1.8, "inference_steps": 20, "vram_usage": "medium"}},
        "4": {"class_type": "VHS_VideoCombine",
              "inputs": {"images": ["3", 0], "audio": ["3", 1],
                         "frame_rate": LIPSYNC_FPS, "loop_count": 0,
                         "filename_prefix": "freegma_vp",
                         "format": "video/h264-mp4", "pix_fmt": "yuv420p",
                         "crf": 19, "save_metadata": True, "trim_to_audio": True,
                         "pingpong": False, "save_output": True}},
    }

    client_id = str(uuid.uuid4())
    resp = requests.post(f"{COMFYUI_URL}/prompt",
                         json={"prompt": workflow, "client_id": client_id}, timeout=30)
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for _ in range(300):
        time.sleep(2)
        h = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in h:
            break
    else:
        raise TimeoutError("LatentSync timeout (10 min)")

    for node_out in h[prompt_id]["outputs"].values():
        for key in ("gifs", "videos", "images"):
            if key not in node_out:
                continue
            info = node_out[key][0]
            url = (f"{COMFYUI_URL}/view?filename={info['filename']}"
                   f"&subfolder={info.get('subfolder','')}&type={info.get('type','output')}")
            out.write_bytes(requests.get(url, timeout=300).content)
            return out

    raise RuntimeError("LatentSync: no video in ComfyUI output")


# ── Avatar composite (circular overlay) ──────────────────────────────────────

def _composite_avatar(base_video: Path, lipsync_video: Path, out: Path):
    D, r = AVATAR_D, AVATAR_D // 2
    x = (IMAGE_W - D) // 2
    y = IMAGE_H - D - AVATAR_B

    fc = (
        f"[1:v]fps={FPS},scale={D}:{D},format=rgba,"
        f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)'"
        f":a='255*lte(hypot(X-{r},Y-{r}),{r - 3})'[av];"
        f"[0:v][av]overlay={x}:{y}[vout]"
    )
    r_proc = subprocess.run(
        ["ffmpeg", "-y",
         "-i", str(base_video), "-i", str(lipsync_video),
         "-filter_complex", fc,
         "-map", "[vout]", "-map", "0:a",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(out)],
        capture_output=True, text=True,
    )
    if r_proc.returncode != 0:
        raise RuntimeError(f"Avatar composite: {r_proc.stderr[-600:]}")


# ── Subtitles (faster-whisper → SRT → burn) ───────────────────────────────────

def _make_srt(audio: Path, out: Path) -> bool:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return False
    try:
        try:
            model = WhisperModel("base", device="cuda", compute_type="float16")
        except Exception:
            model = WhisperModel("base", device="cpu", compute_type="int8")

        def ts(s: float) -> str:
            h, m = int(s // 3600), int((s % 3600) // 60)
            return f"{h:02d}:{m:02d}:{int(s%60):02d},{int(s*1000)%1000:03d}"

        segments, _ = model.transcribe(str(audio), word_timestamps=True)
        entries, idx, buf, t0 = [], 1, [], None
        for seg in list(segments):
            for w in (seg.words or []):
                if t0 is None:
                    t0 = w.start
                buf.append(w.word.strip())
                if len(buf) >= 5:
                    entries += [str(idx), f"{ts(t0)} --> {ts(w.end)}", " ".join(buf), ""]
                    idx += 1
                    buf, t0 = [], None
        if buf and t0 is not None:
            entries += [str(idx), f"{ts(t0)} --> {ts(t0+2.0)}", " ".join(buf), ""]

        out.write_text("\n".join(entries), encoding="utf-8")
        return True
    except Exception:
        return False


def _burn_subs(silent_video: Path, audio: Path, srt: Path, out: Path):
    local = out.parent / "_subs.srt"
    shutil.copy(str(srt), str(local))
    srt_f = str(local).replace("\\", "/")
    if len(srt_f) > 1 and srt_f[1] == ":":
        srt_f = srt_f[0] + "\\:" + srt_f[2:]

    style = ("FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,"
             "OutlineColour=&H00000000,BackColour=&HA0000000,"
             "Outline=2,Shadow=1,Bold=1,Alignment=2,MarginV=90")
    r = subprocess.run(
        ["ffmpeg", "-y",
         "-i", str(silent_video), "-i", str(audio),
         "-vf", f"subtitles='{srt_f}':force_style='{style}'",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k",
         "-shortest", "-movflags", "+faststart", str(out)],
        capture_output=True, text=True,
    )
    local.unlink(missing_ok=True)
    if r.returncode != 0:
        raise RuntimeError(f"Burn subtitles: {r.stderr[-500:]}")


def _add_audio(silent_video: Path, audio: Path, out: Path):
    r = subprocess.run(
        ["ffmpeg", "-y",
         "-i", str(silent_video), "-i", str(audio),
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k",
         "-shortest", "-movflags", "+faststart", str(out)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"Add audio: {r.stderr[-400:]}")


# ── Main orchestrator ─────────────────────────────────────────────────────────

def generate_video_pipeline(
    bg_image_paths: list,
    bg_video_paths: list,
    avatar_path: Optional[Path],
    narration_text: str,
    tts_engine: str,
    tts_voice: str,
    lang: str,
    no_zoom: bool,
    no_subtitles: bool,
    fixed_scene_duration: Optional[float],
    out_dir: Path,
    update=None,
) -> Path:
    if not bg_image_paths and not bg_video_paths:
        raise ValueError("Provide background images or background videos")
    if not narration_text.strip():
        raise ValueError("Narration text is required")

    if update: update(0.04)

    # 1 — Parse narration
    script = parse_narration(narration_text)
    scenes = script["scenes"]
    full_text = script["hook"] + ". " + " ".join(s["narration"] for s in scenes)

    # 2 — Generate TTS audio
    audio_path = out_dir / "narration.wav"
    if tts_engine == "kokoro":
        try:
            _tts_kokoro(full_text, audio_path)
        except Exception:
            voice = "en-US-JennyNeural" if lang == "en" else "ro-RO-AlinaNeural"
            _tts_edge(full_text, voice, audio_path)
    else:
        voice = tts_voice or ("en-US-JennyNeural" if lang == "en" else "ro-RO-AlinaNeural")
        _tts_edge(full_text, voice, audio_path)

    if update: update(0.18)

    audio_dur = _audio_duration(audio_path)

    # 3 — Silent background video
    bg_silent = out_dir / "bg_silent.mp4"

    if bg_image_paths:
        canvas_dir = out_dir / "canvases"
        canvas_dir.mkdir(exist_ok=True)
        canvases = []
        for i, p in enumerate(bg_image_paths):
            c = canvas_dir / f"c_{i:03d}.png"
            _make_canvas(p, c)
            canvases.append(c)

        # Distribute images evenly across the full audio duration.
        # Each image gets equal screen time regardless of narration paragraph count.
        n_clips = len(canvases)
        clip_dur = max((audio_dur + (n_clips - 1) * CROSSFADE) / n_clips, 2.5 + CROSSFADE)
        durs = [clip_dur] * n_clips

        clips_dir = out_dir / "clips"
        clips_dir.mkdir(exist_ok=True)
        clips = []
        for i, (canvas, dur) in enumerate(zip(canvases, durs)):
            clip = clips_dir / f"clip_{i:03d}.mp4"
            _scene_clip(canvas, dur, clip, i, no_zoom)
            clips.append(clip)
            if update: update(0.18 + 0.35 * (i + 1) / n_clips)

        _xfade_concat(clips, durs, bg_silent)
    else:
        _video_background(bg_video_paths, audio_dur, bg_silent)

    if update: update(0.56)

    # 4 — Subtitles (optional)
    srt_path = out_dir / "subs.srt"
    has_subs = not no_subtitles and _make_srt(audio_path, srt_path)
    if update: update(0.65)

    # 5 — Base video = background + audio (+ burned subtitles)
    base_video = out_dir / "base.mp4"
    if has_subs:
        _burn_subs(bg_silent, audio_path, srt_path, base_video)
    else:
        _add_audio(bg_silent, audio_path, base_video)
    if update: update(0.72)

    # 6 — Optional avatar lip-sync overlay
    if avatar_path:
        lipsync_video = out_dir / "lipsync.mp4"
        _run_lipsync(avatar_path, audio_path, lipsync_video)
        if update: update(0.93)
        result = out_dir / "result.mp4"
        _composite_avatar(base_video, lipsync_video, result)
    else:
        result = out_dir / "result.mp4"
        shutil.copy(str(base_video), str(result))

    if update: update(1.0)
    return result
