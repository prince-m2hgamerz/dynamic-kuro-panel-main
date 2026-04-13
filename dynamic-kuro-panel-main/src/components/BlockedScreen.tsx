import { Shield, AlertTriangle, Clock, MessageCircle } from "lucide-react";

interface BlockedScreenProps {
  retryAfter?: number;
  reason?: string;
}

const BlockedScreen = ({ retryAfter = 3600, reason = "RATE_LIMITED" }: BlockedScreenProps) => {
  const minutes = Math.ceil(retryAfter / 60);
  const isDark = (() => {
    try { return localStorage.getItem("gta-theme") !== "light"; } catch { return true; }
  })();
  const accent = isDark ? '#006fff' : '#da4e24';
  const accentRgb = isDark ? '0,111,255' : '218,78,36';
  const bg = isDark
    ? 'radial-gradient(ellipse at 20% 10%, rgba(0,111,255,0.1) 0%, transparent 50%), linear-gradient(180deg, rgb(0,12,36) 0%, rgb(0,0,0) 100%)'
    : 'radial-gradient(ellipse at 30% 20%, rgba(218,78,36,0.15) 0%, transparent 50%), linear-gradient(180deg, rgb(10,6,2) 0%, rgb(0,0,0) 100%)';

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: bg }}>
      
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-pulse"
            style={{
              background: `rgba(${accentRgb},0.25)`,
              left: `${(i * 17 + 7) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              animationDelay: `${(i * 0.3) % 2}s`,
              animationDuration: `${2 + (i % 3)}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Glowing border */}
        <div className="absolute -inset-1 rounded-2xl blur-sm opacity-60 animate-pulse"
          style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.8), rgba(239,68,68,0.5), rgba(${accentRgb},0.8))` }} />
        
        {/* Main card */}
        <div
          className="relative rounded-2xl p-8 text-center border"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.6))',
            borderColor: `rgba(${accentRgb},0.2)`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(${accentRgb},0.08)`,
          }}
        >
          {/* Shield icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: `rgba(${accentRgb},0.2)` }} />
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center border"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(0,0,0,0.5))',
                borderColor: `rgba(${accentRgb},0.2)`,
              }}
            >
              <Shield className="w-12 h-12" style={{ color: accent }} />
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <AlertTriangle className="w-6 h-6 text-red-400" />
            ACCESS DENIED
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </h1>
          
          {/* Subtitle */}
          <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Your IP has been temporarily blocked due to suspicious activity
          </p>
          
          {/* Reason badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.2)',
            }}
          >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-mono">
              {reason === "BLACKLISTED" ? "IP BLACKLISTED" : "DDoS PROTECTION ACTIVATED"}
            </span>
          </div>
          
          {/* Timer */}
          <div
            className="rounded-xl p-4 mb-6 border"
            style={{
              background: `rgba(${accentRgb},0.06)`,
              borderColor: `rgba(${accentRgb},0.15)`,
            }}
          >
            <div className="flex items-center justify-center gap-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <Clock className="w-5 h-5" style={{ color: accent }} />
              <span>Try again after:</span>
              <span className="font-mono font-bold" style={{ color: accent }}>{minutes} minutes</span>
            </div>
          </div>
          
          {/* Contact support */}
          <a
            href="/blocked-message"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(135deg, rgba(${accentRgb},0.3), rgba(${accentRgb},0.15))`,
              border: `1px solid rgba(${accentRgb},0.3)`,
              boxShadow: `0 0 20px rgba(${accentRgb},0.1)`,
            }}
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </a>
          
          {/* Footer */}
          <p className="mt-8 text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.12)' }}>
            © 2026 — Sarkar PVT Panel | DDoS Protection System
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlockedScreen;