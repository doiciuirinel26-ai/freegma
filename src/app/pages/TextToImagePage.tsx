import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Maximize2, X, ChevronDown } from "lucide-react";
import { PageHoloCard } from "../components/PageHoloCard";
import { SpinningGenerationCard } from "../components/SpinningGenerationCard";
import { useGeneration } from "../../hooks/useGeneration";
import imgNeuralVision from "../../imports/result__7_.png";

const STYLE_PRESETS = ["Photorealistic", "Cyberpunk", "Anime", "Oil Painting", "Watercolor", "Neon Noir", "Concept Art", "Pixel Art"];
const RESOLUTIONS = ["512×512", "768×768", "1024×1024", "1024×576", "576×1024", "1536×1024"];
const STEP_OPTIONS = [20, 30, 40, 50, 75, 100];

function SelectField({ label, value, options, onChange, color = "#00f5ff" }: {
  label: string; value: string | number; options: (string | number)[]; onChange: (v: string) => void; color?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 6 }}>{label}</label>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: "#e0f7ff", background: "rgba(0,20,40,0.6)", border: `1px solid ${color}30`, cursor: "pointer", letterSpacing: "0.08em" }}>
        {value}
        <ChevronDown size={12} color={color} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden"
            style={{ background: "rgba(8,10,18,0.97)", border: `1px solid ${color}30`, backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(String(opt)); setOpen(false); }} className="w-full text-left px-3 py-2 block"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", color: String(opt) === String(value) ? color : "#7ab8d0", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", borderLeft: String(opt) === String(value) ? `2px solid ${color}` : "2px solid transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${color}10`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FullscreenModal({ imgUrl, prompt, onClose }: { imgUrl: string; prompt: string; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="relative max-w-3xl w-full"
        style={{ border: "1px solid rgba(0,245,255,0.25)", boxShadow: "0 0 60px rgba(0,245,255,0.15)" }}
        initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <motion.div className="absolute left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #00f5ff60, transparent)" }} animate={{ top: ["0%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
        </div>
        <img src={imgUrl} alt={prompt} className="w-full object-cover" style={{ display: "block", maxHeight: "72vh", objectFit: "contain", background: "#000" }} />
        <div className="p-4 flex items-center justify-between" style={{ background: "rgba(0,10,20,0.9)", borderTop: "1px solid rgba(0,245,255,0.15)" }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff" }}>{prompt || "Generated Image"}</p>
          <div className="flex items-center gap-2">
            <motion.a href={imgUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 no-underline"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", letterSpacing: "0.12em", color: "#0a0a0f", background: "linear-gradient(135deg, #00f5ff, #0066ff)" }}
              whileHover={{ scale: 1.04 } as any}>
              <Download size={12} /> DOWNLOAD
            </motion.a>
            <motion.button onClick={onClose} className="p-2" style={{ background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,50,50,0.3)", cursor: "pointer" }} whileHover={{ scale: 1.05 } as any}>
              <X size={14} color="#ff4455" />
            </motion.button>
          </div>
        </div>
        {[{ top: -1, left: -1 }, { top: -1, right: -1 }, { bottom: -1, right: -1 }, { bottom: -1, left: -1 }].map((pos, i) => (
          <div key={i} className="absolute w-6 h-6" style={{ ...pos, borderColor: "#00f5ff", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i === 0 || i === 1) ? 2 : 0, borderBottomWidth: (i === 2 || i === 3) ? 2 : 0, borderLeftWidth: (i === 0 || i === 3) ? 2 : 0, borderRightWidth: (i === 1 || i === 2) ? 2 : 0 }} />
        ))}
      </motion.div>
    </motion.div>
  );
}

export function TextToImagePage() {
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [style, setStyle] = useState("Cyberpunk");
  const [resolution, setResolution] = useState("1024×1024");
  const [steps, setSteps] = useState("40");
  const [guidance, setGuidance] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const gen = useGeneration();
  const isActive = ["uploading", "queued", "running"].includes(gen.status);

  const handleGenerate = () => {
    if (!prompt.trim()) { promptRef.current?.focus(); return; }
    gen.submit({
      mode: "text-to-image",
      prompt,
      negPrompt,
      model: "sdxl",
      steps: parseInt(steps),
      cfg: guidance,
      resolution,
      seed,
    });
  };

  const resultArea = () => {
    if (isActive) {
      return (
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-center overflow-hidden" style={{ border: "1px solid rgba(0,245,255,0.18)", background: "rgba(0,8,18,0.7)", backdropFilter: "blur(8px)", minHeight: 460 }}>
            <SpinningGenerationCard imageSrc={imgNeuralVision} accentColor="#00f5ff" label="GENERATING..." isSpinning={isActive} onHidden={() => {}} />
          </div>
          {/* Progress */}
          <div className="p-4" style={{ border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00f5ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.4, repeat: Infinity }} />
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00f5ff", letterSpacing: "0.18em" }}>
                  {gen.status === "uploading" ? "UPLOADING…" : gen.status === "queued" ? "QUEUED…" : "RENDERING PIXELS…"}
                </span>
              </div>
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: "#00f5ff" }}>{Math.round(gen.progress * 100)}%</span>
            </div>
            <div className="relative h-1" style={{ background: "rgba(0,245,255,0.1)" }}>
              <motion.div className="absolute top-0 left-0 h-full" style={{ background: "linear-gradient(90deg, #0066ff, #00f5ff)", boxShadow: "0 0 8px #00f5ff80" }} animate={{ width: `${gen.progress * 100}%` }} transition={{ duration: 0.15 }} />
            </div>
          </div>
        </motion.div>
      );
    }

    if (gen.status === "done" && gen.resultUrl) {
      return (
        <motion.div className="flex flex-col gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#00f5ff", letterSpacing: "0.2em" }}>GENERATED OUTPUT</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,245,255,0.3), transparent)" }} />
          </div>
          <motion.div className="relative group" style={{ border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,10,20,0.6)" }}
            whileHover={{ borderColor: "rgba(0,245,255,0.5)", boxShadow: "0 0 30px rgba(0,245,255,0.15)" } as any}>
            <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
              <img src={gen.resultUrl} alt="Generated" className="w-full h-full object-contain" style={{ display: "block" }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, rgba(0,245,255,0.03) 0px, transparent 2px, transparent 4px)" }} />
              {[{ top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, right: 4 }, { bottom: 4, left: 4 }].map((pos, i) => (
                <div key={i} className="absolute w-4 h-4" style={{ ...pos, borderColor: "#00f5ff", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i === 0 || i === 1) ? 1.5 : 0, borderBottomWidth: (i === 2 || i === 3) ? 1.5 : 0, borderLeftWidth: (i === 0 || i === 3) ? 1.5 : 0, borderRightWidth: (i === 1 || i === 2) ? 1.5 : 0 }} />
              ))}
              <motion.div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100" transition={{ duration: 0.2 }}>
                <motion.button onClick={() => setFullscreen(true)} className="p-2.5" style={{ background: "rgba(0,245,255,0.15)", border: "1px solid rgba(0,245,255,0.4)", cursor: "pointer" }} whileHover={{ scale: 1.1 } as any}>
                  <Maximize2 size={14} color="#00f5ff" />
                </motion.button>
                <motion.a href={gen.resultUrl} target="_blank" rel="noopener noreferrer" className="p-2.5" style={{ background: "rgba(0,245,255,0.15)", border: "1px solid rgba(0,245,255,0.4)", display: "flex" }} whileHover={{ scale: 1.1 } as any}>
                  <Download size={14} color="#00f5ff" />
                </motion.a>
              </motion.div>
            </div>
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(0,245,255,0.1)" }}>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.85rem", color: "#e0f7ff" }}>{prompt}</p>
            </div>
          </motion.div>
          <motion.a
            href={gen.resultUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            download="generated.png"
            className="flex items-center justify-center gap-3 py-4 relative overflow-hidden no-underline w-full"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", color: "#0a0a0f", background: "linear-gradient(135deg, #0066ff, #00f5ff)", textTransform: "uppercase" }}
            animate={{ boxShadow: ["0 0 20px rgba(0,102,255,0.5)", "0 0 50px rgba(0,245,255,0.75)", "0 0 20px rgba(0,102,255,0.5)"] }}
            transition={{ boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
            whileHover={{ scale: 1.02 } as any}
            whileTap={{ scale: 0.97 } as any}
          >
            <Download size={16} />
            DOWNLOAD IMAGE
            <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.25), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
          </motion.a>
          <motion.button onClick={gen.reset} className="w-full py-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.15em", color: "#7ab8d0", background: "transparent", border: "1px solid rgba(0,245,255,0.15)", cursor: "pointer" }} whileHover={{ borderColor: "rgba(0,245,255,0.4)", color: "#00f5ff" } as any}>
            ↺ GENERATE ANOTHER
          </motion.button>
        </motion.div>
      );
    }

    if (gen.status === "error") {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="p-5" style={{ border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)" }}>
            <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem", color: "#ff4455", letterSpacing: "0.12em", marginBottom: 8 }}>GENERATION ERROR</p>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.95rem", color: "#7ab8d0", marginBottom: 12 }}>{gen.error}</p>
            <motion.button onClick={gen.reset} className="px-4 py-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.12em", color: "#ff4455", border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)", cursor: "pointer" }} whileHover={{ scale: 1.03 } as any}>
              ↺ RETRY
            </motion.button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div className="flex items-center justify-center py-8"
        style={{ border: "1px solid rgba(0,245,255,0.1)", background: "rgba(0,8,18,0.55)", backdropFilter: "blur(8px)", minHeight: 420 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <PageHoloCard imageSrc={imgNeuralVision} label="Text to Image" subtitle="Neural Vision" accentColor="#00f5ff" />
      </motion.div>
    );
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: "linear-gradient(180deg, transparent, #00f5ff, transparent)" }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#00f5ff", letterSpacing: "0.25em" }}>NEURAL VISION ENGINE · v4.2</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Text <span style={{ color: "#00f5ff" }}>→</span> Image
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>Describe your vision. The matrix renders it.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left */}
        <div className="flex flex-col gap-6">
          <motion.div className="relative p-5" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,245,255,0.15)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="absolute top-0 right-0 w-8 h-8" style={{ borderTop: "1px solid #00f5ff40", borderRight: "1px solid #00f5ff40" }} />
            <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00f5ff", letterSpacing: "0.2em", display: "block", marginBottom: 8 }}>PROMPT MATRIX</label>
            <div className="relative">
              <textarea ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your image in detail — style, subject, mood, lighting, composition..."
                rows={5} className="w-full resize-none outline-none"
                style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff", background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.12)", padding: "12px 14px", lineHeight: 1.6, caretColor: "#00f5ff" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.45)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.12)")}
              />
              <div className="absolute bottom-2 right-2" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", opacity: 0.6 }}>{prompt.length}/500</div>
            </div>
            <div className="mt-3">
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#ff4455", letterSpacing: "0.18em", display: "block", marginBottom: 6 }}>NEGATIVE PROMPT</label>
              <input value={negPrompt} onChange={(e) => setNegPrompt(e.target.value)}
                placeholder="blurry, distorted, low quality, watermark..."
                className="w-full outline-none"
                style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#e0f7ff", background: "rgba(255,68,85,0.04)", border: "1px solid rgba(255,68,85,0.15)", padding: "8px 12px" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,68,85,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,68,85,0.15)")}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["8K ultra detailed", "cinematic lighting", "ray tracing", "volumetric fog", "octane render"].map((tag) => (
                <button key={tag} onClick={() => setPrompt((p) => p ? `${p}, ${tag}` : tag)} className="px-2.5 py-1"
                  style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)", cursor: "pointer", letterSpacing: "0.08em" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.4)"; e.currentTarget.style.color = "#00f5ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.12)"; e.currentTarget.style.color = "#7ab8d0"; }}>
                  + {tag}
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={gen.status}>
              {resultArea()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: settings */}
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <motion.button onClick={handleGenerate} disabled={isActive} className="relative w-full py-4 overflow-hidden"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", color: isActive ? "#7ab8d0" : "#0a0a0f", background: isActive ? "rgba(0,245,255,0.1)" : "linear-gradient(135deg, #00f5ff, #0066ff)", border: isActive ? "1px solid rgba(0,245,255,0.3)" : "none", cursor: isActive ? "not-allowed" : "pointer", textTransform: "uppercase", boxShadow: isActive ? "none" : "0 0 40px rgba(0,245,255,0.35)" }}
            whileHover={!isActive ? { scale: 1.02, boxShadow: "0 0 60px rgba(0,245,255,0.5)" } as any : {}}
            whileTap={!isActive ? { scale: 0.97 } as any : {}}>
            {isActive ? "RENDERING…" : "GENERATE"}
            {!isActive && (
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            )}
          </motion.button>

          <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,245,255,0.12)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid rgba(0,245,255,0.08)" }}>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00f5ff", letterSpacing: "0.2em" }}>GENERATION SETTINGS</span>
            </div>
            <SelectField label="ART STYLE" value={style} options={STYLE_PRESETS} onChange={setStyle} color="#00f5ff" />
            <SelectField label="RESOLUTION" value={resolution} options={RESOLUTIONS} onChange={setResolution} color="#0066ff" />
            <SelectField label="INFERENCE STEPS" value={steps} options={STEP_OPTIONS} onChange={setSteps} color="#7000ff" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.18em" }}>GUIDANCE SCALE</label>
                <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: "#00f5ff" }}>{guidance.toFixed(1)}</span>
              </div>
              <div className="relative h-1.5" style={{ background: "rgba(0,245,255,0.1)" }}>
                <div className="absolute top-0 left-0 h-full" style={{ width: `${(guidance / 20) * 100}%`, background: "linear-gradient(90deg, #0066ff, #00f5ff)" }} />
                <input type="range" min={1} max={20} step={0.5} value={guidance} onChange={(e) => setGuidance(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: "100%" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0", opacity: 0.5 }}>CREATIVE</span>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0", opacity: 0.5 }}>PRECISE</span>
              </div>
            </div>
            <div>
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 6 }}>SEED</label>
              <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="w-full outline-none"
                style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.65rem", color: "#e0f7ff", background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)", padding: "7px 10px" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.12)")}
              />
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0", marginTop: 4, opacity: 0.6 }}>-1 = RANDOM SEED</p>
            </div>
          </div>

          <div className="p-3" style={{ background: "rgba(112,0,255,0.06)", border: "1px solid rgba(112,0,255,0.2)" }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7000ff", letterSpacing: "0.12em" }}>ACTIVE MODEL</p>
            <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>Freegma SDXL</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7000ff" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0" }}>LOCAL GPU · SDXL BACKBONE</span>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {fullscreen && gen.resultUrl && (
          <FullscreenModal imgUrl={gen.resultUrl} prompt={prompt} onClose={() => setFullscreen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
