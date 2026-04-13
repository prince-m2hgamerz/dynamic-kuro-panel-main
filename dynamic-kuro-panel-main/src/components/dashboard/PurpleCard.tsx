import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PurpleCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  headerIcon?: ReactNode;
}

export const PurpleCard = ({ title, icon, children, className, headerAction, headerIcon }: PurpleCardProps) => {
  return (
    <motion.div
      className={cn("rounded-2xl overflow-hidden relative group", className)}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.2) 100%)',
        border: '1px solid rgba(0,111,255,0.12)',
        boxShadow: 'inset 0 0 30px rgba(0,62,161,0.05), 0 8px 24px rgba(0,0,0,0.3)',
      }}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{
        boxShadow: 'inset 0 0 40px rgba(0,111,255,0.1), 0 12px 40px rgba(0,0,0,0.4)',
        borderColor: 'rgba(0,111,255,0.22)',
      }}
    >
      {/* Top highlight line */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-[1px] opacity-40 group-hover:opacity-80 transition-opacity"
        style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.5) 50%, rgba(0,128,255,0) 100%)' }}
      />
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, rgba(0,111,255,0.08) 0%, rgba(0,111,255,0.02) 100%)',
          borderBottom: '1px solid rgba(0,111,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(0,17,51,0.6)',
                border: '1px solid rgba(0,111,255,0.2)',
                boxShadow: 'inset 0 0 12px rgba(0,62,161,0.3)',
              }}
            >
              <span className="text-sm">{icon}</span>
            </div>
          )}
          <span className="font-semibold text-foreground tracking-wide text-sm" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>{title}</span>
          {headerIcon && <span className="ml-2">{headerIcon}</span>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  );
};
