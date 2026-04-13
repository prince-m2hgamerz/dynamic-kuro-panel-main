import { Shield, Wifi, WifiOff, Lock, AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface IPLockdownScreenProps {
  ip?: string;
  reason?: string;
}

const IPLockdownScreen = ({ ip, reason = "NOT_WHITELISTED" }: IPLockdownScreenProps) => {
  const isBlacklisted = reason === "BLACKLISTED";
  const isDark = (() => {
    try { return localStorage.getItem("gta-theme") !== "light"; } catch { return true; }
  })();

  // Theme accent: dark = blue, light = orange
  const accent = isDark ? '#006fff' : '#da4e24';
  const accentRgb = isDark ? '0,111,255' : '218,78,36';
  const alertColor = isBlacklisted ? '#ff4060' : accent;
  const alertRgb = isBlacklisted ? '255,64,96' : accentRgb;
  const bg = isDark
    ? 'radial-gradient(ellipse at 20% 10%, rgba(0,111,255,0.1) 0%, transparent 50%), linear-gradient(180deg, rgb(0,12,36) 0%, rgb(0,0,0) 100%)'
    : 'radial-gradient(ellipse at 30% 20%, rgba(218,78,36,0.15) 0%, transparent 50%), linear-gradient(180deg, rgb(10,6,2) 0%, rgb(0,0,0) 100%)';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: bg }}>

      {/* Animated mesh gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.08]"
          style={{ background: `radial-gradient(circle, rgba(${alertRgb},0.8), transparent 70%)`, top: "-20%", left: "-10%" }}
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-[0.06]"
          style={{ background: `radial-gradient(circle, rgba(${accentRgb},0.6), transparent 70%)`, bottom: "-15%", right: "-5%" }}
          animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />

      <motion.div
        className="relative z-10 w-full max-w-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top status badge */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border"
            style={{
              background: `rgba(${alertRgb},0.08)`,
              borderColor: `rgba(${alertRgb},0.25)`,
              boxShadow: `0 0 30px rgba(${alertRgb},0.1)`,
            }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: alertColor }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-medium tracking-[0.2em] uppercase" style={{ color: alertColor }}>
              {isBlacklisted ? "IP Blacklisted" : "Lockdown Active"}
            </span>
          </div>
        </motion.div>

        {/* Icon */}
        <motion.div variants={itemVariants} className="flex justify-center mb-6">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: `rgba(${alertRgb},0.2)` }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(0,0,0,0.5))',
                borderColor: `rgba(${alertRgb},0.2)`,
              }}>
              {isBlacklisted
                ? <WifiOff className="w-9 h-9" style={{ color: alertColor }} />
                : <Lock className="w-9 h-9" style={{ color: alertColor }} />
              }
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1 variants={itemVariants}
          className="text-center text-2xl md:text-3xl font-bold tracking-tight mb-3"
          style={{ color: 'rgba(255,255,255,0.9)' }}>
          {isBlacklisted ? "Access Revoked" : "Access Restricted"}
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={itemVariants}
          className="text-center text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          {isBlacklisted
            ? "Your IP address has been permanently blocked due to detected malicious activity."
            : "This panel is currently in lockdown mode. Only pre-approved IP addresses are allowed access."
          }
        </motion.p>

        {/* Info Card */}
        <motion.div variants={itemVariants}
          className="rounded-xl border p-5 mb-6"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Status</span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md"
                style={{
                  background: `rgba(${alertRgb},0.1)`,
                  color: alertColor,
                }}>
                {isBlacklisted ? "BLOCKED" : "NOT AUTHORIZED"}
              </span>
            </div>

            <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />

            {ip && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wifi className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Your IP</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{ip}</span>
                </div>
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Reason</span>
              </div>
              <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {isBlacklisted ? "Malicious Activity Detected" : "IP Not Whitelisted"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Guidance Card */}
        <motion.div variants={itemVariants}
          className="rounded-xl border p-5 mb-8"
          style={{
            background: `rgba(${accentRgb},0.03)`,
            borderColor: `rgba(${accentRgb},0.12)`,
          }}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
            style={{ color: `rgba(${accentRgb},0.7)` }}>
            What can you do?
          </h3>
          <ul className="space-y-2.5">
            {[
              "If you're a panel member, contact the owner to whitelist your IP.",
              "If you recently changed networks (WiFi/mobile), your IP may have changed.",
              isBlacklisted
                ? "If you believe this is an error, reach out via Telegram for appeal."
                : "Login from a previously approved device/network to auto-register.",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: `rgba(${accentRgb},0.5)` }} />
                <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Contact Button */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <a
            href="https://t.me/WTF_I_Dont_Care"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, rgba(${accentRgb},0.2), rgba(${alertRgb},0.1))`,
              border: `1px solid rgba(${accentRgb},0.25)`,
              color: 'rgba(255,255,255,0.8)',
              boxShadow: `0 0 20px rgba(${accentRgb},0.06)`,
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Contact Support on Telegram
          </a>
        </motion.div>

        {/* Footer */}
        <motion.p variants={itemVariants}
          className="text-center mt-10 text-[10px] tracking-[0.3em] uppercase"
          style={{ color: 'rgba(255,255,255,0.12)' }}>
          © 2026 SARKAR PANEL — IP LOCKDOWN SYSTEM
        </motion.p>
      </motion.div>
    </div>
  );
};

export default IPLockdownScreen;
