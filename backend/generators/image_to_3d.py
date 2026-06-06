"""Image-to-3D via TripoSR (subprocess with isolated venv)."""

import subprocess
from pathlib import Path

VENV_PYTHON  = Path(r"C:\Users\Fane sefu meu\models_3d\tsr_venv\Scripts\python.exe")
RUNNER_SCRIPT = Path(r"C:\Users\Fane sefu meu\models_3d\triposr_runner.py")


def generate_3d(input_path: Path, model: str, out_dir: Path, update=None) -> Path:
    if not VENV_PYTHON.exists():
        raise FileNotFoundError(
            f"TripoSR venv not found at {VENV_PYTHON}. "
            "Run the setup script to install it."
        )

    if update: update(0.05)

    proc = subprocess.Popen(
        [str(VENV_PYTHON), str(RUNNER_SCRIPT), str(input_path), str(out_dir)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if update: update(0.15)

    stdout, stderr = proc.communicate(timeout=300)

    if proc.returncode != 0:
        raise RuntimeError(f"TripoSR failed:\n{stderr[-800:]}")

    # Runner prints "RESULT:<path>" on success
    result_path = None
    for line in stdout.splitlines():
        if line.startswith("RESULT:"):
            result_path = Path(line[7:].strip())
            break

    if not result_path or not result_path.exists():
        # fallback: search for glb in out_dir
        glbs = list(out_dir.glob("*.glb"))
        if glbs:
            result_path = glbs[0]
        else:
            raise FileNotFoundError(f"TripoSR produced no .glb file.\nstdout: {stdout}\nstderr: {stderr[-400:]}")

    if update: update(1.0)
    return result_path
