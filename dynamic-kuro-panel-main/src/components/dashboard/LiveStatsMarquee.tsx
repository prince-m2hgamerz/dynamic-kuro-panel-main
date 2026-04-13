import { motion } from "framer-motion";
import { Activity, Key, Users, Zap, Shield, Globe } from "lucide-react";

interface MarqueeItem {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
}

interface LiveStatsMarqueeProps {
  items: MarqueeItem[];
}

const MarqueeRow = ({ items, direction = 1, speed = 30 }: { items: MarqueeItem[]; direction?: number; speed?: number }) => {
  // Double items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden w-full" style={{
      maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
    }}>
      <motion.div
        className="flex gap-4 w-max"
        animate={{ x: direction > 0 ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3 rounded-xl shrink-0 group cursor-default"
            style={{
              background: 'linear-gradient(180deg, rgba(51,136,255,0.06) 0%, rgba(0,111,255,0.12) 100%)',
              border: '1px solid rgba(0,111,255,0.15)',
              minWidth: '200px',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(0,17,51,0.7)',
                border: '1px solid rgba(0,111,255,0.25)',
                boxShadow: 'inset 0 0 12px rgba(0,62,161,0.3)',
              }}
            >
              <item.icon className="h-4 w-4 text-[#006fff]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {item.label}
              </span>
              <span className="text-lg font-bold text-white/90 leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
                {item.value}{item.suffix || ''}
              </span>
            </div>
            {/* Blue top highlight */}
            <div className="absolute top-0 left-[20%] right-[20%] h-[1px] opacity-0 group-hover:opacity-100 transition-opacity" style={{
              background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.5) 50%, rgba(0,128,255,0) 100%)',
            }} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const LiveStatsMarquee = ({ items }: LiveStatsMarqueeProps) => {
  const half = Math.ceil(items.length / 2);
  const row1 = items.slice(0, half);
  const row2 = items.slice(half);

  return (
    <motion.div
      className="relative rounded-2xl py-5 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)',
        border: '1px solid rgba(0,111,255,0.1)',
      }}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Top highlight */}
      <div className="absolute top-0 left-[15%] right-[15%] h-[1px] opacity-40" style={{
        background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.4) 50%, rgba(0,128,255,0) 100%)',
      }} />
      
      {/* Label */}
      <div className="flex items-center gap-2 px-6 mb-3">
        <div className="w-2 h-2 rounded-full bg-[#006fff] animate-pulse" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Live System Metrics
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <MarqueeRow items={row1} direction={1} speed={35} />
        {row2.length > 0 && <MarqueeRow items={row2} direction={-1} speed={40} />}
      </div>

      {/* Bottom highlight */}
      <div className="absolute bottom-0 left-[15%] right-[15%] h-[1px] opacity-20" style={{
        background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.4) 50%, rgba(0,128,255,0) 100%)',
      }} />
    </motion.div>
  );
};

export default LiveStatsMarquee;
export { LiveStatsMarquee };
export type { MarqueeItem };
