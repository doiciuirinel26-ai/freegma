"""
Image-to-3D via TripoSR sau InstantMesh.
Modele descarcate in: C:/Users/Fane sefu meu/models_3d/
"""

import subprocess, sys
from pathlib import Path

MODELS_DIR = Path(r"C:\Users\Fane sefu meu\models_3d")


def generate_3d(input_path: Path, model: str, out_dir: Path, update=None) -> Path:
    if model.lower() in ("instantmesh", "instant-mesh"):
        return _run_instantmesh(input_path, out_dir, update)
    else:
        return _run_triposr(input_path, out_dir, update)


def _run_triposr(input_path: Path, out_dir: Path, update=None) -> Path:
    if update: update(0.1)
    try:
        import rembg
        import numpy as np
        from PIL import Image
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install",
                        "rembg", "onnxruntime", "-q"], check=True)
        import rembg
        import numpy as np
        from PIL import Image

    try:
        from tsr.system import TSR
        from tsr.utils import remove_background, resize_foreground
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install",
                        "tsr", "-q"], check=True)
        from tsr.system import TSR
        from tsr.utils import remove_background, resize_foreground

    import torch

    if update: update(0.2)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model_path = MODELS_DIR / "TripoSR"

    system = TSR.from_pretrained(
        str(model_path) if model_path.exists() else "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    system = system.to(device)

    if update: update(0.3)

    # Preproceseaza imaginea
    image = Image.open(input_path).convert("RGB")
    image = remove_background(image, rembg.new_session())
    image = resize_foreground(image, 0.85)

    if update: update(0.5)

    with torch.no_grad():
        scene_codes = system([image], device=device)

    if update: update(0.7)

    meshes = system.extract_mesh(scene_codes, resolution=256)
    out_glb = out_dir / "model.glb"
    meshes[0].export(str(out_glb))

    if update: update(1.0)
    return out_glb


def _run_instantmesh(input_path: Path, out_dir: Path, update=None) -> Path:
    if update: update(0.1)

    instantmesh_dir = MODELS_DIR / "InstantMesh"
    if not instantmesh_dir.exists():
        raise FileNotFoundError(
            "InstantMesh nu e instalat. Ruleaza: python download_3d_models.py"
        )

    script = instantmesh_dir / "run.py"
    if update: update(0.2)

    result = subprocess.run(
        [sys.executable, str(script),
         "--input", str(input_path),
         "--output", str(out_dir),
         "--export-texmap"],
        capture_output=True, text=True, timeout=300,
    )

    if result.returncode != 0:
        raise RuntimeError(f"InstantMesh error: {result.stderr[-500:]}")

    if update: update(0.9)

    # Cauta .glb in output
    glbs = list(out_dir.glob("**/*.glb"))
    if glbs:
        if update: update(1.0)
        return glbs[0]

    objs = list(out_dir.glob("**/*.obj"))
    if objs:
        if update: update(1.0)
        return objs[0]

    raise FileNotFoundError("InstantMesh nu a generat niciun fisier 3D")
