import { Activity, Package, Wifi, CreditCard, Infinity } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconBg: string;
  badge?: string;
  delay: number;
}

const StatCard = ({ label, value, icon: Icon, badge, delay }: StatCardProps) => (
  <motion.div
    className="relative rounded-2xl p-5 group"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%)',
      border: '1px solid rgba(0,111,255,0.12)',
      boxShadow: 'inset 0 0 30px rgba(0,62,161,0.06), 0 8px 32px rgba(0,0,0,0.3)',
    }}
    initial={{ opacity: 0, y: 48 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{
      boxShadow: 'inset 0 0 40px rgba(0,111,255,0.12), 0 12px 40px rgba(0,0,0,0.4)',
      borderColor: 'rgba(0,111,255,0.25)',
      y: -4,
    }}
  >
    {/* Top highlight */}
    <div
      className="absolute top-0 left-[15%] right-[15%] h-[1px] opacity-40 group-hover:opacity-100 transition-opacity"
      style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.5) 50%, rgba(0,128,255,0) 100%)' }}
    />
    {badge && (
      <span
        className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: 'rgba(51,136,255,0.09)',
          border: '1px solid rgba(0,111,255,0.2)',
          color: 'rgba(0,111,255,0.8)',
        }}
      >
        {badge}
      </span>
    )}
    <motion.div
      className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
      style={{
        background: 'rgba(0,17,51,0.6)',
        border: '1px solid rgba(0,111,255,0.2)',
        boxShadow: 'inset 0 0 20px rgba(0,62,161,0.3)',
      }}
      whileHover={{ rotate: 10, scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Icon className="h-5 w-5 text-[#006fff]" />
    </motion.div>
    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </p>
    <p className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Orbitron', sans-serif" }}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </p>
  </motion.div>
);

interface StatsCardsRowProps {
  activeKeys: number;
  totalKeys: number;
  totalRequests: number;
  isOwner?: boolean;
}

export const StatsCardsRow = ({
  activeKeys,
  totalKeys,
  totalRequests,
  isOwner = false,
}: StatsCardsRowProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <StatCard
        label="Active Nodes"
        value={activeKeys}
        icon={Activity}
        iconBg=""
        badge="+5%"
        delay={0}
      />
      <StatCard
        label="Inventory"
        value={totalKeys}
        icon={Package}
        iconBg=""
        badge="+3%"
        delay={0.05}
      />
      <StatCard
        label="Network Load"
        value={totalRequests}
        icon={Wifi}
        iconBg=""
        badge="+18%"
        delay={0.1}
      />
      <StatCard
        label="Credits"
        value={isOwner ? "∞ Unlimited" : "0"}
        icon={isOwner ? Infinity : CreditCard}
        iconBg=""
        delay={0.15}
      />
    </div>
  );
};
