import { forwardRef, ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GTAButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  glow?: boolean;
}

export const GTAButton = forwardRef<HTMLButtonElement, GTAButtonProps>(
  ({ className, variant = "primary", size = "md", loading, glow = true, children, disabled, ...props }, ref) => {
    const sizeClasses = {
      sm: "py-2.5 px-5 text-xs",
      md: "py-3.5 px-6 text-sm",
      lg: "py-4 px-8 text-base",
    };

    const variantClasses = {
      primary: `
        bg-gradient-to-r from-primary via-primary/85 to-secondary
        text-primary-foreground font-bold
        border-0
        shadow-[0_4px_20px_hsl(var(--primary)/0.35),0_0_40px_hsl(var(--secondary)/0.15)]
        hover:shadow-[0_6px_30px_hsl(var(--primary)/0.5),0_0_60px_hsl(var(--secondary)/0.25)]
      `,
      secondary: `
        bg-gradient-to-r from-secondary via-secondary/85 to-accent
        text-secondary-foreground font-bold
        border-0
        shadow-[0_4px_20px_hsl(var(--secondary)/0.35)]
        hover:shadow-[0_6px_30px_hsl(var(--secondary)/0.45),0_0_40px_hsl(var(--accent)/0.2)]
      `,
      outline: `
        bg-transparent
        text-primary font-semibold
        border-2 border-primary/40
        hover:bg-primary/10 hover:border-primary
        hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]
      `,
      ghost: `
        bg-primary/5
        text-foreground font-medium
        border border-primary/15
        hover:bg-primary/10 hover:border-primary/30
      `,
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative rounded-xl uppercase tracking-[0.15em] transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
          "overflow-hidden",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -2 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        {...(props as any)}
      >
        {/* Animated gradient shine */}
        {glow && !disabled && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.25) 55%, transparent 60%)",
            }}
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        )}

        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
        </span>
      </motion.button>
    );
  }
);

GTAButton.displayName = "GTAButton";
