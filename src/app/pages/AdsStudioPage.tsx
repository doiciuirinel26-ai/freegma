import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Video, Mic, Layers } from "lucide-react";
import { VideoOutputArea } from "../components/VideoOutputArea";
import { useGeneration } from "../../hooks/useGeneration";

const ACCENT = "#ff9500";
const ACCENT_DIM = "rgba(255,149,0,0.15)";
const ACCENT_BORDER = "rgba(255,149,0,0.3)";

type Tab = "clothing-video";

// ─── Upload zone singura imagine ───────────────────────────────────────────
function UploadZone({
  onFile, imgUrl, label = "DROP CLOTHING IMAGE",
}: {
  onFile: (f: File) => void;
  imgUrl: string | null;
  label?: string;
}) {
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
      className="relative overflow-hidden cursor-pointer"
      style={{
        border: `1px dashed ${dragging ? ACCENT : ACCENT_BORDER}`,
        background: dragging ? ACCENT_DIM : "rgba(0,10,20,0.5)",
        minHeight: imgUrl ? "auto" : 200,
        transition: "all 0.2s",
        boxShadow: dragging ? `0 0 30px rgba(255,149,0,0.2), inset 0 0 30px rgba(255,149,0,0.05)` : "none",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      {imgUrl ? (
        <div className="relative group">
          <img src={imgUrl} alt="Reference" style={{ width: "100%", height: 220, display: "block", objectFit: "contain", background: "rgba(0,8,18,0.8)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `repeating-linear-gradient(0deg, rgba(255,149,0,0.04) 0px, transparent 2px, transparent 6px)` }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,10,20,0.7)", backdropFilter: "blur(4px)" }}>
            <div className="flex flex-col items-center gap-2">
              <Upload size={20} color={ACCENT} />
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: ACCENT, letterSpacing: "0.1em" }}>REPLACE IMAGE</span>
            </div>
          </div>
          <div className="absolute top-2 left-2 px-2 py-1" style={{ background: "rgba(0,10,20,0.8)", border: `1px solid ${ACCENT_BORDER}` }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: ACCENT, letterSpacing: "0.15em" }}>REFERENCE</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14">
          <div className="relative flex items-center justify-center mb-5">
            {[36, 56].map((size, i) => (
              <motion.div key={i} className="absolute rounded-full" style={{ width: size, height: size, border: `1px solid rgba(255,149,0,${0.5 - i * 0.15})` }} animate={{ rotate: i % 2 === 0 ? 360 : -360 }} transition={{ duration: 5 + i * 3, repeat: Infinity, ease: "linear" }} />
            ))}
            <Upload size={18} color={ACCENT} style={{ position: "relative", zIndex: 1 }} />
          </div>
          <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: "#e0f7ff", letterSpacing: "0.08em" }}>{label}</p>
          <p className="mt-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>PNG · JPG · WEBP</p>
        </div>
      )}

      {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
        <div key={i} className="absolute w-5 h-5" style={{
          ...pos,
          borderColor: dragging ? ACCENT : ACCENT_BORDER,
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

// ─── Prompt textarea ─────────────────────────────────────────────────────────
function PromptBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div
      className="relative p-4"
      style={{ background: "rgba(0,15,30,0.7)", border: `1px solid ${ACCENT_BORDER}`, backdropFilter: "blur(12px)" }}
    >
      <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: `1px solid ${ACCENT}40`, borderRight: `1px solid ${ACCENT}40` }} />
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: ACCENT, letterSpacing: "0.2em", display: "block", marginBottom: 8 }}>PROMPT</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none outline-none"
        style={{
          fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff",
          background: "rgba(255,149,0,0.04)", border: `1px solid rgba(255,149,0,0.12)`,
          padding: "10px 12px", lineHeight: 1.6, caretColor: ACCENT, transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(255,149,0,0.45)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,149,0,0.12)")}
      />
    </div>
  );
}

// ─── Generate button ──────────────────────────────────────────────────────────
function GenerateButton({ onClick, disabled, isActive, isDone, label }: {
  onClick: () => void; disabled: boolean; isActive: boolean; isDone: boolean; label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="relative w-full py-4 overflow-hidden"
      style={{
        fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em",
        color: disabled ? "#7ab8d0" : "#000",
        background: disabled ? ACCENT_DIM : `linear-gradient(135deg, ${ACCENT}, #ffcc00)`,
        border: disabled ? `1px solid ${ACCENT_BORDER}` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        boxShadow: !disabled ? `0 0 40px rgba(255,149,0,0.4)` : "none",
        fontWeight: 700,
      }}
      whileHover={!disabled ? { scale: 1.02, boxShadow: "0 0 60px rgba(255,149,0,0.55)" } as any : {}}
      whileTap={!disabled ? { scale: 0.97 } as any : {}}
    >
      {isActive ? "GENERATING…" : isDone ? `REGENERATE ${label}` : `GENERATE ${label}`}
      {!disabled && (
        <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
      )}
    </motion.button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdsStudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("clothing-video");
  const navigate = useNavigate();

  // Clothing Video state
  const genVideo = useGeneration();
  const [clothingImg, setClothingImg] = useState<string | null>(null);
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");

  const isVideoActive = ["uploading", "queued", "running"].includes(genVideo.status);

  const handleClothingFile = (file: File) => {
    setClothingImg(URL.createObjectURL(file));
    setClothingFile(file);
    if (genVideo.status === "done" || genVideo.status === "error") genVideo.reset();
  };

  const handleGenerateVideo = () => {
    if (!clothingFile) return;
    genVideo.submit({
      mode: "ads-clothing-video",
      file: clothingFile,
      prompt: videoPrompt,
    });
  };

  const videoPhase = genVideo.status === "done" ? "complete" : isVideoActive ? "loading" : "idle";

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: `linear-gradient(180deg, transparent, ${ACCENT}, transparent)` }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: ACCENT, letterSpacing: "0.25em" }}>AD ENGINE · v1.0</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Ads <span style={{ color: ACCENT }}>→</span> Studio
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>
          Generate professional clothing ads — video or image — from product references.
        </p>
      </motion.div>

      {/* Tab selector */}
      <motion.div className="flex gap-0 mb-6" style={{ border: `1px solid ${ACCENT_BORDER}`, display: "inline-flex" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <button
          onClick={() => setActiveTab("clothing-video")}
          className="flex items-center gap-2 px-5 py-3"
          style={{
            fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.15em",
            color: "#000", background: ACCENT,
            border: "none", cursor: "pointer", transition: "all 0.2s", fontWeight: 700,
          }}
        >
          <Video size={12} />
          CLOTHING VIDEO
        </button>
        <button
          onClick={() => navigate("/lip-sync")}
          className="flex items-center gap-2 px-5 py-3"
          style={{
            fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.15em",
            color: "#7ab8d0", background: "transparent",
            border: "none", borderLeft: `1px solid ${ACCENT_BORDER}`,
            cursor: "pointer", transition: "all 0.2s", fontWeight: 700,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ff4400")}
          onMouseLeave={e => (e.currentTarget.style.color = "#7ab8d0")}
        >
          <Mic size={12} />
          LIP SYNC
        </button>
        <button
          onClick={() => navigate("/studio")}
          className="flex items-center gap-2 px-5 py-3"
          style={{
            fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.15em",
            color: "#7ab8d0", background: "transparent",
            border: "none", borderLeft: `1px solid ${ACCENT_BORDER}`,
            cursor: "pointer", transition: "all 0.2s", fontWeight: 700,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00e5b0")}
          onMouseLeave={e => (e.currentTarget.style.color = "#7ab8d0")}
        >
          <Layers size={12} />
          CRAFT
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── TAB 1: Clothing Video ── */}
        {activeTab === "clothing-video" && (
          <motion.div key="clothing-video" className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            <div className="flex flex-col gap-5">
              {/* Upload */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: ACCENT, letterSpacing: "0.18em" }}>CLOTHING REFERENCE</span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${ACCENT_BORDER}, transparent)` }} />
                </div>
                <UploadZone onFile={handleClothingFile} imgUrl={clothingImg} label="DROP CLOTHING IMAGE" />
              </div>

              {/* Prompt */}
              <PromptBox
                value={videoPrompt}
                onChange={setVideoPrompt}
                placeholder="Describe the scene — model movement, environment, lighting, style..."
              />

              {/* Error */}
              <AnimatePresence>
                {genVideo.status === "error" && (
                  <motion.div className="p-4" style={{ border: "1px solid rgba(255,68,85,0.4)", background: "rgba(255,68,85,0.06)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem", color: "#ff4455" }}>GENERATION FAILED</p>
                    <p className="mt-1" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0" }}>{genVideo.error ?? "Unknown error"}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video output */}
              <VideoOutputArea
                phase={videoPhase}
                progress={Math.min(100, Math.round(genVideo.progress * 100))}
                videoSrc={clothingImg ?? ""}
                duration={5}
                resultUrl={genVideo.resultUrl ?? undefined}
              />
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-4">
              <GenerateButton
                onClick={handleGenerateVideo}
                disabled={isVideoActive || !clothingFile}
                isActive={isVideoActive}
                isDone={genVideo.status === "done"}
                label="VIDEO"
              />
              <div className="p-3" style={{ background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}` }}>
                <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: ACCENT, letterSpacing: "0.12em" }}>ACTIVE MODEL</p>
                <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>WAN 2.2 · Clothing LoRA</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0" }}>WANVIDEO I2V · LOCAL GPU</span>
                </div>
              </div>
              <div className="p-3" style={{ background: "rgba(0,15,30,0.7)", border: `1px solid ${ACCENT_BORDER}` }}>
                <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: ACCENT, letterSpacing: "0.1em", marginBottom: 8 }}>HOW IT WORKS</p>
                {["Upload a product/clothing image", "Add optional motion prompt", "AI generates a model wearing it"].map((step, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", color: ACCENT, minWidth: 14 }}>{i + 1}.</span>
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.85rem", color: "#7ab8d0" }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
