import { motion } from "framer-motion";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";

const IgniteBackground = () => {
  const perf = useDevicePerformance();
  const isLow = perf.tier === "low";
  const rays = isLow ? [-24, -8, 0, 8, 24] : [-35, -24, -14, -6, 0, 6, 14, 24, 35];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Main sweeping curved light */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '-25%', left: '50%', width: '220%', height: '120%',
          transform: 'translateX(-50%)',
          background: `radial-gradient(ellipse 75% 60% at 50% 15%, rgba(255,160,50,0.85) 0%, rgba(255,100,25,0.45) 25%, rgba(200,60,10,0.2) 45%, rgba(120,30,5,0.08) 65%, transparent 80%)`,
          filter: isLow ? 'none' : 'blur(12px)',
        }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: [0.44, 0, 0.56, 1] }}
      />

      {/* Glossy curved sweeps — skip on low */}
      {!isLow && (
        <>
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top: '-10%', left: '3%', width: '68%', height: '90%',
              background: `linear-gradient(145deg, rgba(255,170,70,0.55) 0%, rgba(255,120,30,0.25) 30%, rgba(200,60,10,0.08) 55%, transparent 70%)`,
              borderRadius: '0 0 50% 50%', filter: 'blur(22px)',
              transformOrigin: 'top center', transform: 'rotate(-10deg) skewX(-5deg)',
            }}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2.5, ease: [0.44, 0, 0.56, 1], delay: 0.2 }}
          />
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top: '-10%', right: '3%', width: '68%', height: '90%',
              background: `linear-gradient(215deg, rgba(255,170,70,0.55) 0%, rgba(255,120,30,0.25) 30%, rgba(200,60,10,0.08) 55%, transparent 70%)`,
              borderRadius: '0 0 50% 50%', filter: 'blur(22px)',
              transformOrigin: 'top center', transform: 'rotate(10deg) skewX(5deg)',
            }}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 2.5, ease: [0.44, 0, 0.56, 1], delay: 0.2 }}
          />
        </>
      )}

      {/* Central bright streak */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '2%', left: '50%',
          width: isLow ? '600px' : '1100px', height: isLow ? '400px' : '650px',
          transform: 'translateX(-50%) perspective(800px) rotateX(35deg)',
          background: `radial-gradient(ellipse 100% 80% at 50% 0%, rgba(255,190,80,0.85) 0%, rgba(255,130,35,0.45) 25%, rgba(200,60,10,0.15) 50%, transparent 70%)`,
          filter: isLow ? 'none' : 'blur(10px)',
        }}
        initial={{ opacity: 0, scaleY: 0.3 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 2, ease: [0.44, 0, 0.56, 1], delay: 0.3 }}
      />

      {/* Extra bright core — pulse only on high */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '-8%', left: '50%',
          width: isLow ? '300px' : '600px', height: isLow ? '200px' : '400px',
          transform: 'translateX(-50%)',
          background: `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(255,210,110,0.75) 0%, rgba(255,160,60,0.4) 35%, transparent 65%)`,
          filter: isLow ? 'none' : 'blur(18px)',
        }}
        animate={isLow ? { opacity: 0.9 } : { scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
        transition={isLow ? { duration: 0 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sweeping curved bands — skip on low */}
      {!isLow && (
        <>
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top: '5%', left: '-5%', width: '70%', height: '50%',
              background: `linear-gradient(120deg, transparent 5%, rgba(255,130,40,0.3) 30%, rgba(255,170,70,0.12) 50%, transparent 65%)`,
              borderRadius: '0 0 60% 20%', filter: 'blur(15px)', transform: 'skewY(-6deg)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top: '5%', right: '-5%', width: '70%', height: '50%',
              background: `linear-gradient(240deg, transparent 5%, rgba(255,130,40,0.3) 30%, rgba(255,170,70,0.12) 50%, transparent 65%)`,
              borderRadius: '0 0 20% 60%', filter: 'blur(15px)', transform: 'skewY(6deg)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
        </>
      )}

      {/* Edge rays — reduced on low */}
      {rays.map((angle, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: '-2%', left: '50%', width: '5px', height: '70%', marginLeft: '-2.5px',
            background: `linear-gradient(to bottom, rgba(255,210,110,0.85) 0%, rgba(255,150,50,0.35) 30%, rgba(255,100,20,0.1) 55%, transparent 75%)`,
            transformOrigin: '50% 0%',
            filter: isLow ? 'none' : `blur(${2 + i}px)`,
          }}
          initial={{ opacity: 0, rotate: 0, scaleY: 0 }}
          animate={{ opacity: 0.9, rotate: angle, scaleY: 1 }}
          transition={{ duration: 2, delay: 0.6 + i * 0.07, ease: [0.44, 0, 0.56, 1] }}
        />
      ))}

      {/* Bottom ambient glow — skip on low */}
      {!isLow && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            bottom: '-5%', left: '50%', width: '120%', height: '45%',
            transform: 'translateX(-50%)',
            background: `radial-gradient(ellipse 80% 50% at 50% 90%, rgba(180,70,15,0.12) 0%, rgba(120,40,5,0.06) 40%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3, delay: 1 }}
        />
      )}

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 60%, transparent 100%)' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 25%, transparent 15%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* Top accent line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 5%, rgba(255,160,60,0.7) 50%, transparent 95%)',
          boxShadow: '0 0 25px rgba(255,130,40,0.5)',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
};

export default IgniteBackground;
