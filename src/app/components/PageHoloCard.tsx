import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface PageHoloCardProps {
  imageSrc: string;
  label: string;
  subtitle: string;
  accentColor: string;
}

function BaseEmitter({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 320 56" className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`pg-base-${color.replace("#", "")}`} cx="50%" cy="35%" rx="50%" ry="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.65" />
          <stop offset="45%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`pg-glow-${color.replace("#", "")}`}>
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="160" cy="28" rx="148" ry="20"
        fill={`url(#pg-base-${color.replace("#", "")})`}
        stroke={color} strokeWidth="0.8" strokeOpacity="0.45"
        filter={`url(#pg-glow-${color.replace("#", "")})`}
      />
      <ellipse cx="160" cy="28" rx="100" ry="13"
        fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.3"
      />
      <ellipse cx="160" cy="28" rx="56" ry="8"
        fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"
      />
      <circle cx="160" cy="28" r="7" fill={color} fillOpacity="0.55"
        filter={`url(#pg-glow-${color.replace("#", "")})`}
      />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <circle key={i} cx={160 + 148 * Math.cos(a)} cy={28 + 20 * Math.sin(a)} r="1.4" fill={color} fillOpacity="0.4" />;
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <line key={i}
            x1={160 + 56 * Math.cos(a)} y1={28 + 8 * Math.sin(a)}
            x2={160 + 100 * Math.cos(a)} y2={28 + 13 * Math.sin(a)}
            stroke={color} strokeWidth="0.5" strokeOpacity="0.25"
          />
        );
      })}
    </svg>
  );
}

export function PageHoloCard({ imageSrc, label, subtitle, accentColor }: PageHoloCardProps) {
  const [scanY, setScanY] = useState(0);
  const [hovered, setHovered] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let y = 0;
    const tick = () => {
      y = (y + 0.3) % 100;
      setScanY(y);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="flex flex-col items-center w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-full flex flex-col items-center">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
          width: "55%", height: 360,
          background: `linear-gradient(to top, ${accentColor}22, transparent)`,
          clipPath: "polygon(20% 100%, 80% 100%, 70% 0%, 30% 0%)",
          zIndex: 0, opacity: hovered ? 0.8 : 0.45, transition: "opacity 0.35s",
        }} />

        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
          style={{ width: "min(280px, 80%)" }}
        >
          <motion.div
            className="relative overflow-hidden"
            style={{
              aspectRatio: "3/4",
              boxShadow: hovered
                ? `0 0 60px ${accentColor}55, 0 0 120px ${accentColor}25, inset 0 0 40px ${accentColor}12`
                : `0 0 30px ${accentColor}35, inset 0 0 20px ${accentColor}08`,
              border: `1px solid ${accentColor}${hovered ? "55" : "22"}`,
              transition: "box-shadow 0.35s, border-color 0.35s",
            }}
            animate={{ rotateY: hovered ? 5 : 0, scale: hovered ? 1.03 : 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
          >
            <img src={imageSrc} alt={label} className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ filter: hovered ? "brightness(1.18) saturate(1.35) contrast(1.08)" : "brightness(0.88) saturate(1.08)", transition: "filter 0.35s" }} />
            <div className="absolute inset-0" style={{
              background: `linear-gradient(180deg, ${accentColor}00 25%, ${accentColor}45 100%)`,
              mixBlendMode: "screen", opacity: hovered ? 0.95 : 0.65, transition: "opacity 0.35s",
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 60%, rgba(0,8,18,0.6) 100%)`,
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}0c 0px, transparent 1px, transparent 5px)`,
              opacity: hovered ? 1 : 0.65, transition: "opacity 0.3s",
            }} />
            <div className="absolute left-0 right-0 h-0.5 pointer-events-none" style={{
              top: `${scanY}%`,
              background: `linear-gradient(90deg, transparent 5%, ${accentColor}99 35%, ${accentColor} 50%, ${accentColor}99 65%, transparent 95%)`,
              boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}60`,
              opacity: hovered ? 1 : 0.5, transition: "opacity 0.3s",
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `linear-gradient(172deg, #ff000009 0%, transparent 45%, #00ffff07 100%)`,
              transform: "translateX(-2px)", mixBlendMode: "screen", opacity: hovered ? 1 : 0.6, transition: "opacity 0.35s",
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `linear-gradient(172deg, #00ffff09 0%, transparent 45%, #ff000007 100%)`,
              transform: "translateX(2px)", mixBlendMode: "screen", opacity: hovered ? 1 : 0.6, transition: "opacity 0.35s",
            }} />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(120deg, transparent 25%, ${accentColor}1a 50%, transparent 75%)`, mixBlendMode: "screen" }}
              animate={hovered ? { x: ["-60%", "160%"] } : { x: "-60%" }}
              transition={hovered ? { duration: 1.2, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
            />
            {[
              { top: 8, left: 8, bT: true, bL: true },
              { top: 8, right: 8, bT: true, bR: true },
              { bottom: 8, right: 8, bB: true, bR: true },
              { bottom: 8, left: 8, bB: true, bL: true },
            ].map((c, i) => (
              <div key={i} className="absolute w-6 h-6" style={{
                top: c.top, bottom: c.bottom, left: c.left, right: c.right,
                borderColor: accentColor, borderStyle: "solid", borderWidth: 0,
                borderTopWidth: c.bT ? 1.5 : 0,
                borderBottomWidth: c.bB ? 1.5 : 0,
                borderLeftWidth: c.bL ? 1.5 : 0,
                borderRightWidth: c.bR ? 1.5 : 0,
                opacity: hovered ? 0.85 : 0.35, transition: "opacity 0.3s",
              }} />
            ))}
            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-10">
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: accentColor, letterSpacing: "0.18em", textShadow: `0 0 8px ${accentColor}`, opacity: hovered ? 1 : 0.6, transition: "opacity 0.3s" }}>
                FREEGMA.AI
              </span>
              <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
            </div>
          </motion.div>
        </motion.div>

        <div className="w-full max-w-xs -mt-1 z-10">
          <BaseEmitter color={accentColor} />
        </div>
      </div>

      <motion.div className="text-center mt-2" animate={{ opacity: hovered ? 1 : 0.72 }} transition={{ duration: 0.2 }}>
        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.62rem", letterSpacing: "0.28em", color: accentColor, textShadow: `0 0 ${hovered ? 16 : 8}px ${accentColor}`, transition: "text-shadow 0.35s" }}>
          {subtitle.toUpperCase()}
        </p>
        <h3 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem", fontWeight: 700, color: "#e0f7ff", letterSpacing: "0.06em", marginTop: 4, textShadow: `0 0 ${hovered ? 20 : 10}px ${accentColor}55`, transition: "text-shadow 0.35s" }}>
          {label}
        </h3>
        <motion.div
          className="mx-auto mt-2 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
          animate={{ width: hovered ? "85%" : "40%", opacity: hovered ? 1 : 0.35 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </div>
  );
}
