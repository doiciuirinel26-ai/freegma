import { useCallback, useRef, useState, useEffect } from "react";
import { useGeneration } from "./hooks/useGeneration";
import { apiHealth } from "./api/client";

type Category = "text-to-image" | "image-to-3d" | "image-to-video";

const MODELS: Record<Category, { id: string; label: string }[]> = {
  "text-to-image": [
    { id: "sdxl",   label: "SDXL 1.0" },
    { id: "sdxl",   label: "FLUX 1.1 (soon)" },
  ],
  "image-to-3d": [
    { id: "triposr",     label: "TripoSR (fast)" },
    { id: "instantmesh", label: "InstantMesh (quality)" },
  ],
  "image-to-video": [
    { id: "wan2video", label: "WAN 2.1 I2V" },
  ],
};

const RESOLUTIONS = ["512×512", "768×768", "1024×1024"];
const TABS: { id: Category; label: string }[] = [
  { id: "text-to-image",  label: "Text → Image" },
  { id: "image-to-3d",    label: "Image → 3D" },
  { id: "image-to-video", label: "Image → Video" },
];

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
function IconCube() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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

/* ── Progress bar ─────────────────────────────────────── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track" style={{ marginTop: 8 }}>
      <div
        className="progress-bar"
        style={{
          width: `${Math.round(value * 100)}%`,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

/* ── Result viewer ────────────────────────────────────── */
function ResultViewer({ url, mode }: { url: string; mode: Category }) {
  if (mode === "text-to-image") {
    return <img className="output-image" src={url} alt="Generated" />;
  }
  if (mode === "image-to-video") {
    return (
      <video
        className="output-image"
        src={url}
        controls
        autoPlay
        loop
        muted
        style={{ width: "100%", borderRadius: 6 }}
      />
    );
  }
  // image-to-3d — usa model-viewer
  return (
    <div style={{ width: "100%", height: 300, background: "#111", borderRadius: 6, overflow: "hidden" }}>
      {/* @ts-ignore */}
      <model-viewer
        src={url}
        alt="3D Model"
        auto-rotate
        camera-controls
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function App() {
  const [gpuOnline, setGpuOnline]   = useState<boolean | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [category, setCategory]     = useState<Category>("text-to-image");
  const [model, setModel]           = useState(MODELS["text-to-image"][0].id);
  const [prompt, setPrompt]         = useState("");
  const [negPrompt, setNegPrompt]   = useState("");
  const [uploadedFile, setUploadedFile]   = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [steps, setSteps]           = useState(30);
  const [cfg, setCfg]               = useState(7);
  const [resolution, setResolution] = useState(RESOLUTIONS[2]);
  const [seed, setSeed]             = useState(randomSeed);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPreviewRef = useRef<string | null>(null);

  const gen = useGeneration();

  // Health check
  useEffect(() => {
    const check = async () => {
      const h = await apiHealth();
      setGpuOnline(h !== null);
      if (h) setQueueCount(h.queue ?? 0);
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);

  // model-viewer script
  useEffect(() => {
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const s = document.createElement("script");
      s.type = "module";
      s.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
      document.head.appendChild(s);
    }
  }, []);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const canGenerate =
    gpuOnline === true &&
    gen.status !== "uploading" &&
    gen.status !== "queued" &&
    gen.status !== "running" &&
    (category === "text-to-image" ? prompt.trim().length > 0 : uploadedFile !== null);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await gen.submit({
      mode: category,
      prompt, negPrompt, model, steps, cfg, resolution, seed,
      file: uploadedFile,
    });
  };

  const isGenerating = ["uploading","queued","running"].includes(gen.status);
  const statusLabel: Record<string, string> = {
    uploading: "Se incarca imaginea...",
    queued:    "In asteptare (GPU ocupat)...",
    running:   "Se genereaza...",
    done:      "Gata!",
    error:     "Eroare",
  };

  return (
    <div className="page">
      <main className="panel">
        <header className="header">
          <h1 className="logo">Freegma</h1>
          <div className="header-meta">
            <span className="status-pill">
              <span className={`status-dot ${gpuOnline ? "online" : "offline"}`} />
              {gpuOnline === null ? "Se conecteaza..." : gpuOnline ? "GPU Online" : "GPU Offline"}
            </span>
            <span className="queue-badge">{queueCount} jobs in queue</span>
          </div>
        </header>

        <section className="card card-section">
          <div className="tab-list" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={category === tab.id}
                className={`tab ${category === tab.id ? "active" : ""}`}
                onClick={() => handleCategoryChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            <label className="field-label" htmlFor="model-select">Model</label>
            <div className="select-wrap">
              <select
                id="model-select"
                className="select"
                value={model}
                onChange={e => setModel(e.target.value)}
              >
                {MODELS[category].map(m => (
                  <option key={m.id + m.label} value={m.id}>{m.label}</option>
                ))}
              </select>
              <IconChevronDown />
            </div>
          </div>

          {category === "text-to-image" ? (
            <>
              <textarea
                className="textarea"
                placeholder="Descrie imaginea (in engleza pentru rezultate mai bune)..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
              />
              <textarea
                className="textarea"
                placeholder="Negative prompt (optional)..."
                value={negPrompt}
                onChange={e => setNegPrompt(e.target.value)}
                rows={2}
                style={{ marginTop: 8 }}
              />
            </>
          ) : (
            <>
              <div
                className={`upload-zone ${dragOver ? "dragover" : ""} ${uploadedFile ? "has-file" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Preview"
                       style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }} />
                ) : <IconUpload />}
                <span className="upload-label">
                  {uploadedFile ? "Click sau drop pentru a inlocui" : "Drop imagine sau click pentru upload"}
                </span>
                {uploadedFile && <span className="upload-filename">{uploadedFile.name}</span>}
                <input ref={fileInputRef} type="file" accept="image/*" className="upload-input"
                       onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              {category === "image-to-video" && (
                <>
                  <textarea
                    className="textarea"
                    placeholder="Descrie miscarea / actiunea din video (optional, in engleza)..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={3}
                    style={{ marginTop: 8 }}
                  />
                  <textarea
                    className="textarea"
                    placeholder="Negative prompt (optional)..."
                    value={negPrompt}
                    onChange={e => setNegPrompt(e.target.value)}
                    rows={2}
                    style={{ marginTop: 8 }}
                  />
                </>
              )}
            </>
          )}

          <div className="divider" />

          <div className="params-grid">
            {category === "text-to-image" && (
              <>
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
                    <input id="seed-input" type="number" className="seed-input"
                           value={seed} onChange={e => setSeed(Number(e.target.value))} />
                    <button type="button" className="dice-btn" onClick={() => setSeed(randomSeed())}>
                      <IconDice />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="generate-btn"
            disabled={!canGenerate || gpuOnline !== true}
            onClick={handleGenerate}
          >
            {isGenerating ? (statusLabel[gen.status] ?? "Generating…") : "Generate"}
          </button>

          {isGenerating && (
            <ProgressBar value={gen.progress} />
          )}

          {gen.status === "error" && (
            <div style={{ color: "#f87171", fontSize: 13, marginTop: 8, padding: "8px 12px",
                          background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>
              {gen.error}
            </div>
          )}
        </section>

        <section className="card output-card">
          <div className={`output-preview ${gen.resultUrl ? "has-result" : ""}`}>
            {!gen.resultUrl ? (
              isGenerating ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "var(--accent)", marginBottom: 8 }}>
                    {statusLabel[gen.status]}
                  </div>
                  <ProgressBar value={gen.progress} />
                </div>
              ) : category === "image-to-3d" ? (
                <><IconCube /><span className="output-empty-text">Rezultatul 3D apare aici</span></>
              ) : (
                <><IconImage /><span className="output-empty-text">Rezultatul apare aici</span></>
              )
            ) : (
              <ResultViewer url={gen.resultUrl} mode={category} />
            )}
          </div>

          <div className="output-actions">
            <a
              href={gen.resultUrl ?? "#"}
              download
              className="download-btn"
              style={{ pointerEvents: gen.resultUrl ? "auto" : "none", opacity: gen.resultUrl ? 1 : 0.4,
                       textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
            >
              <IconDownload />
              Download
            </a>
            {gen.status === "done" && (
              <button
                className="dice-btn"
                style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px" }}
                onClick={gen.reset}
              >
                New generation
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
