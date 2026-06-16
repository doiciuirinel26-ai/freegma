"""Ads Studio — Clothing Video via WanVideo I2V + Clothing LoRA chain."""

import uuid, time, random, requests
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"

DEFAULT_NEG = (
    "static frozen motion, blurry details, deformed, distorted, "
    "watermark, text overlay, low quality, flickering"
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

    pos_text = prompt.strip() if prompt.strip() else (
        "fashion model wearing the clothing, walking forward, cinematic motion, "
        "studio lighting, smooth fluid motion, high quality"
    )
    neg_text = neg.strip() if neg.strip() else DEFAULT_NEG

    return {
        "1": {"class_type": "UNETLoader", "inputs": {
            "unet_name": "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
            "weight_dtype": "default",
        }},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {
            "model":          ["1", 0],
            "lora_name":      "wan22-tool1-ClothConsistency-16-14-low-000045.safetensors",
            "strength_model": 0.9,
        }},
        "3": {"class_type": "LoraLoaderModelOnly", "inputs": {
            "model":          ["2", 0],
            "lora_name":      "Wan2.2-Lightning_I2V-A14B-4steps-lora_LOW_fp16.safetensors",
            "strength_model": 1.0,
        }},
        "4": {"class_type": "ModelSamplingSD3", "inputs": {
            "model": ["3", 0],
            "shift": 5.0,
        }},
        "5": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
            "type":      "wan",
            "device":    "default",
        }},
        "6": {"class_type": "VAELoader", "inputs": {
            "vae_name": "wan_2.1_vae.safetensors",
        }},
        "7": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["5", 0],
            "text": pos_text,
        }},
        "8": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["5", 0],
            "text": neg_text,
        }},
        "9": {"class_type": "LoadImage", "inputs": {
            "image": image_filename,
        }},
        "10": {"class_type": "WanImageToVideo", "inputs": {
            "positive":    ["7", 0],
            "negative":    ["8", 0],
            "vae":         ["6", 0],
            "start_image": ["9", 0],
            "width":       480,
            "height":      832,
            "length":      81,
            "batch_size":  1,
        }},
        "11": {"class_type": "KSampler", "inputs": {
            "model":        ["4", 0],
            "positive":     ["10", 0],
            "negative":     ["10", 1],
            "latent_image": ["10", 2],
            "seed":         seed,
            "steps":        4,
            "cfg":          1.0,
            "sampler_name": "euler",
            "scheduler":    "simple",
            "denoise":      1.0,
        }},
        "12": {"class_type": "VAEDecode", "inputs": {
            "samples": ["11", 0],
            "vae":     ["6", 0],
        }},
        "13": {"class_type": "CreateVideo", "inputs": {
            "images": ["12", 0],
            "fps":    16.0,
        }},
        "14": {"class_type": "SaveVideo", "inputs": {
            "video":           ["13", 0],
            "filename_prefix": "freegma_ads_vid",
            "format":          "auto",
            "codec":           "auto",
        }},
    }


def generate_clothing_video(
    input_path: Path, prompt: str, neg: str = "",
    out_dir: Path = None, update=None,
) -> Path:
    # Free VRAM from previous model run (FLUX → WanVideo switch)
    try:
        requests.post(
            f"{COMFYUI_URL}/free",
            json={"unload_models": True, "free_memory": True},
            timeout=10,
        )
    except Exception:
        pass

    if update:
        update(0.05)

    image_filename = _upload_to_comfyui(input_path)
    if update:
        update(0.10)

    client_id = str(uuid.uuid4())
    workflow = _build_workflow(image_filename, prompt, neg, -1)

    resp = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(600):
        time.sleep(2)
        if update and attempt % 15 == 0:
            update(min(0.95, 0.10 + attempt / 400))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("ComfyUI clothing video timeout (20 min)")

    outputs = history[prompt_id]["outputs"]
    for node_out in outputs.values():
        for key in ("videos", "gifs", "images"):
            if key not in node_out:
                continue
            info = node_out[key][0]
            url = (
                f"{COMFYUI_URL}/view?filename={info['filename']}"
                f"&subfolder={info.get('subfolder', '')}"
                f"&type={info.get('type', 'output')}"
            )
            vid_bytes = requests.get(url, timeout=300).content
            ext = ".mp4" if "mp4" in info["filename"].lower() else ".webm"
            out = out_dir / f"result{ext}"
            out.write_bytes(vid_bytes)
            if update:
                update(1.0)
            return out

    raise RuntimeError("ComfyUI did not return any video output")
