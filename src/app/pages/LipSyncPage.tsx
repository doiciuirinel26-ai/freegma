import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Download, Mic, Film, ChevronDown, User, Layers } from "lucide-react";
import { SpinningGenerationCard } from "../components/SpinningGenerationCard";
import { PageHoloCard } from "../components/PageHoloCard";
import { useGeneration } from "../../hooks/useGeneration";
import imgAvatar from "../../imports/image_to_video.png";

// ── Constants ────────────────────────────────────────────────────────────────

const TTS_OPTS = ["Kokoro · Local HQ", "Edge TTS · Cloud", "Voice Clone · XTTS v2"];
const TTS_ENGINE_MAP: Record<string, string> = {
  "Kokoro · Local HQ":   "kokoro",
  "Edge TTS · Cloud":    "edge",
  "Voice Clone · XTTS v2": "xtts",
};
const PIPELINE_LANGS = ["en", "ro", "es", "fr", "de", "zh", "ja", "ar"];
const XTTS_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "ru", label: "Russian" },
  { code: "nl", label: "Dutch" },
  { code: "cs", label: "Czech" },
  { code: "ar", label: "Arabic" },
  { code: "hu", label: "Hungarian" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "hi", label: "Hindi" },
];

type LipMode = "pipeline" | "realface";
type FileEntry = { file: File; url: string };

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectField({ label, value, options, onChange, color = "#ff4400" }: {
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

function MultiUpload({ label, accept, color, files, onAdd }: {
  label: string; accept: string; color: string; files: FileEntry[]; onAdd: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    for (const file of Array.from(e.dataTransfer.files)) onAdd(file);
  }, [onAdd]);
  return (
    <div>
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 8 }}>{label}</label>
      <motion.div
        className="relative flex flex-col items-center justify-center cursor-pointer py-6"
        style={{ border: `1px dashed ${dragging ? color : color + "55"}`, background: dragging ? color + "0d" : "rgba(0,10,20,0.4)", transition: "all 0.2s" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ borderColor: color + "80" } as any}
      >
        <input ref={inputRef} type="file" accept={accept} multiple className="hidden"
          onChange={(e) => { for (const f of Array.from(e.target.files ?? [])) onAdd(f); }} />
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

function SingleUpload({ label, accept, color, file, onAdd, onRemove, hint }: {
  label: string; accept: string; color: string; file: FileEntry | null;
  onAdd: (f: File) => void; onRemove: () => void; hint?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 8 }}>{label}</label>
      {file ? (
        <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: color + "0a", border: `1px solid ${color}40` }}>
          <Film size={13} color={color} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#e0f7ff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.file.name}</span>
          <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ff4455", cursor: "pointer", fontSize: "0.65rem", lineHeight: 1 }}>✕</button>
        </div>
      ) : (
        <motion.div
          className="relative flex flex-col items-center justify-center cursor-pointer py-5"
          style={{ border: `1px dashed ${dragging ? color : color + "55"}`, background: dragging ? color + "0d" : "rgba(0,10,20,0.4)", transition: "all 0.2s" }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onAdd(f); }}
          onClick={() => inputRef.current?.click()}
          whileHover={{ borderColor: color + "80" } as any}
        >
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdd(f); }} />
          <Upload size={15} color={color} />
          <p className="mt-1.5" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem", color: "#e0f7ff", letterSpacing: "0.06em" }}>DROP OR CLICK</p>
          {hint && <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0", marginTop: 2 }}>{hint}</p>}
        </motion.div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LipSyncPage() {
  const gen = useGeneration();

  const [lipMode, setLipMode] = useState<LipMode>("pipeline");

  // Pipeline mode state
  const [avatar,      setAvatar]      = useState<FileEntry | null>(null);
  const [bgImages,    setBgImages]    = useState<FileEntry[]>([]);
  const [bgVideos,    setBgVideos]    = useState<FileEntry[]>([]);
  const [narration,   setNarration]   = useState("");
  const [ttsOpt,      setTtsOpt]      = useState("Kokoro · Local HQ");
  const [lang,        setLang]        = useState("en");
  const [zoom,        setZoom]        = useState(false);
  const [subtitles,   setSubtitles]   = useState(true);
  const [pipeVoice,   setPipeVoice]   = useState<FileEntry | null>(null);

  // Real face mode state
  const [rfVideo, setRfVideo] = useState<FileEntry | null>(null);
  const [rfVoice, setRfVoice] = useState<FileEntry | null>(null);
  const [rfText,  setRfText]  = useState("");
  const [rfLang,  setRfLang]  = useState("en");

  const isActive = gen.status === "uploading" || gen.status === "queued" || gen.status === "running";
  const isDone   = gen.status === "done";
  const isError  = gen.status === "error";
  const progressPct = Math.round(gen.progress * 100);

  const handleMode = (m: LipMode) => { gen.reset(); setLipMode(m); };

  // Pipeline handlers
  const addAvatar  = useCallback((f: File) => { if (avatar) URL.revokeObjectURL(avatar.url); setAvatar({ file: f, url: URL.createObjectURL(f) }); }, [avatar]);
  const addBgImage = useCallback((f: File) => setBgImages((p) => [...p, { file: f, url: URL.createObjectURL(f) }]), []);
  const addBgVideo = useCallback((f: File) => setBgVideos((p) => [...p, { file: f, url: URL.createObjectURL(f) }]), []);

  const addPipeVoice = useCallback((f: File) => { if (pipeVoice) URL.revokeObjectURL(pipeVoice.url); setPipeVoice({ file: f, url: URL.createObjectURL(f) }); }, [pipeVoice]);

  const handleGeneratePipeline = () => {
    if (!narration.trim() && bgImages.length === 0 && bgVideos.length === 0) return;
    const engine = TTS_ENGINE_MAP[ttsOpt];
    if (engine === "xtts" && !pipeVoice) return;
    gen.submit({
      mode: "video-pipeline",
      file: avatar?.file ?? null,
      audioFile: engine === "xtts" ? (pipeVoice?.file ?? null) : null,
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

  // Real face handlers
  const addRfVideo = useCallback((f: File) => { if (rfVideo) URL.revokeObjectURL(rfVideo.url); setRfVideo({ file: f, url: URL.createObjectURL(f) }); }, [rfVideo]);
  const addRfVoice = useCallback((f: File) => { if (rfVoice) URL.revokeObjectURL(rfVoice.url); setRfVoice({ file: f, url: URL.createObjectURL(f) }); }, [rfVoice]);

  const handleGenerateRealFace = () => {
    if (!rfVideo || !rfVoice || !rfText.trim()) return;
    gen.submit({
      mode: "lipsync-realface",
      file: rfVideo.file,
      audioFile: rfVoice.file,
      extraBody: { tts_text: rfText, lang: rfLang },
    });
  };

  const handleReset = () => {
    if (avatar)    URL.revokeObjectURL(avatar.url);
    if (pipeVoice) URL.revokeObjectURL(pipeVoice.url);
    if (rfVideo)   URL.revokeObjectURL(rfVideo.url);
    if (rfVoice)   URL.revokeObjectURL(rfVoice.url);
    setAvatar(null); setBgImages([]); setBgVideos([]); setNarration(""); setPipeVoice(null);
    setRfVideo(null); setRfVoice(null); setRfText("");
    gen.reset();
  };

  const accentColor = lipMode === "realface" ? "#00e5b0" : "#ff4400";

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div className="mb-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-px h-6" style={{ background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)` }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: accentColor, letterSpacing: "0.25em" }}>VOICE ENGINE · v2.0</span>
        </div>
        <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#e0f7ff" }}>
          Lip <span style={{ color: accentColor }}>Sync</span>
        </h1>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#7ab8d0", fontSize: "0.95rem", marginTop: 4 }}>
          {lipMode === "pipeline" ? "Animate avatars with synthesized speech and background media." : "Lip-sync real face video with AI-cloned voice."}
        </p>
      </motion.div>

      {/* Mode Tabs */}
      <motion.div className="flex gap-2 mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {([
          { id: "pipeline" as LipMode, label: "AVATAR PIPELINE", icon: <Layers size={12} />, color: "#ff4400", disabled: false },
          { id: "realface" as LipMode, label: "REAL FACE SYNC",  icon: <User   size={12} />, color: "#00e5b0", disabled: true  },
        ] as const).map((tab) => (
          <div key={tab.id} className="relative">
            <button
              onClick={() => !tab.disabled && handleMode(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 relative overflow-hidden"
              style={{
                fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.12em",
                color: tab.disabled ? tab.color + "33" : lipMode === tab.id ? "#0a0a0f" : tab.color,
                background: tab.disabled ? "transparent" : lipMode === tab.id ? tab.color : "transparent",
                border: `1px solid ${tab.color}${tab.disabled ? "22" : lipMode === tab.id ? "" : "55"}`,
                cursor: tab.disabled ? "not-allowed" : "pointer", transition: "all 0.2s",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
            {tab.disabled && (
              <span style={{ position: "absolute", top: -7, right: -4, fontFamily: "Share Tech Mono, monospace", fontSize: "0.38rem", letterSpacing: "0.12em", color: "#00e5b0", background: "rgba(0,229,176,0.12)", border: "1px solid rgba(0,229,176,0.3)", padding: "1px 5px" }}>
                SOON
              </span>
            )}
          </div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── AVATAR PIPELINE TAB ─────────────────────────────── */}
        {lipMode === "pipeline" && (
          <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <div className="flex flex-col gap-5">
                {/* Avatar upload */}
                <motion.div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.25)", backdropFilter: "blur(12px)" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>AVATAR IMAGE</span>
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,68,0,0.3), transparent)" }} />
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "rgba(255,68,0,0.5)", letterSpacing: "0.1em" }}>REQUIRED</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <div style={{ width: 80, height: 80, flexShrink: 0, background: "rgba(255,68,0,0.06)", border: `1px solid ${avatar ? "rgba(255,68,0,0.6)" : "rgba(255,68,0,0.2)"}`, overflow: "hidden", position: "relative" }}>
                      {avatar
                        ? <img src={avatar.url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div className="flex items-center justify-center w-full h-full" style={{ color: "rgba(255,68,0,0.3)" }}><Upload size={20} /></div>}
                      {avatar && (
                        <button onClick={() => { URL.revokeObjectURL(avatar.url); setAvatar(null); }} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)", border: "none", color: "#ff4455", cursor: "pointer", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <MultiUpload label="" accept="image/*" color="#ff4400" files={[]} onAdd={addAvatar} />
                      {avatar && <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#ff8866", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{avatar.file.name}</p>}
                    </div>
                  </div>
                </motion.div>

                {/* Background uploads */}
                <motion.div className="p-4 flex flex-col gap-5" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.15)", backdropFilter: "blur(12px)" }}>
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
                <motion.div className="relative p-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.15)", backdropFilter: "blur(12px)" }}>
                  <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: "1px solid #ff440040", borderRight: "1px solid #ff440040" }} />
                  <div className="flex items-center gap-2 mb-3">
                    <Mic size={13} color="#ff4400" />
                    <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>NARRATION TEXT</label>
                  </div>
                  <textarea value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Enter the text for speech synthesis. The avatar will lip-sync to this narration..." rows={5} className="w-full resize-none outline-none" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff", background: "rgba(255,68,0,0.04)", border: "1px solid rgba(255,68,0,0.12)", padding: "10px 12px", lineHeight: 1.7, caretColor: "#ff4400", transition: "border-color 0.2s" }} onFocus={(e) => (e.target.style.borderColor = "rgba(255,68,0,0.45)")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,68,0,0.12)")} />
                  <div className="flex items-center justify-between mt-2">
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", opacity: 0.55 }}>{narration.length} CHARS</span>
                    <motion.button onClick={() => setNarration("")} className="px-2 py-1" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#ff4455", border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)", cursor: "pointer" }} whileHover={{ scale: 1.05 } as any}>CLEAR</motion.button>
                  </div>
                </motion.div>

                {/* Output */}
                <OutputArea gen={gen} isActive={isActive} isDone={isDone} isError={isError} progressPct={progressPct} onReset={handleReset} onRetry={handleGeneratePipeline} accentColor="#ff4400" statusLabel={gen.status === "uploading" ? "UPLOADING MEDIA…" : gen.status === "queued" ? "IN QUEUE…" : "RENDERING AVATAR…"} />
              </div>

              {/* Right sidebar */}
              <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <GenerateButton isActive={isActive} isDone={isDone} onClick={handleGeneratePipeline} color="#ff4400" label="RENDER LIP SYNC" />
                <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.15)", backdropFilter: "blur(12px)" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>TTS MODEL</span>
                  <SelectField label="VOICE ENGINE" value={ttsOpt} options={TTS_OPTS} onChange={(v) => { setTtsOpt(v); if (TTS_ENGINE_MAP[v] !== "xtts" && pipeVoice) { URL.revokeObjectURL(pipeVoice.url); setPipeVoice(null); } }} color="#ff4400" />
                  {TTS_ENGINE_MAP[ttsOpt] === "xtts" && (
                    <div>
                      <SingleUpload label="VOICE SAMPLE FOR CLONING (WAV / MP3 / M4A)" accept="audio/*" color="#ff4400" file={pipeVoice} onAdd={addPipeVoice} onRemove={() => { if (pipeVoice) URL.revokeObjectURL(pipeVoice.url); setPipeVoice(null); }} hint="6–30 seconds · clean audio" />
                      <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.44rem", color: "#7ab8d0", marginTop: 4, lineHeight: 1.5 }}>XTTS v2 clones this voice for the narration. Language must be set below.</p>
                    </div>
                  )}
                  <div>
                    <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.56rem", color: "#7ab8d0", letterSpacing: "0.18em", display: "block", marginBottom: 8 }}>LANGUAGE</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PIPELINE_LANGS.map((l) => (
                        <button key={l} onClick={() => setLang(l)} style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.06em", color: lang === l ? "#0a0a0f" : "#7ab8d0", background: lang === l ? "#ff4400" : "rgba(255,68,0,0.05)", border: `1px solid ${lang === l ? "#ff4400" : "rgba(255,68,0,0.2)"}`, cursor: "pointer", padding: "5px 0" }}>{l.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(255,68,0,0.12)", backdropFilter: "blur(12px)" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#ff4400", letterSpacing: "0.2em" }}>OUTPUT OPTIONS</span>
                  {[{ label: "ZOOM EFFECT", value: zoom, setter: setZoom }, { label: "SUBTITLES", value: subtitles, setter: setSubtitles }].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>{label}</span>
                      <div className="relative w-8 h-4 cursor-pointer" style={{ background: value ? "rgba(255,68,0,0.4)" : "rgba(0,245,255,0.08)", border: `1px solid ${value ? "#ff4400" : "rgba(0,245,255,0.15)"}`, transition: "all 0.2s" }} onClick={() => setter((v: boolean) => !v)}>
                        <div className="absolute top-0.5 h-3 w-3" style={{ left: value ? "calc(100% - 14px)" : "2px", background: value ? "#ff4400" : "#7ab8d0", transition: "left 0.2s" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3" style={{ background: "rgba(255,68,0,0.05)", border: "1px solid rgba(255,68,0,0.2)" }}>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#ff4400", letterSpacing: "0.12em" }}>ACTIVE PIPELINE</p>
                  <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>LatentSync + {TTS_ENGINE_MAP[ttsOpt] === "kokoro" ? "Kokoro TTS" : "Edge TTS"}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff4400" }} />
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0" }}>AVATAR SYNTHESIS · LOCAL GPU</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── REAL FACE SYNC TAB ──────────────────────────────── */}
        {lipMode === "realface" && (
          <motion.div key="realface" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <div className="flex flex-col gap-5">
                {/* Video clip */}
                <motion.div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,229,176,0.25)", backdropFilter: "blur(12px)" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00e5b0", letterSpacing: "0.2em" }}>PERSON VIDEO CLIP</span>
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,229,176,0.3), transparent)" }} />
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "rgba(0,229,176,0.5)", letterSpacing: "0.1em" }}>REQUIRED</span>
                  </div>
                  <SingleUpload label="VIDEO WITH FACE (MP4 / MOV / WEBM)" accept="video/*" color="#00e5b0" file={rfVideo} onAdd={addRfVideo} onRemove={() => { if (rfVideo) URL.revokeObjectURL(rfVideo.url); setRfVideo(null); }} hint="The person whose lips will be synced · Any length" />
                  <div className="flex flex-col gap-1 mt-1">
                    {["Face must be clearly visible and well-lit", "Face should fill at least 30% of the frame", "Avoid full-body shots or side profiles", "MP4 / MOV portrait or square clips work best"].map((tip, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span style={{ color: "#00e5b0", fontSize: "0.5rem" }}>›</span>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.47rem", color: "#7ab8d0" }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Voice sample */}
                <motion.div className="p-4 flex flex-col gap-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,229,176,0.18)", backdropFilter: "blur(12px)" }}>
                  <div className="flex items-center gap-2">
                    <Mic size={13} color="#00e5b0" />
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00e5b0", letterSpacing: "0.2em" }}>VOICE SAMPLE</span>
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,229,176,0.3), transparent)" }} />
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "rgba(0,229,176,0.5)", letterSpacing: "0.1em" }}>REQUIRED</span>
                  </div>
                  <SingleUpload label="REFERENCE AUDIO FOR VOICE CLONING (WAV / MP3 / M4A)" accept="audio/*" color="#00e5b0" file={rfVoice} onAdd={addRfVoice} onRemove={() => { if (rfVoice) URL.revokeObjectURL(rfVoice.url); setRfVoice(null); }} hint="6–30 seconds of the target voice · Clean audio works best" />
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#7ab8d0", lineHeight: 1.6 }}>
                    XTTS v2 clones this voice and uses it to speak the text below.
                  </p>
                </motion.div>

                {/* Text */}
                <motion.div className="relative p-4" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,229,176,0.15)", backdropFilter: "blur(12px)" }}>
                  <div className="absolute top-0 right-0 w-7 h-7" style={{ borderTop: "1px solid #00e5b040", borderRight: "1px solid #00e5b040" }} />
                  <div className="flex items-center gap-2 mb-3">
                    <Mic size={13} color="#00e5b0" />
                    <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00e5b0", letterSpacing: "0.2em" }}>TEXT TO SPEAK</label>
                  </div>
                  <textarea value={rfText} onChange={(e) => setRfText(e.target.value)} placeholder="Type the text the person in the video will say (in the language selected on the right)..." rows={5} className="w-full resize-none outline-none" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", color: "#e0f7ff", background: "rgba(0,229,176,0.04)", border: "1px solid rgba(0,229,176,0.12)", padding: "10px 12px", lineHeight: 1.7, caretColor: "#00e5b0", transition: "border-color 0.2s" }} onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,176,0.45)")} onBlur={(e) => (e.target.style.borderColor = "rgba(0,229,176,0.12)")} />
                  <div className="flex items-center justify-between mt-2">
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", opacity: 0.55 }}>{rfText.length} CHARS</span>
                    <motion.button onClick={() => setRfText("")} className="px-2 py-1" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "#ff4455", border: "1px solid rgba(255,68,85,0.3)", background: "rgba(255,68,85,0.06)", cursor: "pointer" }} whileHover={{ scale: 1.05 } as any}>CLEAR</motion.button>
                  </div>
                </motion.div>

                {/* Output */}
                <OutputArea gen={gen} isActive={isActive} isDone={isDone} isError={isError} progressPct={progressPct} onReset={handleReset} onRetry={handleGenerateRealFace} accentColor="#00e5b0" statusLabel={gen.status === "uploading" ? "UPLOADING FILES…" : gen.status === "queued" ? "IN QUEUE…" : progressPct < 32 ? "CLONING VOICE…" : "SYNCING LIPS…"} />
              </div>

              {/* Right sidebar */}
              <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <GenerateButton isActive={isActive} isDone={isDone} onClick={handleGenerateRealFace} color="#00e5b0" label="GENERATE REAL FACE SYNC" disabled={!rfVideo || !rfVoice || !rfText.trim()} />

                {/* Language */}
                <div className="p-4 flex flex-col gap-3" style={{ background: "rgba(0,15,30,0.7)", border: "1px solid rgba(0,229,176,0.15)", backdropFilter: "blur(12px)" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00e5b0", letterSpacing: "0.2em" }}>SPEECH LANGUAGE</span>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.46rem", color: "#7ab8d0", lineHeight: 1.5 }}>Select the language of your text. Note: Romanian is not supported by XTTS — use English for best results.</p>
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                    {XTTS_LANGS.map((l) => (
                      <button key={l.code} onClick={() => setRfLang(l.code)}
                        className="flex items-center justify-between px-3 py-1.5"
                        style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.54rem", color: rfLang === l.code ? "#0a0a0f" : "#7ab8d0", background: rfLang === l.code ? "#00e5b0" : "rgba(0,229,176,0.04)", border: `1px solid ${rfLang === l.code ? "#00e5b0" : "rgba(0,229,176,0.15)"}`, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                      >
                        <span style={{ letterSpacing: "0.06em" }}>{l.label}</span>
                        <span style={{ opacity: 0.6, fontSize: "0.46rem" }}>{l.code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pipeline info */}
                <div className="p-3" style={{ background: "rgba(0,229,176,0.05)", border: "1px solid rgba(0,229,176,0.2)" }}>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#00e5b0", letterSpacing: "0.12em" }}>ACTIVE PIPELINE</p>
                  <p className="mt-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem", color: "#e0f7ff" }}>XTTS v2 + LatentSync</p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {["1. Voice clone from sample", "2. Speech synthesis (XTTS v2)", "3. Lip sync on real video"].map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00e5b0" }} />
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.46rem", color: "#7ab8d0" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="p-3" style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.1)" }}>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#00f5ff", letterSpacing: "0.1em", marginBottom: 6 }}>TIPS</p>
                  {[
                    "Use a quiet, clear voice recording (6–30s)",
                    "Face must be visible and well-lit in the video",
                    "Short texts produce the best results",
                    "First run downloads the XTTS model (~1.8 GB)",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <span style={{ color: "#00e5b0", fontSize: "0.5rem", marginTop: 1 }}>›</span>
                      <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", color: "#7ab8d0", lineHeight: 1.4 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function GenerateButton({ isActive, isDone, onClick, color, label, disabled }: {
  isActive: boolean; isDone: boolean; onClick: () => void; color: string; label: string; disabled?: boolean;
}) {
  const off = isActive || disabled;
  return (
    <motion.button
      onClick={onClick}
      disabled={off}
      className="relative w-full py-4 overflow-hidden"
      style={{
        fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em",
        color: off ? "#7ab8d0" : "#ffffff",
        background: off ? `rgba(0,0,0,0.2)` : `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: off ? `1px solid ${color}30` : "none",
        cursor: off ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        boxShadow: !off ? `0 0 40px ${color}55` : "none",
        opacity: disabled && !isActive ? 0.5 : 1,
      }}
      whileHover={!off ? { scale: 1.02, boxShadow: `0 0 60px ${color}80` } as any : {}}
      whileTap={!off ? { scale: 0.97 } as any : {}}
    >
      {isActive ? "RENDERING…" : isDone ? "RE-RENDER" : label}
      {!off && (
        <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.18), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
      )}
    </motion.button>
  );
}

function OutputArea({ gen, isActive, isDone, isError, progressPct, onReset, onRetry, accentColor, statusLabel }: {
  gen: ReturnType<typeof useGeneration>; isActive: boolean; isDone: boolean; isError: boolean;
  progressPct: number; onReset: () => void; onRetry: () => void; accentColor: string; statusLabel: string;
}) {
  return (
    <div className="relative overflow-hidden" style={{
      border: `1px solid ${isActive ? accentColor + "70" : isDone ? "rgba(0,245,255,0.3)" : accentColor + "1f"}`,
      background: "rgba(0,8,18,0.7)", minHeight: 460, backdropFilter: "blur(8px)",
      boxShadow: isActive ? `0 0 40px ${accentColor}25, inset 0 0 40px ${accentColor}08` : isDone ? "0 0 40px rgba(0,245,255,0.1)" : "none",
      transition: "box-shadow 0.5s, border-color 0.5s",
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${accentColor}${isActive ? "0a" : "04"} 1px, transparent 1px), linear-gradient(90deg, ${accentColor}${isActive ? "0a" : "04"} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />

      <AnimatePresence>
        {gen.status === "idle" && (
          <motion.div className="absolute inset-0 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PageHoloCard imageSrc={imgAvatar} label="Lip Sync" subtitle="Voice Engine" accentColor={accentColor} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isActive && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SpinningGenerationCard imageSrc={imgAvatar} accentColor={accentColor} label="SYNTHESIZING..." isSpinning={isActive} onHidden={() => {}} />
            <div className="w-64 mt-4">
              <div className="flex justify-between mb-1">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: accentColor, letterSpacing: "0.12em" }}>{statusLabel}</span>
                <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", color: accentColor }}>{progressPct}%</span>
              </div>
              <div className="relative h-1" style={{ background: accentColor + "1f" }}>
                <motion.div className="absolute top-0 left-0 h-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)`, boxShadow: `0 0 8px ${accentColor}80` }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.12 }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDone && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 w-full max-w-md" style={{ border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.04)", padding: "12px 16px" }}>
              <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00f5ff", boxShadow: "0 0 8px #00f5ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#00f5ff", letterSpacing: "0.12em" }}>LIP SYNC VIDEO READY</p>
            </div>
            {gen.resultUrl && (
              <div className="relative w-full max-w-md" style={{ border: `1px solid ${accentColor}66`, boxShadow: `0 0 40px ${accentColor}33` }}>
                <div className="absolute top-0 left-0 right-0 h-px z-10 pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }} />
                <div className="relative overflow-hidden" style={{ background: "#000" }}>
                  <video src={gen.resultUrl} autoPlay loop controls style={{ width: "100%", display: "block", maxHeight: 320 }} />
                  {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
                    <div key={i} className="absolute w-5 h-5 pointer-events-none z-10" style={{ ...pos, borderColor: accentColor + "b3", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i===0||i===1)?1.5:0, borderBottomWidth: (i===2||i===3)?1.5:0, borderLeftWidth: (i===0||i===3)?1.5:0, borderRightWidth: (i===1||i===2)?1.5:0 }} />
                  ))}
                </div>
              </div>
            )}
            {gen.resultUrl && (
              <motion.a href={gen.resultUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-8 py-3 relative overflow-hidden no-underline" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", color: "#0a0a0f", background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, textTransform: "uppercase", boxShadow: `0 0 30px ${accentColor}66` }} whileHover={{ scale: 1.04, boxShadow: `0 0 55px ${accentColor}99` } as any} whileTap={{ scale: 0.97 } as any}>
                <Download size={14} />
                DOWNLOAD VIDEO
                <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              </motion.a>
            )}
            <motion.button onClick={onReset} className="px-4 py-1.5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.55rem", color: "#7ab8d0", border: "1px solid rgba(0,245,255,0.2)", background: "transparent", cursor: "pointer", letterSpacing: "0.1em" }} whileHover={{ scale: 1.03, borderColor: "rgba(0,245,255,0.4)" } as any}>NEW SESSION</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isError && (
          <motion.div className="absolute inset-0 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff4455", boxShadow: "0 0 16px #ff4455" }} />
              <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.78rem", color: "#ff4455", letterSpacing: "0.1em" }}>SYNTHESIS FAILED</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0", lineHeight: 1.5 }}>{gen.error ?? "Unknown error"}</p>
              <motion.button onClick={onRetry} className="px-5 py-2" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: accentColor, border: `1px solid ${accentColor}66`, background: accentColor + "14", cursor: "pointer", letterSpacing: "0.12em" }} whileHover={{ scale: 1.03 } as any}>RETRY</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, right: 6 }, { bottom: 6, left: 6 }].map((pos, i) => (
        <div key={i} className="absolute w-5 h-5 pointer-events-none z-20" style={{ ...pos, borderColor: isActive ? accentColor : isDone ? "#00f5ff" : accentColor + "59", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i===0||i===1)?1.5:0, borderBottomWidth: (i===2||i===3)?1.5:0, borderLeftWidth: (i===0||i===3)?1.5:0, borderRightWidth: (i===1||i===2)?1.5:0, opacity: gen.status === "idle" ? 0.35 : 0.75, transition: "border-color 0.4s, opacity 0.4s" }} />
      ))}
    </div>
  );
}
