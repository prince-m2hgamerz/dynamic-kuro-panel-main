import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface GTAInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const GTAInput = forwardRef<HTMLInputElement, GTAInputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-foreground/70 text-xs font-medium tracking-[0.15em] uppercase">
            {label}
          </label>
        )}
        <div className="relative group">
          {/* Background glow on focus - Purple */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
          
          <div className="relative">
            {icon && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors">
                {icon}
              </div>
            )}
            <input
              type={isPassword ? (showPassword ? "text" : "password") : type}
              className={cn(
                "w-full py-3.5 px-4 bg-primary/[0.03] border border-primary/15 rounded-xl",
                "text-foreground placeholder:text-foreground/30",
                "outline-none transition-all duration-300",
                "focus:border-primary/40 focus:bg-primary/[0.05]",
                "focus:shadow-[0_0_20px_hsl(var(--primary)/0.1),inset_0_0_20px_hsl(var(--primary)/0.02)]",
                icon && "pl-12",
                isPassword && "pr-12",
                error && "border-destructive/50 focus:border-destructive",
                className
              )}
              ref={ref}
              {...props}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
        {error && (
          <p className="text-destructive text-xs flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-destructive" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

GTAInput.displayName = "GTAInput";
