import { Wrench, Phone } from "lucide-react";
import { StarryBackground } from "@/components/StarryBackground";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

interface MaintenanceScreenProps {
  message?: string;
  contactUrl?: string;
}

export const MaintenanceScreen = ({ message, contactUrl }: MaintenanceScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <StarryBackground />
      <GlassCard className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-warning/20 rounded-full animate-pulse">
            <Wrench className="h-12 w-12 text-warning" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Maintenance Mode</h1>
          <p className="text-muted-foreground">
            The panel is currently under maintenance. Please try again later.
          </p>
        </div>

        {message && (
          <div className="p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-sm text-foreground">{message}</p>
          </div>
        )}

        {contactUrl && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(contactUrl, "_blank")}
          >
            <Phone className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          We apologize for the inconvenience.
        </p>
      </GlassCard>
    </div>
  );
};
