import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Download, Mic, Film } from "lucide-react";
import { SpinningGenerationCard } from "../components/SpinningGenerationCard";
import { PageHoloCard } from "../components/PageHoloCard";
import { useGeneration } from "../../hooks/useGeneration";
import imgAvatar from "../../imports/image_to_video.png";

const TTS_ENGINES = ["kokoro", "edge"];
const LANG_OPTS = ["en", "ro", "es", "fr", "de", "zh", "ja", "ar"];

type FileEntry = { file: File; url: string };

function MultiUpload({ label, accept, color, files, onAdd }: { label: string; accept: string; color: string; files: FileEntry[]; onAdd: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      onAdd(file);
    }
  }, [onAdd]);

  return (
    <div>
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 8 }}>{label}</label>
      <motion.div
        className="relative flex flex-col items-center justify-center cursor-pointer py-6"
        style={{
          border: `1px dashed ${dragging ? color : color + "55"}`,
          background: dragging ? color + "0d" : "rgba(0,10,20,0.4)",
          transition: "all 0.2s",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ borderColor: color + "80" } as any}
      >
        <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => { for (const f of Array.from(e.target.files ?? [])) onAdd(f); }} />
        <Upload size={16} color={color} />
        <p className="mt-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", color: "#e0f7ff", letterSpacing: "0.06em" }}>DROP FILES</p>
        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", marginTop: 2 }}>{accept.replace(/,/g, " · ").replace(/\*/g, "")}</p>
      </motion.div>
      {files.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5" style={{ background: color + "0a", border: `1px solid ${color}25` }}>
              <Film size={10} color={color} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#e0f7ff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LipSyncPage() {
  const gen = useGeneration();
  const [avatar, setAvatar] = useState<FileEntry | null>(null);
  const [bgImages, setBgImages] = useState<FileEntry[]>([]);
  const [bgVideos, setBgVideos] = useState<FileEntry[]>([]);
  const [narration, setNarration] = useState("");
  const [engine, setEngine] = useState("kokoro");
  const [lang, setLang] = useState("en");
  const [zoom, setZoom] = useState(false);
  const [subtitles, setSubtitles] = useState(true);

  const isActive = gen.status === "uploading" || gen.status === "queued" || gen.status === "running";
  const isDone = gen.status === "done";
  const isError = gen.status === "error";
  const progressPct = Math.round(gen.progress * 100);

  const addAvatar = useCallback((f: File) => {
    if (avatar) URL.revokeObjectURL(avatar.url);
    setAvatar({ file: f, url: URL.createObjectURL(f) });
  }, [avatar]);

  const addBgImage = useCallback((f: File) => {
    setBgImages((prev) => [...prev, { file: f, url: URL.createObjectURL(f) }]);
  }, []);

  const addBgVideo = useCallback((f: File) => {
    setBgVideos((prev) => [...prev, { file: f, url: URL.createObjectURL(f) }]);
  }, []);

  const handleGenerate = () => {
    if (!narration.trim() && bgImages.length === 0 && bgVideos.length === 0) return;
    gen.submit({
      mode: "video-pipeline",
      file: avatar?.file ?? null,
      bgImages: bgImages.map((e) => e.file),
      bgVideos: bgVideos.map((e) => e.file),
      extraBody: {
        narration_text: narration,
        tts_engine: engine,
        tts_voice: ({ en: "en-US-JennyNeural", ro: "ro-RO-AlinaNeural", es: "es-ES-ElviraNeural", fr: "fr-FR-DeniseNeural", de: "de-DE-KatjaNeural", zh: "zh-CN-XiaoxiaoNeural", ja: "ja-JP-NanamiNeural", ar: "ar-SA-ZariyahNeural" } as Record<string, string>)[lang] ?? "en-US-JennyNeural",
        lang,
        no_zoom: !zoom,
        no_subtitles: !subtitles,
      },
    });
  };

  const handleReset = () => {
    if (avatar) URL.revokeObjectURL(avatar.url);
    setAvatar(null);
    setBgImages([]);
    setBgVideos([]);
    setNarration("");
    gen.reset();
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: "linear-gradient(180deg, transparent, #ff4400, transparent)" }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#ff4400", letterSpacing: "0.25em" }}>VOICE ENGINE · v1.4</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Lip <span style={{ color: "#ff4400" }}>Sync</span>
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>Animate avatars with synthesized speech and background media.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: media uploads + output */}
        <div className="flex flex-col gap-5">
          {/* Avatar upload */}
          <motion.div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.25)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>AVATAR IMAGE</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,68,0,0.3), transparent)" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "rgba(255,68,0,0.5)", letterSpacing: "0.1em" }}>REQUIRED</span>
            </div>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div style={{ width: 80, height: 80, flexShrink: 0, background: "rgba(255,68,0,0.06)", border: `1px solid ${avatar ? "rgba(255,68,0,0.6)" : "rgba(255,68,0,0.2)"}`, overflow: "hidden", position: "relative" }}>
                {avatar
                  ? <img src={avatar.url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div className="flex items-center justify-center w-full h-full" style={{ color: "rgba(255,68,0,0.3)" }}><Upload size={20} /></div>}
                {avatar && (
                  <button
                    onClick={() => { URL.revokeObjectURL(avatar.url); setAvatar(null); }}
                    style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)", border: "none", color: "#ff4455", cursor: "pointer", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", lineHeight: 1 }}>✕</button>
                )}
              </div>
              {/* Drop zone */}
              <div style={{ flex: 1 }}>
                <MultiUpload label="" accept="image/*" color="#ff4400" files={[]} onAdd={addAvatar} />
                {avatar && <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#ff8866", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{avatar.file.name}</p>}
              </div>
            </div>
          </motion.div>

          {/* Background uploads */}
          <motion.div className="p-4 flex flex-col gap-5" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.15)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>BACKGROUND MEDIA</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,68,0,0.3), transparent)" }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiUpload label="BACKGROUND IMAGES" accept="image/*" color="#ff4400" files={bgImages} onAdd={addBgImage} />
              <MultiUpload label="BACKGROUND VIDEOS" accept="video/*" color="#ff6622" files={bgVideos} onAdd={addBgVideo} />
            </div>
          </motion.div>

          {/* Narration */}
          <motion.div className="relative p-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.15)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: "1px solid #ff440040", borderRight: "1px solid #ff440040" }} />
            <div className="flex items-center gap-2 mb-3">
              <Mic size={13} color="#ff4400" />
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>NARRATION TEXT</label>
            </div>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Enter the text for speech synthesis. The avatar will lip-sync to this narration..."
              rows={5}
              className="w-full resize-none outline-none"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff",
                background: "rgba(255,68,0,0.04)", border: "1px solid rgba(255,68,0,0.12)",
                padding: "10px 12px", lineHeight: 1.7, caretColor: "#ff4400", transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,68,0,0.45)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,68,0,0.12)")}
            />
            <div className="flex items-center justify-between mt-2">
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", opacity: 0.55 }}>
                {narration.length} CHARS
              </span>
              <motion.button onClick={() => setNarration("")} className="px-2 py-1" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#ff4455", border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)", cursor: "pointer" }} whileHover={{ scale: 1.05 } as any}>CLEAR</motion.button>
            </div>
          </motion.div>

          {/* Output area */}
          <div className="relative overflow-hidden" style={{
            border: `1px solid ${isActive ? "rgba(255,68,0,0.45)" : isDone ? "rgba(0,245,255,0.3)" : "rgba(255,68,0,0.12)"}`,
            background: "rgba(0,8,18,0.7)", minHeight: 460, backdropFilter: "blur(8px)",
            boxShadow: isActive ? "0 0 40px rgba(255,68,0,0.15), inset 0 0 40px rgba(255,68,0,0.05)" : isDone ? "0 0 40px rgba(0,245,255,0.1)" : "none",
            transition: "box-shadow 0.5s, border-color 0.5s",
          }}>
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(255,68,0,${isActive ? "0.04" : "0.015"}) 1px, transparent 1px), linear-gradient(90deg, rgba(255,68,0,${isActive ? "0.04" : "0.015"}) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />

            {/* Idle */}
            <AnimatePresence>
              {gen.status === "idle" && (
                <motion.div className="absolute inset-0 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PageHoloCard imageSrc={imgAvatar} label="Lip Sync" subtitle="Voice Engine" accentColor="#ff4400" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active */}
            <AnimatePresence>
              {isActive && (
                <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SpinningGenerationCard imageSrc={imgAvatar} accentColor="#ff4400" label="SYNTHESIZING..." isSpinning={isActive} onHidden={() => {}} />
                  <div className="w-64 mt-4">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#ff4400", letterSpacing: "0.12em" }}>
                        {gen.status === "uploading" ? "UPLOADING MEDIA…" : gen.status === "queued" ? "IN QUEUE…" : "RENDERING AVATAR…"}
                      </span>
                      <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", color: "#ff4400" }}>{progressPct}%</span>
                    </div>
                    <div className="relative h-1" style={{ background: "rgba(255,68,0,0.12)" }}>
                      <motion.div className="absolute top-0 left-0 h-full" style={{ background: "linear-gradient(90deg, #ff4400, #ff8844)", boxShadow: "0 0 8px #ff440080" }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.12 }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Done */}
            <AnimatePresence>
              {isDone && (
                <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-3 w-full max-w-md" style={{ border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.04)", padding: "12px 16px" }}>
                    <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00f5ff", boxShadow: "0 0 8px #00f5ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#00f5ff", letterSpacing: "0.12em" }}>LIP SYNC VIDEO READY</p>
                  </div>
                  {gen.resultUrl && (
                    <div className="relative w-full max-w-md" style={{ border: "1px solid rgba(255,68,0,0.4)", boxShadow: "0 0 40px rgba(255,68,0,0.2)" }}>
                      <div className="absolute top-0 left-0 right-0 h-px z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, #ff440080, #ff884480, transparent)" }} />
                      <div className="relative overflow-hidden" style={{ background: "#000" }}>
                        <video src={gen.resultUrl} autoPlay loop controls style={{ width: "100%", display: "block", maxHeight: 320 }} />
                        {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
                          <div key={i} className="absolute w-5 h-5 pointer-events-none z-10" style={{ ...pos, borderColor: "rgba(255,68,0,0.7)", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i===0||i===1)?1.5:0, borderBottomWidth: (i===2||i===3)?1.5:0, borderLeftWidth: (i===0||i===3)?1.5:0, borderRightWidth: (i===1||i===2)?1.5:0 }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {gen.resultUrl && (
                    <motion.a
                      href={gen.resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-8 py-3 relative overflow-hidden no-underline"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", color: "#0a0a0f", background: "linear-gradient(135deg, #ff4400, #ff8844)", textTransform: "uppercase", boxShadow: "0 0 30px rgba(255,68,0,0.4)" }}
                      whileHover={{ scale: 1.04, boxShadow: "0 0 55px rgba(255,68,0,0.6)" } as any}
                      whileTap={{ scale: 0.97 } as any}
                    >
                      <Download size={14} />
                      DOWNLOAD VIDEO
                      <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                    </motion.a>
                  )}
                  <motion.button onClick={handleReset} className="px-4 py-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", border: "1px solid rgba(0,245,255,0.2)", background: "transparent", cursor: "pointer", letterSpacing: "0.1em" }} whileHover={{ scale: 1.03, borderColor: "rgba(0,245,255,0.4)" } as any}>
                    NEW SESSION
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {isError && (
                <motion.div className="absolute inset-0 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#ff4455", boxShadow: "0 0 16px #ff4455" }} />
                    <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.78rem", color: "#ff4455", letterSpacing: "0.1em" }}>SYNTHESIS FAILED</p>
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0", lineHeight: 1.5 }}>{gen.error ?? "Unknown error"}</p>
                    <motion.button onClick={handleGenerate} className="px-5 py-2" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", border: "1px solid rgba(255,68,0,0.4)", background: "rgba(255,68,0,0.08)", cursor: "pointer", letterSpacing: "0.12em" }} whileHover={{ scale: 1.03 } as any}>
                      RETRY
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Corners */}
            {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
              <div key={i} className="absolute w-5 h-5 pointer-events-none z-20" style={{ ...pos, borderColor: isActive ? "#ff4400" : isDone ? "#00f5ff" : "rgba(255,68,0,0.35)", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i === 0 || i === 1) ? 1.5 : 0, borderBottomWidth: (i === 2 || i === 3) ? 1.5 : 0, borderLeftWidth: (i === 0 || i === 3) ? 1.5 : 0, borderRightWidth: (i === 1 || i === 2) ? 1.5 : 0, opacity: gen.status === "idle" ? 0.35 : 0.75, transition: "border-color 0.4s, opacity 0.4s" }} />
            ))}
          </div>
        </div>

        {/* Right: settings */}
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          {/* Generate button */}
          <motion.button
            onClick={handleGenerate}
            disabled={isActive}
            className="relative w-full py-4 overflow-hidden"
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em",
              color: isActive ? "#7ab8d0" : "#ffffff",
              background: isActive ? "rgba(255,68,0,0.1)" : "linear-gradient(135deg, #ff4400, #ff8844)",
              border: isActive ? "1px solid rgba(255,68,0,0.3)" : "none",
              cursor: isActive ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              boxShadow: !isActive ? "0 0 40px rgba(255,68,0,0.35)" : "none",
            }}
            whileHover={!isActive ? { scale: 1.02, boxShadow: "0 0 60px rgba(255,68,0,0.5)" } as any : {}}
            whileTap={!isActive ? { scale: 0.97 } as any : {}}
          >
            {isActive ? "RENDERING…" : isDone ? "RE-RENDER" : "RENDER LIP SYNC"}
            {!isActive && (
              <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.18), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
            )}
          </motion.button>

          {/* TTS Settings */}
          <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.15)", backdropFilter: "blur(12px)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>TTS ENGINE</span>
            <div className="flex gap-3">
              {TTS_ENGINES.map((eng) => (
                <motion.button
                  key={eng}
                  onClick={() => setEngine(eng)}
                  className="flex-1 py-2.5"
                  style={{
                    fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem", letterSpacing: "0.08em",
                    color: engine === eng ? "#ff4400" : "#7ab8d0",
                    border: `1px solid ${engine === eng ? "#ff4400" : "rgba(255,68,0,0.2)"}`,
                    background: engine === eng ? "rgba(255,68,0,0.12)" : "rgba(255,68,0,0.04)",
                    cursor: "pointer",
                    boxShadow: engine === eng ? "0 0 12px rgba(255,68,0,0.2)" : "none",
                  }}
                  whileHover={{ borderColor: "rgba(255,68,0,0.5)" } as any}
                >
                  {eng.toUpperCase()}
                </motion.button>
              ))}
            </div>

            <div>
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 8 }}>LANGUAGE</label>
              <div className="grid grid-cols-4 gap-2">
                {LANG_OPTS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.06em",
                      color: lang === l ? "#0a0a0f" : "#7ab8d0",
                      background: lang === l ? "#ff4400" : "rgba(255,68,0,0.05)",
                      border: `1px solid ${lang === l ? "#ff4400" : "rgba(255,68,0,0.2)"}`,
                      cursor: "pointer", padding: "5px 0",
                    }}
                  >{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Output options */}
          <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.12)", backdropFilter: "blur(12px)" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>OUTPUT OPTIONS</span>

            {[
              { label: "ZOOM EFFECT", value: zoom, setter: setZoom },
              { label: "SUBTITLES", value: subtitles, setter: setSubtitles },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>{label}</span>
                <div
                  className="relative w-8 h-4 cursor-pointer"
                  style={{ background: value ? "rgba(255,68,0,0.4)" : "rgba(0,245,255,0.08)", border: `1px solid ${value ? "#ff4400" : "rgba(0,245,255,0.15)"}`, transition: "all 0.2s" }}
                  onClick={() => setter((v: boolean) => !v)}
                >
                  <div className="absolute top-0.5 h-3 w-3" style={{ left: value ? "calc(100% - 14px)" : "2px", background: value ? "#ff4400" : "#7ab8d0", transition: "left 0.2s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Model info */}
          <div className="p-3" style={{ background: "rgba(255,68,0,0.05)", border: "1px solid rgba(255,68,0,0.2)" }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#ff4400", letterSpacing: "0.12em" }}>ACTIVE PIPELINE</p>
            <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>LatentSync + {engine === "kokoro" ? "Kokoro TTS" : "Edge TTS"}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff4400" }} />
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0" }}>AVATAR SYNTHESIS · LOCAL GPU</span>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3" style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.1)" }}>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#00f5ff", letterSpacing: "0.1em", marginBottom: 6 }}>TIPS</p>
            {[
              "Add background images/videos for a richer scene",
              "Use Kokoro for higher-quality local TTS",
              "Keep narration under 500 chars for best results",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span style={{ color: "#ff4400", fontSize: "0.5rem", marginTop: 1 }}>›</span>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", color: "#7ab8d0", lineHeight: 1.4 }}>{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
