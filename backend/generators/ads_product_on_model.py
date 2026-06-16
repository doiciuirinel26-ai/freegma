"""Ads Studio — Product on Model via FLUX Fill inpainting.

Technique: PIL composite (black canvas left + 2x2 reference grid right) +
mask (white left / black right) → FLUX Fill generates model on left side.
"""

import io, uuid, time, random, requests
from pathlib import Path
from PIL import Image, ImageDraw

COMFYUI_URL = "http://127.0.0.1:8188"

CANVAS_W = 512
CANVAS_H = 768


def _create_composite_and_mask(ref_paths: list[Path]) -> tuple[bytes, bytes]:
    """Build 1024×768 composite image and white-left mask."""
    full_w = CANVAS_W * 2  # 1024
    full_h = CANVAS_H       # 768

    composite = Image.new("RGB", (full_w, full_h), (0, 0, 0))

    cell_w = CANVAS_W // 2   # 256
    cell_h = CANVAS_H // 2   # 384

    cell_positions = [
        (CANVAS_W, 0),
        (CANVAS_W + cell_w, 0),
        (CANVAS_W, cell_h),
        (CANVAS_W + cell_w, cell_h),
    ]

    for i, pos in enumerate(cell_positions):
        if i < len(ref_paths) and ref_paths[i] and ref_paths[i].exists():
            img = Image.open(ref_paths[i]).convert("RGB")
            img = img.resize((cell_w, cell_h), Image.LANCZOS)
            composite.paste(img, pos)

    # Mask: white (255) = inpaint left half, black (0) = keep right half
    mask = Image.new("RGB", (full_w, full_h), (0, 0, 0))
    mask.paste(Image.new("RGB", (CANVAS_W, full_h), (255, 255, 255)), (0, 0))

    composite_buf = io.BytesIO()
    composite.save(composite_buf, format="PNG")

    mask_buf = io.BytesIO()
    mask.save(mask_buf, format="PNG")

    return composite_buf.getvalue(), mask_buf.getvalue()


def _upload_bytes_to_comfyui(data: bytes, filename: str) -> str:
    resp = requests.post(
        f"{COMFYUI_URL}/upload/image",
        files={"image": (filename, io.BytesIO(data), "image/png")},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["name"]


def _build_workflow(composite_name: str, mask_name: str, prompt: str, seed: int) -> dict:
    if seed < 0:
        seed = random.randint(0, 2**32 - 1)

    pos_text = prompt.strip() if prompt.strip() else (
        "photo of a fashion model wearing the clothing, professional studio photography, "
        "clean white background, high quality, sharp focus"
    )

    return {
        "1": {"class_type": "UNETLoader", "inputs": {
            "unet_name":    "flux1-fill-dev-fp8.safetensors",
            "weight_dtype": "fp8_e4m3fn",
        }},
        "2": {"class_type": "VAELoader", "inputs": {
            "vae_name": "ae.safetensors",
        }},
        # type "sd3" loads CLIP-L + T5-XXL, same as flux — matches workflow 15
        "3": {"class_type": "DualCLIPLoader", "inputs": {
            "clip_name1": "clip_l.safetensors",
            "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
            "type":       "sd3",
        }},
        "4": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["3", 0],
            "text": pos_text,
        }},
        "5": {"class_type": "CLIPTextEncode", "inputs": {
            "clip": ["3", 0],
            "text": "",
        }},
        "6": {"class_type": "LoadImage", "inputs": {"image": composite_name}},
        "7": {"class_type": "LoadImage", "inputs": {"image": mask_name}},
        "8": {"class_type": "ImageToMask", "inputs": {"image": ["7", 0], "channel": "red"}},
        "9": {"class_type": "DifferentialDiffusion", "inputs": {"model": ["1", 0]}},
        "10": {"class_type": "InpaintModelConditioning", "inputs": {
            "positive":   ["4", 0],
            "negative":   ["5", 0],
            "vae":        ["2", 0],
            "pixels":     ["6", 0],
            "mask":       ["8", 0],
            "noise_mask": False,
        }},
        "11": {"class_type": "BasicGuider", "inputs": {
            "model":        ["9", 0],
            "conditioning": ["10", 0],
        }},
        "12": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "13": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "dpmpp_2m"}},
        "14": {"class_type": "BasicScheduler", "inputs": {
            "model":     ["9", 0],
            "scheduler": "beta",
            "steps":     20,
            "denoise":   1.0,
        }},
        "15": {"class_type": "SamplerCustomAdvanced", "inputs": {
            "noise":        ["12", 0],
            "guider":       ["11", 0],
            "sampler":      ["13", 0],
            "sigmas":       ["14", 0],
            "latent_image": ["10", 2],
        }},
        "16": {"class_type": "VAEDecode", "inputs": {
            "samples": ["15", 1],
            "vae":     ["2", 0],
        }},
        "17": {"class_type": "SaveImage", "inputs": {
            "images":          ["16", 0],
            "filename_prefix": "freegma_ads_img",
        }},
    }


def _crop_left_half(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    cropped = img.crop((0, 0, CANVAS_W, CANVAS_H))
    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    return buf.getvalue()


def generate_product_on_model(
    ref_paths: list[Path], prompt: str = "",
    out_dir: Path = None, update=None,
) -> Path:
    # Free VRAM from previous WanVideo run before loading FLUX
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

    composite_bytes, mask_bytes = _create_composite_and_mask(ref_paths)
    if update:
        update(0.10)

    composite_name = _upload_bytes_to_comfyui(composite_bytes, "ads_composite.png")
    mask_name = _upload_bytes_to_comfyui(mask_bytes, "ads_mask.png")
    if update:
        update(0.15)

    client_id = str(uuid.uuid4())
    workflow = _build_workflow(composite_name, mask_name, prompt, -1)

    resp = requests.post(
        f"{COMFYUI_URL}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    if not resp.ok:
        try:
            err = resp.json()
        except Exception:
            err = resp.text
        raise RuntimeError(f"ComfyUI /prompt rejected workflow ({resp.status_code}): {err}")
    prompt_id = resp.json()["prompt_id"]

    for attempt in range(600):
        time.sleep(2)
        if update and attempt % 15 == 0:
            update(min(0.95, 0.15 + attempt / 400))
        history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10).json()
        if prompt_id in history:
            break
    else:
        raise TimeoutError("ComfyUI product-on-model timeout (20 min)")

    outputs = history[prompt_id]["outputs"]
    for node_out in outputs.values():
        if "images" not in node_out:
            continue
        info = node_out["images"][0]
        url = (
            f"{COMFYUI_URL}/view?filename={info['filename']}"
            f"&subfolder={info.get('subfolder', '')}"
            f"&type={info.get('type', 'output')}"
        )
        img_bytes = requests.get(url, timeout=120).content
        cropped = _crop_left_half(img_bytes)
        out = out_dir / "result.png"
        out.write_bytes(cropped)
        if update:
            update(1.0)
        return out

    raise RuntimeError("ComfyUI did not return any image output")
