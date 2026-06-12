import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Download, Film, Trash2, GripVertical, Play, Image, Music } from "lucide-react";
import { apiUpload, apiStudioRender, apiStatus, resultUrl as getResultUrl } from "../../api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GapSettings {
  type: string;
  duration: number;
}

type RenderStatus = "idle" | "uploading" | "rendering" | "done" | "error";

interface Clip {
  id: string;
  file: File;
  name: string;
  url: string;
  thumbnail: string;
  duration: number;
  isImage: boolean;
}

interface AudioTrack {
  id: string;
  file: File;
  name: string;
  url: string;
  duration: number;
  offset: number; // seconds from video start
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isImageFile = (f: File) =>
  f.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name);
const isVideoFile = (f: File) =>
  f.type.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(f.name);
const isAudioFile = (f: File) =>
  f.type.startsWith("audio/") || /\.(mp3|wav|aac|ogg|flac|m4a)$/i.test(f.name);

async function extractVideoMeta(file: File): Promise<{ thumbnail: string; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url; video.muted = true; video.preload = "metadata";
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 90;
      canvas.getContext("2d")?.drawImage(video, 0, 0, 160, 90);
      URL.revokeObjectURL(url);
      resolve({ thumbnail: canvas.toDataURL("image/jpeg", 0.7), duration: video.duration || 0 });
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve({ thumbnail: "", duration: 0 }); };
  });
}

async function extractImageMeta(file: File): Promise<{ thumbnail: string; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 90;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const scale = Math.min(160 / img.width, 90 / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 160, 90);
        ctx.drawImage(img, (160 - w) / 2, (90 - h) / 2, w, h);
      }
      URL.revokeObjectURL(url);
      resolve({ thumbnail: canvas.toDataURL("image/jpeg", 0.8), duration: 3.0 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ thumbnail: "", duration: 3.0 }); };
    img.src = url;
  });
}

async function extractMeta(file: File): Promise<{ thumbnail: string; duration: number; isImage: boolean }> {
  if (isImageFile(file)) {
    const m = await extractImageMeta(file);
    return { ...m, isImage: true };
  }
  const m = await extractVideoMeta(file);
  return { ...m, isImage: false };
}

async function extractAudioMeta(file: File): Promise<{ duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ duration: isFinite(el.duration) ? el.duration : 0 }); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve({ duration: 0 }); };
    el.src = url;
  });
}

// ── Transition catalogue ───────────────────────────────────────────────────────

const TRANS_OPTS = [
  { value: "cut",        label: "CUT",      color: "#00f5ff", group: "BASIC" },
  { value: "fade",       label: "FADE",     color: "#7000ff", group: "BASIC" },
  { value: "dissolve",   label: "DISSOLVE", color: "#0066ff", group: "BASIC" },
  { value: "fadeblack",  label: "TO BLACK", color: "#4400cc", group: "BASIC" },
  { value: "wipeleft",   label: "WIPE ←",  color: "#0099ff", group: "WIPE"  },
  { value: "wiperight",  label: "WIPE →",  color: "#0099ff", group: "WIPE"  },
  { value: "wipeup",     label: "WIPE ↑",  color: "#0099ff", group: "WIPE"  },
  { value: "wipedown",   label: "WIPE ↓",  color: "#0099ff", group: "WIPE"  },
  { value: "slideleft",  label: "SLIDE ←", color: "#aa00ff", group: "SLIDE" },
  { value: "slideright", label: "SLIDE →", color: "#aa00ff", group: "SLIDE" },
  { value: "zoomin",     label: "ZOOM IN", color: "#ff6600", group: "FX"    },
  { value: "circleopen", label: "CIRCLE",  color: "#ff6600", group: "FX"    },
  { value: "pixelize",   label: "PIXEL",   color: "#ff6600", group: "FX"    },
] as const;

const DEFAULT_GAP: GapSettings = { type: "cut", duration: 0 };

const gapColor = (type: string) => TRANS_OPTS.find((t) => t.value === type)?.color ?? "#00f5ff";
const gapLabel = (gap: GapSettings) =>
  gap.type === "cut" ? "CUT"
    : `${(TRANS_OPTS.find((t) => t.value === gap.type)?.label ?? gap.type).split(" ")[0]} ${gap.duration.toFixed(1)}s`;

// ── TransitionPicker ──────────────────────────────────────────────────────────

function TransitionPicker({ gap, onChange }: { gap: GapSettings; onChange: (g: GapSettings) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const col = gapColor(gap.type);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left - 80, window.innerWidth - 310)) });
    }
    setOpen(true);
  };

  const setType = (value: string) =>
    onChange(value === "cut" ? { type: "cut", duration: 0 } : { type: value, duration: gap.duration > 0 ? gap.duration : 0.5 });

  const groups = [...new Set(TRANS_OPTS.map((t) => t.group))];

  return (
    <div className="relative flex-shrink-0 flex flex-col items-center" style={{ width: 90 }}>
      <div className="h-px w-full" style={{ background: `${col}50` }} />
      <button ref={btnRef} onClick={handleOpen}
        className="my-1 px-2 py-1 flex items-center justify-center gap-1 w-full"
        style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.06em", color: col, border: `1px solid ${col}50`, background: `${col}12`, cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{gapLabel(gap)}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" style={{ flexShrink: 0, opacity: 0.6 }}>
          <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
      </button>
      <div className="h-px w-full" style={{ background: `${col}50` }} />

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div className="fixed z-50 flex flex-col"
            style={{ top: pos.top, left: pos.left, width: 290, maxHeight: 480, background: "rgba(8,8,18,0.98)", border: "1px solid rgba(0,245,255,0.25)", backdropFilter: "blur(20px)", boxShadow: "0 8px 48px rgba(0,0,0,0.7)", overflow: "hidden" }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
              <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: "#00f5ff", letterSpacing: "0.14em" }}>TRANSITION</p>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(0,245,255,0.5)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0 2px" }}>✕</button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
              {groups.map((grp) => (
                <div key={grp}>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "rgba(0,245,255,0.3)", letterSpacing: "0.14em", padding: "8px 16px 4px" }}>{grp}</p>
                  {TRANS_OPTS.filter((t) => t.group === grp).map((opt) => {
                    const active = gap.type === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setType(opt.value)}
                        className="w-full flex items-center gap-3 px-4 py-2.5"
                        style={{ background: active ? `${opt.color}20` : "transparent", border: "none", borderLeft: active ? `3px solid ${opt.color}` : "3px solid transparent", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = `${opt.color}0e`; }}
                        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color, boxShadow: active ? `0 0 6px ${opt.color}` : "none" }} />
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.72rem", color: active ? opt.color : "#c0d8e8", letterSpacing: "0.06em" }}>{opt.label}</span>
                        {active && <span style={{ marginLeft: "auto", fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: opt.color }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            {gap.type !== "cut" && (
              <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,245,255,0.1)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.65rem", color: "rgba(0,245,255,0.6)", letterSpacing: "0.1em" }}>DURATION</p>
                  <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: gapColor(gap.type), fontWeight: 600 }}>{gap.duration.toFixed(1)}s</p>
                </div>
                <input type="range" min={0.1} max={1.5} step={0.1} value={gap.duration}
                  onChange={(e) => onChange({ ...gap, duration: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: gapColor(gap.type), cursor: "pointer", height: 4 }} />
                <div className="flex justify-between mt-1">
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "rgba(0,245,255,0.35)" }}>0.1s</span>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "rgba(0,245,255,0.35)" }}>1.5s</span>
                </div>
              </div>
            )}
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── ClipCard ──────────────────────────────────────────────────────────────────

function ClipCard({ clip, index, isActive, onSelect, onDelete, onDurationChange, onDragStart, onDragOver, onDrop }: {
  clip: Clip; index: number; isActive: boolean;
  onSelect: () => void; onDelete: () => void;
  onDurationChange: (d: number) => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <motion.div className="relative flex-shrink-0 select-none"
      style={{ width: 124, border: isActive ? "1px solid rgba(0,245,255,0.6)" : "1px solid rgba(0,245,255,0.15)", boxShadow: isActive ? "0 0 18px rgba(0,245,255,0.18)" : "none", background: "rgba(0,8,18,0.85)", cursor: "pointer", transition: "border-color 0.18s, box-shadow 0.18s" }}
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onClick={onSelect}
      whileHover={{ scale: 1.03 } as any}>

      <div style={{ width: 124, height: 70, background: "#000", overflow: "hidden", position: "relative" }}>
        {clip.thumbnail
          ? <img src={clip.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
          : <div className="flex items-center justify-center w-full h-full">{clip.isImage ? <Image size={22} style={{ color: "rgba(0,245,255,0.25)" }} /> : <Film size={22} style={{ color: "rgba(0,245,255,0.25)" }} />}</div>}
        <div style={{ position: "absolute", top: 3, left: 3, fontFamily: "Share Tech Mono, monospace", fontSize: "0.38rem", color: clip.isImage ? "#00e5b0" : "#00f5ff", background: "rgba(0,0,0,0.7)", padding: "1px 4px", letterSpacing: "0.06em" }}>
          {clip.isImage ? "IMG" : "VID"} {index + 1}
        </div>
        <div style={{ position: "absolute", bottom: 3, right: 3, fontFamily: "Share Tech Mono, monospace", fontSize: "0.42rem", color: "#00f5ff", background: "rgba(0,0,0,0.75)", padding: "1px 3px" }}>
          {clip.isImage ? `${clip.duration.toFixed(1)}s` : fmt(clip.duration)}
        </div>
      </div>

      <div className="flex items-center justify-between px-1.5 py-0.5">
        <div style={{ color: "rgba(0,245,255,0.35)", lineHeight: 0, cursor: "grab" }} onMouseDown={(e) => e.stopPropagation()}><GripVertical size={11} /></div>
        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.4rem", color: "#7ab8d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 64 }}>{clip.name.replace(/\.[^.]+$/, "")}</p>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,68,68,0.45)", padding: 0, lineHeight: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,68,68,1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,68,68,0.45)"; }}>
          <Trash2 size={10} />
        </button>
      </div>

      {clip.isImage && (
        <div className="flex items-center justify-between px-1.5 py-1" style={{ borderTop: "1px solid rgba(0,229,176,0.15)", background: "rgba(0,229,176,0.04)" }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.42rem", color: "rgba(0,229,176,0.6)", letterSpacing: "0.06em" }}>HOLD</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onDurationChange(Math.max(1, parseFloat((clip.duration - 0.5).toFixed(1))))}
              style={{ width: 16, height: 16, background: "rgba(0,229,176,0.12)", border: "1px solid rgba(0,229,176,0.3)", color: "#00e5b0", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>−</button>
            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.5rem", color: "#00e5b0", minWidth: 28, textAlign: "center" }}>{clip.duration.toFixed(1)}s</span>
            <button onClick={() => onDurationChange(Math.min(15, parseFloat((clip.duration + 0.5).toFixed(1))))}
              style={{ width: 16, height: 16, background: "rgba(0,229,176,0.12)", border: "1px solid rgba(0,229,176,0.3)", color: "#00e5b0", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── AudioTrackRow ─────────────────────────────────────────────────────────────

function AudioTrackRow({ track, totalDuration, onChange, onDelete }: {
  track: AudioTrack;
  totalDuration: number;
  onChange: (t: AudioTrack) => void;
  onDelete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(600);
  const dragging = useRef<{ startX: number; startOffset: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const safeTotal = totalDuration > 0.1 ? totalDuration : 10;
  const pxPerSec = containerW / safeTotal;
  const blockW = Math.max(40, Math.min(track.duration * pxPerSec, containerW));
  const blockLeft = Math.min(track.offset * pxPerSec, containerW - blockW);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { startX: e.clientX, startOffset: track.offset };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dSec = (ev.clientX - dragging.current.startX) / pxPerSec;
      const newOffset = Math.max(0, dragging.current.startOffset + dSec);
      onChange({ ...track, offset: parseFloat(newOffset.toFixed(2)) });
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const fmt = (s: number) => isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--";

  return (
    <div style={{ display: "flex", alignItems: "stretch", height: 38, marginTop: 6 }}>
      {/* Label column — matches timeline left gutter */}
      <div style={{ width: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(160,96,255,0.08)", border: "1px solid rgba(160,96,255,0.2)", borderRight: "none" }}>
        <Music size={11} style={{ color: "#a060ff" }} />
      </div>

      {/* Draggable track area */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", background: "rgba(112,0,255,0.04)", border: "1px solid rgba(160,96,255,0.18)", overflow: "hidden" }}>
        {/* Subtle grid lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, rgba(160,96,255,0.05) 0px, rgba(160,96,255,0.05) 1px, transparent 1px, transparent 60px)", pointerEvents: "none" }} />

        {/* Audio block */}
        <motion.div
          onMouseDown={onMouseDown}
          style={{
            position: "absolute",
            left: blockLeft,
            width: blockW,
            top: 4, bottom: 4,
            background: "rgba(112,0,255,0.28)",
            border: "1px solid rgba(160,96,255,0.65)",
            borderRadius: 3,
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 6px",
            userSelect: "none",
          }}
          whileHover={{ background: "rgba(112,0,255,0.38)" } as any}>
          <GripVertical size={9} style={{ color: "rgba(160,96,255,0.7)", flexShrink: 0 }} />
          <Music size={9} style={{ color: "#c090ff", flexShrink: 0 }} />
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.4rem", color: "#c090ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {track.name.replace(/\.[^.]+$/, "")}
          </span>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.38rem", color: "rgba(192,144,255,0.55)", flexShrink: 0 }}>
            {fmt(track.duration)}
          </span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,68,68,0.4)", padding: 0, flexShrink: 0, lineHeight: 0 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,68,68,1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,68,68,0.4)"; }}>
            <Trash2 size={9} />
          </button>
        </motion.div>
      </div>

      {/* Offset display */}
      <div style={{ width: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(112,0,255,0.06)", border: "1px solid rgba(160,96,255,0.18)", borderLeft: "none" }}>
        <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.42rem", color: "#a060ff" }}>+{track.offset.toFixed(1)}s</span>
      </div>
    </div>
  );
}

// ── StudioPage ────────────────────────────────────────────────────────────────

export function StudioPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [gaps, setGaps] = useState<GapSettings[]>([]);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seqMode, setSeqMode] = useState(false);
  const [seqIdx, setSeqIdx] = useState(0);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("idle");
  const [renderPct, setRenderPct] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  const dragIdx = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const activeClip = clips.find((c) => c.id === activeId) ?? null;
  const isRendering = renderStatus === "uploading" || renderStatus === "rendering";
  const previewSrc = seqMode ? (clips[seqIdx]?.url ?? null) : (activeClip?.url ?? null);
  const previewIsImage = seqMode ? (clips[seqIdx]?.isImage ?? false) : (activeClip?.isImage ?? false);

  // Total video duration accounting for transition overlaps
  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0)
    - gaps.reduce((sum, g, i) => sum + (i < clips.length - 1 && g.type !== "cut" ? g.duration : 0), 0);

  useEffect(() => {
    if (!seqMode) return;
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      setSeqIdx((i) => {
        const next = (i + 1) % clips.length;
        if (videoRef.current && !clips[next]?.isImage) { videoRef.current.src = clips[next].url; videoRef.current.play(); }
        return next;
      });
    };
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [seqMode, clips]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => isVideoFile(f) || isImageFile(f));
    if (!arr.length) return;
    setProcessing(true);
    const newClips: Clip[] = await Promise.all(
      arr.map(async (file) => {
        const { thumbnail, duration, isImage } = await extractMeta(file);
        return { id: Math.random().toString(36).slice(2), file, name: file.name, url: URL.createObjectURL(file), thumbnail, duration, isImage };
      })
    );
    setProcessing(false);
    setClips((prev) => {
      const updated = [...prev, ...newClips];
      setGaps(Array(Math.max(0, updated.length - 1)).fill(null).map(() => ({ ...DEFAULT_GAP })));
      return updated;
    });
    if (!activeId && newClips[0]) setActiveId(newClips[0].id);
  }, [activeId]);

  const addAudio = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files).find(isAudioFile);
    if (!file) return;
    const { duration } = await extractAudioMeta(file);
    if (audioTrack) URL.revokeObjectURL(audioTrack.url);
    setAudioTrack({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      duration,
      offset: 0,
    });
  }, [audioTrack]);

  const deleteClip = (id: string) => {
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      URL.revokeObjectURL(prev[idx].url);
      const next = prev.filter((c) => c.id !== id);
      setGaps(Array(Math.max(0, next.length - 1)).fill(null).map(() => ({ ...DEFAULT_GAP })));
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const setClipDuration = (id: string, d: number) =>
    setClips((prev) => prev.map((c) => c.id === id ? { ...c, duration: d } : c));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setClips((prev) => { const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return arr; });
  };

  const startSequence = () => {
    setSeqMode(true); setSeqIdx(0);
    setTimeout(() => { if (videoRef.current && clips[0] && !clips[0].isImage) { videoRef.current.src = clips[0].url; videoRef.current.play(); } }, 50);
  };

  const handleRender = async () => {
    if (!clips.length) return;
    setRenderStatus("uploading"); setError(null); setResultUrl(null);
    try {
      const ids: string[] = [];
      const totalFiles = clips.length + (audioTrack ? 1 : 0);
      for (let i = 0; i < clips.length; i++) {
        setRenderPct((i / totalFiles) * 0.45);
        ids.push(await apiUpload(clips[i].file));
      }

      let audioId: string | undefined;
      if (audioTrack) {
        setRenderPct((clips.length / totalFiles) * 0.45);
        audioId = await apiUpload(audioTrack.file);
      }

      setRenderStatus("rendering"); setRenderPct(0.5);
      const clip_durations = clips.map((c) => c.isImage ? c.duration : 0);
      const jobId = await apiStudioRender(ids, gaps, clip_durations, audioId, audioTrack?.offset ?? 0);

      // Poll until done (same pattern as other pages)
      await new Promise<void>((resolve, reject) => {
        const iv = setInterval(async () => {
          try {
            const s = await apiStatus(jobId);
            setRenderPct(0.5 + s.progress * 0.5);
            if (s.status === "done") { clearInterval(iv); resolve(); }
            else if (s.status === "error") { clearInterval(iv); reject(new Error(s.error ?? "Render failed")); }
          } catch (e) { clearInterval(iv); reject(e); }
        }, 2000);
      });

      setResultUrl(getResultUrl(jobId)); setRenderStatus("done"); setRenderPct(1);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Render failed"); setRenderStatus("error");
    }
  };

  const handleReset = () => {
    clips.forEach((c) => URL.revokeObjectURL(c.url));
    if (audioTrack) URL.revokeObjectURL(audioTrack.url);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setClips([]); setGaps([]); setAudioTrack(null); setActiveId(null); setResultUrl(null);
    setRenderStatus("idle"); setError(null); setRenderPct(0); setSeqMode(false); setSeqIdx(0);
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-6" style={{ background: "linear-gradient(180deg, #00f5ff, #7000ff)" }} />
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.4rem", color: "#00f5ff", letterSpacing: "0.12em" }}>STUDIO</h1>
        </div>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "#7ab8d0" }}>
          Combine video clips &amp; images — reorder, set transitions, add audio, render final MP4
        </p>
      </div>

      {/* Upload zone */}
      <motion.div className="mb-4 flex items-center justify-center"
        style={{ border: `1px dashed ${dropActive ? "rgba(0,245,255,0.75)" : "rgba(0,245,255,0.22)"}`, background: dropActive ? "rgba(0,245,255,0.05)" : "rgba(0,8,18,0.55)", padding: clips.length ? "14px 0" : "52px 0", cursor: "pointer", transition: "all 0.18s" }}
        onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => { e.preventDefault(); setDropActive(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        whileHover={{ scale: 1.005 } as any}>
        <input ref={fileRef} type="file" accept="video/mp4,video/*,image/jpeg,image/png,image/webp,image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
        {processing ? (
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Film size={16} style={{ color: "#00f5ff" }} /></motion.div>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#00f5ff", letterSpacing: "0.1em" }}>PROCESSING…</span>
          </div>
        ) : clips.length > 0 ? (
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "rgba(0,245,255,0.55)", letterSpacing: "0.1em" }}>+ ADD MORE CLIPS OR IMAGES</span>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Film size={30} style={{ color: "rgba(0,245,255,0.35)" }} />
              <span style={{ color: "rgba(0,245,255,0.2)", fontSize: "1.2rem" }}>+</span>
              <Image size={28} style={{ color: "rgba(0,229,176,0.4)" }} />
            </div>
            <div className="text-center">
              <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem", color: "#00f5ff", letterSpacing: "0.12em" }}>DROP MP4 CLIPS OR IMAGES</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.82rem", color: "rgba(0,245,255,0.45)", marginTop: 4 }}>
                JPG · PNG · WEBP · MP4 · MOV · drag to reorder
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {clips.length > 0 && (
        <>
          {/* Timeline */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "rgba(0,245,255,0.45)", letterSpacing: "0.15em" }}>
                TIMELINE — {clips.length} ITEM{clips.length > 1 ? "S" : ""} · {totalDuration.toFixed(1)}s · drag to reorder
              </p>
              {/* Add audio button */}
              <button
                onClick={() => audioFileRef.current?.click()}
                style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: audioTrack ? "#a060ff" : "rgba(160,96,255,0.6)", border: `1px solid ${audioTrack ? "rgba(160,96,255,0.5)" : "rgba(160,96,255,0.25)"}`, background: audioTrack ? "rgba(112,0,255,0.12)" : "transparent", padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(160,96,255,0.6)"; (e.currentTarget as HTMLButtonElement).style.color = "#c090ff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = audioTrack ? "rgba(160,96,255,0.5)" : "rgba(160,96,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = audioTrack ? "#a060ff" : "rgba(160,96,255,0.6)"; }}>
                <Music size={10} />
                {audioTrack ? audioTrack.name.replace(/\.[^.]+$/, "").slice(0, 14) : "+ ADD AUDIO"}
              </button>
              <input ref={audioFileRef} type="file" accept="audio/*,.mp3,.wav,.aac,.ogg,.flac,.m4a" style={{ display: "none" }} onChange={(e) => e.target.files && addAudio(e.target.files)} />
            </div>

            {/* Clips row */}
            <div className="flex items-center overflow-x-auto pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,245,255,0.18) transparent" }}>
              {clips.map((clip, i) => (
                <div key={clip.id} className="flex items-center flex-shrink-0">
                  <ClipCard clip={clip} index={i}
                    isActive={activeId === clip.id && !seqMode}
                    onSelect={() => { setActiveId(clip.id); setSeqMode(false); }}
                    onDelete={() => deleteClip(clip.id)}
                    onDurationChange={(d) => setClipDuration(clip.id, d)}
                    onDragStart={() => { dragIdx.current = i; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIdx.current !== null) { reorder(dragIdx.current, i); dragIdx.current = null; } }}
                  />
                  {i < clips.length - 1 && (
                    <TransitionPicker gap={gaps[i] ?? DEFAULT_GAP} onChange={(g) => setGaps((prev) => { const a = [...prev]; a[i] = g; return a; })} />
                  )}
                </div>
              ))}
            </div>

            {/* Audio track row */}
            <AnimatePresence>
              {audioTrack && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <AudioTrackRow
                    track={audioTrack}
                    totalDuration={Math.max(totalDuration, 1)}
                    onChange={setAudioTrack}
                    onDelete={() => { URL.revokeObjectURL(audioTrack.url); setAudioTrack(null); }}
                  />
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.42rem", color: "rgba(160,96,255,0.45)", marginTop: 4, letterSpacing: "0.08em" }}>
                    drag audio block to set start position · offset: {audioTrack.offset.toFixed(1)}s
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Preview + controls */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
            <div className="lg:col-span-3">
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.48rem", color: "rgba(0,245,255,0.45)", letterSpacing: "0.15em", marginBottom: 8 }}>
                {seqMode ? `SEQUENCE PREVIEW — ${seqIdx + 1}/${clips.length}` : `PREVIEW${activeClip ? ` — ${activeClip.name}` : ""}`}
              </p>
              <div style={{ border: "1px solid rgba(0,245,255,0.28)", boxShadow: "0 0 28px rgba(0,245,255,0.08)", position: "relative", background: "#000" }}>
                <div className="absolute top-0 left-0 right-0 h-px z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, transparent, #00f5ff70, #7000ff70, transparent)" }} />
                {previewSrc ? (
                  previewIsImage
                    ? <img src={previewSrc} style={{ width: "100%", display: "block", maxHeight: 380, objectFit: "contain", background: "#000" }} alt="" />
                    : <video ref={videoRef} key={seqMode ? `seq-${seqIdx}` : `clip-${activeId}`} src={previewSrc} controls autoPlay={seqMode} style={{ width: "100%", display: "block", maxHeight: 380 }} />
                ) : (
                  <div className="flex items-center justify-center" style={{ height: 220 }}><Play size={36} style={{ color: "rgba(0,245,255,0.18)" }} /></div>
                )}
                {([{ top: 5, left: 5 }, { top: 5, right: 5 }, { bottom: 5, right: 5 }, { bottom: 5, left: 5 }] as React.CSSProperties[]).map((p, i) => (
                  <div key={i} className="absolute w-4 h-4 pointer-events-none z-10" style={{ ...p, borderColor: "rgba(0,245,255,0.45)", borderStyle: "solid", borderWidth: 0, borderTopWidth: (i===0||i===1)?1.5:0, borderBottomWidth: (i===2||i===3)?1.5:0, borderLeftWidth: (i===0||i===3)?1.5:0, borderRightWidth: (i===1||i===2)?1.5:0 }} />
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-3 justify-end">
              <motion.button className="px-5 py-3 relative overflow-hidden"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.14em", color: seqMode ? "#0a0a0f" : "#00f5ff", border: "1px solid rgba(0,245,255,0.38)", background: seqMode ? "linear-gradient(135deg, #00f5ff, #7000ff)" : "rgba(0,245,255,0.05)", cursor: "pointer" }}
                onClick={startSequence} whileHover={{ scale: 1.02 } as any} whileTap={{ scale: 0.97 } as any}>
                <Play size={11} className="inline mr-2" />PREVIEW SEQUENCE
              </motion.button>

              <AnimatePresence mode="wait">
                {renderStatus === "done" ? (
                  <motion.div key="done" className="flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ border: "1px solid rgba(0,245,255,0.18)", background: "rgba(0,245,255,0.04)", padding: "10px 14px" }}>
                      <div className="flex items-center gap-2">
                        <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00f5ff", boxShadow: "0 0 8px #00f5ff" }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#00f5ff", letterSpacing: "0.1em" }}>RENDER COMPLETE</p>
                      </div>
                    </div>
                    <motion.a href={resultUrl!} target="_blank" rel="noopener noreferrer" download="studio_result.mp4" className="flex items-center justify-center gap-2 px-5 py-3 relative overflow-hidden no-underline"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.62rem", letterSpacing: "0.14em", color: "#0a0a0f", background: "linear-gradient(135deg, #00f5ff, #7000ff)", boxShadow: "0 0 28px rgba(0,245,255,0.35)" }}
                      whileHover={{ scale: 1.03, boxShadow: "0 0 48px rgba(0,245,255,0.55)" } as any} whileTap={{ scale: 0.97 } as any}>
                      <Download size={13} /> DOWNLOAD MP4
                      <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                    </motion.a>
                    <motion.button onClick={handleReset} style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: "#7ab8d0", border: "1px solid rgba(0,245,255,0.15)", background: "transparent", cursor: "pointer", padding: "7px", letterSpacing: "0.1em" }} whileHover={{ scale: 1.02 } as any}>
                      NEW SESSION
                    </motion.button>
                  </motion.div>
                ) : isRendering ? (
                  <motion.div key="rendering" style={{ border: "1px solid rgba(0,245,255,0.18)", background: "rgba(0,8,18,0.85)", padding: "16px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Film size={14} style={{ color: "#00f5ff" }} /></motion.div>
                      <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.52rem", color: "#00f5ff", letterSpacing: "0.09em" }}>
                        {renderStatus === "uploading" ? "UPLOADING…" : "FFMPEG RENDERING…"}
                      </p>
                    </div>
                    <div className="h-1" style={{ background: "rgba(0,245,255,0.08)" }}>
                      <motion.div className="h-full" style={{ background: "linear-gradient(90deg, #00f5ff, #7000ff)", boxShadow: "0 0 8px #00f5ff60" }} animate={{ width: `${Math.round(renderPct * 100)}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {error && (
                      <div style={{ border: "1px solid rgba(255,68,68,0.28)", background: "rgba(255,68,68,0.05)", padding: "10px 14px" }}>
                        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.82rem", color: "#ff4455" }}>{error}</p>
                      </div>
                    )}
                    <motion.button className="px-5 py-3 relative overflow-hidden"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.64rem", letterSpacing: "0.15em", color: "#0a0a0f", background: "linear-gradient(135deg, #00f5ff, #7000ff)", border: "none", cursor: clips.length === 0 ? "not-allowed" : "pointer", boxShadow: "0 0 28px rgba(0,245,255,0.28)", opacity: clips.length === 0 ? 0.4 : 1 }}
                      onClick={handleRender} disabled={clips.length === 0}
                      whileHover={clips.length > 0 ? { scale: 1.03, boxShadow: "0 0 48px rgba(0,245,255,0.48)" } as any : {}}
                      whileTap={clips.length > 0 ? { scale: 0.97 } as any : {}}>
                      <Film size={13} className="inline mr-2" />RENDER FINAL
                      <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.14), transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
