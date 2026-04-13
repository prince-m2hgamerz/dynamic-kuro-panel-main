import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMemo, useEffect, useCallback, useRef } from "react";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";

const RAY_CONFIGS = [
  { rotateX: 49, skewX: 23, initialX: 0 },
  { rotateX: 49, skewX: 15, initialX: 0 },
  { rotateX: 49, skewX: 23, initialX: 0 },
  { rotateX: 49, skewX: 8,  initialX: 0 },
  { rotateX: 70, skewX: 0,  initialX: 0 },
  { rotateX: 39, skewX: 0,  initialX: 0 },
  { rotateX: 49, skewX: -9, initialX: 0 },
  { rotateX: 49, skewX: -15, initialX: 0 },
  { rotateX: 49, skewX: -17, initialX: 0 },
  { rotateX: 49, skewX: -23, initialX: 0 },
  { rotateX: 49, skewX: -20, initialX: 159 },
];

const LOW_RAY_CONFIGS = [
  { rotateX: 49, skewX: 23, initialX: 0 },
  { rotateX: 70, skewX: 0,  initialX: 0 },
  { rotateX: 49, skewX: -15, initialX: 0 },
  { rotateX: 49, skewX: -23, initialX: 0 },
];

const FRAMER_EASE: [number, number, number, number] = [0.44, 0, 0.56, 1];

interface PerspectiveRaysProps {
  subtle?: boolean;
  variant?: "blue" | "orange";
}

const PerspectiveRays = ({ subtle = false, variant = "blue" }: PerspectiveRaysProps) => {
  const perf = useDevicePerformance();
  const isLow = perf.tier === "low";

  const isOrange = variant === "orange";
  const c = isOrange
    ? { r: 218, g: 78, b: 36, hi: "rgba(255,120,30,", mid: "rgba(218,78,36,", lo: "rgba(159,78,0," }
    : { r: 0, g: 111, b: 255, hi: "rgba(0,140,255,", mid: "rgba(0,111,255,", lo: "rgba(0,80,200," };

  const containerRef = useRef<HTMLDivElement>(null);
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const mouseX = useSpring(rawMouseX, { stiffness: 40, damping: 30, mass: 1 });
  const mouseY = useSpring(rawMouseY, { stiffness: 40, damping: 30, mass: 1 });
  const orbX = useTransform(mouseX, (v) => v * 30);
  const orbY = useTransform(mouseY, (v) => v * 20);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 2;
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;
    rawMouseX.set(cx * 15);
    rawMouseY.set(cy * 10);
  }, [rawMouseX, rawMouseY]);

  useEffect(() => {
    if (!perf.enableMouseTracking) return;
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove, perf.enableMouseTracking]);

  const particleCount = Math.round((subtle ? 10 : 20) * perf.particleMultiplier);
  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 4,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 7,
    })), [particleCount]);

  const op = subtle ? 0.85 : 1;
  const activeRays = isLow ? LOW_RAY_CONFIGS : RAY_CONFIGS;
  const blurBase = isLow ? 0 : 6;
  const wideRays = isLow ? [-20, 0, 20] : [-35, -18, 0, 18, 35];

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* TOP LIGHT SOURCE GLOW */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '-25%', left: '50%', width: '220%', height: '90%',
          background: `radial-gradient(ellipse 90% 80% at 50% 0%, ${c.hi}${0.6 * op}) 0%, ${c.mid}${0.35 * op}) 25%, ${c.lo}${0.18 * op}) 50%, transparent 75%)`,
          transform: 'translateX(-50%)',
          filter: isLow ? 'none' : 'blur(25px)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: FRAMER_EASE }}
      />

      {/* PULSING CORE GLOW */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '-10%', left: '50%', width: isLow ? '800px' : '1600px', height: isLow ? '600px' : '1200px',
          background: `radial-gradient(ellipse 90% 70% at 50% 10%, ${c.hi}${0.35 * op}) 0%, ${c.lo}${0.18 * op}) 30%, transparent 60%)`,
          filter: isLow ? 'none' : 'blur(40px)',
          x: perf.enableMouseTracking ? orbX : 0,
          y: perf.enableMouseTracking ? orbY : 0,
          translateX: '-50%',
        }}
        animate={isLow ? { opacity: 0.8 } : { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={isLow ? { duration: 0 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 3D PERSPECTIVE LIGHT RAYS */}
      {activeRays.map((cfg, i) => {
        const totalRays = activeRays.length;
        const centerIndex = (totalRays - 1) / 2;
        const offset = i - centerIndex;
        const spreadAngle = offset * (isLow ? 12 : 8);
        const width = 120 + (i * 31) % 180;
        const brightness = 0.12 + (i % 3) * 0.05;

        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{
              top: '-5%', left: '50%', width: `${width}px`, height: '130%',
              marginLeft: `-${width / 2}px`,
              background: `linear-gradient(to bottom, 
                ${c.hi}${brightness * 3}) 0%, 
                ${c.mid}${brightness * 2}) 10%, 
                ${c.lo}${brightness * 1.2}) 25%, 
                ${c.lo}${brightness * 0.6}) 50%, 
                transparent 80%)`,
              transformOrigin: '50% 0%',
              filter: isLow ? 'none' : `blur(${blurBase + (i % 3) * 3}px)`,
              opacity: op,
            }}
            initial={{ opacity: 0.001, scale: 0.5, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: spreadAngle }}
            transition={{ duration: 2.5, ease: FRAMER_EASE, delay: i * 0.06 }}
          />
        );
      })}

      {/* SECONDARY WIDE AMBIENT RAYS */}
      {wideRays.map((angle, i) => (
        <motion.div
          key={`wide-${i}`}
          className="absolute pointer-events-none"
          style={{
            top: '-5%', left: '50%', width: '300px', height: '130%', marginLeft: '-150px',
            background: `linear-gradient(to bottom, ${c.mid}0.18) 0%, ${c.lo}0.1) 30%, transparent 65%)`,
            transformOrigin: '50% 0%',
            filter: isLow ? 'none' : 'blur(25px)',
            opacity: op * 0.5,
          }}
          initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: angle }}
          transition={{ duration: 3, ease: FRAMER_EASE, delay: 0.3 + i * 0.1 }}
        />
      ))}

      {/* FLOATING DUST PARTICLES */}
      {!isLow && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: op }}>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: `${p.size}px`, height: `${p.size}px`,
                background: `rgba(${c.r},${c.g},${c.b},0.7)`,
                boxShadow: `0 0 ${p.size * 5}px rgba(${c.r},${c.g},${c.b},0.5), 0 0 ${p.size * 10}px rgba(${c.r},${c.g},${c.b},0.2)`,
              }}
              animate={{ y: [0, 25 + Math.random() * 35, 0], opacity: [0.15, 0.6, 0.15], scale: [1, 1.5, 1] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      {/* HORIZONTAL SCAN LINE — skip on low */}
      {!isLow && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 5%, rgba(${c.r},${c.g},${c.b},0.5) 50%, transparent 95%)`,
            boxShadow: `0 0 40px rgba(${c.r},${c.g},${c.b},0.4), 0 0 80px rgba(${c.r},${c.g},${c.b},0.15)`,
            opacity: op,
          }}
          animate={{ top: ['-2%', '102%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* GRID OVERLAY */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025 * op,
          backgroundImage: `
            linear-gradient(rgba(${c.r},${c.g},${c.b},0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(${c.r},${c.g},${c.b},0.25) 1px, transparent 1px)
          `,
          backgroundSize: isLow ? '120px 120px' : '80px 80px',
        }}
      />

      {/* VIGNETTE */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 15%, transparent 10%, rgba(0,0,0,${0.5 * op}) 50%, rgba(0,0,0,${0.85 * op}) 100%)`,
        }}
      />
    </div>
  );
};

export default PerspectiveRays;
