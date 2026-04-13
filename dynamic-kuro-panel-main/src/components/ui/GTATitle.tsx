import { motion } from "framer-motion";

interface GTATitleProps {
  text: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const GTATitle = ({ text, subtitle, size = "lg" }: GTATitleProps) => {
  const sizeClasses = {
    sm: "text-3xl md:text-4xl",
    md: "text-4xl md:text-5xl",
    lg: "text-5xl md:text-7xl",
    xl: "text-6xl md:text-8xl lg:text-9xl",
  };

  const subtitleSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg md:text-xl",
  };

  return (
    <div className="text-center relative">
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Background glow */}
        <motion.h1
          className={`font-display ${sizeClasses[size]} font-black tracking-[0.15em] absolute inset-0 pointer-events-none select-none`}
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 50%, hsl(var(--accent)) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "blur(25px)",
            opacity: 0.5,
          }}
          aria-hidden="true"
        >
          {text}
        </motion.h1>

        {/* Main text with theme gradient */}
        <motion.h1
          className={`font-display ${sizeClasses[size]} font-black tracking-[0.15em] relative`}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, hsl(var(--primary)) 30%, hsl(var(--secondary)) 60%, hsl(var(--accent)) 100%)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "titleMultiColor 6s ease infinite",
          }}
        >
          {text}
        </motion.h1>

        {/* Animated shine */}
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        >
          <div
            className={`font-display ${sizeClasses[size]} font-black tracking-[0.15em]`}
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(var(--secondary) / 0.6) 50%, transparent 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </div>
        </motion.div>
      </motion.div>

      {subtitle && (
        <motion.p
          className={`${subtitleSizes[size]} font-medium tracking-[0.3em] uppercase mt-4`}
          style={{
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {subtitle}
        </motion.p>
      )}

      {/* Decorative underline */}
      <motion.div
        className="mx-auto mt-4 h-[2px]"
        style={{
          width: "60%",
          background: "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), transparent)",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      />
    </div>
  );
};
