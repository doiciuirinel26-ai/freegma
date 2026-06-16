import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

export function AuthPage() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? "/text-to-image";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    if (mode === "login") {
      const err = await signIn(email, password);
      if (err) {
        setError(err);
        setLoading(false);
      } else {
        navigate(from, { replace: true });
      }
    } else {
      const err = await signUp(email, password);
      if (err) {
        setError(err);
        setLoading(false);
      } else {
        setInfo("Account created! Check your email to confirm, then log in.");
        setMode("login");
        setPassword("");
        setConfirm("");
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0a0a0f" }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(112,0,255,0.08) 0%, transparent 70%)" }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Card */}
        <div
          className="relative p-8"
          style={{
            background: "rgba(10,10,20,0.85)",
            border: "1px solid rgba(0,245,255,0.12)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6" style={{ borderTop: "1px solid #00f5ff", borderLeft: "1px solid #00f5ff" }} />
          <div className="absolute top-0 right-0 w-6 h-6" style={{ borderTop: "1px solid #00f5ff", borderRight: "1px solid #00f5ff" }} />
          <div className="absolute bottom-0 left-0 w-6 h-6" style={{ borderBottom: "1px solid #7000ff", borderLeft: "1px solid #7000ff" }} />
          <div className="absolute bottom-0 right-0 w-6 h-6" style={{ borderBottom: "1px solid #7000ff", borderRight: "1px solid #7000ff" }} />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <svg width="36" height="36" viewBox="0 0 32 32" className="mb-3">
              <defs>
                <linearGradient id="auth-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f5ff" />
                  <stop offset="100%" stopColor="#7000ff" />
                </linearGradient>
              </defs>
              <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="none" stroke="url(#auth-logo-grad)" strokeWidth="1.5" />
              <polygon points="16,8 24,13 24,19 16,24 8,19 8,13" fill="url(#auth-logo-grad)" fillOpacity="0.2" stroke="url(#auth-logo-grad)" strokeWidth="0.5" />
              <circle cx="16" cy="16" r="3" fill="#00f5ff" />
            </svg>
            <span style={{
              fontFamily: "Orbitron, sans-serif",
              fontSize: "1.2rem",
              fontWeight: 700,
              background: "linear-gradient(90deg, #00f5ff, #7000ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.1em",
            }}>
              FREEGMA
            </span>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.2em", marginTop: 4 }}>
              NEURAL CREATION PLATFORM
            </p>
          </div>

          {/* Tab switch */}
          <div className="flex mb-6" style={{ border: "1px solid rgba(0,245,255,0.1)" }}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className="flex-1 py-2 relative"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "0.58rem",
                  letterSpacing: "0.15em",
                  color: mode === m ? "#00f5ff" : "#7ab8d0",
                  background: mode === m ? "rgba(0,245,255,0.06)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {m === "login" ? "LOGIN" : "REGISTER"}
                {mode === m && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, #00f5ff, transparent)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 outline-none"
                style={{
                  background: "rgba(0,245,255,0.03)",
                  border: "1px solid rgba(0,245,255,0.15)",
                  color: "#e0f7ff",
                  fontFamily: "Share Tech Mono, monospace",
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.45)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.15)")}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 outline-none"
                style={{
                  background: "rgba(0,245,255,0.03)",
                  border: "1px solid rgba(0,245,255,0.15)",
                  color: "#e0f7ff",
                  fontFamily: "Share Tech Mono, monospace",
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.45)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.15)")}
                placeholder="••••••••"
              />
            </div>

            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <label style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.58rem", color: "#7ab8d0", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-3 py-2.5 outline-none"
                    style={{
                      background: "rgba(0,245,255,0.03)",
                      border: "1px solid rgba(0,245,255,0.15)",
                      color: "#e0f7ff",
                      fontFamily: "Share Tech Mono, monospace",
                      fontSize: "0.8rem",
                      letterSpacing: "0.05em",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.45)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,245,255,0.15)")}
                    placeholder="••••••••"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error / Info */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-2"
                  style={{ background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,50,50,0.25)", fontFamily: "Share Tech Mono, monospace", fontSize: "0.68rem", color: "#ff6677", letterSpacing: "0.05em" }}
                >
                  {error}
                </motion.div>
              )}
              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-2"
                  style={{ background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.25)", fontFamily: "Share Tech Mono, monospace", fontSize: "0.68rem", color: "#00f5ff", letterSpacing: "0.05em" }}
                >
                  {info}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 relative overflow-hidden"
              style={{
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                color: loading ? "#7ab8d0" : "#0a0a0f",
                background: loading ? "rgba(0,245,255,0.15)" : "linear-gradient(135deg, #00f5ff, #0066ff)",
                border: loading ? "1px solid rgba(0,245,255,0.2)" : "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s",
              }}
              whileHover={!loading ? { scale: 1.02 } as any : {}}
              whileTap={!loading ? { scale: 0.98 } as any : {}}
            >
              {loading ? "PROCESSING…" : mode === "login" ? "LOGIN" : "CREATE ACCOUNT"}
              {!loading && (
                <motion.div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, transparent, rgba(255,255,255,0.15), transparent)" }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.button>
          </form>

          <p className="text-center mt-5" style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", color: "#7ab8d0", opacity: 0.6, letterSpacing: "0.08em" }}>
            {mode === "login" ? "No account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setInfo(null); }}
              style={{ color: "#00f5ff", background: "none", border: "none", cursor: "pointer", fontFamily: "Share Tech Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.08em" }}
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
