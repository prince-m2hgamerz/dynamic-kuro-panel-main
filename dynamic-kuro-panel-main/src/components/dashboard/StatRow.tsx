import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatRowProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  badgeClass?: string;
  isLast?: boolean;
}

export const StatRow = ({ icon, label, value, badgeClass = "bg-cyan-600", isLast = false }: StatRowProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3",
        !isLast && "border-b border-purple-700/30"
      )}
    >
      <span className="flex items-center gap-2 text-gray-300">
        {icon}
        <span>{label}</span>
      </span>
      <Badge className={cn("text-white font-bold px-3", badgeClass)}>
        {value}
      </Badge>
    </div>
  );
};
