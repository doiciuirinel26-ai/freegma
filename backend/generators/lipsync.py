"""Lip Sync via ComfyUI GeekyLatentSyncNode + optional Edge TTS."""

import uuid, time, random, asyncio, requests
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"

VOICES = {
    "en-US-JennyNeural":   "English — Jenny (Female)",
    "en-US-GuyNeural":     "English — Guy (Male)",
    "en-US-AriaNeural":    "English — Aria (Female)",
    "en-US-DavisNeural":   "English — Davis (Male)",
    "ro-RO-AlinaNeural":   "Romanian — Alina (Female)",
    "ro-RO-EmilNeural":    "Romanian — Emil (Male)",
    "es-ES-ElviraNeural":  "Spanish — Elvira (Female)",
    "fr-FR-DeniseNeural":  "French — Denise (Female)",
    "de-DE-KatjaNeural":   "German — Katja (Female)",
    "it-IT-ElsaNeural":    "Italian — Elsa (Female)",
}


def _upload_avatar(image_path: Path) -> str:
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    with open(image_path, "rb") as f:
        resp = requests.post(f"{COMFYUI_URL}/upload/image",
                             files={"image": (image_path.name, f, mime)}, timeout=30)
    resp.raise_for_status()
    return resp.json()["name"]


def _upload_audio(audio_path: Path) -> str:
    ext = audio_path.suffix.lower()
    mime = {"mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac"}.get(ext[1:], "audio/mpeg")
    with open(audio_path, "rb") as f:
        resp = requests.post(f"{COMFYUI_URL}/upload/audio",
                             files={"audio": (audio_path.name, f, mime)}, timeout=30)
    resp.raise_for_status()
    return resp.json()["name"]


def _tts_generate(text: str, voice: str, out_path: Path):
    import edge_tts

    async def _run():
        comm = edge_tts.Communicate(text, voice)
        await comm.save(str(out_path))

    asyncio.run(_run())


def _build_workflow(avatar_file: str, audio_file: str,
                    lips_expression: float, steps: int, seed: int) -> dict:
    if seed < 0:
        seed = random.randint(0, 2 ** 32 - 1)
    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": avatar_file}},
        "2": {"class_type": "VHS_LoadAudioUpload", "inputs": {
            "audio": audio_file, "start_time": 0, "duration": 0,
        }},
        "3": {"class_type": "GeekyLatentSyncNode", "inputs": {
            "images":          ["1", 0],
            "audio":           ["2", 0],
            "seed":            seed,
            "lips_expression": lips_expression,
            "steps":           steps,
            "vram_usage":      "medium",
        }},
        "4": {"class_type": "VHS_VideoCombine", "inputs": {
            "images":          ["3", 0],
            "audio":           ["3", 1],
            "frame_rate":      25,
            "loop_count":      0,
            "filename_prefix": "freegma_lipsync",
            "format":          "video/h264-mp4",
            "pix_fmt":         "yuv420p",
            "crf":             19,
            "save_metadata":   True,
            "trim_to_audio":   True,
            "pingpong":        False,
            "save_output":     True,
        }},
    }


def generate_lipsync(
    avatar_path: Path,
    audio_path: Path | None,
    tts_text: str,
    tts_voice: str,
    lips_expression: float,
    steps: int,
    out_dir: Path,
    update=None,
) -> Path:
    if update: update(0.05)

    # Generate TTS audio if no audio file provided
    if not audio_path:
        if not tts_text.strip():
            raise ValueError("Provide either an audio file or text for TTS")
        voice = tts_voice or "en-US-JennyNeural"
        tts_out = out_dir / "tts_audio.mp3"
        _tts_generate(tts_text, voice, tts_out)
        audio_path = tts_out

    if update: update(0.15)

    avatar_file = _upload_avatar(avatar_path)
    if update: update(0.20)

    audio_file = _upload_audio(audio_path)
    if update: update(0.25)

    client_id = str(uuid.uuid4())
    workflow   = _build_workflow(avatar_file, audio_file, lips_expression, steps, -1)

    resp = requests.post(f"{COMFYUI_URL}/prompt",
                         json={"prompt": workflow, "client_id": client_id}, timeout=30)
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(300):
        time.sleep(2)
        if update and attempt % 10 == 0:
            update(min(0.95, 0.25 + attempt / 180))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("LipSync timeout (10 min)")

    outputs = history[prompt_id]["outputs"]
    for node_out in outputs.values():
        for key in ("gifs", "videos", "images"):
            if key not in node_out:
                continue
            info = node_out[key][0]
            url = (f"{COMFYUI_URL}/view?filename={info['filename']}"
                   f"&subfolder={info.get('subfolder', '')}&type={info.get('type', 'output')}")
            data = requests.get(url, timeout=300).content
            out  = out_dir / "result.mp4"
            out.write_bytes(data)
            if update: update(1.0)
            return out

    raise RuntimeError("LipSync: ComfyUI returned no video output")
