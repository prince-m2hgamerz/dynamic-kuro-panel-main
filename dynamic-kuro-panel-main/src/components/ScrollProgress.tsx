import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

export const ScrollProgress = () => {
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(0);
  const scaleX = useSpring(0, { stiffness: 100, damping: 30 });

  useEffect(() => {
    if (isMobile) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(scrollPercent);
      scaleX.set(scrollPercent);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile, scaleX]);

  if (isMobile) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--secondary)))",
        boxShadow: "0 0 10px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--secondary) / 0.3)",
      }}
    />
  );
};
