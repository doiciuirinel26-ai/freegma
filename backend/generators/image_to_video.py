"""Image-to-Video via ComfyUI WAN 2.2 or HunyuanVideo 1.5 (subprocess)."""

import uuid, time, random, requests, subprocess
from pathlib import Path

MODELS_DIR = Path(r"C:\Users\Fane sefu meu\models_3d")

HUNYUAN_RUNNER = {
    "python": MODELS_DIR / "hunyuan15_venv" / "Scripts" / "python.exe",
    "script": MODELS_DIR / "hunyuan15_runner.py",
}

COMFYUI_URL = "http://127.0.0.1:8188"

DEFAULT_NEG = (
    "static frozen motion, blurry details, overexposed highlights, "
    "watermark, text overlay, deformed, distorted, low quality, "
    "jpeg artifacts, grainy, noisy, flickering"
)


def _upload_to_comfyui(image_path: Path) -> str:
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    with open(image_path, "rb") as f:
        resp = requests.post(
            f"{COMFYUI_URL}/upload/image",
            files={"image": (image_path.name, f, mime)},
            timeout=30,
        )
    resp.raise_for_status()
    return resp.json()["name"]


def _build_workflow(image_filename: str, prompt: str, neg: str, seed: int) -> dict:
    if seed < 0:
        seed = random.randint(0, 2**32 - 1)
    if not neg.strip():
        neg = DEFAULT_NEG

    pos_text = (prompt.strip() or "cinematic motion, smooth video") + ", high quality, realistic"

    return {
        # 1. Load diffusion model
        "1": {"class_type": "UNETLoader", "inputs": {
            "unet_name": "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
            "weight_dtype": "default",
        }},
        # 2. Apply LightX2V 4-step LoRA (model only, strength 1.0)
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {
            "model":        ["1", 0],
            "lora_name":    "wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise (1).safetensors",
            "strength_model": 1.0,
        }},
        # 3. Shift sampler for WAN
        "3": {"class_type": "ModelSamplingSD3", "inputs": {
            "model": ["2", 0],
            "shift": 5.0,
        }},
        # 4. Load CLIP text encoder (direct — not through LoRA)
        "4": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
            "type":      "wan",
            "device":    "default",
        }},
        # 5. Load VAE
        "5": {"class_type": "VAELoader", "inputs": {
            "vae_name": "wan_2.1_vae.safetensors",
        }},
        # 6. Positive prompt
        "6": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["4", 0],
            "text": pos_text,
        }},
        # 7. Negative prompt
        "7": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["4", 0],
            "text": neg,
        }},
        # 8. Load reference image
        "8": {"class_type": "LoadImage", "inputs": {
            "image": image_filename,
        }},
        # 9. WAN Image-to-Video conditioning
        "9": {"class_type": "WanImageToVideo", "inputs": {
            "positive":    ["6", 0],
            "negative":    ["7", 0],
            "vae":         ["5", 0],
            "start_image": ["8", 0],
            "width":       640,
            "height":      640,
            "length":      81,
            "batch_size":  1,
        }},
        # 10. KSampler — 4 steps with LightX2V LoRA
        "10": {"class_type": "KSampler", "inputs": {
            "model":        ["3", 0],
            "positive":     ["9", 0],
            "negative":     ["9", 1],
            "latent_image": ["9", 2],
            "seed":         seed,
            "steps":        4,
            "cfg":          1.0,
            "sampler_name": "euler",
            "scheduler":    "simple",
            "denoise":      1.0,
        }},
        # 11. Decode latent to images
        "11": {"class_type": "VAEDecode", "inputs": {
            "samples": ["10", 0],
            "vae":     ["5", 0],
        }},
        # 12. Combine frames into video
        "12": {"class_type": "CreateVideo", "inputs": {
            "images": ["11", 0],
            "fps":    16.0,
        }},
        # 13. Save video to disk
        "13": {"class_type": "SaveVideo", "inputs": {
            "video":           ["12", 0],
            "filename_prefix": "freegma_vid",
            "format":          "auto",
            "codec":           "auto",
        }},
    }


def _generate_hunyuan(input_path: Path, prompt: str, out_dir: Path, update=None) -> Path:
    py     = HUNYUAN_RUNNER["python"]
    script = HUNYUAN_RUNNER["script"]

    if not py.exists():
        raise FileNotFoundError(
            f"HunyuanVideo 1.5 venv not found at {py}. Run setup to install it."
        )

    if update: update(0.05)

    proc = subprocess.Popen(
        [str(py), str(script), str(input_path), str(out_dir), prompt, "61"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )

    if update: update(0.10)
    stdout, stderr = proc.communicate(timeout=1200)  # 20 min

    if proc.returncode != 0:
        raise RuntimeError(f"HunyuanVideo 1.5 failed:\n{stderr[-800:]}")

    for line in stdout.splitlines():
        if line.startswith("RESULT:"):
            result_path = Path(line[7:].strip())
            if result_path.exists():
                if update: update(1.0)
                return result_path

    raise FileNotFoundError(
        f"HunyuanVideo 1.5 produced no video.\nstdout: {stdout}\nstderr: {stderr[-400:]}"
    )


def generate_video(
    input_path: Path, prompt: str, neg: str, model: str = "wan2video",
    out_dir: Path = None, update=None,
) -> Path:
    if model == "hunyuan15":
        return _generate_hunyuan(input_path, prompt, out_dir, update)

    if update: update(0.05)

    image_filename = _upload_to_comfyui(input_path)
    if update: update(0.10)

    client_id = str(uuid.uuid4())
    workflow  = _build_workflow(image_filename, prompt, neg, -1)

    resp = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    # Poll up to 20 min
    for attempt in range(600):
        time.sleep(2)
        if update and attempt % 15 == 0:
            update(min(0.95, 0.10 + attempt / 400))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("ComfyUI video timeout (20 min)")

    outputs = history[prompt_id]["outputs"]
    for node_out in outputs.values():
        for key in ("videos", "gifs", "images"):
            if key not in node_out:
                continue
            info = node_out[key][0]
            url  = (
                f"{COMFYUI_URL}/view?filename={info['filename']}"
                f"&subfolder={info.get('subfolder', '')}"
                f"&type={info.get('type', 'output')}"
            )
            vid_bytes = requests.get(url, timeout=300).content
            ext = ".mp4" if "mp4" in info["filename"].lower() else ".webm"
            out = out_dir / f"result{ext}"
            out.write_bytes(vid_bytes)
            if update: update(1.0)
            return out

    raise RuntimeError("ComfyUI nu a returnat niciun video in output")
