"""
XTTS v2 voice cloning worker — run with the isolated TTS venv.
Usage: python tts_worker.py --voice <path> --text <text> --output <wav> --lang <lang>
"""
import sys, subprocess, argparse
from pathlib import Path

import torch
_orig_load = torch.load
def _load_compat(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _orig_load(*args, **kwargs)
torch.load = _load_compat

import torchaudio
try:
    torchaudio.set_audio_backend("soundfile")
except Exception:
    pass

parser = argparse.ArgumentParser()
parser.add_argument("--voice",  required=True)
parser.add_argument("--text",   required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--lang",   default="en")
args = parser.parse_args()

voice_path = Path(args.voice)
out_path   = Path(args.output)
out_path.parent.mkdir(parents=True, exist_ok=True)

if voice_path.suffix.lower() != ".wav":
    wav_path = out_path.parent / f"_voice_{voice_path.stem}.wav"
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", str(voice_path),
         "-ar", "22050", "-ac", "1", "-c:a", "pcm_s16le", str(wav_path)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(f"[ERR] WAV conversion failed:\n{r.stderr[-300:]}", file=sys.stderr)
        sys.exit(1)
    voice_path = wav_path

from TTS.api import TTS
device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
tts.tts_to_file(
    text=args.text,
    speaker_wav=str(voice_path),
    language=args.lang,
    file_path=str(out_path),
)
print(f"[OK] {out_path}")
