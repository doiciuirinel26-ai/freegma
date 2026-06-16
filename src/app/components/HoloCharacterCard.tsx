import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface HoloCharacterCardProps {
  imageSrc: string;
  toolName: string;
  toolSubtitle: string;
  accentColor: string;
  index: number;
  onClick?: () => void;
}

function BaseEmitter({ color }: { color: string }) {
  return (
    <div className="relative w-full" style={{ height: 52 }}>
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-full"
        style={{
          width: 200,
          height: 280,
          background: `linear-gradient(to top, ${color}18, transparent)`,
          clipPath: "polygon(25% 100%, 75% 100%, 85% 0%, 15% 0%)",
          pointerEvents: "none",
        }}
      />
      <svg viewBox="0 0 240 52" className="w-full" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`emitter-${color.replace("#", "")}`} cx="50%" cy="35%" rx="50%" ry="65%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="40%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`emitter-glow-${color.replace("#", "")}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <ellipse cx="120" cy="26" rx="110" ry="18"
          fill={`url(#emitter-${color.replace("#", "")})`}
          stroke={color} strokeWidth="0.8" strokeOpacity="0.5"
          filter={`url(#emitter-glow-${color.replace("#", "")})`}
        />
        <ellipse cx="120" cy="26" rx="76" ry="12"
          fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.3"
        />
        <ellipse cx="120" cy="26" rx="44" ry="7"
          fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"
        />
        <circle cx="120" cy="26" r="6" fill={color} fillOpacity="0.6"
          filter={`url(#emitter-glow-${color.replace("#", "")})`}
        />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const rx = 110, ry = 18;
          const x = 120 + rx * Math.cos(angle);
          const y = 26 + ry * Math.sin(angle);
          return <circle key={i} cx={x} cy={y} r="1.2" fill={color} fillOpacity="0.5" />;
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <line key={i}
              x1={120 + 44 * Math.cos(angle)} y1={26 + 7 * Math.sin(angle)}
              x2={120 + 76 * Math.cos(angle)} y2={26 + 12 * Math.sin(angle)}
              stroke={color} strokeWidth="0.5" strokeOpacity="0.3"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function HoloCharacterCard({ imageSrc, toolName, toolSubtitle, accentColor, index, onClick }: HoloCharacterCardProps) {
  const [hovered, setHovered] = useState(false);
  const [scanY, setScanY] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let y = 0;
    const speed = 0.25 + index * 0.05;
    const tick = () => {
      y = (y + speed) % 100;
      setScanY(y);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index]);

  const glowStrength = hovered ? 40 : 18;

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: index * 0.18, ease: "easeOut" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4 + index * 0.7, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
        className="relative"
      >
        <motion.div
          className="relative overflow-hidden"
          style={{
            width: 220,
            height: 300,
            boxShadow: hovered
              ? `0 0 ${glowStrength * 2}px ${accentColor}50, 0 0 ${glowStrength}px ${accentColor}30, inset 0 0 30px ${accentColor}10`
              : `0 0 ${glowStrength}px ${accentColor}30, inset 0 0 20px ${accentColor}08`,
            transition: "box-shadow 0.35s ease",
          }}
          animate={{ rotateY: hovered ? 6 : 0, scale: hovered ? 1.04 : 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <img
            src={imageSrc}
            alt={toolName}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{
              filter: hovered ? "brightness(1.15) saturate(1.3) contrast(1.05)" : "brightness(0.85) saturate(1.05)",
              transition: "filter 0.35s ease",
            }}
          />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(180deg, ${accentColor}00 30%, ${accentColor}35 100%)`,
            mixBlendMode: "screen",
            opacity: hovered ? 0.9 : 0.65,
            transition: "opacity 0.35s ease",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 65%, rgba(0,10,20,0.55) 100%)`,
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}0a 0px, transparent 1px, transparent 4px, ${accentColor}06 5px)`,
            opacity: hovered ? 1 : 0.7,
            transition: "opacity 0.3s",
          }} />
          <div className="absolute left-0 right-0 pointer-events-none" style={{
            top: `${scanY}%`,
            height: 2,
            background: `linear-gradient(90deg, transparent 5%, ${accentColor}80 30%, ${accentColor} 50%, ${accentColor}80 70%, transparent 95%)`,
            boxShadow: `0 0 8px ${accentColor}`,
            opacity: hovered ? 0.9 : 0.45,
            transition: "opacity 0.3s",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `linear-gradient(175deg, #ff000008 0%, transparent 40%, #00ffff06 100%)`,
            transform: "translateX(-1.5px)", mixBlendMode: "screen",
            opacity: hovered ? 1 : 0.5, transition: "opacity 0.35s",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `linear-gradient(175deg, #00ffff08 0%, transparent 40%, #ff000006 100%)`,
            transform: "translateX(1.5px)", mixBlendMode: "screen",
            opacity: hovered ? 1 : 0.5, transition: "opacity 0.35s",
          }} />
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(125deg, transparent 30%, ${accentColor}18 50%, transparent 70%)`, mixBlendMode: "screen" }}
            animate={{ x: hovered ? ["-30%", "130%"] : "-30%" }}
            transition={hovered ? { duration: 1.4, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
          />
          {[
            { top: 6, left: 6, borderTop: true, borderLeft: true },
            { top: 6, right: 6, borderTop: true, borderRight: true },
            { bottom: 6, right: 6, borderBottom: true, borderRight: true },
            { bottom: 6, left: 6, borderBottom: true, borderLeft: true },
          ].map((c, i) => (
            <div key={i} className="absolute w-5 h-5" style={{
              top: "top" in c ? c.top : undefined,
              left: "left" in c ? c.left : undefined,
              right: "right" in c ? c.right : undefined,
              bottom: "bottom" in c ? c.bottom : undefined,
              borderColor: accentColor, borderStyle: "solid",
              borderTopWidth: c.borderTop ? 1.5 : 0,
              borderLeftWidth: c.borderLeft ? 1.5 : 0,
              borderRightWidth: c.borderRight ? 1.5 : 0,
              borderBottomWidth: c.borderBottom ? 1.5 : 0,
              opacity: hovered ? 0.9 : 0.45, transition: "opacity 0.3s",
            }} />
          ))}
          <div className="absolute inset-0 pointer-events-none" style={{
            border: `1px solid ${accentColor}`,
            opacity: hovered ? 0.5 : 0.18, transition: "opacity 0.35s",
          }} />
          <div className="absolute top-2 left-3 right-3 flex items-center justify-between">
            <div style={{
              fontFamily: "Share Tech Mono, monospace", fontSize: "0.46rem",
              color: accentColor, letterSpacing: "0.18em",
              opacity: hovered ? 0.9 : 0.55,
              textShadow: `0 0 6px ${accentColor}`, transition: "opacity 0.3s",
            }}>FREEGMA.AI</div>
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.3 }}
            />
          </div>
        </motion.div>
      </motion.div>

      <div className="w-56 -mt-1">
        <BaseEmitter color={accentColor} />
      </div>

      <motion.div className="text-center mt-1" animate={{ opacity: hovered ? 1 : 0.72 }} transition={{ duration: 0.2 }}>
        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: accentColor, letterSpacing: "0.25em", textShadow: `0 0 ${hovered ? 14 : 8}px ${accentColor}`, transition: "text-shadow 0.35s" }}>
          {toolSubtitle.toUpperCase()}
        </p>
        <h3 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#e0f7ff", textShadow: `0 0 ${hovered ? 18 : 10}px ${accentColor}60`, marginTop: 3, letterSpacing: "0.04em", transition: "text-shadow 0.35s" }}>
          {toolName}
        </h3>
        <motion.div
          className="mx-auto mt-2 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
          animate={{ width: hovered ? "90%" : "45%", opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.3 }}
        />
        <motion.p
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.5rem", color: accentColor, letterSpacing: "0.2em", marginTop: 6 }}
        >
          CLICK TO OPEN →
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
