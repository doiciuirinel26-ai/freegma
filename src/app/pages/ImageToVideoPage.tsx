import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload } from "lucide-react";
import { VideoOutputArea } from "../components/VideoOutputArea";
import { useGeneration } from "../../hooks/useGeneration";

const DURATION_OPTS = [
  { label: "3s", value: 3, desc: "Quick clip" },
  { label: "5s", value: 5, desc: "Standard" },
  { label: "10s", value: 10, desc: "Extended" },
];

const MOTION_PRESETS = [
  "Slow zoom in", "Dolly push", "Orbital pan", "Parallax float",
  "Cinematic drift", "Pulse wave", "Glitch burst", "Spiral warp",
];

function UploadZone({ onFile, imgUrl }: { onFile: (f: File) => void; imgUrl: string | null }) {
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
        border: `1px dashed ${dragging ? "#0066ff" : "rgba(0,102,255,0.4)"}`,
        background: dragging ? "rgba(0,102,255,0.08)" : "rgba(0,10,20,0.5)",
        minHeight: imgUrl ? "auto" : 200,
        transition: "all 0.2s",
        boxShadow: dragging ? "0 0 30px rgba(0,102,255,0.2), inset 0 0 30px rgba(0,102,255,0.05)" : "none",
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
          <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, rgba(0,102,255,0.04) 0px, transparent 2px, transparent 6px)" }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,10,20,0.7)", backdropFilter: "blur(4px)" }}>
            <div className="flex flex-col items-center gap-2">
              <Upload size={20} color="#0066ff" />
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: "#0066ff", letterSpacing: "0.1em" }}>REPLACE IMAGE</span>
            </div>
          </div>
          <div className="absolute top-2 left-2 px-2 py-1" style={{ background: "rgba(0,10,20,0.8)", border: "1px solid rgba(0,102,255,0.3)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#0066ff", letterSpacing: "0.15em" }}>REFERENCE FRAME</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-14">
          <div className="relative flex items-center justify-center mb-5">
            {[36, 56].map((size, i) => (
              <motion.div key={i} className="absolute rounded-full" style={{ width: size, height: size, border: `1px solid rgba(0,102,255,${0.5 - i * 0.15})` }} animate={{ rotate: i % 2 === 0 ? 360 : -360 }} transition={{ duration: 5 + i * 3, repeat: Infinity, ease: "linear" }} />
            ))}
            <Upload size={18} color="#0066ff" style={{ position: "relative", zIndex: 1 }} />
          </div>
          <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: "#e0f7ff", letterSpacing: "0.08em" }}>DROP REFERENCE IMAGE</p>
          <p className="mt-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>PNG · JPG · WEBP</p>
        </div>
      )}

      {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
        <div key={i} className="absolute w-5 h-5" style={{
          ...pos,
          borderColor: dragging ? "#0066ff" : "rgba(0,102,255,0.4)",
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

export function ImageToVideoPage() {
  const gen = useGeneration();
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [motionPrompt, setMotionPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [selectedPreset, setSelectedPreset] = useState("Cinematic drift");

  const isActive = gen.status === "uploading" || gen.status === "queued" || gen.status === "running";
  const isError = gen.status === "error";

  const phase = gen.status === "done" ? "complete" : isActive ? "loading" : "idle";
  const progressPct = Math.min(100, Math.round(gen.progress * 100));

  const handleFile = (file: File) => {
    setUploadedImg(URL.createObjectURL(file));
    setUploadedFile(file);
    if (gen.status === "done" || isError) gen.reset();
  };

  const handleGenerate = () => {
    if (!uploadedFile) return;
    gen.submit({
      mode: "image-to-video",
      file: uploadedFile,
      prompt: motionPrompt,
      negPrompt,
      extraBody: { duration },
    });
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: "linear-gradient(180deg, transparent, #0066ff, transparent)" }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#0066ff", letterSpacing: "0.25em" }}>MOTION FORGE · v2.5</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Image <span style={{ color: "#0066ff" }}>→</span> Video
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>Breathe motion into still images with neural video synthesis.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: upload + player */}
        <div className="flex flex-col gap-5">
          {/* Upload zone */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#0066ff", letterSpacing: "0.18em" }}>REFERENCE IMAGE</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,102,255,0.3), transparent)" }} />
            </div>
            <UploadZone onFile={handleFile} imgUrl={uploadedImg} />
          </motion.div>

          {/* Motion prompt */}
          <motion.div
            className="relative p-4"
            style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,102,255,0.15)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          >
            <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: "1px solid #0066ff40", borderRight: "1px solid #0066ff40" }} />
            <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#0066ff", letterSpacing: "0.2em", display: "block", marginBottom: 8 }}>
              MOTION PROMPT
            </label>
            <textarea
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              placeholder="Describe the motion — camera movement, element animation, atmospheric effects..."
              rows={3}
              className="w-full resize-none outline-none"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff",
                background: "rgba(0,102,255,0.04)", border: "1px solid rgba(0,102,255,0.12)",
                padding: "10px 12px", lineHeight: 1.6, caretColor: "#0066ff", transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,102,255,0.45)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,102,255,0.12)")}
            />
            <div className="mt-3">
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4455", letterSpacing: "0.2em", display: "block", marginBottom: 6 }}>
                NEGATIVE PROMPT
              </label>
              <textarea
                value={negPrompt}
                onChange={(e) => setNegPrompt(e.target.value)}
                placeholder="What to avoid — blur, distortion, watermark, flickering, morphing faces..."
                rows={2}
                className="w-full resize-none outline-none"
                style={{
                  fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff",
                  background: "rgba(255,68,85,0.03)", border: "1px solid rgba(255,68,85,0.15)",
                  padding: "8px 12px", lineHeight: 1.6, caretColor: "#ff4455", transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,68,85,0.45)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,68,85,0.15)")}
              />
            </div>
            <div className="mt-3">
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.54rem", color: "#7ab8d0", letterSpacing: "0.14em", marginBottom: 8 }}>MOTION PRESETS</p>
              <div className="flex flex-wrap gap-2">
                {MOTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setSelectedPreset(preset); setMotionPrompt(preset.toLowerCase()); }}
                    className="px-2.5 py-1"
                    style={{
                      fontFamily: "Share Tech Mono, monospace", fontSize: "0.53rem",
                      color: selectedPreset === preset ? "#0066ff" : "#7ab8d0",
                      background: selectedPreset === preset ? "rgba(0,102,255,0.12)" : "rgba(0,102,255,0.04)",
                      border: `1px solid ${selectedPreset === preset ? "rgba(0,102,255,0.5)" : "rgba(0,102,255,0.15)"}`,
                      cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { if (selectedPreset !== preset) { e.currentTarget.style.borderColor = "rgba(0,102,255,0.4)"; e.currentTarget.style.color = "#0066ff"; } }}
                    onMouseLeave={(e) => { if (selectedPreset !== preset) { e.currentTarget.style.borderColor = "rgba(0,102,255,0.15)"; e.currentTarget.style.color = "#7ab8d0"; } }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Error state */}
          <AnimatePresence>
            {isError && (
              <motion.div className="p-5" style={{ border: "1px solid rgba(255,68,85,0.4)", background: "rgba(255,68,85,0.06)" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "#ff4455", boxShadow: "0 0 8px #ff4455" }} />
                  <div>
                    <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", color: "#ff4455", letterSpacing: "0.08em" }}>SYNTHESIS FAILED</p>
                    <p className="mt-1" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0", lineHeight: 1.5 }}>{gen.error ?? "Unknown error"}</p>
                    <motion.button onClick={handleGenerate} className="mt-3 px-4 py-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#0066ff", border: "1px solid rgba(0,102,255,0.4)", background: "rgba(0,102,255,0.08)", cursor: "pointer", letterSpacing: "0.1em" }} whileHover={{ scale: 1.03 } as any}>
                      RETRY
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Output area */}
          <VideoOutputArea
            phase={phase}
            progress={progressPct}
            videoSrc={uploadedImg ?? ""}
            duration={duration}
            resultUrl={gen.resultUrl ?? undefined}
          />
        </div>

        {/* Right: settings */}
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          {/* Generate button */}
          <motion.button
            onClick={handleGenerate}
            disabled={isActive || !uploadedFile}
            className="relative w-full py-4 overflow-hidden"
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em",
              color: isActive || !uploadedFile ? "#7ab8d0" : "#ffffff",
              background: isActive || !uploadedFile ? "rgba(0,102,255,0.1)" : "linear-gradient(135deg, #0066ff, #00f5ff)",
              border: isActive || !uploadedFile ? "1px solid rgba(0,102,255,0.3)" : "none",
              cursor: isActive || !uploadedFile ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              boxShadow: !isActive && uploadedFile ? "0 0 40px rgba(0,102,255,0.35)" : "none",
            }}
            whileHover={!isActive && uploadedFile ? { scale: 1.02, boxShadow: "0 0 60px rgba(0,102,255,0.5)" } as any : {}}
            whileTap={!isActive && uploadedFile ? { scale: 0.97 } as any : {}}
          >
            {isActive ? "SYNTHESIZING…" : gen.status === "done" ? "REGENERATE" : "GENERATE VIDEO"}
            {!isActive && (
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.18), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
            )}
          </motion.button>

          {/* Duration selector */}
          <div className="p-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,102,255,0.15)", backdropFilter: "blur(12px)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#0066ff", letterSpacing: "0.2em", display: "block", marginBottom: 12 }}>VIDEO DURATION</span>
            <div className="flex gap-3">
              {DURATION_OPTS.map((opt) => (
                <motion.button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className="flex-1 py-3 flex flex-col items-center gap-1"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    border: `1px solid ${duration === opt.value ? "#0066ff" : "rgba(0,102,255,0.2)"}`,
                    background: duration === opt.value ? "rgba(0,102,255,0.15)" : "rgba(0,102,255,0.04)",
                    cursor: "pointer",
                    boxShadow: duration === opt.value ? "0 0 16px rgba(0,102,255,0.2)" : "none",
                  }}
                  whileHover={{ borderColor: "#0066ff60" } as any}
                >
                  <span style={{ fontSize: "1rem", color: duration === opt.value ? "#0066ff" : "#e0f7ff", fontWeight: 700 }}>{opt.label}</span>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0", letterSpacing: "0.08em" }}>{opt.desc}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Video settings */}
          <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,102,255,0.15)", backdropFilter: "blur(12px)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#0066ff", letterSpacing: "0.2em" }}>VIDEO SETTINGS</span>

            <div>
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.14em", display: "block", marginBottom: 6 }}>FRAME RATE</label>
              <div className="flex gap-2">
                {["12fps", "24fps", "30fps", "60fps"].map((fps) => (
                  <button key={fps} className="flex-1 py-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", letterSpacing: "0.06em", color: fps === "24fps" ? "#0a0a0f" : "#7ab8d0", background: fps === "24fps" ? "#0066ff" : "rgba(0,102,255,0.05)", border: `1px solid ${fps === "24fps" ? "#0066ff" : "rgba(0,102,255,0.2)"}`, cursor: "pointer" }}>{fps}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.14em", display: "block", marginBottom: 6 }}>OUTPUT RESOLUTION</label>
              <div className="flex gap-2">
                {["720p", "1080p", "4K"].map((res) => (
                  <button key={res} className="flex-1 py-1.5" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.58rem", color: res === "1080p" ? "#0a0a0f" : "#7ab8d0", background: res === "1080p" ? "#0066ff" : "rgba(0,102,255,0.05)", border: `1px solid ${res === "1080p" ? "#0066ff" : "rgba(0,102,255,0.2)"}`, cursor: "pointer" }}>{res}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.14em" }}>MOTION INTENSITY</label>
                <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", color: "#0066ff" }}>65%</span>
              </div>
              <div className="relative h-1.5" style={{ background: "rgba(0,102,255,0.1)" }}>
                <div className="absolute top-0 left-0 h-full" style={{ width: "65%", background: "linear-gradient(90deg, #0066ff, #00f5ff)" }} />
                <input type="range" min={0} max={100} defaultValue={65} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.46rem", color: "#7ab8d0", opacity: 0.5 }}>SUBTLE</span>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.46rem", color: "#7ab8d0", opacity: 0.5 }}>EXTREME</span>
              </div>
            </div>

            {[
              { label: "LOOP SEAMLESSLY", active: true },
              { label: "STABILIZE OUTPUT", active: true },
            ].map((toggle) => (
              <div key={toggle.label} className="flex items-center justify-between">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#7ab8d0", letterSpacing: "0.1em" }}>{toggle.label}</span>
                <div className="relative w-8 h-4" style={{ background: toggle.active ? "rgba(0,102,255,0.4)" : "rgba(0,245,255,0.08)", border: `1px solid ${toggle.active ? "#0066ff" : "rgba(0,245,255,0.15)"}`, cursor: "pointer" }}>
                  <div className="absolute top-0.5 h-3 w-3" style={{ left: toggle.active ? "calc(100% - 14px)" : "2px", background: toggle.active ? "#0066ff" : "#7ab8d0", transition: "left 0.2s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Model info */}
          <div className="p-3" style={{ background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.2)" }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#0066ff", letterSpacing: "0.12em" }}>ACTIVE MODEL</p>
            <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>WAN 2.2 · Image-to-Video</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0066ff" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0" }}>VIDEO DIFFUSION · LOCAL GPU</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
