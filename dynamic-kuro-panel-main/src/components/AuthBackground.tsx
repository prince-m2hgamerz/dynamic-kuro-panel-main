import { motion } from "framer-motion";
import PerspectiveRays from "@/components/PerspectiveRays";
import IgniteBackground from "@/components/IgniteBackground";

interface AuthBackgroundProps {
  theme?: "dark" | "light";
}

const AuthBackground = ({ theme = "dark" }: AuthBackgroundProps) => {
  const isDark = theme === "dark";

  if (!isDark) {
    return <IgniteBackground />;
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "#000" }} />
      <PerspectiveRays />

      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1400px',
          height: '700px',
          background: 'radial-gradient(ellipse, rgba(0,111,255,0.1) 0%, rgba(0,60,180,0.05) 35%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 5%, rgba(0,111,255,0.6) 50%, transparent 95%)',
          boxShadow: '0 0 15px rgba(0,111,255,0.3)',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      />

      <div
        className="absolute top-0 left-0 w-[300px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(0,111,255,0.06) 0%, transparent 60%)' }}
      />
      <div
        className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(0,111,255,0.06) 0%, transparent 60%)' }}
      />
    </div>
  );
};

export default AuthBackground;
