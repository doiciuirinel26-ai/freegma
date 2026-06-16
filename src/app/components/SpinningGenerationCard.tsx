import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SpinningGenerationCardProps {
  imageSrc: string;
  accentColor: string;
  label: string;
  isSpinning: boolean;
  onHidden?: () => void;
}

interface Bolt {
  id: number;
  d: string;
  color: string;
  width: number;
  glowWidth: number;
}

const BOLT_COLORS_BASE = ["#ffffff", "#00f5ff"];

function buildBolt(cx: number, cy: number, hw: number, hh: number, accentColor: string): Bolt {
  const colors = [accentColor, ...BOLT_COLORS_BASE, accentColor];
  const edge = Math.floor(Math.random() * 4);
  let sx: number, sy: number;
  if (edge === 0)      { sx = cx + (Math.random() - 0.5) * hw * 2; sy = cy - hh; }
  else if (edge === 1) { sx = cx + hw; sy = cy + (Math.random() - 0.5) * hh * 2; }
  else if (edge === 2) { sx = cx + (Math.random() - 0.5) * hw * 2; sy = cy + hh; }
  else                 { sx = cx - hw; sy = cy + (Math.random() - 0.5) * hh * 2; }
  const dx = sx - cx, dy = sy - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const reach = 40 + Math.random() * 100;
  const ux = dx / dist, uy = dy / dist;
  const segs = 4 + Math.floor(Math.random() * 5);
  const pts: [number, number][] = [[sx, sy]];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    pts.push([sx + ux * reach * t + (Math.random() - 0.5) * 28, sy + uy * reach * t + (Math.random() - 0.5) * 28]);
  }
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const color = colors[Math.floor(Math.random() * colors.length)];
  return { id: Math.random(), d, color, width: 0.8 + Math.random() * 0.8, glowWidth: 4 };
}

function LightningRing({ active, accentColor, cardW, cardH, svgW, svgH, intensityRef }: {
  active: boolean; accentColor: string;
  cardW: number; cardH: number; svgW: number; svgH: number;
  intensityRef: React.MutableRefObject<number>;
}) {
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const cx = svgW / 2, cy = svgH / 2;
  const hw = cardW / 2, hh = cardH / 2;

  useEffect(() => {
    if (!active) { setBolts([]); return; }
    let timerId: ReturnType<typeof setTimeout>;
    const fire = () => {
      const intensity = intensityRef.current;
      const count = 3 + Math.floor(intensity * 6);
      setBolts(Array.from({ length: count }, () => buildBolt(cx, cy, hw, hh, accentColor)));
      const ms = Math.max(45, 130 - intensity * 85);
      timerId = setTimeout(fire, ms);
    };
    fire();
    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cx, cy, hw, hh, accentColor]);

  if (!active || bolts.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" width={svgW} height={svgH} style={{ zIndex: 20, overflow: "visible" }}>
      <defs>
        <filter id={`bolt-glow-sg-${accentColor.replace("#", "")}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {bolts.map((b) => (
        <g key={b.id} filter={`url(#bolt-glow-sg-${accentColor.replace("#", "")})`}>
          <path d={b.d} fill="none" stroke={b.color} strokeWidth={b.glowWidth} strokeOpacity={0.18} strokeLinecap="round" />
          <path d={b.d} fill="none" stroke={b.color} strokeWidth={b.width} strokeOpacity={0.9} strokeLinecap="round" />
          <path d={b.d} fill="none" stroke="#fff" strokeWidth={0.3} strokeOpacity={0.55} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

const CARD_W = 220, CARD_H = 300, SVG_W = 520, SVG_H = 460;

export function SpinningGenerationCard({ imageSrc, accentColor, label, isSpinning, onHidden }: SpinningGenerationCardProps) {
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [scanY, setScanY] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const speedRef = useRef(0);
  const angleRef = useRef(0);
  const opacityRef = useRef(1);
  const scanRef = useRef(0);
  const intensityRef = useRef(0);
  const isSpinRef = useRef(isSpinning);
  const hiddenFired = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => { isSpinRef.current = isSpinning; }, [isSpinning]);

  useEffect(() => {
    hiddenFired.current = false;
    const tick = () => {
      const spinning = isSpinRef.current;
      if (spinning) { speedRef.current = Math.min(14, speedRef.current + 0.05); }
      else { speedRef.current = Math.max(0, speedRef.current - 0.35); }
      angleRef.current = (angleRef.current + speedRef.current) % 360;
      setRotation(angleRef.current);
      const newIntensity = speedRef.current / 14;
      intensityRef.current = newIntensity;
      setIntensity(newIntensity);
      scanRef.current = (scanRef.current + 0.6) % 100;
      setScanY(scanRef.current);
      if (!spinning && speedRef.current === 0) {
        opacityRef.current = Math.max(0, opacityRef.current - 0.04);
        setOpacity(opacityRef.current);
        if (opacityRef.current === 0 && !hiddenFired.current) {
          hiddenFired.current = true;
          onHidden?.();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSpinning) { opacityRef.current = 1; setOpacity(1); hiddenFired.current = false; }
  }, [isSpinning]);

  const glowSize = 20 + intensity * 60;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: SVG_W, maxWidth: "100%", opacity }}>
      <AnimatePresence>
        {(isSpinning || speedRef.current > 0) && (
          <motion.div className="mb-6 flex items-center gap-2" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.35, repeat: Infinity }} />
            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", letterSpacing: "0.22em", color: accentColor, textShadow: `0 0 16px ${accentColor}` }}>{label}</span>
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.35, repeat: Infinity, delay: 0.17 }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-center" style={{ width: SVG_W, height: SVG_H, maxWidth: "100%" }}>
        <LightningRing active={intensity > 0.15} accentColor={accentColor} cardW={CARD_W} cardH={CARD_H} svgW={SVG_W} svgH={SVG_H} intensityRef={intensityRef} />

        <div style={{ perspective: "700px", perspectiveOrigin: "50% 50%" }}>
          <div style={{ width: CARD_W, height: CARD_H, transform: `rotateY(${rotation}deg)`, transformStyle: "preserve-3d", willChange: "transform", position: "relative" }}>
            {/* Front */}
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", overflow: "hidden", boxShadow: `0 0 ${glowSize}px ${accentColor}60, 0 0 ${glowSize * 2}px ${accentColor}25`, border: `1px solid ${accentColor}${intensity > 0.4 ? "80" : "35"}` }}>
              <img src={imageSrc} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", filter: `brightness(${0.85 + intensity * 0.4}) saturate(${1.1 + intensity * 0.5}) contrast(${1 + intensity * 0.12})` }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${accentColor}00 25%, ${accentColor}50 100%)`, mixBlendMode: "screen", opacity: 0.6 + intensity * 0.35 }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}10 0px, transparent 1px, transparent 5px)` }} />
              <div style={{ position: "absolute", left: 0, right: 0, height: 2, pointerEvents: "none", top: `${scanY}%`, background: `linear-gradient(90deg, transparent, ${accentColor}cc 40%, ${accentColor} 50%, ${accentColor}cc 60%, transparent)`, boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}80` }} />
              {[{ top: 6, left: 6, bT: true, bL: true }, { top: 6, right: 6, bT: true, bR: true }, { bottom: 6, right: 6, bB: true, bR: true }, { bottom: 6, left: 6, bB: true, bL: true }].map((c, i) => (
                <div key={i} style={{ position: "absolute", top: c.top, bottom: c.bottom, left: c.left, right: c.right, width: 20, height: 20, borderColor: accentColor, borderStyle: "solid", borderWidth: 0, borderTopWidth: c.bT ? 1.5 : 0, borderBottomWidth: c.bB ? 1.5 : 0, borderLeftWidth: c.bL ? 1.5 : 0, borderRightWidth: c.bR ? 1.5 : 0, opacity: 0.6 + intensity * 0.4 }} />
              ))}
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, boxShadow: `0 0 ${6 + intensity * 10}px ${accentColor}` }} />
              </div>
            </div>
            {/* Back */}
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden", background: "rgba(0,8,20,0.85)", border: `1px solid ${accentColor}35`, boxShadow: `0 0 ${glowSize}px ${accentColor}40` }}>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}08 0px, transparent 1px, transparent 18px), repeating-linear-gradient(90deg, ${accentColor}08 0px, transparent 1px, transparent 18px)` }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)` }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}0a 0px, transparent 1px, transparent 5px)` }} />
            </div>
          </div>
        </div>

        {intensity > 0.3 && (
          <>
            {[1, 1.35, 1.7].map((scale, i) => (
              <motion.div key={i} style={{ position: "absolute", width: CARD_W + 20, height: CARD_H + 20, border: `1px solid ${accentColor}`, pointerEvents: "none" }}
                animate={{ scale: [scale, scale * 1.12, scale], opacity: [0.3 - i * 0.07, 0, 0.3 - i * 0.07] }}
                transition={{ duration: Math.max(0.3, 0.8 - intensity * 0.5), repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </>
        )}
      </div>

      <AnimatePresence>
        {(isSpinning || speedRef.current > 0) && (
          <motion.div className="flex items-center gap-2 mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
