"""Image-to-Video via ComfyUI WAN2VIDEO."""

import uuid, time, requests
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"


def _upload_to_comfyui(image_path: Path) -> str:
    mime = "image/png" if image_path.suffix.lower() == ".png" else "image/jpeg"
    with open(image_path, "rb") as f:
        resp = requests.post(f"{COMFYUI_URL}/upload/image",
                             files={"image": (image_path.name, f, mime)}, timeout=30)
    resp.raise_for_status()
    return resp.json()["name"]


def _build_wan_workflow(image_filename: str, prompt: str, neg: str, seed: int) -> dict:
    import random
    if seed < 0:
        seed = random.randint(0, 2**32 - 1)

    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": image_filename}},
        "2": {"class_type": "WanVideoImageToVideo",
              "inputs": {
                  "model": "wan2.1_i2v_480p_14B_bf16.safetensors",
                  "image": ["1", 0],
                  "positive_prompt": prompt + ", cinematic, smooth motion",
                  "negative_prompt": neg + ", static, blur",
                  "width": 480, "height": 832,
                  "num_frames": 81, "steps": 25,
                  "cfg": 6.0, "seed": seed,
              }},
        "3": {"class_type": "SaveVideo",
              "inputs": {"video": ["2", 0], "filename_prefix": "freegma_vid"}},
    }


def generate_video(
    input_path: Path, prompt: str, neg: str,
    out_dir: Path, update=None
) -> Path:
    if update: update(0.05)

    image_filename = _upload_to_comfyui(input_path)
    if update: update(0.1)

    client_id = str(uuid.uuid4())
    workflow   = _build_wan_workflow(image_filename, prompt, neg, -1)

    resp = requests.post(f"{COMFYUI_URL}/prompt",
                         json={"prompt": workflow, "client_id": client_id}, timeout=30)
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(600):
        time.sleep(2)
        if update and attempt % 10 == 0:
            update(0.1 + min(0.85, attempt / 200))
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
            url  = (f"{COMFYUI_URL}/view?filename={info['filename']}"
                    f"&subfolder={info.get('subfolder','')}&type={info.get('type','output')}")
            vid_bytes = requests.get(url, timeout=300).content
            ext = ".mp4" if "mp4" in info["filename"].lower() else ".webm"
            out = out_dir / f"result{ext}"
            out.write_bytes(vid_bytes)
            if update: update(1.0)
            return out

    raise RuntimeError("ComfyUI nu a returnat niciun video")
