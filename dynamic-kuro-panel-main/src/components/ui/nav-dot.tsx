import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavDotProps {
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NavDot = ({ active = false, onClick, className }: NavDotProps) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className
      )}
      style={{
        width: 6,
        height: 6,
      }}
      initial={false}
      animate={{
        scale: active ? 1 : 1,
        opacity: active ? 1 : 0.5,
      }}
      whileHover={{
        scale: 1.8,
        opacity: 1,
      }}
      whileTap={{
        scale: 2.2,
      }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Main dot */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: "hsl(var(--dot))",
        }}
        animate={{
          boxShadow: active
            ? "0 0 12px hsl(var(--dot) / 0.7), 0 0 24px hsl(var(--dot) / 0.4)"
            : "0 0 6px hsl(var(--dot) / 0.3)",
        }}
        whileHover={{
          boxShadow: "0 0 16px hsl(var(--dot) / 0.8), 0 0 32px hsl(var(--dot) / 0.5)",
        }}
        transition={{
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      
      {/* Glow ring on active */}
      {active && (
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: -4,
            border: "1px solid hsl(var(--dot) / 0.3)",
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.26,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      )}
    </motion.button>
  );
};

// Inline nav dot for sidebar items (doesn't need onClick)
export const NavDotIndicator = ({ active = false, className }: { active?: boolean; className?: string }) => {
  return (
    <motion.div
      className={cn(
        "rounded-full flex-shrink-0",
        className
      )}
      style={{
        width: 6,
        height: 6,
        backgroundColor: active ? "hsl(var(--dot))" : "transparent",
      }}
      initial={false}
      animate={{
        opacity: active ? 1 : 0,
        scale: active ? 1 : 0.5,
        boxShadow: active
          ? "0 0 10px hsl(var(--dot) / 0.6), 0 0 20px hsl(var(--dot) / 0.3)"
          : "none",
      }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  );
};
