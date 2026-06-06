"""Image-to-3D via TripoSR or InstantMesh (subprocess with isolated venvs)."""

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
}


def generate_3d(input_path: Path, model: str, out_dir: Path, update=None) -> Path:
    runner = RUNNERS.get(model) or RUNNERS["triposr"]
    py     = runner["python"]
    script = runner["script"]

    if not py.exists():
        raise FileNotFoundError(
            f"Venv for '{model}' not found at {py}. Run the setup script to install it."
        )

    if update: update(0.05)

    proc = subprocess.Popen(
        [str(py), str(script), str(input_path), str(out_dir)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if update: update(0.15)

    timeout = 600 if model == "instantmesh" else 300
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
