import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { StarryBackground } from "@/components/StarryBackground";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  allowedRoles?: ("owner" | "admin" | "user" | "co_owner" | "reseller")[];
  children?: React.ReactNode;
}

interface MaintenanceSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings | null>(null);
  const [hasMaintenanceAccess, setHasMaintenanceAccess] = useState<boolean | null>(null);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Fetch maintenance settings via secure RPC function
        const { data: settingsData } = await supabase.rpc('get_maintenance_settings');
        const settings = settingsData as any;

        const maintenanceMode = settings?.maintenance_mode === true;
        const maintenanceMessage = (settings?.maintenance_message as string) || "";

        setMaintenanceSettings({
          maintenanceMode,
          maintenanceMessage,
        });

        // If maintenance mode is on and user is not owner/co_owner, check maintenance_access
        if (maintenanceMode && user && role !== "owner" && role !== "co_owner") {
          const { data: accessData } = await supabase
            .from("maintenance_access")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          setHasMaintenanceAccess(!!accessData);
        } else {
          setHasMaintenanceAccess(null);
        }
      } catch (error) {
        console.error("Error checking maintenance:", error);
        setMaintenanceSettings({ maintenanceMode: false, maintenanceMessage: "" });
      } finally {
        setCheckingMaintenance(false);
      }
    };

    if (!loading && user) {
      checkMaintenance();
    } else if (!loading) {
      setCheckingMaintenance(false);
    }
  }, [user, role, loading]);

  if (loading || checkingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StarryBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check maintenance mode
  if (maintenanceSettings?.maintenanceMode) {
    // Owner and co_owner always have access
    const isPrivilegedRole = role === "owner" || role === "co_owner";
    
    if (!isPrivilegedRole && !hasMaintenanceAccess) {
      return <MaintenanceScreen message={maintenanceSettings.maintenanceMessage} />;
    }
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
