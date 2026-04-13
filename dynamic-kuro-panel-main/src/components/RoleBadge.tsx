import { cn } from "@/lib/utils";
import { Crown, Shield, User, Store } from "lucide-react";

type Role = "owner" | "admin" | "user" | "co_owner" | "reseller";

interface RoleBadgeProps {
  role: Role;
  className?: string;
  showIcon?: boolean;
}

const roleConfig = {
  owner: {
    label: "Owner",
    icon: Crown,
    className: "bg-accent/20 text-accent border-accent/30",
  },
  co_owner: {
    label: "Co-Owner",
    icon: Crown,
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    className: "bg-primary/20 text-primary border-primary/30",
  },
  reseller: {
    label: "Reseller",
    icon: Store,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  user: {
    label: "User",
    icon: User,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export const RoleBadge = ({ role, className, showIcon = true }: RoleBadgeProps) => {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
};
