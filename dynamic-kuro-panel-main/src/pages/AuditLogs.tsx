import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  username?: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // Fetch audit logs without join
      const { data: logsData, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, entity_type, entity_id, details, ip_address, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (logsData && logsData.length > 0) {
        // Fetch usernames separately
        const userIds = [...new Set(logsData.filter(l => l.user_id).map(l => l.user_id))] as string[];
        
        let usernameMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles_safe")
            .select("id, username")
            .in("id", userIds);
          
          usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
        }

        const logsWithUsernames: AuditLog[] = logsData.map(log => ({
          id: log.id,
          user_id: log.user_id,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          details: log.details,
          ip_address: log.ip_address as string | null,
          created_at: log.created_at,
          username: log.user_id ? usernameMap.get(log.user_id) || "Unknown" : "System"
        }));
        
        setLogs(logsWithUsernames);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(logs.map((log) => log.action))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all administrative actions
          </p>
        </div>

        <GlassCard className="p-6">
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action or username..."
                className="pl-10 bg-secondary/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full bg-secondary/50 sm:w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No logs found</div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </span>
                      <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {log.action}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{log.username || "System"}</div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><span className="text-foreground">Entity:</span> {log.entity_type || "-"}</p>
                      <p className="break-words"><span className="text-foreground">Details:</span> {log.details ? JSON.stringify(log.details) : "-"}</p>
                      <p className="break-all"><span className="text-foreground">IP:</span> {log.ip_address || "-"}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.username || "System"}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.entity_type || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                          {log.details ? JSON.stringify(log.details) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {log.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogs;
