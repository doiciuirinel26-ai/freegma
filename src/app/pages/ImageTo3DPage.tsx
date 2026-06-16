import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Download, RotateCcw, Eye, Box, ChevronDown, Plus } from "lucide-react";
import { PageHoloCard } from "../components/PageHoloCard";
import { SpinningGenerationCard } from "../components/SpinningGenerationCard";
import { useGeneration } from "../../hooks/useGeneration";
import imgDepthEngine from "../../imports/result__8_.png";

const QUALITY_OPTS = ["InstantMesh · High", "Hunyuan3D · Ultra"];
const QUALITY_MODEL: Record<string, string> = {
  "InstantMesh · High": "instantmesh",
  "Hunyuan3D · Ultra": "hunyuan3d",
};

const FORMAT_OPTS = [
  { ext: "GLB", desc: "Binary glTF — universal", color: "#00f5ff" },
  { ext: "OBJ", desc: "Wavefront — max compat", color: "#0066ff" },
  { ext: "FBX", desc: "Autodesk — game engines", color: "#7000ff" },
  { ext: "USDZ", desc: "Apple AR / QuickLook", color: "#00f5ff" },
];

const EXTRA_LABELS = ["SIDE VIEW", "BACK VIEW", "DETAIL"];

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  }, [onFile]);

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center cursor-pointer"
      style={{
        border: `1px dashed ${dragging ? "#7000ff" : "rgba(112,0,255,0.35)"}`,
        background: dragging ? "rgba(112,0,255,0.08)" : "rgba(0,10,20,0.5)",
        minHeight: 240,
        transition: "all 0.2s",
        boxShadow: dragging ? "0 0 30px rgba(112,0,255,0.2), inset 0 0 30px rgba(112,0,255,0.05)" : "none",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      whileHover={{ borderColor: "#7000ff80" } as any}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      <div className="relative flex items-center justify-center mb-6">
        {[48, 72, 96].map((size, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: size, height: size, border: `1px solid rgba(112,0,255,${0.5 - i * 0.12})` }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: dragging ? [1, 1.1, 1] : 1 }}
            transition={{ rotate: { duration: 6 + i * 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity } }}
          />
        ))}
        <motion.div animate={{ scale: dragging ? 1.2 : 1 }} style={{ position: "relative", zIndex: 1 }}>
          <Upload size={22} color="#7000ff" />
        </motion.div>
      </div>

      <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem", color: "#e0f7ff", letterSpacing: "0.08em" }}>
        {dragging ? "RELEASE TO UPLOAD" : "DROP IMAGE HERE"}
      </p>
      <p className="mt-2" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>
        PNG · JPG · WEBP · MAX 20MB
      </p>
      <motion.button
        className="mt-5 px-5 py-2"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", letterSpacing: "0.12em", color: "#7000ff", border: "1px solid rgba(112,0,255,0.35)", background: "rgba(112,0,255,0.06)", cursor: "pointer" }}
        whileHover={{ scale: 1.03, borderColor: "#7000ff80" } as any}
        whileTap={{ scale: 0.97 } as any}
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        BROWSE FILES
      </motion.button>

      {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, right: 8 }, { bottom: 8, left: 8 }].map((pos, i) => (
        <div key={i} className="absolute w-5 h-5" style={{
          ...pos,
          borderColor: dragging ? "#7000ff" : "rgba(112,0,255,0.35)",
          borderStyle: "solid", borderWidth: 0,
          ...(i === 0 && { borderTopWidth: 1.5, borderLeftWidth: 1.5 }),
          ...(i === 1 && { borderTopWidth: 1.5, borderRightWidth: 1.5 }),
          ...(i === 2 && { borderBottomWidth: 1.5, borderRightWidth: 1.5 }),
          ...(i === 3 && { borderBottomWidth: 1.5, borderLeftWidth: 1.5 }),
          transition: "border-color 0.2s",
        }} />
      ))}
    </motion.div>
  );
}

function SmallSlot({ label, preview, onFile, onClear }: {
  label: string;
  preview: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{
        border: "1px dashed rgba(112,0,255,0.28)",
        background: "rgba(0,6,16,0.6)",
        flex: 1,
        minHeight: 110,
        transition: "border-color 0.2s",
      }}
      onClick={() => !preview && inputRef.current?.click()}
      onMouseEnter={(e) => { if (!preview) (e.currentTarget as HTMLElement).style.borderColor = "rgba(112,0,255,0.6)"; }}
      onMouseLeave={(e) => { if (!preview) (e.currentTarget as HTMLElement).style.borderColor = "rgba(112,0,255,0.28)"; }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {preview ? (
        <>
          <img
            src={preview}
            alt={label}
            style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              position: "absolute", top: 4, right: 4,
              background: "rgba(0,0,0,0.8)", border: "none", cursor: "pointer",
              color: "#ff4455", fontSize: "0.65rem", padding: "1px 6px", lineHeight: "1.6",
            }}
          >✕</button>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "rgba(0,0,0,0.7)", padding: "3px 6px",
            fontFamily: "Share Tech Mono, monospace", fontSize: "0.43rem",
            color: "#7000ff", letterSpacing: "0.15em", textAlign: "center",
          }}>
            {label}
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center gap-2 p-3"
          onClick={() => inputRef.current?.click()}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid rgba(112,0,255,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Plus size={12} color="rgba(112,0,255,0.7)" />
          </div>
          <span style={{
            fontFamily: "Share Tech Mono, monospace", fontSize: "0.44rem",
            color: "#7ab8d0", letterSpacing: "0.12em", textAlign: "center",
          }}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange, color = "#7000ff" }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; color?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 6 }}>{label}</label>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.63rem", color: "#e0f7ff", background: "rgba(0,20,40,0.6)", border: `1px solid ${color}30`, cursor: "pointer", letterSpacing: "0.06em" }}
      >
        {value}
        <ChevronDown size={11} color={color} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 right-0 top-full z-50 mt-1"
            style={{ background: "rgba(8,10,18,0.97)", border: `1px solid ${color}30`, backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          >
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-3 py-2 block"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", color: opt === value ? color : "#7ab8d0", background: "none", border: "none", cursor: "pointer", borderLeft: opt === value ? `2px solid ${color}` : "2px solid transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${color}10`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >{opt}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ImageTo3DPage() {
  const gen = useGeneration();
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<(File | null)[]>([null, null, null]);
  const [extraImgs, setExtraImgs] = useState<(string | null)[]>([null, null, null]);
  const [quality, setQuality] = useState("Hunyuan3D · Ultra");

  const isActive = gen.status === "uploading" || gen.status === "queued" || gen.status === "running";
  const isDone = gen.status === "done";
  const isError = gen.status === "error";
  const isHunyuan = quality === "Hunyuan3D · Ultra";

  const handleFile = (file: File) => {
    setUploadedImg(URL.createObjectURL(file));
    setUploadedFile(file);
    if (isDone || isError) gen.reset();
  };

  const handleExtraFile = (idx: number, file: File) => {
    const urls = [...extraImgs];
    if (urls[idx]) URL.revokeObjectURL(urls[idx]!);
    urls[idx] = URL.createObjectURL(file);
    setExtraImgs(urls);
    const files = [...extraFiles];
    files[idx] = file;
    setExtraFiles(files);
  };

  const clearExtraFile = (idx: number) => {
    const urls = [...extraImgs];
    if (urls[idx]) URL.revokeObjectURL(urls[idx]!);
    urls[idx] = null;
    setExtraImgs(urls);
    const files = [...extraFiles];
    files[idx] = null;
    setExtraFiles(files);
  };

  const handleConvert = () => {
    if (!uploadedFile) return;
    const validExtras = isHunyuan
      ? (extraFiles.filter((f): f is File => f !== null))
      : [];
    gen.submit({
      mode: "image-to-3d",
      file: uploadedFile,
      bgImages: validExtras,
      model: QUALITY_MODEL[quality],
    });
  };

  const handleReset = () => {
    extraImgs.forEach((u) => u && URL.revokeObjectURL(u));
    setUploadedImg(null);
    setUploadedFile(null);
    setExtraFiles([null, null, null]);
    setExtraImgs([null, null, null]);
    gen.reset();
  };

  const progressPct = Math.round(gen.progress * 100);
  const extraCount = extraFiles.filter(Boolean).length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: "linear-gradient(180deg, transparent, #7000ff, transparent)" }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7000ff", letterSpacing: "0.25em" }}>DEPTH ENGINE · v3.8</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Image <span style={{ color: "#7000ff" }}>→</span> 3D
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>Upload any image. Reconstruct it in three dimensions.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Upload + Viewer */}
        <div className="flex flex-col gap-5">
          {!uploadedImg ? (
            <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <DropZone onFile={handleFile} />
              <div className="flex items-center justify-center py-6" style={{ border: "1px solid rgba(112,0,255,0.12)", background: "rgba(0,6,16,0.55)", backdropFilter: "blur(8px)", minHeight: 420 }}>
                <PageHoloCard imageSrc={imgDepthEngine} label="Image to 3D" subtitle="Depth Engine" accentColor="#7000ff" />
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
              {/* Primary image strip */}
              <div className="relative" style={{ border: "1px solid rgba(112,0,255,0.25)", background: "rgba(0,10,20,0.5)" }}>
                <div className="p-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(112,0,255,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7000ff" }} />
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7000ff", letterSpacing: "0.15em" }}>
                      FRONT VIEW · PRIMARY
                    </span>
                  </div>
                  <motion.button
                    onClick={handleReset}
                    className="px-2 py-1"
                    style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#ff4455", border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)", cursor: "pointer" }}
                    whileHover={{ scale: 1.05 } as any}
                  >
                    REPLACE
                  </motion.button>
                </div>
                <div className="relative flex items-center justify-center" style={{ background: "rgba(0,6,16,0.8)", maxHeight: 280, overflow: "hidden" }}>
                  <img src={uploadedImg} alt="Source" style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block" }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, rgba(112,0,255,0.03) 0px, transparent 2px, transparent 6px)" }} />
                </div>
              </div>

              {/* Multi-view additional slots (Hunyuan3D only) */}
              <AnimatePresence>
                {isHunyuan && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7ab8d0", letterSpacing: "0.15em" }}>
                          ADDITIONAL VIEWS
                        </span>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.44rem", color: "rgba(0,245,255,0.5)", letterSpacing: "0.08em" }}>
                          · OPTIONAL
                        </span>
                      </div>
                      <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.44rem", color: extraCount > 0 ? "#00f5ff" : "#7ab8d0", letterSpacing: "0.1em", opacity: extraCount > 0 ? 1 : 0.5 }}>
                        {extraCount > 0 ? `${extraCount} EXTRA VIEW${extraCount > 1 ? "S" : ""} · BETTER ACCURACY` : "MORE ANGLES = BETTER 3D"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {EXTRA_LABELS.map((label, i) => (
                        <SmallSlot
                          key={label}
                          label={label}
                          preview={extraImgs[i]}
                          onFile={(f) => handleExtraFile(i, f)}
                          onClear={() => clearExtraFile(i)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active state — spinning card */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="flex flex-col items-center justify-center overflow-hidden"
                    style={{ border: "1px solid rgba(112,0,255,0.2)", background: "rgba(0,6,16,0.7)", backdropFilter: "blur(8px)", minHeight: 460 }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <SpinningGenerationCard imageSrc={imgDepthEngine} accentColor="#7000ff" label="PROCESSING..." isSpinning={isActive} onHidden={() => {}} />
                    <div className="w-64 mt-4">
                      <div className="flex justify-between mb-1">
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7000ff", letterSpacing: "0.12em" }}>
                          {gen.status === "uploading" ? "UPLOADING…" : gen.status === "queued" ? "QUEUED…" : "RECONSTRUCTING…"}
                        </span>
                        <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", color: "#7000ff" }}>{progressPct}%</span>
                      </div>
                      <div className="relative h-1" style={{ background: "rgba(112,0,255,0.12)" }}>
                        <motion.div className="absolute top-0 left-0 h-full" style={{ background: "linear-gradient(90deg, #7000ff, #0066ff)", boxShadow: "0 0 8px #7000ff80" }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.12 }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error state */}
              <AnimatePresence>
                {isError && (
                  <motion.div className="p-5" style={{ border: "1px solid rgba(255,68,85,0.4)", background: "rgba(255,68,85,0.06)" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "#ff4455", boxShadow: "0 0 8px #ff4455" }} />
                      <div>
                        <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", color: "#ff4455", letterSpacing: "0.08em" }}>RECONSTRUCTION FAILED</p>
                        <p className="mt-1" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0", lineHeight: 1.5 }}>{gen.error ?? "Unknown error"}</p>
                        <motion.button onClick={handleConvert} className="mt-3 px-4 py-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7000ff", border: "1px solid rgba(112,0,255,0.4)", background: "rgba(112,0,255,0.08)", cursor: "pointer", letterSpacing: "0.1em" }} whileHover={{ scale: 1.03 } as any}>
                          RETRY
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Done state — result panel */}
              <AnimatePresence>
                {isDone && (
                  <motion.div className="flex flex-col gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <motion.a
                      href={gen.resultUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      download="model.glb"
                      className="flex items-center justify-center gap-3 py-4 relative overflow-hidden no-underline w-full"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", color: "#0a0a0f", background: "linear-gradient(135deg, #0066ff, #00f5ff)", textTransform: "uppercase" }}
                      animate={{ boxShadow: ["0 0 20px rgba(0,102,255,0.5)", "0 0 50px rgba(0,245,255,0.75)", "0 0 20px rgba(0,102,255,0.5)"] }}
                      transition={{ boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                      whileHover={{ scale: 1.02 } as any}
                      whileTap={{ scale: 0.97 } as any}
                    >
                      <Download size={16} />
                      DOWNLOAD GLB
                      <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.25), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                    </motion.a>

                    {/* AR button */}
                    {/* @ts-ignore */}
                    <model-viewer src={gen.resultUrl ?? ""} ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" style={{ display: "none" }} id="ar-main-viewer" />
                    <motion.button
                      onClick={() => { const mv = document.querySelector("#ar-main-viewer") as any; if (mv?.activateAR) mv.activateAR(); }}
                      className="flex items-center justify-center gap-3 py-4 relative overflow-hidden w-full"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", color: "#0a0a0f", background: "linear-gradient(135deg, #00c853, #00f5ff)", border: "none", cursor: "pointer", textTransform: "uppercase" }}
                      animate={{ boxShadow: ["0 0 20px rgba(0,200,83,0.5)", "0 0 50px rgba(0,245,200,0.75)", "0 0 20px rgba(0,200,83,0.5)"] }}
                      transition={{ boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                      whileHover={{ scale: 1.02 } as any}
                      whileTap={{ scale: 0.97 } as any}
                    >
                      <Eye size={16} />
                      VIEW IN AR
                      <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.25), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                    </motion.button>

                    <div className="p-4 flex items-center gap-4" style={{ border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.04)" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: "#00f5ff", boxShadow: "0 0 8px #00f5ff", flexShrink: 0 }} />
                      <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#00f5ff", letterSpacing: "0.12em" }}>
                        3D MODEL READY · {QUALITY_MODEL[quality].toUpperCase()}
                        {extraCount > 0 && ` · ${extraCount + 1} VIEWS USED`}
                      </p>
                    </div>

                    {/* Interactive 3D viewer */}
                    <div className="relative" style={{ border: "1px solid rgba(112,0,255,0.35)", background: "rgba(0,6,16,0.6)" }}>
                      <div className="absolute top-3 left-3 z-10" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7000ff", letterSpacing: "0.15em", opacity: 0.8 }}>
                        3D MODEL VIEWER · DRAG TO ROTATE
                      </div>
                      {/* @ts-ignore */}
                      <model-viewer
                        src={gen.resultUrl ?? ""}
                        camera-controls
                        auto-rotate
                        shadow-intensity="1"
                        ar
                        ar-modes="webxr scene-viewer quick-look"
                        ar-scale="auto"
                        style={{ width: "100%", height: 400, background: "transparent" }}
                      >
                        <button
                          slot="ar-button"
                          style={{
                            position: "absolute", bottom: 16, right: 16,
                            fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", letterSpacing: "0.15em",
                            color: "#00f5ff", border: "1px solid rgba(0,245,255,0.5)",
                            background: "rgba(0,245,255,0.1)", backdropFilter: "blur(8px)",
                            padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f5ff" strokeWidth="2"><path d="M5 3H3v4M21 3h-2v4M5 21H3v-4M21 21h-2v-4M12 8v8M8 12h8"/></svg>
                          VIEW IN AR
                        </button>
                      {/* @ts-ignore */}
                      </model-viewer>
                      {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, right: 8 }, { bottom: 8, left: 8 }].map((pos, i) => (
                        <div key={i} className="absolute w-6 h-6 pointer-events-none" style={{ ...pos, borderColor: "#7000ff70", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i === 0 || i === 1) ? 1.5 : 0, borderBottomWidth: (i === 2 || i === 3) ? 1.5 : 0, borderLeftWidth: (i === 0 || i === 3) ? 1.5 : 0, borderRightWidth: (i === 1 || i === 2) ? 1.5 : 0 }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Idle after upload, before convert */}
              {gen.status === "idle" && (
                <div className="flex items-center justify-center" style={{ border: "1px dashed rgba(112,0,255,0.15)", background: "rgba(0,6,16,0.4)", minHeight: 280 }}>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7ab8d0", letterSpacing: "0.18em", opacity: 0.6 }}>
                    CLICK "CONVERT TO 3D" TO BEGIN
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: settings + download */}
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          {/* Convert button */}
          <motion.button
            onClick={handleConvert}
            disabled={isActive || !uploadedFile}
            className="relative w-full py-4 overflow-hidden"
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em",
              color: isActive || !uploadedFile ? "#7ab8d0" : "#ffffff",
              background: isActive || !uploadedFile ? "rgba(112,0,255,0.1)" : "linear-gradient(135deg, #7000ff, #0066ff)",
              border: isActive || !uploadedFile ? "1px solid rgba(112,0,255,0.3)" : "none",
              cursor: isActive || !uploadedFile ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              boxShadow: !isActive && uploadedFile ? "0 0 40px rgba(112,0,255,0.4)" : "none",
            }}
            whileHover={!isActive && uploadedFile ? { scale: 1.02 } as any : {}}
            whileTap={!isActive && uploadedFile ? { scale: 0.97 } as any : {}}
          >
            {isActive ? "PROCESSING…" : isDone ? "RE-CONVERT" : "CONVERT TO 3D"}
            {!isActive && uploadedFile && (
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
            )}
          </motion.button>

          {/* Settings */}
          <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(112,0,255,0.15)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid rgba(112,0,255,0.08)" }}>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7000ff", letterSpacing: "0.2em" }}>QUALITY SETTINGS</span>
            </div>
            <SelectField label="MESH RESOLUTION" value={quality} options={QUALITY_OPTS} onChange={setQuality} color="#7000ff" />

            {/* Multi-view badge */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: isHunyuan ? "rgba(112,0,255,0.08)" : "rgba(0,6,16,0.4)",
                border: `1px solid ${isHunyuan ? "rgba(112,0,255,0.3)" : "rgba(112,0,255,0.1)"}`,
                transition: "all 0.3s",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isHunyuan ? "#7000ff" : "#7ab8d0", boxShadow: isHunyuan ? "0 0 6px #7000ff" : "none", transition: "all 0.3s" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: isHunyuan ? "#c0a0ff" : "#7ab8d0", letterSpacing: "0.1em" }}>
                {isHunyuan ? "MULTI-VIEW ACTIVE · UP TO 4 IMAGES" : "SINGLE IMAGE MODE"}
              </span>
            </div>

            {[
              { label: "GENERATE TEXTURES", active: true },
              { label: "NORMAL MAPS", active: true },
              { label: "PBR MATERIALS", active: false },
              { label: "SMOOTH NORMALS", active: true },
            ].map((toggle) => (
              <div key={toggle.label} className="flex items-center justify-between">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>{toggle.label}</span>
                <div className="relative w-8 h-4" style={{ background: toggle.active ? "rgba(112,0,255,0.4)" : "rgba(0,245,255,0.08)", border: `1px solid ${toggle.active ? "#7000ff" : "rgba(0,245,255,0.15)"}` }}>
                  <div className="absolute top-0.5 h-3 w-3" style={{ left: toggle.active ? "calc(100% - 14px)" : "2px", background: toggle.active ? "#7000ff" : "#7ab8d0", transition: "left 0.2s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Download formats */}
          <div className="p-4 flex flex-col gap-3" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,245,255,0.12)", backdropFilter: "blur(12px)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00f5ff", letterSpacing: "0.2em" }}>EXPORT FORMAT</span>
            {FORMAT_OPTS.map((fmt, i) => (
              <motion.a
                key={fmt.ext}
                href={isDone && i === 0 ? (gen.resultUrl ?? "#") : "#"}
                target={isDone && i === 0 && gen.resultUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="relative flex items-center justify-between px-3 py-2.5 overflow-hidden no-underline"
                style={{
                  border: `1px solid ${isDone ? fmt.color + "30" : "rgba(0,245,255,0.08)"}`,
                  background: isDone ? `${fmt.color}06` : "rgba(0,245,255,0.02)",
                  cursor: isDone ? "pointer" : "not-allowed",
                  opacity: isDone ? 1 : 0.4,
                  pointerEvents: isDone ? "auto" : "none",
                }}
                whileHover={isDone ? { borderColor: `${fmt.color}60`, scale: 1.01 } as any : {}}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", color: isDone ? fmt.color : "#7ab8d0", letterSpacing: "0.1em", fontWeight: 700 }}>{fmt.ext}</span>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7ab8d0" }}>{fmt.desc}</span>
                </div>
                <Download size={12} color={isDone ? fmt.color : "#7ab8d0"} />
              </motion.a>
            ))}
          </div>

          {/* Model info */}
          <div className="p-3" style={{ background: "rgba(112,0,255,0.05)", border: "1px solid rgba(112,0,255,0.2)" }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7000ff", letterSpacing: "0.12em" }}>ACTIVE MODEL</p>
            <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>{QUALITY_MODEL[quality].toUpperCase()}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7000ff" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0" }}>3D RECONSTRUCTION · LOCAL GPU</span>
            </div>
          </div>

          <div className="p-3 flex items-center gap-3" style={{ background: "rgba(112,0,255,0.04)", border: "1px solid rgba(112,0,255,0.12)" }}>
            <RotateCcw size={13} color="#7000ff" />
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", letterSpacing: "0.1em" }}>GLB downloads open in your system 3D viewer</span>
          </div>

          <div className="p-3 flex items-center gap-3" style={{ background: "rgba(0,102,255,0.04)", border: "1px solid rgba(0,102,255,0.12)" }}>
            <Box size={13} color="#0066ff" />
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", letterSpacing: "0.1em" }}>OBJ/FBX for game engine import</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
