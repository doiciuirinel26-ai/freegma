"""Real face lip sync: XTTS v2 voice clone + LatentSync on real video via ComfyUI.

Pre-processing pipeline for full-body fashion videos:
  1. Crop the top face region (top 35% of portrait height)
  2. Scale up to a square for LatentSync face detection
  3. Run LatentSync with cloned voice audio
  4. Scale synced face back and composite onto original video
"""

import json as _json
import uuid, time, random, shutil, subprocess
from pathlib import Path
import requests

COMFYUI_URL   = "http://127.0.0.1:8188"
COMFYUI_INPUT = Path(r"C:\Users\Fane sefu meu\ComfyUI\input")
TTS_PYTHON    = Path(r"C:\Users\Fane sefu meu\Desktop\test_voice_clone\venv\Scripts\python.exe")
TTS_WORKER    = Path(__file__).parent.parent / "tts_worker.py"

# Fraction of video height to crop as face region (top of portrait video)
FACE_CROP_RATIO = 0.38


def _clone_voice(voice_path: Path, text: str, lang: str, out_dir: Path) -> Path:
    out_wav = out_dir / "cloned_voice.wav"
    r = subprocess.run(
        [str(TTS_PYTHON), str(TTS_WORKER),
         "--voice",  str(voice_path),
         "--text",   text,
         "--output", str(out_wav),
         "--lang",   lang],
        capture_output=True, text=True,
        timeout=600,
    )
    if r.returncode != 0:
        detail = (r.stderr or r.stdout)[-500:]
        raise RuntimeError(f"XTTS voice clone failed:\n{detail}")
    return out_wav


def _video_dims(video_path: Path) -> tuple[int, int]:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height",
         "-of", "json", str(video_path)],
        capture_output=True, text=True,
    )
    s = _json.loads(r.stdout)["streams"][0]
    return s["width"], s["height"]


def _preprocess_face_crop(video_path: Path, out_dir: Path,
                           trim_start: float = 0.5) -> tuple[Path, dict]:
    """
    1. Trim the first trim_start seconds (WanVideo I2V always starts from the
       static product image — no face there).
    2. Crop the top FACE_CROP_RATIO of the remaining video (face region).
    3. Scale to a square so LatentSync detects the face reliably.
    Returns (face_crop_video, crop_params).
    crop_params["trimmed_orig"] is the trimmed-but-not-cropped video used
    later for compositing.
    """
    w, h = _video_dims(video_path)
    crop_h = int(h * FACE_CROP_RATIO)
    crop_h -= crop_h % 2
    crop_w  = w - (w % 2)
    sq      = crop_w

    # Step 1 — trim away the initial product-image frames
    trimmed = out_dir / "_trimmed.mp4"
    r = subprocess.run(
        ["ffmpeg", "-y", "-ss", str(trim_start), "-i", str(video_path),
         "-c:v", "libx264", "-preset", "fast", "-crf", "17",
         "-pix_fmt", "yuv420p", "-an", str(trimmed)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"Trim failed:\n{r.stderr[-200:]}")

    # Step 2 — crop face region + scale to square + 25 fps
    face_crop = out_dir / "_face_crop.mp4"
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", str(trimmed),
         "-vf", (f"crop={crop_w}:{crop_h}:0:0,"
                 f"scale={sq}:{sq}:flags=lanczos,"
                 f"fps=25,format=yuv420p"),
         "-c:v", "libx264", "-preset", "fast", "-crf", "17",
         "-an", str(face_crop)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"Face crop failed:\n{r.stderr[-200:]}")

    return face_crop, {
        "w": w, "h": h, "crop_h": crop_h, "crop_w": crop_w, "sq": sq,
        "trimmed_orig": trimmed,
    }


def _composite_back(crop_params: dict, synced: Path, audio: Path,
                    out_dir: Path) -> Path:
    """
    Scale the synced face crop back to original face-region dimensions and
    overlay it on the TRIMMED original video (timing is already aligned).
    Uses the cloned-voice audio track.
    """
    crop_w       = crop_params["crop_w"]
    crop_h       = crop_params["crop_h"]
    trimmed_orig = crop_params["trimmed_orig"]
    out          = out_dir / "result.mp4"

    r = subprocess.run(
        ["ffmpeg", "-y",
         "-i", str(trimmed_orig),  # [0] trimmed original (no face close-up)
         "-i", str(synced),        # [1] synced face square (silent)
         "-i", str(audio),         # [2] cloned voice
         "-filter_complex",
         (f"[1:v]scale={crop_w}:{crop_h}:flags=lanczos[face];"
          f"[0:v][face]overlay=0:0:shortest=1[v]"),
         "-map", "[v]",
         "-map", "2:a",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k",
         "-shortest", "-movflags", "+faststart",
         str(out)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"Composite failed:\n{r.stderr[-300:]}")
    return out


def _copy_to_comfyui(path: Path, prefix: str) -> str:
    uid  = uuid.uuid4().hex[:8]
    name = f"{prefix}_{uid}{path.suffix}"
    shutil.copy2(path, COMFYUI_INPUT / name)
    return name


def _build_workflow(video_file: str, audio_file: str) -> dict:
    seed = random.randint(0, 2**32 - 1)
    return {
        "1": {
            "class_type": "VHS_LoadVideo",
            "inputs": {
                "video":             video_file,
                "force_rate":        25,
                "force_size":        "Disabled",
                "custom_width":      512,
                "custom_height":     512,
                "frame_load_cap":    0,
                "skip_first_frames": 0,
                "select_every_nth":  1,
            },
        },
        "2": {
            "class_type": "VHS_LoadAudioUpload",
            "inputs": {"audio": audio_file, "start_time": 0, "duration": 0},
        },
        "3": {
            "class_type": "GeekyLatentSyncNode",
            "inputs": {
                "images":          ["1", 0],
                "audio":           ["2", 0],
                "seed":            seed,
                "lips_expression": 1.0,
                "inference_steps": 20,
                "vram_usage":      "medium",
            },
        },
        "4": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images":          ["3", 0],
                "audio":           ["3", 1],
                "frame_rate":      25,
                "loop_count":      0,
                "filename_prefix": "freegma_realface",
                "format":          "video/h264-mp4",
                "pix_fmt":         "yuv420p",
                "crf":             19,
                "save_metadata":   True,
                "trim_to_audio":   True,
                "pingpong":        False,
                "save_output":     True,
            },
        },
    }


def _run_lipsync_comfyui(face_video: Path, audio_path: Path, out_dir: Path,
                          update=None) -> Path:
    """Submit face crop + audio to ComfyUI, poll, download result."""
    video_file = _copy_to_comfyui(face_video, "rfvid")
    audio_file = _copy_to_comfyui(audio_path, "rfaud")

    client_id = str(uuid.uuid4())
    workflow  = _build_workflow(video_file, audio_file)
    resp = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"ComfyUI /prompt error {resp.status_code}: {resp.text[:300]}")
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(300):
        time.sleep(2)
        if update and attempt % 5 == 0:
            update(min(0.92, 0.38 + attempt / 160))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("Real face lipsync timeout (10 min)")

    job_data = history[prompt_id]
    status   = job_data.get("status", {})

    if status.get("status_str") == "error":
        for msg_type, msg_data in status.get("messages", []):
            if msg_type == "execution_error":
                exc  = msg_data.get("exception_message", "Unknown").strip()
                node = msg_data.get("node_type", "")
                if "face not detected" in exc.lower():
                    raise RuntimeError(
                        "Face not detected even after cropping. "
                        "Try a video with a clearer, more frontal face shot."
                    )
                raise RuntimeError(f"ComfyUI error in {node}: {exc}")
        raise RuntimeError("ComfyUI workflow failed.")

    synced = out_dir / "_synced_face.mp4"
    for node_out in job_data.get("outputs", {}).values():
        for key in ("gifs", "videos", "images"):
            if key not in node_out:
                continue
            info = node_out[key][0]
            url  = (f"{COMFYUI_URL}/view?filename={info['filename']}"
                    f"&subfolder={info.get('subfolder','')}&type={info.get('type','output')}")
            synced.write_bytes(requests.get(url, timeout=300).content)
            return synced

    raise RuntimeError("Real face lipsync: ComfyUI returned no output")


def generate_realface_lipsync(
    video_path: Path,
    voice_path: Path,
    text: str,
    lang: str,
    out_dir: Path,
    update=None,
) -> Path:
    if update: update(0.03)

    # 1 — Clone voice with XTTS
    if update: update(0.05)
    audio_path = _clone_voice(voice_path, text, lang, out_dir)
    if update: update(0.30)

    # 2 — Crop face region from video and scale up
    if update: update(0.32)
    face_crop, crop_params = _preprocess_face_crop(video_path, out_dir)
    if update: update(0.36)

    # 3 — Run LatentSync on the face crop
    synced_face = _run_lipsync_comfyui(face_crop, audio_path, out_dir, update)
    if update: update(0.94)

    # 4 — Composite synced face back onto trimmed original video
    result = _composite_back(crop_params, synced_face, audio_path, out_dir)
    if update: update(1.0)
    return result
