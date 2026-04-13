import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

// Matrix rain character column - Electric Blue
const MatrixColumn = ({ x, delay, speed }: { x: number; delay: number; speed: number }) => {
  const chars = useMemo(() => {
    const charset = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01234567890ABCDEF";
    return Array.from({ length: 12 + Math.floor(Math.random() * 8) }, () =>
      charset[Math.floor(Math.random() * charset.length)]
    ).join('\n');
  }, []);

  return (
    <motion.div
      className="absolute pointer-events-none font-mono text-xs leading-5 whitespace-pre"
      style={{
        left: `${x}%`,
        top: '-20%',
        color: 'rgba(59,130,246,0.45)',
        textShadow: '0 0 8px rgba(59,130,246,0.5)',
        fontSize: '11px',
      }}
      animate={{ y: ['0%', '120vh'] }}
      transition={{ duration: speed, delay, repeat: Infinity, ease: 'linear' }}
    >
      {chars}
    </motion.div>
  );
};

// Blue particle
const BlueParticle = ({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: `${size}px`,
      height: `${size}px`,
      background: 'hsl(217 91% 60%)',
      boxShadow: `0 0 ${size * 6}px rgba(59,130,246,0.6), 0 0 ${size * 12}px rgba(59,130,246,0.3)`,
    }}
    animate={{
      y: [0, -30 - Math.random() * 40, 0],
      x: [0, (Math.random() - 0.5) * 30, 0],
      opacity: [0.1, 0.7, 0.1],
      scale: [1, 1.5, 1],
    }}
    transition={{
      duration: 5 + Math.random() * 6,
      repeat: Infinity,
      delay,
      ease: "easeInOut",
    }}
  />
);

// Circuit board line
const CircuitLine = ({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) => (
  <motion.line
    x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
    stroke="rgba(59,130,246,0.12)"
    strokeWidth="1"
    strokeDasharray="6 10"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: [0, 1, 0], opacity: [0, 0.5, 0] }}
    transition={{ duration: 5, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

// Circuit node dot
const CircuitNode = ({ cx, cy, delay }: { cx: number; cy: number; delay: number }) => (
  <motion.circle
    cx={`${cx}%`} cy={`${cy}%`} r="2"
    fill="rgba(59,130,246,0.5)"
    animate={{ r: [2, 4, 2], opacity: [0.3, 0.8, 0.3] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

// Hexagon grid element
const HexElement = ({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: `${x}%`, top: `${y}%`,
      width: `${size}px`, height: `${size}px`,
      border: '1px solid rgba(59,130,246,0.08)',
      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    }}
    animate={{ opacity: [0.05, 0.2, 0.05], rotate: [0, 60] }}
    transition={{ duration: 8 + Math.random() * 6, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

export const GTABackground = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isDay = !isDark;

  // Matrix rain columns
  const matrixColumns = useMemo(() => isDark ? Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 8, speed: 8 + Math.random() * 12,
  })) : [], [isDark]);

  // Particles
  const particles = useMemo(() => isDark ? Array.from({ length: 35 }, (_, i) => ({
    id: i, delay: Math.random() * 6,
    x: Math.random() * 100, y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
  })) : [], [isDark]);

  // Circuit lines
  const circuits = useMemo(() => isDark ? Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x1: Math.random() * 100, y1: Math.random() * 100,
    x2: Math.random() * 100, y2: Math.random() * 100,
    delay: i * 1.2,
  })) : [], [isDark]);

  // Circuit nodes
  const nodes = useMemo(() => isDark ? Array.from({ length: 12 }, (_, i) => ({
    id: i, cx: Math.random() * 100, cy: Math.random() * 100, delay: i * 0.8,
  })) : [], [isDark]);

  // Hexagons
  const hexagons = useMemo(() => isDark ? Array.from({ length: 15 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 30 + Math.random() * 60, delay: Math.random() * 5,
  })) : [], [isDark]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Light mode */}
      {isDay && (
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('/images/sunset-house.webp')` }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(180deg, rgba(255,220,180,0.2) 0%, rgba(255,200,150,0.15) 30%, rgba(255,180,120,0.1) 60%, rgba(255,160,100,0.2) 100%)`,
          }} />
        </div>
      )}

      {/* Dark mode: Deep Midnight Navy Base */}
      {isDark && (
        <>
          {/* Base gradient */}
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(15,23,42,0.9) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(30,58,138,0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(29,78,216,0.15) 0%, transparent 60%),
              linear-gradient(180deg, #060b18 0%, #0a1628 30%, #081020 60%, #040810 100%)
            `,
          }} />

          {/* Animated blue radial pulse */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 120% 80% at 50% 50%, rgba(59,130,246,0.03) 0%, rgba(14,165,233,0.02) 30%, transparent 60%)`,
              mixBlendMode: 'screen',
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Perspective grid floor */}
          <div className="absolute bottom-0 left-0 right-0 h-[40vh]" style={{
            background: `linear-gradient(transparent 0%, rgba(59,130,246,0.015) 100%)`,
            maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px),
                linear-gradient(0deg, rgba(59,130,246,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '80px 40px',
              transform: 'perspective(500px) rotateX(60deg)',
              transformOrigin: 'bottom center',
            }} />
          </div>

          {/* Matrix rain columns */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.4 }}>
            {matrixColumns.map((col) => (
              <MatrixColumn key={col.id} {...col} />
            ))}
          </div>

          {/* SVG circuit board lines + nodes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {circuits.map((c) => <CircuitLine key={c.id} {...c} />)}
            {nodes.map((n) => <CircuitNode key={n.id} {...n} />)}
          </svg>

          {/* Hexagon grid overlay */}
          {hexagons.map((h) => <HexElement key={h.id} {...h} />)}

          {/* Horizontal scan line - blue */}
          <motion.div
            className="absolute left-0 right-0 h-[1px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            }}
            animate={{ top: ['-5%', '105%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />

          {/* Second scan line - slower */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 20%, rgba(14,165,233,0.2) 50%, transparent 80%)',
              boxShadow: '0 0 30px rgba(14,165,233,0.15)',
            }}
            animate={{ top: ['105%', '-5%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />

          {/* Blue particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => <BlueParticle key={p.id} {...p} />)}
          </div>
        </>
      )}

      {/* Light mode skyline + palms */}
      {isDay && (
        <>
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1920 600" preserveAspectRatio="xMidYMax slice" style={{ height: '30vh', minHeight: '180px', maxHeight: '250px' }}>
            <defs>
              <linearGradient id="buildingDark" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="rgba(80,90,100,0.9)" /><stop offset="100%" stopColor="rgba(50,60,70,0.95)" /></linearGradient>
              <linearGradient id="buildingMid" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="rgba(100,110,120,0.85)" /><stop offset="100%" stopColor="rgba(70,80,90,0.9)" /></linearGradient>
            </defs>
            <g opacity="0.7">
              <rect x="50" y="250" width="60" height="350" fill="url(#buildingMid)" />
              <rect x="120" y="200" width="80" height="400" fill="url(#buildingDark)" />
              <rect x="350" y="280" width="70" height="320" fill="url(#buildingMid)" />
              <rect x="500" y="150" width="100" height="450" fill="url(#buildingDark)" />
              <rect x="700" y="220" width="90" height="380" fill="url(#buildingMid)" />
              <rect x="880" y="80" width="100" height="520" fill="url(#buildingDark)" />
              <polygon points="880,80 930,20 980,80" fill="url(#buildingDark)" />
              <rect x="1100" y="200" width="85" height="400" fill="url(#buildingMid)" />
              <rect x="1300" y="160" width="100" height="440" fill="url(#buildingDark)" />
              <rect x="1500" y="140" width="120" height="460" fill="url(#buildingDark)" />
              <rect x="1700" y="250" width="90" height="350" fill="url(#buildingMid)" />
            </g>
          </svg>
          <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none">
            <motion.svg className="absolute bottom-0 left-[5%]" width="120" height="200" viewBox="0 0 120 200" animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: 'bottom center' }}>
              <path d="M55 200 Q58 150 60 100 Q62 50 60 30" stroke="rgba(100,70,50,0.9)" strokeWidth="12" fill="none" />
              <path d="M60 30 Q30 10 5 40" stroke="rgba(40,80,30,0.95)" strokeWidth="3" fill="none" />
              <path d="M60 30 Q90 10 115 40" stroke="rgba(40,80,30,0.95)" strokeWidth="3" fill="none" />
              <path d="M60 30 Q50 5 20 25" stroke="rgba(40,80,30,0.9)" strokeWidth="3" fill="none" />
              <path d="M60 30 Q70 5 100 25" stroke="rgba(40,80,30,0.9)" strokeWidth="3" fill="none" />
            </motion.svg>
            <motion.svg className="absolute bottom-0 right-[8%]" width="100" height="180" viewBox="0 0 100 180" animate={{ rotate: [2, -2, 2] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: 'bottom center' }}>
              <path d="M45 180 Q48 130 50 80 Q52 40 50 25" stroke="rgba(90,65,45,0.9)" strokeWidth="10" fill="none" />
              <path d="M50 25 Q25 8 5 35" stroke="rgba(35,70,28,0.95)" strokeWidth="2.5" fill="none" />
              <path d="M50 25 Q75 8 95 35" stroke="rgba(35,70,28,0.95)" strokeWidth="2.5" fill="none" />
            </motion.svg>
          </div>
        </>
      )}

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,0.15) 2px, rgba(59,130,246,0.15) 4px)' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, transparent 30%, rgba(4,8,16,0.7) 100%)'
            : 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/* Corner brackets - Blue */}
      {isDark && (
        <>
          <div className="absolute top-6 left-6 w-20 h-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-60" />
            <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-primary to-transparent opacity-60" />
            <div className="absolute top-[6px] left-[6px] w-2 h-2 bg-primary rounded-full opacity-80" style={{ boxShadow: '0 0 10px hsl(217 91% 60%)' }} />
          </div>
          <div className="absolute top-6 right-6 w-20 h-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-primary to-transparent opacity-60" />
            <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-primary to-transparent opacity-60" />
            <div className="absolute top-[6px] right-[6px] w-2 h-2 bg-primary rounded-full opacity-80" style={{ boxShadow: '0 0 10px hsl(217 91% 60%)' }} />
          </div>
          <div className="absolute bottom-6 left-6 w-20 h-20 pointer-events-none">
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-60" />
            <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-primary to-transparent opacity-60" />
            <div className="absolute bottom-[6px] left-[6px] w-2 h-2 bg-primary rounded-full opacity-80" style={{ boxShadow: '0 0 10px hsl(217 91% 60%)' }} />
          </div>
          <div className="absolute bottom-6 right-6 w-20 h-20 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-primary to-transparent opacity-60" />
            <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-primary to-transparent opacity-60" />
            <div className="absolute bottom-[6px] right-[6px] w-2 h-2 bg-primary rounded-full opacity-80" style={{ boxShadow: '0 0 10px hsl(217 91% 60%)' }} />
          </div>
        </>
      )}
    </div>
  );
};