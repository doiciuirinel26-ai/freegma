import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

const NAV_TOOLS = [
  { path: "/text-to-image", label: "Text to Image", short: "TXT→IMG", color: "#00f5ff" },
  { path: "/image-to-3d", label: "Image to 3D", short: "IMG→3D", color: "#7000ff" },
  { path: "/image-to-video", label: "Image to Video", short: "IMG→VID", color: "#0066ff" },
  { path: "/upscale", label: "Upscale", short: "UPSCALE", color: "#00ff88" },
  { path: "/ads-studio", label: "Ads Studio", short: "ADS", color: "#ff9500" },
];

function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, #7000ff12 0%, transparent 70%)" }}
      />
      <div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, #0066ff12 0%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, #0a0a0f 100%)" }}
      />
    </div>
  );
}

export function Layout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "#0a0a0f", fontFamily: "Rajdhani, sans-serif" }}
    >
      <GridBackground />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: scrolled ? "rgba(10,10,15,0.92)" : "rgba(10,10,15,0.7)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,245,255,0.08)",
          transition: "background 0.3s",
        }}
      >
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 no-underline">
          <svg width="28" height="28" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="nav-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f5ff" />
                <stop offset="100%" stopColor="#7000ff" />
              </linearGradient>
            </defs>
            <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="none" stroke="url(#nav-logo-grad)" strokeWidth="1.5" />
            <polygon points="16,8 24,13 24,19 16,24 8,19 8,13" fill="url(#nav-logo-grad)" fillOpacity="0.2" stroke="url(#nav-logo-grad)" strokeWidth="0.5" />
            <circle cx="16" cy="16" r="3" fill="#00f5ff" />
          </svg>
          <span
            style={{
              fontFamily: "Orbitron, sans-serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              background: "linear-gradient(90deg, #00f5ff, #7000ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.06em",
            }}
          >
            FREEGMA
          </span>
        </NavLink>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink
            to="/"
            end
            className="px-3 py-1.5 no-underline"
            style={({ isActive }) => ({
              fontFamily: "Orbitron, sans-serif",
              fontSize: "0.62rem",
              letterSpacing: "0.12em",
              color: isActive ? "#00f5ff" : "#7ab8d0",
              transition: "color 0.2s",
            })}
          >
            HOME
          </NavLink>

          <div className="w-px h-4 mx-2" style={{ background: "rgba(0,245,255,0.15)" }} />

          {NAV_TOOLS.map((tool) => (
            <NavLink
              key={tool.path}
              to={tool.path}
              className="relative px-3 py-1.5 no-underline group"
              style={({ isActive }) => ({
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.62rem",
                letterSpacing: "0.12em",
                color: isActive ? tool.color : "#7ab8d0",
                transition: "color 0.2s",
              })}
            >
              {({ isActive }) => (
                <>
                  {tool.short}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1 right-1 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden md:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5"
                style={{
                  fontFamily: "Share Tech Mono, monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                  color: "#00f5ff",
                  border: "1px solid rgba(0,245,255,0.25)",
                  background: "rgba(0,245,255,0.05)",
                  cursor: "pointer",
                }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #00f5ff, #7000ff)", color: "#0a0a0f" }}>
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                {user.email?.split("@")[0].slice(0, 12)}
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    className="absolute right-0 mt-1 w-40 py-1"
                    style={{ background: "rgba(10,10,20,0.97)", border: "1px solid rgba(0,245,255,0.15)", backdropFilter: "blur(16px)", zIndex: 100 }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <button
                      onClick={async () => { await signOut(); setUserMenuOpen(false); navigate("/auth"); }}
                      className="w-full text-left px-4 py-2"
                      style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#ff6677", letterSpacing: "0.12em", background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,50,50,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      LOGOUT
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button
              onClick={() => navigate("/auth")}
              className="hidden md:block px-4 py-1.5 relative overflow-hidden"
              style={{
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.6rem",
                letterSpacing: "0.15em",
                color: "#00f5ff",
                border: "1px solid rgba(0,245,255,0.35)",
                background: "rgba(0,245,255,0.05)",
                cursor: "pointer",
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              LOGIN
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, transparent, rgba(0,245,255,0.12), transparent)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.button>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1 p-1"
            onClick={() => setMobileOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-px w-5"
                style={{ background: "#00f5ff" }}
                animate={{
                  rotate: mobileOpen ? (i === 0 ? 45 : i === 2 ? -45 : 0) : 0,
                  y: mobileOpen ? (i === 0 ? 4 : i === 2 ? -4 : 0) : 0,
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed top-12 left-0 right-0 z-40 flex flex-col py-4 px-6 gap-3"
            style={{
              background: "rgba(10,10,15,0.97)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(0,245,255,0.1)",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <NavLink to="/" end className="no-underline" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: "#7ab8d0", letterSpacing: "0.12em" }}>HOME</NavLink>
            {NAV_TOOLS.map((t) => (
              <NavLink key={t.path} to={t.path} className="no-underline" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: t.color, letterSpacing: "0.12em" }}>
                {t.label.toUpperCase()}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="relative z-10 pt-14 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
