import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, History, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PurpleCard } from "@/components/dashboard/PurpleCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface HistoryStats {
  auditLogs: number;
  expiredKeys: number;
  revokedKeys: number;
}

const ClearHistory = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<HistoryStats>({
    auditLogs: 0,
    expiredKeys: 0,
    revokedKeys: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);

    // Fetch audit logs count
    const { count: auditCount } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true });

    // Fetch expired keys count
    const { count: expiredCount } = await supabase
      .from("license_keys_safe")
      .select("*", { count: "exact", head: true })
      .eq("status", "expired");

    // Fetch revoked keys count
    const { count: revokedCount } = await supabase
      .from("license_keys_safe")
      .select("*", { count: "exact", head: true })
      .eq("status", "revoked");

    setStats({
      auditLogs: auditCount || 0,
      expiredKeys: expiredCount || 0,
      revokedKeys: revokedCount || 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const clearAuditLogs = async () => {
    setClearing("audit");
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'clear_audit_logs' },
    });

    if (error || data?.error) {
      toast({ title: "Failed to clear audit logs", variant: "destructive" });
    } else {
      toast({ title: "Audit logs cleared successfully" });
      fetchStats();
    }
    setClearing(null);
  };

  const clearExpiredKeys = async () => {
    setClearing("expired");
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'clear_expired_keys' },
    });

    if (error || data?.error) {
      toast({ title: "Failed to clear expired keys", variant: "destructive" });
    } else {
      toast({ title: "Expired keys cleared successfully" });
      fetchStats();
    }
    setClearing(null);
  };

  const clearRevokedKeys = async () => {
    setClearing("revoked");
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'clear_revoked_keys' },
    });

    if (error || data?.error) {
      toast({ title: "Failed to clear revoked keys", variant: "destructive" });
    } else {
      toast({ title: "Revoked keys cleared successfully" });
      fetchStats();
    }
    setClearing(null);
  };

  const clearAll = async () => {
    setClearing("all");
    await clearAuditLogs();
    await clearExpiredKeys();
    await clearRevokedKeys();
    toast({ title: "All history cleared successfully" });
    setClearing(null);
  };

  const ClearButton = ({
    label,
    count,
    onClear,
    clearingKey,
    variant = "default",
  }: {
    label: string;
    count: number;
    onClear: () => void;
    clearingKey: string;
    variant?: "default" | "destructive";
  }) => (
    <div className="flex items-center justify-between p-4 bg-purple-900/30 rounded-lg border border-purple-700/30">
      <div>
        <p className="text-white font-semibold">{label}</p>
        <p className="text-gray-400 text-sm">{count} items</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant === "destructive" ? "destructive" : "outline"}
            size="sm"
            disabled={count === 0 || clearing !== null}
            className={
              variant === "default"
                ? "border-purple-700/50 text-purple-300 hover:bg-purple-900/50"
                : ""
            }
          >
            {clearing === clearingKey ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Clear {label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {count} {label.toLowerCase()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClear}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Clear History</h1>
            <p className="text-gray-400 text-sm">
              Manage and clear system history data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PurpleCard title="🗑️ Clear Options">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : (
              <div className="space-y-4">
                <ClearButton
                  label="Audit Logs"
                  count={stats.auditLogs}
                  onClear={clearAuditLogs}
                  clearingKey="audit"
                />
                <ClearButton
                  label="Expired Keys"
                  count={stats.expiredKeys}
                  onClear={clearExpiredKeys}
                  clearingKey="expired"
                />
                <ClearButton
                  label="Revoked Keys"
                  count={stats.revokedKeys}
                  onClear={clearRevokedKeys}
                  clearingKey="revoked"
                />
              </div>
            )}
          </PurpleCard>

          <PurpleCard title="⚠️ Danger Zone">
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-semibold">Clear All History</p>
                    <p className="text-gray-400 text-sm mt-1">
                      This will permanently delete all audit logs, expired keys,
                      and revoked keys. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={
                      (stats.auditLogs === 0 &&
                        stats.expiredKeys === 0 &&
                        stats.revokedKeys === 0) ||
                      clearing !== null
                    }
                  >
                    {clearing === "all" ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Clear All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Clear All History?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>{stats.auditLogs} audit logs</li>
                        <li>{stats.expiredKeys} expired keys</li>
                        <li>{stats.revokedKeys} revoked keys</li>
                      </ul>
                      <p className="mt-2 font-semibold text-red-400">
                        This action cannot be undone!
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearAll}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </PurpleCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClearHistory;
