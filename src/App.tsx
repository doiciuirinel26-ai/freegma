import { useCallback, useRef, useState, useEffect } from "react";
import { useGeneration } from "./hooks/useGeneration";
import { apiHealth } from "./api/client";

type Category = "text-to-image" | "image-to-3d" | "image-to-video";
type AudioMode = "tts" | "upload";

const MODELS: Record<Category, { id: string; label: string; disabled?: boolean }[]> = {
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

const TABS: { id: Category; label: string }[] = [
  { id: "text-to-image",  label: "Text → Image" },
  { id: "image-to-3d",    label: "Image → 3D" },
  { id: "image-to-video", label: "Image → Video" },
];

const VOICES: { id: string; label: string }[] = [
  { id: "en-US-JennyNeural",  label: "English — Jenny (Female)" },
  { id: "en-US-GuyNeural",    label: "English — Guy (Male)" },
  { id: "en-US-AriaNeural",   label: "English — Aria (Female)" },
  { id: "en-US-DavisNeural",  label: "English — Davis (Male)" },
  { id: "ro-RO-AlinaNeural",  label: "Romanian — Alina (Female)" },
  { id: "ro-RO-EmilNeural",   label: "Romanian — Emil (Male)" },
  { id: "es-ES-ElviraNeural", label: "Spanish — Elvira (Female)" },
  { id: "fr-FR-DeniseNeural", label: "French — Denise (Female)" },
  { id: "de-DE-KatjaNeural",  label: "German — Katja (Female)" },
  { id: "it-IT-ElsaNeural",   label: "Italian — Elsa (Female)" },
];

const STATUS_LABELS: Record<string, string> = {
  uploading: "Uploading...",
  queued:    "Waiting in queue...",
  running:   "Generating...",
  done:      "Done!",
  error:     "Error",
};

function randomSeed() { return Math.floor(Math.random() * 2_147_483_647); }

/* ── Icons ────────────────────────────────────────────── */
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
    <svg className="output-empty-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="22" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 19L9 13L14 18L19 13L25 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg className="output-empty-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="7" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 11L26 8V20L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCube() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" style={{ color: "var(--text-subtle)" }}>
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

/* ── Progress bar ─────────────────────────────────────── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track" style={{ marginTop: 8 }}>
      <div className="progress-bar" style={{ width: `${Math.round(value * 100)}%`, transition: "width 0.4s ease" }} />
    </div>
  );
}

/* ── AI Studio Panel ──────────────────────────────────── */
function AIStudioPanel({ gpuOnline }: { gpuOnline: boolean | null }) {
  const [category, setCategory] = useState<Category>("text-to-image");
  const [model, setModel]       = useState(MODELS["text-to-image"][0].id);
  const [prompt, setPrompt]     = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [steps, setSteps]       = useState(30);
  const [cfg, setCfg]           = useState(7);
  const [resolution, setResolution] = useState(RESOLUTIONS[2]);
  const [seed, setSeed]         = useState(randomSeed);
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const uploadPreviewRef  = useRef<string | null>(null);
  const modelViewerRef    = useRef<any>(null);

  const gen         = useGeneration();
  const isGenerating = ["uploading", "queued", "running"].includes(gen.status);

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setModel(MODELS[cat][0].id);
    gen.reset();
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadedFile(file);
    if (uploadPreviewRef.current) URL.revokeObjectURL(uploadPreviewRef.current);
    const url = URL.createObjectURL(file);
    uploadPreviewRef.current = url;
    setUploadPreview(url);
  }, []);

  const canGenerate =
    gpuOnline === true &&
    !isGenerating &&
    (category === "text-to-image" ? prompt.trim().length > 0 : uploadedFile !== null);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await gen.submit({ mode: category, prompt, negPrompt, model, steps, cfg, resolution, seed, file: uploadedFile });
  };

  return (
    <div className="panel-col">
      <section className="card card-section">
        <h2 className="panel-title">AI Studio</h2>

        <div className="tab-list" role="tablist">
          {TABS.map(tab => (
            <button key={tab.id} role="tab" aria-selected={category === tab.id}
              className={`tab ${category === tab.id ? "active" : ""}`}
              onClick={() => handleCategoryChange(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          <label className="field-label" htmlFor="ai-model-select">Model</label>
          <div className="select-wrap">
            <select id="ai-model-select" className="select" value={model} onChange={e => setModel(e.target.value)}>
              {MODELS[category].map(m => <option key={m.id + m.label} value={m.id} disabled={m.disabled}>{m.label}</option>)}
            </select>
            <IconChevronDown />
          </div>
        </div>

        {category === "text-to-image" ? (
          <>
            <textarea className="textarea"
              placeholder="Describe the image (English gives best results)..."
              value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
            <textarea className="textarea"
              placeholder="Negative prompt (optional)..."
              value={negPrompt} onChange={e => setNegPrompt(e.target.value)} rows={2}
              style={{ marginTop: 8 }} />
          </>
        ) : (
          <>
            <div
              className={`upload-zone ${dragOver ? "dragover" : ""} ${uploadedFile ? "has-file" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
              {uploadPreview
                ? <img src={uploadPreview} alt="Preview" style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }} />
                : <IconUpload />}
              <span className="upload-label">{uploadedFile ? "Click or drop to replace" : "Drop image or click to upload"}</span>
              {uploadedFile && <span className="upload-filename">{uploadedFile.name}</span>}
              <input ref={fileInputRef} type="file" accept="image/*" className="upload-input"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            {category === "image-to-video" && (
              <>
                <textarea className="textarea"
                  placeholder="Describe the motion / action in the video (optional, English recommended)..."
                  value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                  style={{ marginTop: 8 }} />
                <textarea className="textarea"
                  placeholder="Negative prompt (optional)..."
                  value={negPrompt} onChange={e => setNegPrompt(e.target.value)} rows={2}
                  style={{ marginTop: 8 }} />
              </>
            )}
          </>
        )}

        <div className="divider" />

        {category === "text-to-image" && (
          <div className="params-grid">
            <div className="param">
              <div className="param-header">
                <span className="field-label" style={{ margin: 0 }}>Steps</span>
                <span className="param-value">{steps}</span>
              </div>
              <input type="range" className="slider" min={1} max={60} value={steps}
                onChange={e => setSteps(Number(e.target.value))} />
            </div>
            <div className="param">
              <div className="param-header">
                <span className="field-label" style={{ margin: 0 }}>CFG Scale</span>
                <span className="param-value">{cfg}</span>
              </div>
              <input type="range" className="slider" min={1} max={20} value={cfg}
                onChange={e => setCfg(Number(e.target.value))} />
            </div>
            <div className="param">
              <label className="field-label" htmlFor="res-select">Resolution</label>
              <div className="select-wrap">
                <select id="res-select" className="select" value={resolution}
                  onChange={e => setResolution(e.target.value)}>
                  {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <IconChevronDown />
              </div>
            </div>
            <div className="param">
              <label className="field-label" htmlFor="seed-input">Seed</label>
              <div className="seed-row">
                <input id="seed-input" type="number" className="seed-input" value={seed}
                  onChange={e => setSeed(Number(e.target.value))} />
                <button type="button" className="dice-btn" onClick={() => setSeed(randomSeed())}>
                  <IconDice />
                </button>
              </div>
            </div>
          </div>
        )}

        <button type="button" className="generate-btn" disabled={!canGenerate} onClick={handleGenerate}>
          {isGenerating ? (STATUS_LABELS[gen.status] ?? "Generating…") : "Generate"}
        </button>

        {isGenerating && <ProgressBar value={gen.progress} />}

        {gen.status === "error" && <div className="error-box">{gen.error}</div>}
      </section>

      <section className="card output-card">
        <div className={`output-preview ${gen.resultUrl ? "has-result" : ""}`}>
          {!gen.resultUrl ? (
            isGenerating ? (
              <div style={{ textAlign: "center", width: "100%", padding: "0 20px" }}>
                <div style={{ color: "var(--accent)", marginBottom: 8 }}>{STATUS_LABELS[gen.status]}</div>
                <ProgressBar value={gen.progress} />
              </div>
            ) : category === "image-to-3d" ? (
              <><IconCube /><span className="output-empty-text">3D result appears here</span></>
            ) : category === "image-to-video" ? (
              <><IconVideo /><span className="output-empty-text">Video result appears here</span></>
            ) : (
              <><IconImage /><span className="output-empty-text">Result appears here</span></>
            )
          ) : (
            category === "text-to-image" ? (
              <img className="output-image" src={gen.resultUrl} alt="Generated" />
            ) : category === "image-to-video" ? (
              <video className="output-image" src={gen.resultUrl} controls autoPlay loop muted
                style={{ width: "100%", borderRadius: 6 }} />
            ) : (
              <div style={{ width: "100%", height: 300, background: "#111", borderRadius: 6, overflow: "hidden" }}>
                {/* @ts-ignore */}
                <model-viewer ref={modelViewerRef} src={gen.resultUrl} alt="3D Model" auto-rotate camera-controls
                  ar ar-modes="scene-viewer webxr quick-look"
                  style={{ width: "100%", height: "100%" }} />
              </div>
            )
          )}
        </div>
        <div className="output-actions">
          <a href={gen.resultUrl ?? "#"} download className="download-btn"
            style={{ pointerEvents: gen.resultUrl ? "auto" : "none", opacity: gen.resultUrl ? 1 : 0.4,
                     textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <IconDownload />Download
          </a>
          {category === "image-to-3d" && gen.resultUrl && (
            <button
              className="download-btn"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#000", border: "none", cursor: "pointer" }}
              onClick={() => {
                if (modelViewerRef.current?.activateAR) {
                  modelViewerRef.current.activateAR();
                } else {
                  window.open(`https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(gen.resultUrl!)}&mode=ar_preferred`, "_blank");
                }
              }}
            >
              <IconAR />AR
            </button>
          )}
          {gen.status === "done" && (
            <button className="dice-btn" style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px" }}
              onClick={gen.reset}>
              New generation
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Lip Sync Panel ───────────────────────────────────── */
function LipSyncPanel({ gpuOnline }: { gpuOnline: boolean | null }) {
  const [avatarFile, setAvatarFile]     = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDrag, setAvatarDrag]     = useState(false);
  const [lsAudioFile, setLsAudioFile]   = useState<File | null>(null);
  const [audioDrag, setAudioDrag]       = useState(false);
  const [audioMode, setAudioMode]       = useState<AudioMode>("tts");
  const [ttsText, setTtsText]           = useState("");
  const [ttsVoice, setTtsVoice]         = useState("en-US-JennyNeural");
  const [lipsExpr, setLipsExpr]         = useState(1.8);
  const [lsSteps, setLsSteps]           = useState(20);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef  = useRef<HTMLInputElement>(null);
  const avatarUrlRef   = useRef<string | null>(null);

  const lsGen        = useGeneration();
  const isGenerating = ["uploading", "queued", "running"].includes(lsGen.status);

  const canGenerate =
    gpuOnline === true &&
    !isGenerating &&
    avatarFile !== null &&
    (audioMode === "upload" ? lsAudioFile !== null : ttsText.trim().length > 0);

  const handleAvatarFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setAvatarFile(file);
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    const url = URL.createObjectURL(file);
    avatarUrlRef.current = url;
    setAvatarPreview(url);
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await lsGen.submit({
      mode: "lip-sync",
      file: avatarFile,
      audioFile: audioMode === "upload" ? lsAudioFile : null,
      extraBody: {
        tts_text:        audioMode === "tts" ? ttsText : "",
        tts_voice:       ttsVoice,
        lips_expression: lipsExpr,
        ls_steps:        lsSteps,
      },
    });
  };

  return (
    <div className="panel-col">
      <section className="card card-section">
        <h2 className="panel-title">Lip Sync</h2>

        {/* Avatar upload */}
        <div>
          <label className="field-label">Avatar Image</label>
          <div
            className={`upload-zone ${avatarDrag ? "dragover" : ""} ${avatarFile ? "has-file" : ""}`}
            onClick={() => avatarInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setAvatarDrag(true); }}
            onDragLeave={() => setAvatarDrag(false)}
            onDrop={e => { e.preventDefault(); setAvatarDrag(false); const f = e.dataTransfer.files[0]; if (f) handleAvatarFile(f); }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }} />
              : <IconUpload />}
            <span className="upload-label">
              {avatarFile ? "Click or drop to replace" : "Drop avatar image or click to upload"}
            </span>
            {avatarFile && <span className="upload-filename">{avatarFile.name}</span>}
            <input ref={avatarInputRef} type="file" accept="image/*" className="upload-input"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }} />
          </div>
        </div>

        {/* Audio source toggle */}
        <div>
          <label className="field-label">Audio Source</label>
          <div className="toggle-group">
            <button type="button" className={`toggle-btn ${audioMode === "tts" ? "active" : ""}`}
              onClick={() => setAudioMode("tts")}>
              Text to Speech
            </button>
            <button type="button" className={`toggle-btn ${audioMode === "upload" ? "active" : ""}`}
              onClick={() => setAudioMode("upload")}>
              Upload Audio
            </button>
          </div>
        </div>

        {audioMode === "tts" ? (
          <>
            <textarea className="textarea"
              placeholder="Type the text you want spoken..."
              value={ttsText} onChange={e => setTtsText(e.target.value)} rows={4} />
            <div>
              <label className="field-label" htmlFor="tts-voice-select">Voice</label>
              <div className="select-wrap">
                <select id="tts-voice-select" className="select" value={ttsVoice}
                  onChange={e => setTtsVoice(e.target.value)}>
                  {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                <IconChevronDown />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="field-label">Audio File (MP3 / WAV / FLAC)</label>
            <div
              className={`upload-zone ${audioDrag ? "dragover" : ""} ${lsAudioFile ? "has-file" : ""}`}
              onClick={() => audioInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setAudioDrag(true); }}
              onDragLeave={() => setAudioDrag(false)}
              onDrop={e => {
                e.preventDefault(); setAudioDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) setLsAudioFile(f);
              }}>
              <IconUpload />
              <span className="upload-label">
                {lsAudioFile ? lsAudioFile.name : "Drop audio file or click to upload"}
              </span>
              <input ref={audioInputRef} type="file" accept="audio/*" className="upload-input"
                onChange={e => { const f = e.target.files?.[0]; if (f) setLsAudioFile(f); }} />
            </div>
          </div>
        )}

        <div className="divider" />

        <div className="params-grid">
          <div className="param">
            <div className="param-header">
              <span className="field-label" style={{ margin: 0 }}>Lip Expression</span>
              <span className="param-value">{lipsExpr.toFixed(1)}</span>
            </div>
            <input type="range" className="slider" min={0.5} max={3.0} step={0.1} value={lipsExpr}
              onChange={e => setLipsExpr(Number(e.target.value))} />
          </div>
          <div className="param">
            <div className="param-header">
              <span className="field-label" style={{ margin: 0 }}>Steps</span>
              <span className="param-value">{lsSteps}</span>
            </div>
            <input type="range" className="slider" min={5} max={50} value={lsSteps}
              onChange={e => setLsSteps(Number(e.target.value))} />
          </div>
        </div>

        <button type="button" className="generate-btn" disabled={!canGenerate} onClick={handleGenerate}>
          {isGenerating ? (STATUS_LABELS[lsGen.status] ?? "Generating…") : "Generate Lip Sync"}
        </button>

        {isGenerating && <ProgressBar value={lsGen.progress} />}

        {lsGen.status === "error" && <div className="error-box">{lsGen.error}</div>}
      </section>

      <section className="card output-card">
        <div className={`output-preview ${lsGen.resultUrl ? "has-result" : ""}`}>
          {!lsGen.resultUrl ? (
            isGenerating ? (
              <div style={{ textAlign: "center", width: "100%", padding: "0 20px" }}>
                <div style={{ color: "var(--accent)", marginBottom: 8 }}>{STATUS_LABELS[lsGen.status]}</div>
                <ProgressBar value={lsGen.progress} />
              </div>
            ) : (
              <><IconVideo /><span className="output-empty-text">Lip sync video appears here</span></>
            )
          ) : (
            <video className="output-image" src={lsGen.resultUrl} controls autoPlay loop
              style={{ width: "100%", borderRadius: 6 }} />
          )}
        </div>
        <div className="output-actions">
          <a href={lsGen.resultUrl ?? "#"} download className="download-btn"
            style={{ pointerEvents: lsGen.resultUrl ? "auto" : "none", opacity: lsGen.resultUrl ? 1 : 0.4,
                     textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <IconDownload />Download
          </a>
          {lsGen.status === "done" && (
            <button className="dice-btn" style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px" }}
              onClick={lsGen.reset}>
              New generation
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function App() {
  const [gpuOnline, setGpuOnline]   = useState<boolean | null>(null);
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
    <div className="page">
      <header className="header">
        <model-viewer
          className="logo-3d"
          src="/freegma_logo.glb"
          auto-rotate
          auto-rotate-delay="0"
          rotation-per-second="20deg"
          camera-controls
          touch-action="pan-y"
          shadow-intensity="0"
          exposure="1.2"
          camera-orbit="0deg 80deg 105%"
          interaction-prompt="none"
        >
          <span slot="error" className="logo-fallback">FREEGMA</span>
        </model-viewer>
        <div className="disclaimer-banner">
          ⚠️ The estimated times next to the models are given by Claude, but don't believe him, it actually takes longer.
        </div>
        <div className="header-meta">
          <span className="status-pill">
            <span className={`status-dot ${gpuOnline ? "online" : "offline"}`} />
            {gpuOnline === null ? "Connecting..." : gpuOnline ? "GPU Online" : "GPU Offline"}
          </span>
          <span className="queue-badge">{queueCount} jobs in queue</span>
        </div>
      </header>

      <div className="workspace">
        <AIStudioPanel gpuOnline={gpuOnline} />
        <LipSyncPanel gpuOnline={gpuOnline} />
      </div>
    </div>
  );
}
