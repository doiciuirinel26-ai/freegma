import { useCallback, useRef, useState, useEffect } from "react";
import { useGeneration } from "./hooks/useGeneration";
import { apiHealth } from "./api/client";

type Page = "text-to-image" | "image-to-3d" | "image-to-video" | "lip-sync";

const MODELS = {
  "text-to-image": [
    { id: "sdxl", label: "SDXL 1.0" },
    { id: "sdxl", label: "FLUX 1.1 (soon)", disabled: true },
  ],
  "image-to-3d": [
    { id: "triposr",     label: "TripoSR (fast, ~30s)" },
    { id: "sf3d",        label: "SF3D (4K textures, ~45s)" },
    { id: "instantmesh", label: "InstantMesh (quality, ~3min)" },
    { id: "hunyuan3d",   label: "Hunyuan3D-2.1 (best quality, ~4min)" },
  ],
  "image-to-video": [
    { id: "wan2video",  label: "WAN 2.2 I2V (fast, ~30s)" },
    { id: "hunyuan15", label: "HunyuanVideo 1.5 — Not Available", disabled: true },
  ],
};

const RESOLUTIONS = ["512×512", "768×768", "1024×1024"];


const STATUS_LABELS: Record<string, string> = {
  uploading: "Uploading...",
  queued:    "Waiting in queue...",
  running:   "Generating...",
  done:      "Done!",
  error:     "Error",
};

const NAV: { id: Page; label: string }[] = [
  { id: "text-to-image",  label: "Text → Image" },
  { id: "image-to-3d",    label: "Image → 3D" },
  { id: "image-to-video", label: "Image → Video" },
  { id: "lip-sync",       label: "Lip Sync" },
];

function randomSeed() { return Math.floor(Math.random() * 2_147_483_647); }

/* ── Icons ───────────────────────────────────────────────────────── */
function IconChevronDown() {
  return (
    <svg className="select-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg className="output-empty-icon" width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="22" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 19L9 13L14 18L19 13L25 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg className="output-empty-icon" width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="7" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 11L26 8V20L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCube() {
  return (
    <svg className="output-empty-icon" width="32" height="32" viewBox="0 0 40 40" fill="none">
      <path d="M20 6L34 14V26L20 34L6 26V14L20 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 6V34M6 14L20 22L34 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconDice() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11.5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconAR() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M2 8V4a1 1 0 0 1 1-1h4M22 8V4a1 1 0 0 0-1-1h-4M2 16v4a1 1 0 0 0 1 1h4M22 16v4a1 1 0 0 1-1 1h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 8l4 2.3v4.4L12 17l-4-2.3V10.3L12 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 10.3l4 2.3 4-2.3M12 17v-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Shared components ───────────────────────────────────────────── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track">
      <div className="progress-bar" style={{ width: `${Math.round(value * 100)}%`, transition: "width 0.4s ease" }} />
    </div>
  );
}

function ModelSelect({ models, value, onChange }: {
  models: { id: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field-group">
      <label className="field-label">Model</label>
      <div className="select-wrap">
        <select className="select" value={value} onChange={e => onChange(e.target.value)}>
          {models.map(m => <option key={m.id + m.label} value={m.id} disabled={m.disabled}>{m.label}</option>)}
        </select>
        <IconChevronDown />
      </div>
    </div>
  );
}

function UploadZone({ file, preview, onFile, label }: {
  file: File | null;
  preview: string | null;
  onFile: (f: File) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      className={`upload-zone ${dragOver ? "dragover" : ""} ${file ? "has-file" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
      {preview
        ? <img src={preview} alt="Preview" style={{ maxHeight: 90, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }} />
        : <IconUpload />}
      <span className="upload-label">{file ? "Click or drop to replace" : (label ?? "Drop image or click to upload")}</span>
      {file && <span className="upload-filename">{file.name}</span>}
      <input ref={inputRef} type="file" accept="image/*" className="upload-input"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

function OutputCard({ gen, is3d, isVideo }: { gen: ReturnType<typeof useGeneration>; is3d?: boolean; isVideo?: boolean }) {
  const modelViewerRef = useRef<any>(null);
  const isGenerating = ["uploading", "queued", "running"].includes(gen.status);

  return (
    <div className="output-card">
      <div className={`output-preview ${gen.resultUrl ? "has-result" : ""}`}>
        {!gen.resultUrl ? (
          isGenerating ? (
            <div className="output-generating">
              <span className="output-generating-label">{STATUS_LABELS[gen.status]}</span>
              <ProgressBar value={gen.progress} />
            </div>
          ) : is3d ? (
            <><IconCube /><span className="output-empty-text">3D model appears here</span></>
          ) : isVideo ? (
            <><IconVideo /><span className="output-empty-text">Video appears here</span></>
          ) : (
            <><IconImage /><span className="output-empty-text">Result appears here</span></>
          )
        ) : is3d ? (
          <div style={{ width: "100%", height: "100%" }}>
            {/* @ts-ignore */}
            <model-viewer ref={modelViewerRef} src={gen.resultUrl} alt="3D Model" auto-rotate camera-controls
              ar ar-modes="scene-viewer webxr quick-look"
              style={{ width: "100%", height: "100%" }} />
          </div>
        ) : isVideo ? (
          <video src={gen.resultUrl} controls autoPlay loop muted style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <img src={gen.resultUrl} alt="Generated" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>

      {gen.status === "error" && <div className="error-box">{gen.error}</div>}

      <div className="output-actions">
        <a href={gen.resultUrl ?? "#"} download className="action-btn"
          style={{ pointerEvents: gen.resultUrl ? "auto" : "none", opacity: gen.resultUrl ? 1 : 0.4, textDecoration: "none" }}>
          <IconDownload />Download
        </a>
        {is3d && gen.resultUrl && (
          <button className="action-btn action-btn-ar"
            onClick={() => {
              if (modelViewerRef.current?.activateAR) {
                modelViewerRef.current.activateAR();
              } else {
                window.open(`https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(gen.resultUrl!)}&mode=ar_preferred`, "_blank");
              }
            }}>
            <IconAR />AR
          </button>
        )}
        {gen.status === "done" && (
          <button className="action-btn action-btn-secondary" style={{ marginLeft: "auto" }} onClick={gen.reset}>
            New generation
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Pages ───────────────────────────────────────────────────────── */
function TextToImagePage({ gpuOnline }: { gpuOnline: boolean | null }) {
  const [model, setModel]       = useState(MODELS["text-to-image"][0].id);
  const [prompt, setPrompt]     = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [steps, setSteps]       = useState(30);
  const [cfg, setCfg]           = useState(7);
  const [resolution, setResolution] = useState(RESOLUTIONS[2]);
  const [seed, setSeed]         = useState(randomSeed);
  const gen = useGeneration();
  const isGenerating = ["uploading", "queued", "running"].includes(gen.status);
  const canGenerate = gpuOnline === true && !isGenerating && prompt.trim().length > 0;

  return (
    <div className="page-layout">
      <div className="controls-card">
        <ModelSelect models={MODELS["text-to-image"]} value={model} onChange={setModel} />

        <div className="field-group">
          <label className="field-label">Prompt</label>
          <textarea className="textarea" placeholder="Describe the image (English gives best results)..."
            value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
        </div>
        <div className="field-group">
          <label className="field-label">Negative Prompt</label>
          <textarea className="textarea" placeholder="What to avoid (optional)..."
            value={negPrompt} onChange={e => setNegPrompt(e.target.value)} rows={2} />
        </div>

        <div className="divider" />

        <div className="params-grid">
          <div className="param">
            <div className="param-header">
              <span className="field-label" style={{ margin: 0 }}>Steps</span>
              <span className="param-value">{steps}</span>
            </div>
            <input type="range" className="slider" min={1} max={60} value={steps} onChange={e => setSteps(Number(e.target.value))} />
          </div>
          <div className="param">
            <div className="param-header">
              <span className="field-label" style={{ margin: 0 }}>CFG Scale</span>
              <span className="param-value">{cfg}</span>
            </div>
            <input type="range" className="slider" min={1} max={20} value={cfg} onChange={e => setCfg(Number(e.target.value))} />
          </div>
          <div className="param">
            <label className="field-label">Resolution</label>
            <div className="select-wrap">
              <select className="select" value={resolution} onChange={e => setResolution(e.target.value)}>
                {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <IconChevronDown />
            </div>
          </div>
          <div className="param">
            <label className="field-label">Seed</label>
            <div className="seed-row">
              <input type="number" className="seed-input" value={seed} onChange={e => setSeed(Number(e.target.value))} />
              <button type="button" className="dice-btn" onClick={() => setSeed(randomSeed())}><IconDice /></button>
            </div>
          </div>
        </div>

        <button className="generate-btn" disabled={!canGenerate} onClick={() =>
          gen.submit({ mode: "text-to-image", prompt, negPrompt, model, steps, cfg, resolution, seed, file: null })}>
          {isGenerating ? (STATUS_LABELS[gen.status] ?? "Generating…") : "Generate"}
        </button>
        {isGenerating && <ProgressBar value={gen.progress} />}
        {gen.status === "error" && <div className="error-box">{gen.error}</div>}
      </div>

      <OutputCard gen={gen} />
    </div>
  );
}

function ImageTo3DPage({ gpuOnline }: { gpuOnline: boolean | null }) {
  const [model, setModel]   = useState(MODELS["image-to-3d"][0].id);
  const [file, setFile]     = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const gen = useGeneration();
  const isGenerating = ["uploading", "queued", "running"].includes(gen.status);
  const canGenerate = gpuOnline === true && !isGenerating && file !== null;

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(f);
    previewRef.current = url;
    setPreview(url);
  }, []);

  return (
    <div className="page-layout">
      <div className="controls-card">
        <ModelSelect models={MODELS["image-to-3d"]} value={model} onChange={setModel} />

        <div className="field-group">
          <label className="field-label">Input Image</label>
          <UploadZone file={file} preview={preview} onFile={handleFile} />
        </div>

        <button className="generate-btn" disabled={!canGenerate} onClick={() =>
          gen.submit({ mode: "image-to-3d", prompt: "", negPrompt: "", model, steps: 30, cfg: 7, resolution: "1024×1024", seed: -1, file })}>
          {isGenerating ? (STATUS_LABELS[gen.status] ?? "Generating…") : "Generate 3D"}
        </button>
        {isGenerating && <ProgressBar value={gen.progress} />}
        {gen.status === "error" && <div className="error-box">{gen.error}</div>}
      </div>

      <OutputCard gen={gen} is3d />
    </div>
  );
}

function ImageToVideoPage({ gpuOnline }: { gpuOnline: boolean | null }) {
  const [model, setModel]     = useState(MODELS["image-to-video"][0].id);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt]   = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const previewRef = useRef<string | null>(null);
  const gen = useGeneration();
  const isGenerating = ["uploading", "queued", "running"].includes(gen.status);
  const canGenerate = gpuOnline === true && !isGenerating && file !== null;

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(f);
    previewRef.current = url;
    setPreview(url);
  }, []);

  return (
    <div className="page-layout">
      <div className="controls-card">
        <ModelSelect models={MODELS["image-to-video"]} value={model} onChange={setModel} />

        <div className="field-group">
          <label className="field-label">Input Image</label>
          <UploadZone file={file} preview={preview} onFile={handleFile} />
        </div>

        <div className="field-group">
          <label className="field-label">Motion Prompt <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional)</span></label>
          <textarea className="textarea" placeholder="Describe the motion / action in the video..."
            value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
        </div>
        <div className="field-group">
          <label className="field-label">Negative Prompt <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional)</span></label>
          <textarea className="textarea" placeholder="What to avoid..."
            value={negPrompt} onChange={e => setNegPrompt(e.target.value)} rows={2} />
        </div>

        <button className="generate-btn" disabled={!canGenerate} onClick={() =>
          gen.submit({ mode: "image-to-video", prompt, negPrompt, model, steps: 30, cfg: 7, resolution: "1024×1024", seed: -1, file })}>
          {isGenerating ? (STATUS_LABELS[gen.status] ?? "Generating…") : "Generate Video"}
        </button>
        {isGenerating && <ProgressBar value={gen.progress} />}
        {gen.status === "error" && <div className="error-box">{gen.error}</div>}
      </div>

      <OutputCard gen={gen} isVideo />
    </div>
  );
}

/* ── Video Pipeline shared sub-components ────────────────────────────────── */
function PipelineSection({ label, desc, enabled, onToggle, children }: {
  label: string; desc: string; enabled: boolean;
  onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div className="pipeline-section">
      <label className="pipeline-toggle-row">
        <input type="checkbox" className="pipeline-checkbox"
          checked={enabled} onChange={e => onToggle(e.target.checked)} />
        <span className="pipeline-section-title">{label}</span>
      </label>
      <p className="pipeline-section-desc">{desc}</p>
      {enabled && <div className="pipeline-section-body">{children}</div>}
    </div>
  );
}

function MultiUploadZone({ files, onFiles, accept, label }: {
  files: File[]; onFiles: (f: File[]) => void; accept: string; label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (fl: FileList | null) => { if (fl) onFiles([...files, ...Array.from(fl)]); };
  return (
    <div className={`upload-zone ${drag ? "dragover" : ""} ${files.length > 0 ? "has-file" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
      {files.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span className="upload-filename">
            {files.length} fișier{files.length > 1 ? "e" : ""} selectat{files.length > 1 ? "e" : ""}
          </span>
          <button type="button" className="action-btn action-btn-secondary"
            onClick={e => { e.stopPropagation(); onFiles([]); }}>Șterge tot</button>
        </div>
      ) : (
        <><IconUpload /><span className="upload-label">{label}</span></>
      )}
      <input ref={inputRef} type="file" accept={accept} multiple className="upload-input"
        onChange={e => add(e.target.files)} />
    </div>
  );
}

/* ── Lip Sync / Video Pipeline page ─────────────────────────────────────── */
function LipSyncPage({ gpuOnline }: { gpuOnline: boolean | null }) {
  // Section toggles
  const [useBgImages,    setUseBgImages]    = useState(true);
  const [useBgVideo,     setUseBgVideo]     = useState(false);
  const [useAvatar,      setUseAvatar]      = useState(false);
  const [useNarration,   setUseNarration]   = useState(true);

  // Content
  const [bgImages,       setBgImages]       = useState<File[]>([]);
  const [bgVideos,       setBgVideos]       = useState<File[]>([]);
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null);
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null);
  const [narration,      setNarration]      = useState("");
  const avatarUrlRef = useRef<string | null>(null);

  // Advanced options
  const [ttsEngine, setTtsEngine]           = useState<"kokoro" | "edge">("kokoro");
  const [lang,      setLang]                = useState<"en" | "ro">("en");
  const [fixedDur,  setFixedDur]            = useState(false);
  const [sceneDur,  setSceneDur]            = useState(5);
  const [noZoom,    setNoZoom]              = useState(false);
  const [noSubs,    setNoSubs]              = useState(false);

  const gen = useGeneration();
  const isGenerating = ["uploading", "queued", "running"].includes(gen.status);

  const hasBg = (useBgImages && bgImages.length > 0) || (useBgVideo && bgVideos.length > 0);
  const hasNarration = !useNarration || narration.trim().length > 0;
  const avatarNeedsNarration = useAvatar && avatarFile !== null && (!useNarration || narration.trim().length === 0);
  const canGenerate = gpuOnline === true && !isGenerating && hasBg && hasNarration && useNarration && !avatarNeedsNarration;

  const handleAvatarFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setAvatarFile(f);
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    const url = URL.createObjectURL(f);
    avatarUrlRef.current = url;
    setAvatarPreview(url);
  }, []);

  const handleSubmit = () => {
    const voiceMap: Record<string, string> = { en: "en-US-JennyNeural", ro: "ro-RO-AlinaNeural" };
    gen.submit({
      mode: "video-pipeline",
      file: useAvatar ? avatarFile : null,
      bgImages: useBgImages ? bgImages : [],
      bgVideos: useBgVideo  ? bgVideos : [],
      extraBody: {
        narration_text:        useNarration ? narration : "",
        tts_engine:            ttsEngine,
        tts_voice:             voiceMap[lang] ?? "en-US-JennyNeural",
        lang,
        no_zoom:               noZoom,
        no_subtitles:          noSubs,
        fixed_scene_duration:  fixedDur ? sceneDur : null,
      },
    });
  };

  return (
    <div className="page-layout">
      <div className="controls-card" style={{ flex: "0 0 420px" }}>
        <div className="pipeline-header">CONȚINUT OPȚIONAL</div>

        <PipelineSection label="Imagini fundal"
          desc="Înlocuiește generarea ComfyUI cu poze locale (PNG/JPG/WebP)"
          enabled={useBgImages}
          onToggle={v => { setUseBgImages(v); if (v) setUseBgVideo(false); }}>
          <MultiUploadZone files={bgImages} onFiles={setBgImages} accept="image/*"
            label="Trage imaginile sau click pentru selectare (multiple acceptate)" />
        </PipelineSection>

        <PipelineSection label="Video fundal"
          desc="Folosește clipuri video existente în loc de imagini"
          enabled={useBgVideo}
          onToggle={v => { setUseBgVideo(v); if (v) setUseBgImages(false); }}>
          <MultiUploadZone files={bgVideos} onFiles={setBgVideos} accept="video/*"
            label="Trage video-urile sau click pentru selectare" />
        </PipelineSection>

        <PipelineSection label="Avatar lip-sync"
          desc="Suprapune un avatar animat (LatentSync) în colțul de jos al video-ului"
          enabled={useAvatar}
          onToggle={setUseAvatar}>
          <UploadZone file={avatarFile} preview={avatarPreview} onFile={handleAvatarFile}
            label="Imaginea avatarului — PNG cu fundal transparent recomandat" />
        </PipelineSection>

        <PipelineSection label="Narațiune personalizată"
          desc="Text scris de tine — fără generare AI"
          enabled={useNarration}
          onToggle={setUseNarration}>
          <p className="pipeline-hint">
            Format: Hook: pe primul rând, text, linie goală, Script:, linie goală, paragraf1, linie goală, paragraf2...
          </p>
          <textarea className="textarea" rows={8}
            placeholder={"Hook:\nPrimul tău hook captivant.\n\nScript:\nParagraf scenă 1.\n\nParagraf scenă 2."}
            value={narration} onChange={e => setNarration(e.target.value)} />
        </PipelineSection>

        <div className="divider" />
        <div className="pipeline-header">OPȚIUNI AVANSATE</div>

        <div className="advanced-grid">
          <div className="field-group">
            <label className="field-label">Motor TTS</label>
            <div className="radio-group">
              {(["kokoro", "edge"] as const).map(e => (
                <label key={e} className="radio-opt">
                  <input type="radio" checked={ttsEngine === e} onChange={() => setTtsEngine(e)} />
                  {e === "kokoro" ? "Kokoro (EN)" : "Edge (RO)"}
                </label>
              ))}
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Limba scriptului</label>
            <div className="radio-group">
              {(["en", "ro"] as const).map(l => (
                <label key={l} className="radio-opt">
                  <input type="radio" checked={lang === l} onChange={() => setLang(l)} />
                  {l === "en" ? "Engleză" : "Română"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="check-list">
          <label className="check-opt">
            <input type="checkbox" checked={fixedDur} onChange={e => setFixedDur(e.target.checked)} />
            <span>Durată fixă per scenă</span>
            {fixedDur && (
              <input type="number" min={1} max={30} value={sceneDur}
                onChange={e => setSceneDur(Number(e.target.value))}
                className="seed-input" style={{ width: 64, marginLeft: 8 }} />
            )}
            {fixedDur && <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>sec</span>}
          </label>
          <label className="check-opt">
            <input type="checkbox" checked={noZoom} onChange={e => setNoZoom(e.target.checked)} />
            <span>No zoom — imagini statice (fără efect Ken Burns)</span>
          </label>
          <label className="check-opt">
            <input type="checkbox" checked={noSubs} onChange={e => setNoSubs(e.target.checked)} />
            <span>No subtitles — sare arderea subtitrărilor (Whisper)</span>
          </label>
          <label className="check-opt" style={{ opacity: 0.4 }}>
            <input type="checkbox" disabled />
            <span>Wan I2V — animează fiecare imagine cu Wan 2.2 (în curând)</span>
          </label>
        </div>

        <div className="pipeline-btn-row">
          <button className="generate-btn" style={{ flex: 1 }}
            disabled={!canGenerate} onClick={handleSubmit}>
            {isGenerating ? (STATUS_LABELS[gen.status] ?? "Generez…") : "▶ Pornește Pipeline"}
          </button>
          {!isGenerating && gen.status !== "idle" && (
            <button className="action-btn action-btn-secondary" onClick={gen.reset}>↺ Reset</button>
          )}
        </div>

        {isGenerating && <ProgressBar value={gen.progress} />}
        {gen.status === "error" && <div className="error-box">{gen.error}</div>}
      </div>

      <OutputCard gen={gen} isVideo />
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage]           = useState<Page>("text-to-image");
  const [gpuOnline, setGpuOnline] = useState<boolean | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      const h = await apiHealth();
      setGpuOnline(h !== null);
      if (h) setQueueCount((h as { queue?: number }).queue ?? 0);
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          {/* @ts-ignore */}
          <model-viewer className="logo-3d" src="/freegma_logo.glb" auto-rotate auto-rotate-delay="0"
            rotation-per-second="20deg" camera-controls touch-action="pan-y"
            shadow-intensity="0" exposure="1.2" camera-orbit="0deg 80deg 105%" interaction-prompt="none">
            <span slot="error" className="logo-fallback">FREEGMA</span>
          </model-viewer>
          <div className="header-status">
            <span className="status-pill">
              <span className={`status-dot ${gpuOnline ? "online" : "offline"}`} />
              {gpuOnline === null ? "Connecting..." : gpuOnline ? "GPU Online" : "GPU Offline"}
            </span>
            <span className="queue-badge">{queueCount} in queue</span>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-tab ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <div className="disclaimer">
          ⚠️ Estimated times are given by Claude — don't believe him, it actually takes longer.
        </div>
        {page === "text-to-image"  && <TextToImagePage  gpuOnline={gpuOnline} />}
        {page === "image-to-3d"    && <ImageTo3DPage    gpuOnline={gpuOnline} />}
        {page === "image-to-video" && <ImageToVideoPage gpuOnline={gpuOnline} />}
        {page === "lip-sync"       && <LipSyncPage      gpuOnline={gpuOnline} />}
      </main>
    </div>
  );
}
