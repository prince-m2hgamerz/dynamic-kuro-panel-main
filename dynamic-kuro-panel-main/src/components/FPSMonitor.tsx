import { useEffect, useRef, useState } from "react";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";
import { useIsMobile } from "@/hooks/use-mobile";

const FPSMonitor = () => {
  const perf = useDevicePerformance();
  const isMobile = useIsMobile();
  const [fps, setFps] = useState(0);
  const framesRef = useRef<number[]>([]);
  const rafRef = useRef<number>();

  useEffect(() => {
    const tick = (now: number) => {
      framesRef.current.push(now);
      const cutoff = now - 1000;
      framesRef.current = framesRef.current.filter((t) => t > cutoff);
      setFps(framesRef.current.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Hide on mobile completely
  if (isMobile) return null;

  const ram = (navigator as any).deviceMemory as number | undefined;
  const cores = navigator.hardwareConcurrency || "?";

  const fpsColor =
    fps >= 50 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400";

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] rounded-xl border border-white/10 bg-black/70 backdrop-blur-md px-4 py-3 font-mono text-xs shadow-2xl select-none pointer-events-none"
      style={{ minWidth: 160 }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-2xl font-bold leading-none ${fpsColor}`}>{fps}</span>
        <span className="text-white/50 uppercase tracking-wider text-[10px]">FPS</span>
      </div>
      <div className="space-y-0.5 text-white/60">
        <div className="flex justify-between">
          <span>RAM</span>
          <span className="text-white/90">{ram ? `${ram} GB` : "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span>Cores</span>
          <span className="text-white/90">{cores}</span>
        </div>
        <div className="flex justify-between">
          <span>Mode</span>
          <span className={perf.tier === "high" ? "text-green-400" : "text-yellow-400"}>
            {perf.tier === "high" ? "High Poly" : "Low Poly"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Device</span>
          <span className="text-white/90">{perf.isMobile ? "Mobile" : "Desktop"}</span>
        </div>
      </div>
    </div>
  );
};

export default FPSMonitor;