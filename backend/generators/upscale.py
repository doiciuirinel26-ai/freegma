"""Image upscale via ComfyUI Real-ESRGAN."""

import uuid, time, requests
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"

MODELS = {
    "realesrgan_x4_photo":  "RealESRGAN_x4plus.pth",
    "realesrgan_x4_anime":  "RealESRGAN_x4plus_anime_6B.pth",
    "realesrgan_x2_photo":  "RealESRGAN_x2plus.pth",
    "ultrasharp_x4":        "4x-UltraSharp.pth",
}


def _upload_image(path: Path) -> str:
    suffix = path.suffix.lower()
    mime = "image/png" if suffix == ".png" else "image/jpeg"
    with open(path, "rb") as f:
        resp = requests.post(
            f"{COMFYUI_URL}/upload/image",
            files={"image": (path.name, f, mime)},
            timeout=30,
        )
    resp.raise_for_status()
    return resp.json()["name"]


def _build_workflow(image_name: str, model_file: str) -> dict:
    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "2": {"class_type": "UpscaleModelLoader", "inputs": {"model_name": model_file}},
        "3": {"class_type": "ImageUpscaleWithModel", "inputs": {
            "upscale_model": ["2", 0],
            "image": ["1", 0],
        }},
        "4": {"class_type": "SaveImage", "inputs": {
            "images": ["3", 0],
            "filename_prefix": "freegma_upscale",
        }},
    }


def upscale_image(input_path: Path, model: str, out_dir: Path, update=None) -> Path:
    model_file = MODELS.get(model, MODELS["realesrgan_x4_photo"])

    if update: update(0.05)
    image_name = _upload_image(input_path)
    if update: update(0.2)

    client_id = str(uuid.uuid4())
    workflow = _build_workflow(image_name, model_file)

    resp = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(150):  # max 5 min
        time.sleep(2)
        if update and attempt % 5 == 0:
            update(min(0.9, 0.2 + attempt / 100))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("Upscale timeout (5 min)")

    outputs = history[prompt_id]["outputs"]
    for node_out in outputs.values():
        if "images" not in node_out:
            continue
        info = node_out["images"][0]
        url = (
            f"{COMFYUI_URL}/view?filename={info['filename']}"
            f"&subfolder={info.get('subfolder', '')}&type={info.get('type', 'output')}"
        )
        data = requests.get(url, timeout=120).content
        out = out_dir / "result.png"
        out.write_bytes(data)
        if update: update(1.0)
        return out

    raise RuntimeError("Upscale: ComfyUI returned no output")
