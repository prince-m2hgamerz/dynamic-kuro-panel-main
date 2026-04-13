import { motion } from "framer-motion";
import { Shield, Zap, Globe, Key, Fingerprint, Lock, Server, Cpu, Wifi, Database, Eye, Radio } from "lucide-react";

interface TechMarqueeProps {
  theme?: "dark" | "light";
}

const ITEMS = [
  { icon: Shield, label: "Shield Protocol" },
  { icon: Zap, label: "Lightning Auth" },
  { icon: Globe, label: "Global CDN" },
  { icon: Key, label: "AES-256" },
  { icon: Fingerprint, label: "Biometric" },
  { icon: Lock, label: "Zero Trust" },
  { icon: Server, label: "Edge Nodes" },
  { icon: Cpu, label: "AI Firewall" },
  { icon: Wifi, label: "Mesh Network" },
  { icon: Database, label: "Encrypted DB" },
  { icon: Eye, label: "Threat Intel" },
  { icon: Radio, label: "Real-time" },
];

const TechMarquee = ({ theme = "dark" }: TechMarqueeProps) => {
  const isDark = theme === "dark";

  const cardBg = isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(218,78,36,0.08)";
  const cardBorder = isDark
    ? "1px solid rgba(0,111,255,0.15)"
    : "1px solid rgba(218,78,36,0.2)";
  const cardShadow = isDark
    ? "0 2px 12px rgba(0,111,255,0.08)"
    : "0 2px 12px rgba(218,78,36,0.1), 0 1px 3px rgba(0,0,0,0.3)";
  const iconColor = isDark ? "#006fff" : "#da4e24";
  const labelColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.6)";
  const dotBg = isDark ? "rgba(0,111,255,0.3)" : "rgba(218,78,36,0.4)";

  const duplicated = [...ITEMS, ...ITEMS];

  return (
    <div className="w-full overflow-hidden relative">
      <div
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        {/* Row 1 — left to right */}
        <motion.div
          className="flex items-center gap-3 mb-3"
          animate={{ x: [0, -900] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          {duplicated.map((item, i) => (
            <motion.div
              key={`r1-${i}`}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0 relative overflow-hidden"
              style={{
                background: cardBg,
                border: cardBorder,
                boxShadow: cardShadow,
                backdropFilter: "blur(8px)",
              }}
              whileHover={{ scale: 1.08, boxShadow: `0 0 20px ${iconColor}40` }}
            >
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${iconColor}15 50%, transparent 100%)`,
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
              />
              <item.icon className="w-4 h-4 flex-shrink-0 relative z-10" style={{ color: iconColor }} />
              <span
                className="text-xs font-medium tracking-wide whitespace-nowrap relative z-10"
                style={{ color: labelColor, fontFamily: "'DM Sans', 'Inter', sans-serif" }}
              >
                {item.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Row 2 — right to left */}
        <motion.div
          className="flex items-center gap-3"
          animate={{ x: [-900, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {[...duplicated].reverse().map((item, i) => (
            <motion.div
              key={`r2-${i}`}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0 relative overflow-hidden"
              style={{
                background: cardBg,
                border: cardBorder,
                boxShadow: cardShadow,
                backdropFilter: "blur(8px)",
              }}
              whileHover={{ scale: 1.08, boxShadow: `0 0 20px ${iconColor}40` }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${iconColor}15 50%, transparent 100%)`,
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 relative z-10"
                style={{ background: dotBg }}
              />
              <span
                className="text-xs font-medium tracking-wide whitespace-nowrap relative z-10"
                style={{ color: labelColor, fontFamily: "'DM Sans', 'Inter', sans-serif" }}
              >
                {item.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default TechMarquee;
