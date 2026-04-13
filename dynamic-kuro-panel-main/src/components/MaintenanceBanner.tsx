import { AlertTriangle } from "lucide-react";

interface MaintenanceBannerProps {
  message?: string;
}

export const MaintenanceBanner = ({ message }: MaintenanceBannerProps) => {
  return (
    <div className="bg-warning/20 border-b border-warning/30 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-warning text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Maintenance Mode Active</span>
        {message && <span className="text-warning/80">— {message}</span>}
      </div>
    </div>
  );
};
