import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { HoloCharacterCard } from "../components/HoloCharacterCard";
import { apiHealth } from "../../api/client";

import imgTextToImage from "../../imports/result__7_.png";
import imgImageTo3D from "../../imports/result__8_.png";
import imgImageToVideo from "../../imports/image_to_video.png";
import imgAdsStudio from "../../imports/ads_studio.png";

const TOOLS = [
  { img: imgTextToImage,  name: "Text to Image",  subtitle: "Neural Vision", color: "#00f5ff", path: "/text-to-image" },
  { img: imgImageTo3D,    name: "Image to 3D",    subtitle: "Depth Engine",  color: "#7000ff", path: "/image-to-3d" },
  { img: imgImageToVideo, name: "Image to Video", subtitle: "Motion Forge",  color: "#0066ff", path: "/image-to-video" },
  { img: imgImageToVideo, name: "Lip Sync",       subtitle: "Voice Engine",  color: "#ff4400", path: "/lip-sync" },
  { img: imgAdsStudio,    name: "Ads Studio",     subtitle: "Ad Engine",     color: "#ff9500", path: "/ads-studio" },
];

type GpuStatus = "checking" | "online" | "offline";

export function LandingPage() {
  const navigate = useNavigate();
  const [glitchActive, setGlitchActive] = useState(false);
  const [gpuStatus, setGpuStatus] = useState<GpuStatus>("checking");
  const [queueSize, setQueueSize] = useState(0);
  const [activeJobs, setActiveJobs] = useState(0);

  const checkHealth = useCallback(async () => {
    const data = await apiHealth();
    if (data && data.status === "online") {
      setGpuStatus("online");
      setQueueSize(data.queue ?? 0);
      setActiveJobs(data.jobs ?? 0);
    } else {
      setGpuStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const poll = setInterval(checkHealth, 30_000);
    return () => clearInterval(poll);
  }, [checkHealth]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[calc(100vh-56px)] flex flex-col items-center justify-center text-center px-6 pt-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1 }} className="relative z-10 max-w-4xl">
          {/* GPU Status badge */}
          <motion.div
            className="inline-flex items-center gap-3 mb-8 px-5 py-2"
            style={{
              border: `1px solid ${gpuStatus === "online" ? "rgba(0,255,100,0.3)" : gpuStatus === "offline" ? "rgba(255,50,50,0.35)" : "rgba(0,245,255,0.2)"}`,
              background: gpuStatus === "online" ? "rgba(0,255,100,0.06)" : gpuStatus === "offline" ? "rgba(255,50,50,0.07)" : "rgba(0,245,255,0.05)",
              transition: "border-color 0.5s, background 0.5s",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Dot */}
            {gpuStatus === "checking" ? (
              <motion.div className="w-2 h-2 rounded-full" style={{ background: "#00f5ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            ) : gpuStatus === "online" ? (
              <motion.div className="w-2 h-2 rounded-full" style={{ background: "#00ff64", boxShadow: "0 0 8px #00ff64" }} animate={{ opacity: [1, 0.35, 1], boxShadow: ["0 0 6px #00ff64", "0 0 16px #00ff64", "0 0 6px #00ff64"] }} transition={{ duration: 1.8, repeat: Infinity }} />
            ) : (
              <motion.div className="w-2 h-2 rounded-full" style={{ background: "#ff4455", boxShadow: "0 0 8px #ff4455" }} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            )}

            {/* Text */}
            <span style={{
              fontFamily: "Share Tech Mono, monospace",
              fontSize: "0.68rem",
              letterSpacing: "0.18em",
              color: gpuStatus === "online" ? "#00ff64" : gpuStatus === "offline" ? "#ff4455" : "#00f5ff",
              transition: "color 0.5s",
            }}>
              {gpuStatus === "checking" && "GPU · CHECKING…"}
              {gpuStatus === "online" && (
                activeJobs > 0
                  ? `GPU · ONLINE · ${activeJobs} JOB RUNNING`
                  : queueSize > 0
                    ? `GPU · ONLINE · ${queueSize} IN QUEUE`
                    : "GPU · ONLINE · READY"
              )}
              {gpuStatus === "offline" && "GPU · OFFLINE · SERVER DOWN"}
            </span>

            {/* Separator + refresh dot when offline */}
            {gpuStatus === "offline" && (
              <button
                onClick={checkHealth}
                style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#ff4455", background: "none", border: "1px solid rgba(255,68,85,0.3)", padding: "2px 6px", cursor: "pointer", letterSpacing: "0.1em" }}
              >RETRY</button>
            )}
          </motion.div>

          <h1 className="relative mb-6" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            <span className="block" style={{
              background: "linear-gradient(135deg, #ffffff 0%, #e0f7ff 40%, #00f5ff 70%, #7000ff 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: glitchActive ? "blur(1px)" : "none",
              transform: glitchActive ? "translateX(2px)" : "none",
              transition: "filter 0.05s, transform 0.05s",
            }}>CREATE WITH</span>
            <span className="block" style={{
              background: "linear-gradient(135deg, #00f5ff 0%, #0066ff 50%, #7000ff 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: glitchActive ? "blur(0.5px)" : "none",
              transform: glitchActive ? "translateX(-2px)" : "none",
              transition: "filter 0.05s, transform 0.05s",
            }}>HOLOGRAPHIC AI</span>
          </h1>

          <p className="max-w-xl mx-auto mb-10" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1.1rem", color: "#7ab8d0", lineHeight: 1.7, letterSpacing: "0.03em" }}>
            Transform concepts into reality with Freegma's neural generation suite.
            Text to image, image to 3D, image to video, lip sync — powered by local AI.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <motion.button onClick={() => navigate("/text-to-image")} className="px-8 py-3 relative overflow-hidden"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#0a0a0f", background: "linear-gradient(135deg, #00f5ff, #0066ff)", border: "none", cursor: "pointer", textTransform: "uppercase", boxShadow: "0 0 30px rgba(0,245,255,0.3)" }}
              whileHover={{ scale: 1.04, boxShadow: "0 0 50px rgba(0,245,255,0.5)" } as any}
              whileTap={{ scale: 0.97 } as any}
            >
              Start Creating Free
            </motion.button>
            <motion.button className="px-8 py-3"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#7ab8d0", background: "transparent", border: "1px solid rgba(0,245,255,0.2)", cursor: "pointer", textTransform: "uppercase" }}
              whileHover={{ scale: 1.04, borderColor: "rgba(0,245,255,0.5)" } as any}
              whileTap={{ scale: 0.97 } as any}
            >
              View Gallery
            </motion.button>
          </div>

          <motion.div className="flex items-center justify-center gap-12 mt-14 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}>
            {[{ value: "2.4M+", label: "Generations" }, { value: "98ms", label: "Avg Latency" }, { value: "47K+", label: "Creators" }].map((s) => (
              <div key={s.label} className="text-center">
                <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.6rem", fontWeight: 700, color: "#00f5ff", textShadow: "0 0 20px rgba(0,245,255,0.5)" }}>{s.value}</div>
                <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7ab8d0", letterSpacing: "0.2em", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.2em" }}>SCROLL</span>
          <svg width="12" height="20" viewBox="0 0 12 20">
            <rect x="3" y="3" width="6" height="12" rx="3" fill="none" stroke="#00f5ff" strokeWidth="1" opacity="0.5" />
            <motion.circle cx="6" cy="7" r="1.5" fill="#00f5ff" animate={{ cy: [7, 11, 7] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </svg>
        </motion.div>
      </section>

      {/* Tools */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(90deg, transparent, #00f5ff40)" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#00f5ff", letterSpacing: "0.3em" }}>NEURAL TOOLS</span>
              <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(90deg, #00f5ff40, transparent)" }} />
            </div>
            <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 4vw, 2.6rem)", fontWeight: 700, background: "linear-gradient(135deg, #ffffff, #00f5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Choose Your Creation Mode
            </h2>
            <p className="mt-3 max-w-lg mx-auto" style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "1rem", lineHeight: 1.7 }}>
              Four powerful AI pipelines projecting holographic interfaces through the Freegma matrix.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-end justify-center gap-8 lg:gap-12">
            {TOOLS.map((tool, i) => (
              <HoloCharacterCard
                key={tool.path}
                imageSrc={tool.img}
                toolName={tool.name}
                toolSubtitle={tool.subtitle}
                accentColor={tool.color}
                index={i}
                onClick={() => navigate(tool.path)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7000ff", letterSpacing: "0.3em" }}>SYSTEM SPECS</span>
            <h2 className="mt-3" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)", fontWeight: 700, color: "#e0f7ff" }}>Built for Creators</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { title: "Neural Rendering Core", desc: "SDXL, WAN 2.2, TripoSR, InstantMesh and more — running locally on your GPU with zero cloud dependency.", icon: "⬡", color: "#00f5ff" },
              { title: "Adaptive Style Matrix", desc: "600+ style presets trained on curated datasets. Fine-tune with reference images in real time.", icon: "◈", color: "#0066ff" },
              { title: "3D & Lip Sync Pipeline", desc: "Convert any image to a 3D model or animate an avatar with voice synthesis using Kokoro TTS or Edge.", icon: "◇", color: "#7000ff" },
              { title: "Local-First Privacy", desc: "Everything runs on your machine. No data leaves your system. Full control, zero tracking.", icon: "⬙", color: "#ff4400" },
            ].map((f, i) => (
              <motion.div key={f.title} className="relative p-6" style={{ background: "rgba(0,20,40,0.4)", border: `1px solid ${f.color}20`, backdropFilter: "blur(8px)" }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ borderColor: `${f.color}50` } as any}
              >
                <div className="flex items-start gap-4">
                  <div style={{ color: f.color, textShadow: `0 0 15px ${f.color}`, fontSize: "1.5rem", marginTop: 2 }}>{f.icon}</div>
                  <div>
                    <h3 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "#e0f7ff", letterSpacing: "0.05em" }}>{f.title}</h3>
                    <p className="mt-2" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.95rem", color: "#7ab8d0", lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: `1px solid ${f.color}50`, borderRight: `1px solid ${f.color}50` }} />
                <div className="absolute bottom-0 left-0 w-7 h-7" style={{ borderBottom: `1px solid ${f.color}50`, borderLeft: `1px solid ${f.color}50` }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(112,0,255,0.12) 0%, transparent 60%)" }} />
        <motion.div className="relative z-10 max-w-2xl mx-auto" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, background: "linear-gradient(135deg, #00f5ff, #ffffff, #7000ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>
            Enter the Freegma Matrix
          </h2>
          <p className="mt-5 mb-8" style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "1.05rem", lineHeight: 1.7 }}>
            Generate images, 3D models, videos, and lip-synced avatars. All local. All free.
          </p>
          <motion.button onClick={() => navigate("/text-to-image")} className="relative px-12 py-4 overflow-hidden"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.78rem", letterSpacing: "0.2em", color: "#0a0a0f", background: "linear-gradient(135deg, #00f5ff, #0066ff)", border: "none", cursor: "pointer", textTransform: "uppercase", boxShadow: "0 0 60px rgba(0,245,255,0.35)" }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 80px rgba(0,245,255,0.55)" } as any}
            whileTap={{ scale: 0.97 } as any}
          >
            Initialize Free Account
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-8" style={{ borderTop: "1px solid rgba(0,245,255,0.07)" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem", fontWeight: 700, background: "linear-gradient(90deg, #00f5ff, #7000ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FREEGMA</span>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Status", "Contact"].map((l) => (
              <a key={l} href="#" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7ab8d0", letterSpacing: "0.15em", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00f5ff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#7ab8d0")}
              >{l}</a>
            ))}
          </div>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", opacity: 0.45, letterSpacing: "0.08em" }}>© 2026 FREEGMA</span>
        </div>
      </footer>
    </div>
  );
}
