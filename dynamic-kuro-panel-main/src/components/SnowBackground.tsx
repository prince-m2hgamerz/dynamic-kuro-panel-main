import { useEffect, useRef, useState, useCallback } from "react";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";

interface Snowflake {
  x: number; y: number; size: number; opacity: number;
  speedY: number; speedX: number; twinklePhase: number; twinkleSpeed: number;
}

interface SnowBackgroundProps { enabled?: boolean; }

export const SnowBackground = ({ enabled = true }: SnowBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const animationRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(true);
  const perf = useDevicePerformance();

  useEffect(() => {
    const h = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);

  const getParticleCount = useCallback(() => {
    if (typeof window === "undefined") return 80;
    const width = window.innerWidth;
    let base: number;
    if (width < 768) base = 30;
    else if (width < 1024) base = 50;
    else base = 100;
    return Math.round(base * perf.particleMultiplier);
  }, [perf.particleMultiplier]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initSnowflakes();
    };

    const initSnowflakes = () => {
      const count = getParticleCount();
      snowflakesRef.current = [];
      for (let i = 0; i < count; i++) {
        snowflakesRef.current.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          size: Math.random() * 2.5 + 0.5, opacity: Math.random() * 0.25 + 0.1,
          speedY: Math.random() * 30 + 10, speedX: (Math.random() - 0.5) * 10,
          twinklePhase: Math.random() * Math.PI * 2, twinkleSpeed: Math.random() * 0.02 + 0.01,
        });
      }
    };

    let lastTime = 0;
    const drawGlow = perf.enableBlur;

    const animate = (currentTime: number) => {
      if (!isVisible) { animationRef.current = requestAnimationFrame(animate); return; }
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      gradient.addColorStop(0, "#0a0e1a");
      gradient.addColorStop(0.5, "#071028");
      gradient.addColorStop(1, "#050a18");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      snowflakesRef.current.forEach((flake) => {
        flake.twinklePhase += flake.twinkleSpeed;
        const twinkle = Math.sin(flake.twinklePhase) * 0.3 + 0.7;
        const currentOpacity = flake.opacity * twinkle;

        if (drawGlow) {
          const g = ctx.createRadialGradient(flake.x, flake.y, 0, flake.x, flake.y, flake.size * 4);
          g.addColorStop(0, `rgba(6, 182, 212, ${currentOpacity})`);
          g.addColorStop(0.4, `rgba(6, 182, 212, ${currentOpacity * 0.3})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity * 1.5})`;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        flake.y += flake.speedY * deltaTime;
        flake.x += flake.speedX * deltaTime;
        if (flake.y > canvas.height + flake.size * 4) { flake.y = -flake.size * 4; flake.x = Math.random() * canvas.width; }
        if (flake.x > canvas.width + 20) flake.x = -20;
        else if (flake.x < -20) flake.x = canvas.width + 20;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [enabled, isVisible, getParticleCount, perf]);

  if (!enabled) {
    return (
      <div className="fixed inset-0 -z-10 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #071028 50%, #050a18 100%)" }} aria-hidden="true" />
    );
  }

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />;
};
