import { useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Card3DTiltProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
}

export const Card3DTilt = ({ children, className, glowColor = "hsl(var(--primary))", intensity = 15 }: Card3DTiltProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRotateX((y - 0.5) * -intensity);
    setRotateY((x - 0.5) * intensity);
    setGlowX(x * 100);
    setGlowY(y * 100);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
      {/* Dynamic glow following cursor */}
      <div
        className="absolute inset-0 rounded-inherit pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          borderRadius: "inherit",
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${glowColor} / 0.15, transparent 60%)`,
        }}
      />
    </motion.div>
  );
};
