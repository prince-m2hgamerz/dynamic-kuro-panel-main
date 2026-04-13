import { cn } from "@/lib/utils";

type Status = "active" | "paused" | "expired" | "revoked" | "banned" | "suspended" | "inactive" | "maintenance";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-success/20 text-success border-success/30",
  },
  paused: {
    label: "Paused",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground border-border",
  },
  revoked: {
    label: "Revoked",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
  banned: {
    label: "Banned",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
  suspended: {
    label: "Suspended",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-border",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-info/20 text-info border-info/30",
  },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
        config.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {config.label}
    </span>
  );
};
