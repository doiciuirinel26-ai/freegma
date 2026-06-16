"""Image-to-3D via InstantMesh or Hunyuan3D (subprocess with isolated venvs)."""

import subprocess
from pathlib import Path

MODELS_DIR = Path(r"C:\Users\Fane sefu meu\models_3d")

RUNNERS = {
    "triposr": {
        "python": MODELS_DIR / "tsr_venv" / "Scripts" / "python.exe",
        "script": MODELS_DIR / "triposr_runner.py",
    },
    "instantmesh": {
        "python": MODELS_DIR / "instantmesh_venv" / "Scripts" / "python.exe",
        "script": MODELS_DIR / "instantmesh_runner.py",
    },
    "sf3d": {
        "python": MODELS_DIR / "sf3d_venv" / "Scripts" / "python.exe",
        "script": MODELS_DIR / "sf3d_runner.py",
    },
    "hunyuan3d": {
        "python": MODELS_DIR / "hunyuan3d_venv" / "Scripts" / "python.exe",
        "script": MODELS_DIR / "hunyuan3d_runner.py",
    },
}


def generate_3d(input_paths: list, model: str, out_dir: Path, update=None) -> Path:
    runner = RUNNERS.get(model) or RUNNERS["triposr"]
    py     = runner["python"]
    script = runner["script"]

    if not py.exists():
        raise FileNotFoundError(
            f"Venv for '{model}' not found at {py}. Run the setup script to install it."
        )

    if update: update(0.05)

    if model == "hunyuan3d":
        # New CLI: <out_dir> <img1> [img2] [img3] [img4]
        cmd = [str(py), str(script), str(out_dir)] + [str(p) for p in input_paths]
    else:
        # Other models: single image only — <img1> <out_dir>
        cmd = [str(py), str(script), str(input_paths[0]), str(out_dir)]

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if update: update(0.15)

    timeout = 600 if model in ("instantmesh", "hunyuan3d") else 300
    stdout, stderr = proc.communicate(timeout=timeout)

    if proc.returncode != 0:
        raise RuntimeError(f"{model} failed:\n{stderr[-800:]}")

    result_path = None
    for line in stdout.splitlines():
        if line.startswith("RESULT:"):
            result_path = Path(line[7:].strip())
            break

    if not result_path or not result_path.exists():
        glbs = list(out_dir.glob("*.glb"))
        if glbs:
            result_path = glbs[0]
        else:
            raise FileNotFoundError(
                f"{model} produced no .glb file.\nstdout: {stdout}\nstderr: {stderr[-400:]}"
            )

    if update: update(1.0)
    return result_path
