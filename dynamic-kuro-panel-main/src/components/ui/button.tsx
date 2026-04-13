import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold uppercase tracking-wider ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu",
  {
    variants: {
      variant: {
        // GTA VI Neon Pink primary button
        default: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] hover:scale-105 active:scale-95",
        // Destructive with red glow
        destructive: "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-[0_0_20px_hsl(var(--destructive)/0.4)] hover:shadow-[0_0_30px_hsl(var(--destructive)/0.6)] hover:scale-105 active:scale-95",
        // Outline with neon border
        outline: "border-2 border-primary/50 bg-primary/5 backdrop-blur-sm text-primary hover:bg-primary/15 hover:border-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] active:scale-95",
        // Secondary cyan button
        secondary: "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground shadow-[0_0_20px_hsl(var(--secondary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--secondary)/0.6)] hover:scale-105 active:scale-95",
        // Ghost minimal
        ghost: "hover:bg-white/10 hover:text-foreground active:scale-95",
        // Link style
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        // Cyan neon
        cyan: "bg-gradient-to-r from-secondary via-secondary/90 to-info text-secondary-foreground font-bold shadow-[0_0_25px_hsl(var(--secondary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--secondary)/0.7)] hover:scale-105 active:scale-95",
        "cyan-outline": "border-2 border-secondary/50 text-secondary bg-secondary/5 backdrop-blur-sm hover:bg-secondary/15 hover:border-secondary hover:shadow-[0_0_20px_hsl(var(--secondary)/0.3)] active:scale-95",
        // Soft variants
        "danger-soft": "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 hover:shadow-[0_0_15px_hsl(var(--destructive)/0.3)] active:scale-95",
        "success-soft": "bg-success/20 text-success border border-success/30 hover:bg-success/30 hover:shadow-[0_0_15px_hsl(var(--success)/0.3)] active:scale-95",
        "warning-soft": "bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 hover:shadow-[0_0_15px_hsl(var(--warning)/0.3)] active:scale-95",
        "info-soft": "bg-info/20 text-info border border-info/30 hover:bg-info/30 hover:shadow-[0_0_15px_hsl(var(--info)/0.3)] active:scale-95",
        // Glass button
        "glass": "bg-white/5 border border-white/20 text-foreground backdrop-blur-xl hover:bg-white/10 hover:border-white/30 active:scale-95",
        // Premium purple gradient
        "premium": "bg-gradient-to-r from-primary via-accent to-secondary text-white font-bold shadow-[0_0_30px_hsl(var(--primary)/0.4),0_0_60px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.6),0_0_80px_hsl(var(--accent)/0.3)] hover:scale-105 active:scale-95",
        // Neon pink animated
        "neon": "bg-gradient-to-r from-primary to-accent text-white font-bold shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.7)] animate-neon-pulse hover:scale-105 active:scale-95",
        // GTA orange accent
        "accent": "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-[0_0_20px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.6)] hover:scale-105 active:scale-95",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
