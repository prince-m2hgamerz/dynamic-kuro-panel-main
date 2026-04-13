import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: ReactNode;
  isLast?: boolean;
}

export const InfoRow = ({ label, value, isLast = false }: InfoRowProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3",
        !isLast && "border-b border-purple-700/30"
      )}
    >
      <span className="text-gray-400 font-medium">{label}</span>
      <div>{value}</div>
    </div>
  );
};
