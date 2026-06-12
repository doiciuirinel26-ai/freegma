# FREEGMA — Documentație pentru Claude

> Citește acest fișier la începutul oricărei sesiuni de lucru pe proiect.

---

## Arhitectură generală

| Parte | Tehnologie | URL |
|-------|-----------|-----|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 | https://freegma.vercel.app |
| Backend | FastAPI (Python) pe portul 8000 | https://api.freegma.win |
| Tunel | Cloudflare Tunnel (Windows service cu token fix) | api.freegma.win |
| Deploy frontend | Vercel (auto-deploy via `npx vercel --prod`) | — |

---

## ⚠️ REGULI CRITICE — NU ÎNCĂLCA

1. **NU modifica `VITE_BACKEND_URL`** — nici în Vercel dashboard, nici în `vercel.json`, nici în `.env.local`. URL-ul backend-ului este `https://api.freegma.win` și este configurat corect.
2. **NU umbla la configurația Cloudflare tunnel** — rulează ca Windows service cu token hardcodat, nu necesită intervenție.
3. **NU adăuga `build.env` în `vercel.json`** — env vars sunt în Vercel dashboard și au prioritate; `build.env` în vercel.json le suprascrie și strică totul.
4. **NU face `git push` sau operații destructive** fără confirmare explicită.

---

## URLs & Environment

```
Frontend (Vercel):     https://freegma.vercel.app
Backend (Cloudflare):  https://api.freegma.win
Backend local:         http://localhost:8000
API Key:               freegma-dev-key-2026  (și în Vercel dashboard ca VITE_API_KEY)
```

### Cloudflare Tunnel
- Rulează ca **Windows service** (`cloudflared`)
- Configurat cu token fix (nu URL temporar trycloudflare.com)
- Dacă tunelul cade: `net stop cloudflared` + `net start cloudflared` (ca Administrator)
- Domeniu: `freegma.win` cumpărat pe Cloudflare

---

## Structura proiectului

```
FREEGMA/
├── src/
│   ├── api/
│   │   └── client.ts          — toate fetch-urile către backend
│   ├── app/
│   │   ├── components/
│   │   │   └── Layout.tsx     — navbar + grid background
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── TextToImagePage.tsx
│   │   │   ├── ImageTo3DPage.tsx
│   │   │   ├── ImageToVideoPage.tsx
│   │   │   ├── LipSyncPage.tsx
│   │   │   └── StudioPage.tsx
│   │   └── routes.ts
│   └── hooks/
│       └── useGeneration.ts   — hook universal pentru job polling
├── backend/
│   ├── main.py                — FastAPI app, toate endpoint-urile
│   ├── middleware/
│   │   └── auth.py            — validare API key + rate limit
│   └── generators/
│       ├── text_to_image.py   — SDXL via ComfyUI
│       ├── image_to_3d.py     — TripoSR / InstantMesh / SF3D
│       ├── image_to_video.py  — WAN 2.2 via ComfyUI
│       ├── lipsync.py         — LatentSync via ComfyUI
│       ├── video_pipeline_gen.py — Video Pipeline complet
│       └── studio_render.py   — FFmpeg concat/xfade pentru Studio
├── vercel.json                — FĂRĂ build.env (env vars sunt în dashboard)
└── .env.local                 — doar pentru dev local
```

---

## Backend — Endpoint-uri

Toate endpoint-urile cer `?key=freegma-dev-key-2026` sau header `X-Api-Key`.

### Async (returnează job_id, se face polling)
```
POST /api/generate          — text-to-image, image-to-3d, image-to-video, lip-sync, video-pipeline
POST /api/studio/render     — Studio render (async din v2, NU mai e sincron)
GET  /api/status/{job_id}   — { status, progress, error }
GET  /api/result/{job_id}   — descarcă fișierul rezultat
```

### Alte endpoint-uri
```
GET  /api/health            — { status, queue, jobs }
POST /api/upload            — upload fișier, returnează { file_id }
```

### Flux async (toate paginile, inclusiv Studio)
```
1. apiUpload(file) → file_id
2. apiGenerate({ mode, file_id, ... }) → job_id    (sau apiStudioRender → job_id)
3. polling apiStatus(job_id) la 2s până status="done"
4. resultUrl(job_id) → URL download
```

---

## Pagini & funcționalitate

### Text to Image (`/text-to-image`)
- Model: SDXL via ComfyUI (`http://127.0.0.1:8188`)
- Checkpoint: `sd_xl_base_1.0.safetensors`
- Parametri: prompt, neg_prompt, steps, cfg, resolution, seed

### Image to 3D (`/image-to-3d`)
- Modele disponibile: TripoSR, InstantMesh, SF3D
- Rulează în venvuri izolate: `C:\Users\Fane sefu meu\models_3d\`
- Output: `.glb` cu preview AR în browser

### Image to Video (`/image-to-video`)
- Model: WAN 2.2 via ComfyUI
- Output: MP4

### Lip Sync (`/lip-sync`)
- Pipeline complet: TTS → background video → avatar lip-sync overlay
- TTS: Kokoro (local, mai bun) sau Edge TTS (fallback)
- Avatar: imagine uploadată de user (required)
- Background: imagini și/sau video-uri multiple
  - Imaginile se distribuie **uniform** pe toată durata audio (nu pe paragrafe)
  - Video-urile se loopează până acoperă durata audio
- Lip-sync: LatentSync via ComfyUI (`GeekyLatentSyncNode`)
- Avatar overlay: cerc de 420px, poziționat jos-centru pe fundal 1080×1920
- Subtitles: faster-whisper (opțional)
- Output: MP4 portrait 1080×1920

### Studio (`/studio`)
- Editor timeline cu drag & drop reordonare
- Suportă: MP4, MOV, AVI, WEBM, JPG, PNG, WEBP
- Imagini → clipuri statice (fără zoom, durată controlabilă 1-15s)
- 13 tranziții: cut, fade, dissolve, fadeblack, wipeleft/right/up/down, slideleft/right, zoomin, circleopen, pixelize
- Audio track: upload MP3, drag pe timeline pentru offset
- Render: FFmpeg xfade chain sau concat simplu (all-cut)
- Output normalizat: 1280×720 @ 30fps, yuv420p, stereo aac
- **Render este ASYNC** — returnează job_id, nu mai blochează conexiunea

---

## Tech Stack Frontend

```
React 19 + TypeScript
Vite 6
Tailwind CSS v4
motion/react (Framer Motion v12)
React Router v7
lucide-react (iconițe)
Fonturi: Orbitron, Share Tech Mono, Rajdhani (Google Fonts)
```

## Tech Stack Backend

```
FastAPI + uvicorn (port 8000)
Python 3.11+
FFmpeg (în PATH)
ComfyUI (http://127.0.0.1:8188) — SDXL, WAN 2.2, LatentSync
Modele 3D în venvuri izolate: C:\Users\Fane sefu meu\models_3d\
Kokoro TTS (local)
edge-tts (pip)
faster-whisper (subtitles)
Pillow, soundfile, numpy
```

---

## Autentificare & Rate Limiting

- API key: `freegma-dev-key-2026` (env var `FREEGMA_API_KEY` pe backend)
- Rate limit: 1 generare / IP / 90 secunde (doar pentru `/api/generate`)
- Studio render și upload NU au rate limit

---

## Deploy

```bash
# Deploy frontend pe Vercel
npx vercel --prod

# Backend rulează local, expus prin Cloudflare tunnel
# NU trebuie deploiat nicăieri
```

---

## Cum să restartezi backendul

```bash
# Din directorul backend/
python main.py
# sau
uvicorn main:app --host 0.0.0.0 --port 8000
```

Backendul trebuie restartat după orice modificare în `backend/`.

---

## Probleme cunoscute & soluții

| Problemă | Cauză | Soluție |
|----------|-------|---------|
| Tunel nu merge | Cloudflare service căzut | `net stop cloudflared` + `net start cloudflared` ca Admin |
| 502 pe api.freegma.win | Backend (FastAPI) nu rulează | Pornește `python main.py` în backend/ |
| "Failed to fetch" pe mobil | URL greșit în Vercel | Verifică că VITE_BACKEND_URL=https://api.freegma.win în Vercel dashboard |
| Pydantic validation error | Model request nu corespunde | Verifică câmpurile din `StudioRenderRequest` / `GenerateRequest` în main.py |
| MP4 "unsupported encoding" | Lipsesc flaguri FFmpeg | Toate output-urile folosesc `-pix_fmt yuv420p -profile:v high -level 4.0 -movflags +faststart` |
