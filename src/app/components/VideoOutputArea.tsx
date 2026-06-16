import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download } from "lucide-react";
import { PageHoloCard } from "./PageHoloCard";
import { SpinningGenerationCard } from "./SpinningGenerationCard";

import imgTextToImage from "../../imports/result__7_.png";
import imgImageTo3D from "../../imports/result__8_.png";
import imgImageToVideo from "../../imports/image_to_video.png";

type Phase = "idle" | "loading" | "complete";

interface VideoOutputAreaProps {
  phase: Phase;
  progress: number;
  videoSrc: string;
  duration: number;
  resultUrl?: string;
}

const CARDS = [
  { img: imgTextToImage, label: "Neural Vision", color: "#00f5ff" },
  { img: imgImageTo3D,   label: "Depth Engine",  color: "#7000ff" },
  { img: imgImageToVideo, label: "Motion Forge", color: "#0066ff" },
];

function MiniHoloCard({ img, label, color, phase, index }: { img: string; label: string; color: string; phase: Phase; index: number }) {
  const [scanY, setScanY] = useState(index * 33);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let y = index * 33;
    const tick = () => {
      y = (y + (phase === "loading" ? 1.8 : 0.35)) % 100;
      setScanY(y);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, index]);

  const spinVariants = {
    idle: { rotate: 0, scale: 1, y: 0 },
    loading: { rotate: [0, 360], scale: [1, 1.08, 1], y: [0, -6, 0] },
    complete: { x: [(index - 1) * 0, (index - 1) * 280], y: [0, (index === 1 ? -220 : -120)], scale: [1, 0.1], opacity: [1, 0] },
  };
  const spinTransition: Record<Phase, object> = {
    idle: { type: "tween", duration: 0 },
    loading: { rotate: { duration: 1.2 - index * 0.12, repeat: Infinity, ease: "linear" }, scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.15 }, y: { duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 } },
    complete: { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: index * 0.06 },
  };

  return (
    <motion.div
      className="relative flex-shrink-0"
      animate={phase === "idle" ? { y: [0, -12, 0] } : spinVariants[phase] as any}
      transition={phase === "idle" ? { duration: 3.5 + index * 0.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.55 } : spinTransition[phase]}
      style={{ transformOrigin: "center center" }}
    >
      <div className="relative overflow-hidden" style={{ width: 130, height: 178, boxShadow: phase === "loading" ? `0 0 35px ${color}70, 0 0 70px ${color}30` : `0 0 18px ${color}35`, transition: "box-shadow 0.4s", border: `1px solid ${color}${phase === "loading" ? "80" : "30"}` }}>
        <img src={img} alt={label} className="w-full h-full object-cover object-top" style={{ filter: phase === "loading" ? "brightness(1.3) saturate(1.6) contrast(1.1)" : "brightness(0.82) saturate(1.05)", transition: "filter 0.3s" }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${color}00 35%, ${color}40 100%)`, mixBlendMode: "screen", opacity: phase === "loading" ? 0.95 : 0.6, transition: "opacity 0.3s" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `repeating-linear-gradient(0deg, ${color}0c 0px, transparent 1px, transparent 4px)` }} />
        <div className="absolute left-0 right-0 h-px pointer-events-none" style={{ top: `${scanY}%`, background: `linear-gradient(90deg, transparent, ${color}cc, transparent)`, boxShadow: `0 0 6px ${color}`, opacity: phase === "loading" ? 1 : 0.5 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(170deg, #ff000009 0%, transparent 50%, #00ffff07 100%)", transform: "translateX(-1px)", mixBlendMode: "screen" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(170deg, #00ffff09 0%, transparent 50%, #ff000007 100%)", transform: "translateX(1px)", mixBlendMode: "screen" }} />
        {[{ t: 4, l: 4 }, { t: 4, r: 4 }, { b: 4, r: 4 }, { b: 4, l: 4 }].map((pos, i) => (
          <div key={i} className="absolute w-3.5 h-3.5" style={{
            top: "t" in pos ? pos.t : undefined, bottom: "b" in pos ? pos.b : undefined,
            left: "l" in pos ? pos.l : undefined, right: "r" in pos ? pos.r : undefined,
            borderColor: color, borderStyle: "solid", borderWidth: 0,
            borderTopWidth: (i === 0 || i === 1) ? 1.5 : 0, borderBottomWidth: (i === 2 || i === 3) ? 1.5 : 0,
            borderLeftWidth: (i === 0 || i === 3) ? 1.5 : 0, borderRightWidth: (i === 1 || i === 2) ? 1.5 : 0,
            opacity: phase === "loading" ? 1 : 0.45, transition: "opacity 0.3s",
          }} />
        ))}
        {phase === "loading" && (
          <motion.div className="absolute inset-0" style={{ border: `2px solid ${color}`, boxShadow: `inset 0 0 20px ${color}30` }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.55, repeat: Infinity, delay: index * 0.18 }} />
        )}
      </div>
      <p className="text-center mt-2" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", letterSpacing: "0.18em", color, textShadow: `0 0 ${phase === "loading" ? 14 : 7}px ${color}`, transition: "text-shadow 0.3s" }}>{label}</p>
    </motion.div>
  );
}

function ParticleBurst({ active }: { active: boolean }) {
  const particles = useRef(Array.from({ length: 48 }, (_, i) => ({
    id: i, angle: (i / 48) * Math.PI * 2, distance: 80 + Math.random() * 140,
    size: 1.5 + Math.random() * 3,
    color: ["#00f5ff", "#7000ff", "#0066ff", "#ffffff", "#ff44ff"][Math.floor(Math.random() * 5)],
    duration: 0.5 + Math.random() * 0.5,
  }))).current;

  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 20 }}>
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full" style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 6px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(p.angle) * p.distance, y: Math.sin(p.angle) * p.distance, opacity: 0, scale: 0.2 }}
          transition={{ duration: p.duration, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function HoloVideoPlayer({ videoSrc, resultUrl }: { videoSrc: string; resultUrl?: string; duration: number }) {
  return (
    <div className="relative" style={{ border: "1px solid rgba(0,102,255,0.4)", boxShadow: "0 0 40px rgba(0,102,255,0.2)" }}>
      <div className="absolute top-0 left-0 right-0 h-px z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, #0066ff80, #00f5ff80, transparent)" }} />

      <div className="relative overflow-hidden" style={{ background: "#000" }}>
        <video
          src={resultUrl}
          poster={videoSrc}
          autoPlay
          loop
          controls
          style={{ width: "100%", display: "block", maxHeight: 480 }}
        />
        {/* Corner brackets */}
        {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, right: 8 }, { bottom: 8, left: 8 }].map((pos, i) => (
          <div key={i} className="absolute w-6 h-6 pointer-events-none z-10" style={{ ...pos, borderColor: "rgba(0,102,255,0.7)", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i === 0 || i === 1) ? 1.5 : 0, borderBottomWidth: (i === 2 || i === 3) ? 1.5 : 0, borderLeftWidth: (i === 0 || i === 3) ? 1.5 : 0, borderRightWidth: (i === 1 || i === 2) ? 1.5 : 0 }} />
        ))}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00f5ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#00f5ff", letterSpacing: "0.12em" }}>READY</span>
        </div>
      </div>
    </div>
  );
}

export function VideoOutputArea({ phase, progress, videoSrc, duration, resultUrl }: VideoOutputAreaProps) {
  const [burstActive, setBurstActive] = useState(false);
  const prevPhase = useRef<Phase>("idle");

  useEffect(() => {
    if (prevPhase.current === "loading" && phase === "complete") {
      setBurstActive(true);
      setTimeout(() => setBurstActive(false), 900);
    }
    prevPhase.current = phase;
  }, [phase]);

  const statusLabels: Record<string, string> = {
    idle: "AWAITING VIDEO GENERATION",
    loading: "NEURAL SYNTHESIS IN PROGRESS...",
    complete: "GENERATION COMPLETE · MP4 READY",
  };

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: phase === "complete" ? "#00f5ff" : phase === "loading" ? "#0066ff" : "#7ab8d0" }} animate={{ opacity: phase === "loading" ? [1, 0.2, 1] : 1 }} transition={{ duration: 0.5, repeat: Infinity }} />
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: phase === "complete" ? "#00f5ff" : phase === "loading" ? "#0066ff" : "#7ab8d0", letterSpacing: "0.18em" }}>{statusLabels[phase]}</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,102,255,0.3), transparent)" }} />
      </div>

      <div className="relative overflow-hidden" style={{
        border: `1px solid ${phase === "loading" ? "rgba(0,102,255,0.45)" : phase === "complete" ? "rgba(0,245,255,0.3)" : "rgba(0,102,255,0.12)"}`,
        background: "rgba(0,8,18,0.7)", minHeight: 460, backdropFilter: "blur(8px)",
        boxShadow: phase === "loading" ? "0 0 40px rgba(0,102,255,0.2), inset 0 0 40px rgba(0,102,255,0.05)" : phase === "complete" ? "0 0 40px rgba(0,245,255,0.15)" : "none",
        transition: "box-shadow 0.5s, border-color 0.5s",
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(0,102,255,${phase === "loading" ? "0.06" : "0.025"}) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,${phase === "loading" ? "0.06" : "0.025"}) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />

        <AnimatePresence>
          {phase === "idle" && (
            <motion.div className="absolute inset-0 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <PageHoloCard imageSrc={imgImageToVideo} label="Image to Video" subtitle="Motion Forge" accentColor="#0066ff" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "loading" && (
            <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <SpinningGenerationCard imageSrc={imgImageToVideo} accentColor="#0066ff" label="SYNTHESIZING..." isSpinning={phase === "loading"} onHidden={() => {}} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "complete" && (
            <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative flex items-end gap-6">
                  {CARDS.map((c, i) => <MiniHoloCard key={c.label} img={c.img} label={c.label} color={c.color} phase="complete" index={i} />)}
                </div>
              </div>
              <ParticleBurst active={burstActive} />
              <motion.div className="w-full" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <HoloVideoPlayer videoSrc={videoSrc} resultUrl={resultUrl} duration={duration} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
          <div key={i} className="absolute w-5 h-5 pointer-events-none z-20" style={{ ...pos, borderColor: phase === "loading" ? "#0066ff" : phase === "complete" ? "#00f5ff" : "rgba(0,102,255,0.35)", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i === 0 || i === 1) ? 1.5 : 0, borderBottomWidth: (i === 2 || i === 3) ? 1.5 : 0, borderLeftWidth: (i === 0 || i === 3) ? 1.5 : 0, borderRightWidth: (i === 1 || i === 2) ? 1.5 : 0, opacity: phase === "idle" ? 0.35 : 0.75, transition: "border-color 0.4s, opacity 0.4s" }} />
        ))}
      </div>

      <AnimatePresence>
        {phase === "loading" && (
          <motion.div className="p-4" style={{ border: "1px solid rgba(0,102,255,0.3)", background: "rgba(0,102,255,0.05)" }} initial={{ opacity: 0, height: 0, overflow: "hidden" }} animate={{ opacity: 1, height: "auto", overflow: "visible" }} exit={{ opacity: 0, height: 0, overflow: "hidden" }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0066ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.4, repeat: Infinity }} />
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#0066ff", letterSpacing: "0.18em" }}>
                  {progress < 20 ? "ANALYZING OPTICAL FLOW…" : progress < 45 ? "PREDICTING MOTION VECTORS…" : progress < 72 ? "RENDERING FRAMES…" : "ENCODING MP4…"}
                </span>
              </div>
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", color: "#0066ff" }}>{Math.round(progress)}%</span>
            </div>
            <div className="relative h-1" style={{ background: "rgba(0,102,255,0.12)" }}>
              <motion.div className="absolute top-0 left-0 h-full" style={{ background: "linear-gradient(90deg, #0066ff, #00f5ff)", boxShadow: "0 0 8px #0066ff80" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.12 }} />
              <motion.div className="absolute top-0 h-full w-16" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} animate={{ x: [`-64px`, `${progress * 4}px`] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "complete" && (
          <motion.a
            href={resultUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 flex items-center justify-center gap-3 relative overflow-hidden no-underline"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", color: "#0a0a0f", background: "linear-gradient(135deg, #0066ff, #00f5ff)", textTransform: "uppercase" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, boxShadow: ["0 0 20px rgba(0,102,255,0.5)", "0 0 50px rgba(0,245,255,0.75)", "0 0 20px rgba(0,102,255,0.5)"] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.7, boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 } }}
            whileHover={{ scale: 1.02 } as any}
            whileTap={{ scale: 0.97 } as any}
          >
            <Download size={14} />
            DOWNLOAD MP4
            <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
