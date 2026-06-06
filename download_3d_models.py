"""
Descarca modelele 3D necesare pentru FREEGMA.
Modele selectate pentru RTX 3090 24GB:
  1. TripoSR  (Stability AI) — rapid, ~3.5GB VRAM, calitate buna
  2. InstantMesh (Tencent) — calitate inalta, ~10GB VRAM
"""

import subprocess, sys
from pathlib import Path

MODELS_DIR = Path(r"C:\Users\Fane sefu meu\models_3d")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def install(pkg):
    subprocess.run([sys.executable, "-m", "pip", "install", pkg, "-q"], check=True)

def download_triposr():
    print("\n[1/2] Descarc TripoSR (Stability AI, ~3.5GB)...")
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        install("huggingface_hub")
        from huggingface_hub import snapshot_download

    dest = MODELS_DIR / "TripoSR"
    if dest.exists() and any(dest.iterdir()):
        print("  ✓ TripoSR deja descarcat")
        return

    snapshot_download(
        "stabilityai/TripoSR",
        local_dir=str(dest),
        ignore_patterns=["*.md", "*.txt", "examples/*"],
    )
    print(f"  ✓ TripoSR salvat la: {dest}")

    # Instaleaza dependintele
    print("  Instalez dependinte TripoSR...")
    for pkg in ["tsr", "rembg", "trimesh", "einops", "omegaconf"]:
        install(pkg)
    print("  ✓ Dependinte instalate")

def download_instantmesh():
    print("\n[2/2] Descarc InstantMesh (Tencent, ~12GB)...")
    try:
        from huggingface_hub import snapshot_download, hf_hub_download
    except ImportError:
        install("huggingface_hub")
        from huggingface_hub import snapshot_download, hf_hub_download

    dest = MODELS_DIR / "InstantMesh"

    # Cloneaza repo-ul InstantMesh
    if not dest.exists():
        print("  Clonez repo InstantMesh...")
        subprocess.run([
            "git", "clone", "--depth=1",
            "https://github.com/TencentARC/InstantMesh.git",
            str(dest)
        ], check=True)

    # Descarca checkpointul
    ckpt_dir = dest / "ckpts"
    ckpt_dir.mkdir(exist_ok=True)
    ckpt_file = ckpt_dir / "instant-mesh-large.ckpt"

    if not ckpt_file.exists():
        print("  Descarc checkpoint InstantMesh-Large (~7GB)...")
        hf_hub_download(
            "TencentARC/InstantMesh",
            filename="instant-mesh-large.ckpt",
            local_dir=str(ckpt_dir),
        )

    # Instaleaza dependinte
    req_file = dest / "requirements.txt"
    if req_file.exists():
        print("  Instalez dependinte InstantMesh...")
        subprocess.run([sys.executable, "-m", "pip", "install",
                        "-r", str(req_file), "-q"], check=True)

    print(f"  ✓ InstantMesh salvat la: {dest}")

if __name__ == "__main__":
    print("=" * 55)
    print("  FREEGMA — Download modele 3D pentru RTX 3090")
    print("=" * 55)
    print(f"  Destinatie: {MODELS_DIR}")

    download_triposr()
    download_instantmesh()

    print("\n" + "=" * 55)
    print("  ✓ Ambele modele sunt gata!")
    print("  TripoSR  — rapid (<5s), VRAM redus")
    print("  InstantMesh — calitate inalta (~60s)")
    print("=" * 55)
