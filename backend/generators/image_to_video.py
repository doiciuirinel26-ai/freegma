"""Image-to-Video via ComfyUI WAN 2.2 VACE workflow."""

import uuid, time, random, requests
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"

DEFAULT_NEG = (
    "static, no motion, blur, low quality, worst quality, "
    "overexposed, text, watermark, ugly"
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


def _build_wan_workflow(image_filename: str, prompt: str, neg: str, seed: int) -> dict:
    if seed < 0:
        seed = random.randint(0, 2**32 - 1)
    if not neg.strip():
        neg = DEFAULT_NEG

    return {
        # Loaders
        "1": {"class_type": "UNETLoader", "inputs": {
            "unet_name": "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
            "weight_dtype": "default",
        }},
        "2": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
            "type": "wan",
            "device": "default",
        }},
        "3": {"class_type": "VAELoader", "inputs": {
            "vae_name": "wan_2.1_vae.safetensors",
        }},
        # LoRA (4-step acceleration)
        "4": {"class_type": "LoraLoader", "inputs": {
            "model": ["1", 0],
            "clip":  ["2", 0],
            "lora_name": "wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise (3).safetensors",
            "strength_model": 0.3,
            "strength_clip":  1.0,
        }},
        # Prompts
        "5": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["4", 1],
            "text": (prompt.strip() or "cinematic motion, smooth video") + ", high quality, realistic",
        }},
        "6": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["4", 1],
            "text": neg,
        }},
        # Input image
        "7": {"class_type": "LoadImage", "inputs": {"image": image_filename}},
        # WAN VACE conditioning
        "8": {"class_type": "WanVaceToVideo", "inputs": {
            "positive":        ["5", 0],
            "negative":        ["6", 0],
            "vae":             ["3", 0],
            "reference_image": ["7", 0],
            "width":   768,
            "height":  768,
            "length":  81,
            "batch_size": 1,
            "strength": 1.0,
        }},
        # Shift sampler for video
        "9": {"class_type": "ModelSamplingSD3", "inputs": {
            "model": ["4", 0],
            "shift": 8.0,
        }},
        # KSampler (4 steps with CausVid LoRA)
        "10": {"class_type": "KSampler", "inputs": {
            "model":        ["9", 0],
            "positive":     ["8", 0],
            "negative":     ["8", 1],
            "latent_image": ["8", 2],
            "seed":         seed,
            "steps":        4,
            "cfg":          1.0,
            "sampler_name": "uni_pc",
            "scheduler":    "simple",
            "denoise":      1.0,
        }},
        # Trim + decode
        "11": {"class_type": "TrimVideoLatent", "inputs": {
            "samples":     ["10", 0],
            "trim_amount": ["8", 3],
        }},
        "12": {"class_type": "VAEDecode", "inputs": {
            "samples": ["11", 0],
            "vae":     ["3", 0],
        }},
        # Save as MP4
        "13": {"class_type": "CreateVideo", "inputs": {
            "images": ["12", 0],
            "fps":    16,
        }},
        "14": {"class_type": "SaveVideo", "inputs": {
            "video":           ["13", 0],
            "filename_prefix": "freegma_vid",
            "format":          "auto",
            "codec":           "auto",
        }},
    }


def generate_video(
    input_path: Path, prompt: str, neg: str,
    out_dir: Path, update=None,
) -> Path:
    if update: update(0.05)

    image_filename = _upload_to_comfyui(input_path)
    if update: update(0.10)

    client_id = str(uuid.uuid4())
    workflow  = _build_wan_workflow(image_filename, prompt, neg, -1)

    resp = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    # Poll up to 20 min (600 x 2s)
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
