import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GTACardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: "default" | "neon" | "glass" | "solid";
  hover?: boolean;
}

export const GTACard = ({
  children,
  variant = "neon",
  hover = true,
  className,
  ...props
}: GTACardProps) => {
  const variants = {
    default: `
      bg-background/80 
      backdrop-blur-xl 
      border border-border/50
      shadow-xl
    `,
    neon: `
      bg-gradient-to-br from-background/90 via-background/80 to-background/90
      backdrop-blur-xl
      border-2 border-primary/20
      shadow-[0_0_30px_hsl(var(--primary)/0.06),0_0_60px_hsl(var(--primary)/0.03),inset_0_1px_0_hsl(var(--primary)/0.06)]
    `,
    glass: `
      bg-muted/5
      backdrop-blur-2xl
      border border-muted/10
      shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_hsl(var(--primary)/0.04)]
    `,
    solid: `
      bg-gradient-to-br from-card via-card to-card
      border border-primary/15
      shadow-2xl
    `,
  };

  return (
    <motion.div
      className={cn(
        "rounded-2xl relative overflow-hidden",
        variants[variant],
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={hover ? { scale: 1.01 } : undefined}
      {...props}
    >
      {/* Animated border gradient — theme colors */}
      {variant === "neon" && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--secondary) / 0.15) 50%, hsl(var(--accent) / 0.15) 100%)",
            padding: "2px",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
          }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Corner accents */}
      {variant === "neon" && (
        <>
          <div className="absolute top-0 left-0 w-14 h-14 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-60" />
            <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-primary to-transparent opacity-60" />
          </div>
          <div className="absolute bottom-0 right-0 w-14 h-14 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-secondary to-transparent opacity-60" />
            <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-secondary to-transparent opacity-60" />
          </div>
        </>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Inner glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.04) 0%, transparent 60%)",
        }}
      />
    </motion.div>
  );
};
