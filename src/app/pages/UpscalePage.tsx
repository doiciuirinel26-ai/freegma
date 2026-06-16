import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, ChevronDown, ZoomIn } from "lucide-react";
import { SpinningGenerationCard } from "../components/SpinningGenerationCard";
import { PageHoloCard } from "../components/PageHoloCard";
import { useGeneration } from "../../hooks/useGeneration";
import imgRef from "../../imports/result__8_.png";

const COLOR = "#00ff88";

const MODEL_OPTS = [
  "RealESRGAN · x4 Photo",
  "RealESRGAN · x4 Anime",
  "RealESRGAN · x2 Photo",
  "4x UltraSharp",
];
const MODEL_KEY: Record<string, string> = {
  "RealESRGAN · x4 Photo": "realesrgan_x4_photo",
  "RealESRGAN · x4 Anime": "realesrgan_x4_anime",
  "RealESRGAN · x2 Photo": "realesrgan_x2_photo",
  "4x UltraSharp":          "ultrasharp_x4",
};
const MODEL_SCALE: Record<string, string> = {
  "RealESRGAN · x4 Photo": "4×",
  "RealESRGAN · x4 Anime": "4×",
  "RealESRGAN · x2 Photo": "2×",
  "4x UltraSharp":          "4×",
};

function SelectField({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 6 }}>UPSCALE MODEL</label>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.63rem", color: "#e0f7ff", background: "rgba(0,20,40,0.6)", border: `1px solid ${COLOR}30`, cursor: "pointer", letterSpacing: "0.06em" }}
      >
        {value}
        <ChevronDown size={11} color={COLOR} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 right-0 top-full z-50 mt-1"
            style={{ background: "rgba(8,10,18,0.97)", border: `1px solid ${COLOR}30`, backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          >
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-3 py-2 block"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", color: opt === value ? COLOR : "#7ab8d0", background: "none", border: "none", cursor: "pointer", borderLeft: opt === value ? `2px solid ${COLOR}` : "2px solid transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${COLOR}10`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >{opt}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function UpscalePage() {
  const gen = useGeneration();
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [model, setModel] = useState("RealESRGAN · x4 Photo");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = gen.status === "uploading" || gen.status === "queued" || gen.status === "running";
  const isDone = gen.status === "done";
  const isError = gen.status === "error";
  const progressPct = Math.round(gen.progress * 100);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (uploadedImg) URL.revokeObjectURL(uploadedImg);
    setUploadedImg(URL.createObjectURL(file));
    setUploadedFile(file);
    if (isDone || isError) gen.reset();
  }, [uploadedImg, isDone, isError, gen]);

  const handleUpscale = () => {
    if (!uploadedFile) return;
    gen.submit({ mode: "upscale", file: uploadedFile, model: MODEL_KEY[model] });
  };

  const handleReset = () => {
    if (uploadedImg) URL.revokeObjectURL(uploadedImg);
    setUploadedImg(null);
    setUploadedFile(null);
    gen.reset();
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: `linear-gradient(180deg, transparent, ${COLOR}, transparent)` }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: COLOR, letterSpacing: "0.25em" }}>NEURAL UPSCALE · v1.0</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Image <span style={{ color: COLOR }}>Upscale</span>
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>Enhance resolution with AI. Up to 4× without losing detail.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left: upload + preview */}
        <div className="flex flex-col gap-5">
          {!uploadedImg ? (
            <motion.div
              className="relative flex flex-col items-center justify-center cursor-pointer"
              style={{
                border: `1px dashed ${dragging ? COLOR : COLOR + "55"}`,
                background: dragging ? COLOR + "0d" : "rgba(0,10,20,0.5)",
                minHeight: 280,
                transition: "all 0.2s",
                boxShadow: dragging ? `0 0 30px ${COLOR}30, inset 0 0 30px ${COLOR}08` : "none",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => inputRef.current?.click()}
              whileHover={{ borderColor: COLOR + "80" } as any}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <motion.div animate={{ scale: dragging ? 1.2 : 1 }}>
                <ZoomIn size={28} color={COLOR} />
              </motion.div>
              <p className="mt-4" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem", color: "#e0f7ff", letterSpacing: "0.08em" }}>
                {dragging ? "RELEASE TO UPLOAD" : "DROP IMAGE HERE"}
              </p>
              <p className="mt-2" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0" }}>PNG · JPG · WEBP · MAX 50MB</p>
              <motion.button
                className="mt-5 px-5 py-2"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", letterSpacing: "0.12em", color: COLOR, border: `1px solid ${COLOR}35`, background: `${COLOR}06`, cursor: "pointer" }}
                whileHover={{ scale: 1.03 } as any}
                whileTap={{ scale: 0.97 } as any}
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >BROWSE FILES</motion.button>
              {/* Corner decorations */}
              {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, right: 8 }, { bottom: 8, left: 8 }].map((pos, i) => (
                <div key={i} className="absolute w-5 h-5" style={{ ...pos, borderColor: dragging ? COLOR : COLOR + "55", borderStyle: "solid", borderWidth: 0, ...(i === 0 && { borderTopWidth: 1.5, borderLeftWidth: 1.5 }), ...(i === 1 && { borderTopWidth: 1.5, borderRightWidth: 1.5 }), ...(i === 2 && { borderBottomWidth: 1.5, borderRightWidth: 1.5 }), ...(i === 3 && { borderBottomWidth: 1.5, borderLeftWidth: 1.5 }), transition: "border-color 0.2s" }} />
              ))}
            </motion.div>
          ) : (
            <motion.div className="flex flex-col gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                {/* Before */}
                <div style={{ border: `1px solid ${COLOR}20`, background: "rgba(0,10,20,0.5)" }}>
                  <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${COLOR}15` }}>
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>ORIGINAL</span>
                    <motion.button onClick={handleReset} className="px-2 py-0.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.46rem", color: "#ff4455", border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)", cursor: "pointer" }} whileHover={{ scale: 1.05 } as any}>REPLACE</motion.button>
                  </div>
                  <div style={{ height: 200, overflow: "hidden" }}>
                    <img src={uploadedImg} alt="Original" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
                {/* After */}
                <div style={{ border: `1px solid ${COLOR}35`, background: "rgba(0,10,20,0.5)" }}>
                  <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${COLOR}15` }}>
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: COLOR, letterSpacing: "0.12em" }}>UPSCALED {MODEL_SCALE[model]}</span>
                  </div>
                  <div className="flex items-center justify-center" style={{ height: 200, background: "rgba(0,255,136,0.02)" }}>
                    {isDone && gen.resultUrl ? (
                      <img src={gen.resultUrl} alt="Upscaled" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : isActive ? (
                      <div className="flex flex-col items-center gap-3">
                        <motion.div style={{ width: 32, height: 32, border: `2px solid ${COLOR}30`, borderTopColor: COLOR, borderRadius: "50%" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: COLOR, letterSpacing: "0.12em" }}>PROCESSING…</span>
                      </div>
                    ) : (
                      <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7ab8d0", opacity: 0.4, letterSpacing: "0.12em" }}>RESULT HERE</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Active spinner */}
              <AnimatePresence>
                {isActive && (
                  <motion.div className="flex flex-col items-center justify-center overflow-hidden" style={{ border: `1px solid ${COLOR}20`, background: "rgba(0,6,16,0.7)", backdropFilter: "blur(8px)", minHeight: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SpinningGenerationCard imageSrc={imgRef} accentColor={COLOR} label="UPSCALING..." isSpinning={isActive} onHidden={() => {}} />
                    <div className="w-64 mt-4">
                      <div className="flex justify-between mb-1">
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: COLOR, letterSpacing: "0.12em" }}>
                          {gen.status === "uploading" ? "UPLOADING…" : gen.status === "queued" ? "QUEUED…" : "ENHANCING…"}
                        </span>
                        <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", color: COLOR }}>{progressPct}%</span>
                      </div>
                      <div className="relative h-1" style={{ background: `${COLOR}15` }}>
                        <motion.div className="absolute top-0 left-0 h-full" style={{ background: `linear-gradient(90deg, ${COLOR}, #00ffcc)`, boxShadow: `0 0 8px ${COLOR}80` }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.12 }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {isError && (
                  <motion.div className="p-5" style={{ border: "1px solid rgba(255,68,85,0.4)", background: "rgba(255,68,85,0.06)" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "#ff4455", boxShadow: "0 0 8px #ff4455" }} />
                      <div>
                        <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", color: "#ff4455", letterSpacing: "0.08em" }}>UPSCALE FAILED</p>
                        <p className="mt-1" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0", lineHeight: 1.5 }}>{gen.error ?? "Unknown error"}</p>
                        <motion.button onClick={handleUpscale} className="mt-3 px-4 py-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: COLOR, border: `1px solid ${COLOR}40`, background: `${COLOR}08`, cursor: "pointer", letterSpacing: "0.1em" }} whileHover={{ scale: 1.03 } as any}>RETRY</motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Idle placeholder */}
              {gen.status === "idle" && (
                <div className="flex items-center justify-center" style={{ border: `1px dashed ${COLOR}15`, background: "rgba(0,6,16,0.4)", minHeight: 80 }}>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7ab8d0", letterSpacing: "0.18em", opacity: 0.5 }}>SELECT MODEL AND CLICK "UPSCALE"</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Landing placeholder card */}
          {!uploadedImg && (
            <div className="flex items-center justify-center py-6" style={{ border: `1px solid ${COLOR}12`, background: "rgba(0,6,16,0.55)", backdropFilter: "blur(8px)", minHeight: 260 }}>
              <PageHoloCard imageSrc={imgRef} label="Upscale" subtitle="Neural Enhance" accentColor={COLOR} />
            </div>
          )}
        </div>

        {/* Right: controls */}
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          {/* Upscale button */}
          <motion.button
            onClick={handleUpscale}
            disabled={isActive || !uploadedFile}
            className="relative w-full py-4 overflow-hidden"
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em",
              color: isActive || !uploadedFile ? "#7ab8d0" : "#0a0a0f",
              background: isActive || !uploadedFile ? `${COLOR}10` : `linear-gradient(135deg, ${COLOR}, #00ffcc)`,
              border: isActive || !uploadedFile ? `1px solid ${COLOR}30` : "none",
              cursor: isActive || !uploadedFile ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              boxShadow: !isActive && uploadedFile ? `0 0 40px ${COLOR}40` : "none",
            }}
            whileHover={!isActive && uploadedFile ? { scale: 1.02 } as any : {}}
            whileTap={!isActive && uploadedFile ? { scale: 0.97 } as any : {}}
          >
            {isActive ? "PROCESSING…" : isDone ? "RE-UPSCALE" : "UPSCALE IMAGE"}
            {!isActive && uploadedFile && (
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
            )}
          </motion.button>

          {/* Model selector */}
          <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: `1px solid ${COLOR}15`, backdropFilter: "blur(12px)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: COLOR, letterSpacing: "0.2em" }}>MODEL SETTINGS</span>
            <SelectField value={model} options={MODEL_OPTS} onChange={setModel} />
            {/* Scale badge */}
            <div className="flex items-center justify-between px-3 py-2" style={{ background: `${COLOR}08`, border: `1px solid ${COLOR}20` }}>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>UPSCALE FACTOR</span>
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem", color: COLOR, fontWeight: 700 }}>{MODEL_SCALE[model]}</span>
            </div>
          </div>

          {/* Download */}
          <AnimatePresence>
            {isDone && gen.resultUrl && (
              <motion.a
                href={gen.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                download="upscaled.png"
                className="flex items-center justify-center gap-3 py-4 relative overflow-hidden no-underline w-full"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", color: "#0a0a0f", background: "linear-gradient(135deg, #0066ff, #00f5ff)", textTransform: "uppercase" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, boxShadow: ["0 0 20px rgba(0,102,255,0.5)", "0 0 45px rgba(0,245,255,0.7)", "0 0 20px rgba(0,102,255,0.5)"] }}
                transition={{ boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                whileHover={{ scale: 1.03 } as any}
                whileTap={{ scale: 0.97 } as any}
              >
                <Download size={16} />
                DOWNLOAD PNG
                <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.25), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              </motion.a>
            )}
          </AnimatePresence>
          {!isDone && (
            <div className="flex items-center justify-center py-4" style={{ border: "1px solid rgba(0,102,255,0.15)", background: "rgba(0,102,255,0.03)", opacity: 0.4 }}>
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: "#7ab8d0", letterSpacing: "0.18em" }}>DOWNLOAD PNG</span>
            </div>
          )}

          {/* Active model info */}
          <div className="p-3" style={{ background: `${COLOR}05`, border: `1px solid ${COLOR}20` }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: COLOR, letterSpacing: "0.12em" }}>ACTIVE MODEL</p>
            <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>{model}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0" }}>REAL-ESRGAN · LOCAL GPU</span>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3" style={{ background: "rgba(0,255,136,0.03)", border: `1px solid ${COLOR}12` }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: COLOR, letterSpacing: "0.1em", marginBottom: 6 }}>TIPS</p>
            {[
              "x4 Photo for real-world images",
              "x4 Anime for illustrations & art",
              "UltraSharp for max detail & clarity",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span style={{ color: COLOR, fontSize: "0.5rem", marginTop: 1 }}>›</span>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", color: "#7ab8d0", lineHeight: 1.4 }}>{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
