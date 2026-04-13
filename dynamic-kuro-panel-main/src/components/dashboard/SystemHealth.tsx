import { useState, useEffect } from "react";
import { Activity, Database, Server, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthStatus {
  database: "online" | "offline" | "checking";
  activeKeys: number;
  lastSync: Date;
}

export const SystemHealth = () => {
  const [health, setHealth] = useState<HealthStatus>({
    database: "checking",
    activeKeys: 0,
    lastSync: new Date(),
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Check database by making a simple query
        const { data, error } = await supabase
          .from("license_keys_safe")
          .select("id, status")
          .limit(100);

        if (error) {
          setHealth((prev) => ({ ...prev, database: "offline" }));
        } else {
          const activeCount = data?.filter((k) => k.status === "active").length || 0;
          setHealth({
            database: "online",
            activeKeys: activeCount,
            lastSync: new Date(),
          });
        }
      } catch {
        setHealth((prev) => ({ ...prev, database: "offline" }));
      }
    };

    checkHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    online: "text-success",
    offline: "text-destructive",
    checking: "text-warning",
  };

  const statusBg = {
    online: "bg-success/20",
    offline: "bg-destructive/20",
    checking: "bg-warning/20",
  };

  return (
    <div className="space-y-4">
      {/* Database Status */}
      <div className="flex items-center justify-between py-2 border-b border-border/30">
        <span className="text-muted-foreground flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusBg[health.database]} ${statusColors[health.database]}`}
        >
          {health.database === "checking" ? "Checking..." : health.database.toUpperCase()}
        </span>
      </div>

      {/* Active Keys */}
      <div className="flex items-center justify-between py-2 border-b border-border/30">
        <span className="text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Active Keys
        </span>
        <span className="text-primary font-bold">{health.activeKeys}</span>
      </div>

      {/* Server Status */}
      <div className="flex items-center justify-between py-2 border-b border-border/30">
        <span className="text-muted-foreground flex items-center gap-2">
          <Server className="h-4 w-4" />
          Server
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
          ONLINE
        </span>
      </div>

      {/* Last Sync */}
      <div className="flex items-center justify-between py-2">
        <span className="text-muted-foreground flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Last Sync
        </span>
        <span className="text-accent text-sm">
          {health.lastSync.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};
