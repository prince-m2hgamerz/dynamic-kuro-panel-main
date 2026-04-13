import { useEffect, useRef } from "react";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>();
  const perf = useDevicePerformance();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      const base = Math.floor((canvas.width * canvas.height) / 8000);
      const starCount = Math.round(base * perf.particleMultiplier);
      starsRef.current = [];

      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
          speed: Math.random() * 0.02 + 0.005,
          twinkleSpeed: Math.random() * 0.02 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawGlow = perf.enableBlur;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      gradient.addColorStop(0, "hsl(222, 47%, 8%)");
      gradient.addColorStop(0.5, "hsl(222, 47%, 6%)");
      gradient.addColorStop(1, "hsl(222, 47%, 4%)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const currentOpacity = star.opacity * twinkle;

        if (drawGlow) {
          const glowGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
          glowGradient.addColorStop(0, `hsla(187, 94%, 70%, ${currentOpacity})`);
          glowGradient.addColorStop(0.5, `hsla(187, 94%, 60%, ${currentOpacity * 0.3})`);
          glowGradient.addColorStop(1, "transparent");
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `hsla(210, 40%, 98%, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.speed;
        if (star.y > canvas.height + star.size * 3) {
          star.y = -star.size * 3;
          star.x = Math.random() * canvas.width;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [perf]);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />
  );
};
