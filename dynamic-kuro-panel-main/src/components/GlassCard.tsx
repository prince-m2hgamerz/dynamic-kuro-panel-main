import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { motion } from "framer-motion";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered" | "glow" | "3d";
  header?: {
    title: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  };
  interactive?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", header, children, interactive = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref as any}
        className={cn("rounded-2xl overflow-hidden relative group", className)}
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.2) 100%)',
          border: '1px solid rgba(0,111,255,0.12)',
          boxShadow: 'inset 0 0 30px rgba(0,62,161,0.05), 0 8px 24px rgba(0,0,0,0.3)',
          ...props.style,
        }}
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        whileHover={interactive ? {
          boxShadow: 'inset 0 0 40px rgba(0,111,255,0.12), 0 12px 40px rgba(0,0,0,0.4)',
          borderColor: 'rgba(0,111,255,0.25)',
          y: -4,
        } : undefined}
        {...(props as any)}
      >
        {/* Top highlight line */}
        <div
          className="absolute top-0 left-[10%] right-[10%] h-[1px] opacity-40 group-hover:opacity-80 transition-opacity"
          style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.5) 50%, rgba(0,128,255,0) 100%)' }}
        />
        
        {header && (
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              background: 'linear-gradient(90deg, rgba(0,111,255,0.08) 0%, rgba(0,111,255,0.02) 100%)',
              borderBottom: '1px solid rgba(0,111,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2.5">
              {header.icon && (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(0,17,51,0.6)',
                    border: '1px solid rgba(0,111,255,0.2)',
                    boxShadow: 'inset 0 0 12px rgba(0,62,161,0.3)',
                  }}
                >
                  <span className="text-sm text-[#006fff]">{header.icon}</span>
                </div>
              )}
              <h3 className="font-semibold text-foreground tracking-wide text-sm" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>{header.title}</h3>
            </div>
            {header.action && <div>{header.action}</div>}
          </div>
        )}
        <div className={cn(header ? "p-4" : "")}>
          {children}
        </div>
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

// Stat Card Component with Framer style
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "accent";
}

export const StatCard = ({ label, value, icon, trend }: StatCardProps) => {
  return (
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
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
          <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Bebas Neue', 'Orbitron', sans-serif" }}>{value}</p>
          {trend && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{
                background: trend.isPositive ? 'rgba(51,255,136,0.09)' : 'rgba(255,51,51,0.09)',
                border: `1px solid ${trend.isPositive ? 'rgba(0,255,111,0.2)' : 'rgba(255,0,0,0.2)'}`,
                color: trend.isPositive ? 'rgba(0,255,111,0.8)' : 'rgba(255,80,80,0.8)',
              }}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(0,17,51,0.6)',
            border: '1px solid rgba(0,111,255,0.2)',
            boxShadow: 'inset 0 0 20px rgba(0,62,161,0.3)',
          }}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
};
