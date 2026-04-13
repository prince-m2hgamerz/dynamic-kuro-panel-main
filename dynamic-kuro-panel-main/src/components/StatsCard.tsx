import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent";
  className?: string;
}

export const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) => {
  return (
    <GlassCard
      className={cn(
        "p-6 hover:border-primary/50 transition-all duration-300 group",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              variant === "primary" && "text-primary",
              variant === "accent" && "text-accent"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={cn(
            "p-3 rounded-lg transition-colors",
            variant === "default" && "bg-muted group-hover:bg-primary/10",
            variant === "primary" && "bg-primary/10 group-hover:bg-primary/20",
            variant === "accent" && "bg-accent/10 group-hover:bg-accent/20"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              variant === "default" && "text-muted-foreground group-hover:text-primary",
              variant === "primary" && "text-primary",
              variant === "accent" && "text-accent"
            )}
          />
        </div>
      </div>
    </GlassCard>
  );
};
