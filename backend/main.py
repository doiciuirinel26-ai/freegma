"""
FREEGMA Backend — FastAPI
Expune ComfyUI + TripoSR + InstantMesh printr-un API REST securizat.
Ruleaza local pe portul 8000, expus public prin Cloudflare Tunnel.
"""

from fastapi import FastAPI, UploadFile, File, Header, Request, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn, uuid, asyncio, time, shutil, os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

from middleware.auth import validate_key, check_rate_limit
from generators.text_to_image import generate_image
from generators.image_to_3d import generate_3d
from generators.image_to_video import generate_video
from generators.lipsync import generate_lipsync

# ── Config ──────────────────────────────────────────────
TEMP_DIR  = Path(__file__).parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)
MAX_QUEUE = 3
CLEANUP_MINUTES = 15

# ── Job store ────────────────────────────────────────────
job_store: dict = {}       # job_id → { status, progress, result_path, error }
job_queue: asyncio.Queue   # initializat in lifespan

# ── App ──────────────────────────────────────────────────
app = FastAPI(title="FREEGMA GPU Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Lifespan: porneste worker-ul la startup ───────────────
@app.on_event("startup")
async def startup():
    global job_queue
    job_queue = asyncio.Queue()
    asyncio.create_task(worker())
    print("[OK] FREEGMA backend pornit pe portul 8000")
    print("[OK] Worker GPU activ")

# ── Models ───────────────────────────────────────────────
class TransitionSettings(BaseModel):
    type: str = "cut"
    duration: float = 0.0

class StudioRenderRequest(BaseModel):
    clip_ids: list[str]
    transitions: list[TransitionSettings] = []
    clip_durations: list[float] = []
    audio_id: Optional[str] = None
    audio_offset: float = 0.0


class GenerateRequest(BaseModel):
    mode: str              # "text-to-image" | "image-to-3d" | "image-to-video" | "lip-sync" | "video-pipeline" | "upscale"
    prompt: str = ""
    neg_prompt: str = ""
    model: str = "sdxl"
    steps: int = 30
    cfg: float = 7.0
    resolution: str = "1024×1024"
    seed: int = -1
    file_id: Optional[str] = None
    # Lip-sync specific
    audio_file_id: Optional[str] = None
    tts_text: str = ""
    tts_voice: str = "en-US-JennyNeural"
    lips_expression: float = 1.8
    ls_steps: int = 20
    # Video pipeline specific
    bg_image_ids: list = []
    bg_video_ids: list = []
    narration_text: str = ""
    tts_engine: str = "edge"      # "kokoro" | "edge"
    lang: str = "en"              # "en" | "ro"
    no_zoom: bool = False
    no_subtitles: bool = False
    fixed_scene_duration: Optional[float] = None

# ── Routes ───────────────────────────────────────────────
@app.get("/api/debug-key")
async def debug_key():
    from middleware.auth import API_KEY
    return {"api_key": API_KEY, "len": len(API_KEY)}

@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "queue": job_queue.qsize() if job_queue else 0,
        "jobs": len([j for j in job_store.values() if j["status"] in ("queued", "running")])
    }

@app.post("/api/upload")
async def upload(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(None),
    key: Optional[str] = Query(None),
):
    validate_key(x_api_key or key)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 50MB)")

    file_id = uuid.uuid4().hex
    dest_dir = TEMP_DIR / "uploads" / file_id
    dest_dir.mkdir(parents=True)
    ext = Path(file.filename).suffix or ".bin"
    dest = dest_dir / f"input{ext}"
    dest.write_bytes(await file.read())
    return {"file_id": file_id, "filename": dest.name}

@app.post("/api/generate")
async def generate(
    body: GenerateRequest,
    request: Request,
    x_api_key: Optional[str] = Header(None),
    key: Optional[str] = Query(None),
):
    validate_key(x_api_key or key)
    client_ip = request.headers.get("CF-Connecting-IP", request.client.host)
    check_rate_limit(client_ip)

    if job_queue.qsize() >= MAX_QUEUE:
        raise HTTPException(429, "GPU busy, please try again in a few minutes")

    job_id = uuid.uuid4().hex
    job_store[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "result_path": None,
        "error": None,
        "created_at": time.time(),
    }
    await job_queue.put((job_id, body))
    queue_pos = job_queue.qsize()
    return {"job_id": job_id, "queue_position": queue_pos}

@app.post("/api/studio/render")
async def studio_render(
    body: StudioRenderRequest,
    x_api_key: Optional[str] = Header(None),
    key: Optional[str] = Query(None),
):
    validate_key(x_api_key or key)

    job_id = uuid.uuid4().hex
    out_dir = TEMP_DIR / "results" / job_id
    out_dir.mkdir(parents=True)

    job_store[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "result_path": None,
        "error": None,
        "created_at": time.time(),
    }

    async def _run():
        job_store[job_id]["status"] = "running"
        job_store[job_id]["progress"] = 0.1
        try:
            clip_paths = [_find_upload(fid) for fid in body.clip_ids]
            audio_path = _find_upload(body.audio_id) if body.audio_id else None
            from generators.studio_render import render_clips
            transitions_dicts = [{"type": t.type, "duration": t.duration} for t in body.transitions]
            result_path = await asyncio.to_thread(
                render_clips, clip_paths, transitions_dicts, out_dir,
                body.clip_durations, audio_path, body.audio_offset,
            )
            job_store[job_id].update({
                "status": "done",
                "progress": 1.0,
                "result_path": str(result_path),
            })
        except Exception as e:
            job_store[job_id].update({"status": "error", "error": str(e), "progress": 0.0})
            print(f"[ERROR] Studio job {job_id}: {e}")
        asyncio.create_task(_cleanup_later(job_id, out_dir))

    asyncio.create_task(_run())
    return {"job_id": job_id}


@app.get("/api/status/{job_id}")
async def status(job_id: str, x_api_key: Optional[str] = Header(None), key: Optional[str] = Query(None)):
    validate_key(x_api_key or key)
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "status": job["status"],
        "progress": job["progress"],
        "error": job.get("error"),
    }

@app.get("/api/result/{job_id}")
async def result(job_id: str, x_api_key: Optional[str] = Header(None), key: Optional[str] = Query(None)):
    validate_key(x_api_key or key)
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "done":
        raise HTTPException(400, f"Job not ready yet (status: {job['status']})")
    path = Path(job["result_path"])
    if not path.exists():
        raise HTTPException(410, "Result expired")
    return FileResponse(
        str(path),
        media_type=_media_type(path),
        filename=path.name,
    )

def _media_type(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        ".png": "image/png", ".jpg": "image/jpeg",
        ".mp4": "video/mp4", ".webm": "video/webm",
        ".glb": "model/gltf-binary", ".obj": "model/obj",
    }.get(ext, "application/octet-stream")

# ── Worker GPU ────────────────────────────────────────────
async def worker():
    global job_queue
    while True:
        try:
            job_id, req = await job_queue.get()
        except Exception:
            await asyncio.sleep(1)
            continue

        job_store[job_id]["status"] = "running"
        job_store[job_id]["progress"] = 0.05

        out_dir = TEMP_DIR / "results" / job_id
        out_dir.mkdir(parents=True, exist_ok=True)

        def update(p: float):
            job_store[job_id]["progress"] = p

        try:
            if req.mode == "text-to-image":
                w, h = _parse_resolution(req.resolution)
                result_path = await asyncio.to_thread(
                    generate_image,
                    req.prompt, req.neg_prompt,
                    req.steps, req.cfg, req.seed, w, h,
                    out_dir, update
                )
            elif req.mode == "image-to-3d":
                input_paths = [_find_upload(req.file_id)]
                for fid in (req.bg_image_ids or []):
                    input_paths.append(_find_upload(fid))
                result_path = await asyncio.to_thread(
                    generate_3d, input_paths, req.model, out_dir, update
                )
            elif req.mode == "image-to-video":
                input_path = _find_upload(req.file_id)
                result_path = await asyncio.to_thread(
                    generate_video, input_path, req.prompt, req.neg_prompt, req.model, out_dir, update
                )
            elif req.mode == "lip-sync":
                avatar_path = _find_upload(req.file_id)
                audio_path  = _find_upload(req.audio_file_id) if req.audio_file_id else None
                result_path = await asyncio.to_thread(
                    generate_lipsync,
                    avatar_path, audio_path,
                    req.tts_text, req.tts_voice,
                    req.lips_expression, req.ls_steps,
                    out_dir, update,
                )
            elif req.mode == "video-pipeline":
                from generators.video_pipeline_gen import generate_video_pipeline
                bg_image_paths = [_find_upload(fid) for fid in (req.bg_image_ids or [])]
                bg_video_paths = [_find_upload(fid) for fid in (req.bg_video_ids or [])]
                avatar_path_vp = _find_upload(req.file_id) if req.file_id else None
                voice_sample   = _find_upload(req.audio_file_id) if req.audio_file_id else None
                result_path = await asyncio.to_thread(
                    generate_video_pipeline,
                    bg_image_paths, bg_video_paths, avatar_path_vp,
                    req.narration_text, req.tts_engine, req.tts_voice, req.lang,
                    req.no_zoom, req.no_subtitles, req.fixed_scene_duration,
                    out_dir, update, voice_sample,
                )
            elif req.mode == "upscale":
                from generators.upscale import upscale_image
                input_path = _find_upload(req.file_id)
                result_path = await asyncio.to_thread(
                    upscale_image, input_path, req.model, out_dir, update
                )
            elif req.mode == "lipsync-realface":
                from generators.lipsync_realface import generate_realface_lipsync
                video_path = _find_upload(req.file_id)
                voice_path = _find_upload(req.audio_file_id)
                result_path = await asyncio.to_thread(
                    generate_realface_lipsync,
                    video_path, voice_path,
                    req.tts_text, req.lang,
                    out_dir, update,
                )
            elif req.mode == "ads-clothing-video":
                from generators.ads_clothing_video import generate_clothing_video
                input_path = _find_upload(req.file_id)
                result_path = await asyncio.to_thread(
                    generate_clothing_video,
                    input_path, req.prompt, req.neg_prompt, out_dir, update
                )
            elif req.mode == "ads-product-on-model":
                from generators.ads_product_on_model import generate_product_on_model
                ref_paths = [_find_upload(req.file_id)] if req.file_id else []
                ref_paths += [_find_upload(fid) for fid in (req.bg_image_ids or [])]
                result_path = await asyncio.to_thread(
                    generate_product_on_model,
                    ref_paths, req.prompt, out_dir, update
                )
            else:
                raise ValueError(f"Unknown mode: {req.mode}")

            job_store[job_id].update({
                "status": "done",
                "progress": 1.0,
                "result_path": str(result_path),
            })

        except Exception as e:
            job_store[job_id].update({
                "status": "error",
                "error": str(e),
                "progress": 0.0,
            })
            print(f"[ERROR] Job {job_id}: {e}")

        # Curata dupa CLEANUP_MINUTES
        asyncio.create_task(_cleanup_later(job_id, out_dir))

async def _cleanup_later(job_id: str, out_dir: Path):
    await asyncio.sleep(CLEANUP_MINUTES * 60)
    shutil.rmtree(out_dir, ignore_errors=True)
    job_store.pop(job_id, None)

def _parse_resolution(res: str) -> tuple[int, int]:
    try:
        parts = res.replace("×", "x").split("x")
        return int(parts[0]), int(parts[1])
    except Exception:
        return 1024, 1024

def _find_upload(file_id: Optional[str]) -> Path:
    if not file_id:
        raise ValueError("file_id missing for this mode")
    upload_dir = TEMP_DIR / "uploads" / file_id
    files = list(upload_dir.glob("input.*"))
    if not files:
        raise FileNotFoundError(f"Upload {file_id} not found")
    return files[0]

# ── Cleanup uploads vechi la startup ─────────────────────
@app.on_event("startup")
async def cleanup_old():
    uploads = TEMP_DIR / "uploads"
    if uploads.exists():
        for d in uploads.iterdir():
            if d.is_dir():
                mtime = d.stat().st_mtime
                if time.time() - mtime > 3600:
                    shutil.rmtree(d, ignore_errors=True)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
