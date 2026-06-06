"""Text-to-image via ComfyUI SDXL."""

import uuid, time, requests
from pathlib import Path
from io import BytesIO

COMFYUI_URL = "http://127.0.0.1:8188"
CHECKPOINT  = "sd_xl_base_1.0.safetensors"


def build_workflow(prompt: str, neg: str, steps: int, cfg: float, seed: int, w: int, h: int) -> dict:
    if seed < 0:
        import random
        seed = random.randint(0, 2**32 - 1)

    return {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {
            "text": prompt + ", cinematic lighting, 8k, ultra detailed, no watermark",
            "clip": ["4", 1]
        }},
        "7": {"class_type": "CLIPTextEncode", "inputs": {
            "text": neg + ", blurry, low quality, watermark, text, signature",
            "clip": ["4", 1]
        }},
        "3": {"class_type": "KSampler", "inputs": {
            "seed": seed, "steps": steps, "cfg": cfg,
            "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0,
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]
        }},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "freegma", "images": ["8", 0]}},
    }


def generate_image(
    prompt: str, neg: str,
    steps: int, cfg: float, seed: int,
    w: int, h: int,
    out_dir: Path,
    update=None,
) -> Path:
    client_id = str(uuid.uuid4())
    workflow   = build_workflow(prompt, neg, steps, cfg, seed, w, h)

    resp = requests.post(f"{COMFYUI_URL}/prompt",
                         json={"prompt": workflow, "client_id": client_id}, timeout=30)
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(300):
        time.sleep(1)
        if update and attempt % 5 == 0:
            update(0.1 + min(0.8, attempt / 150))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("ComfyUI timeout")

    outputs = history[prompt_id]["outputs"]
    for node_out in outputs.values():
        if "images" not in node_out:
            continue
        info = node_out["images"][0]
        url  = (f"{COMFYUI_URL}/view?filename={info['filename']}"
                f"&subfolder={info.get('subfolder','')}&type={info.get('type','output')}")
        img_bytes = requests.get(url, timeout=60).content
        out = out_dir / "result.png"
        out.write_bytes(img_bytes)
        if update:
            update(1.0)
        return out

    raise RuntimeError("ComfyUI nu a returnat nicio imagine")
