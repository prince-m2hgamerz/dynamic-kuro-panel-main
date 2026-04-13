import { useState, useEffect } from "react";
import { Save, Loader2, Server, AlertTriangle, UserPlus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ServerSettingsData {
  panel_name: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_disable_bots: boolean;
  mod_display_name: string;
  session_timeout_minutes: number;
}

interface MaintenanceAccessUser {
  id: string;
  user_id: string;
  granted_at: string;
  expires_at: string | null;
  note: string | null;
  username?: string;
  role?: string;
}

const defaultSettings: ServerSettingsData = {
  panel_name: "License & Auth Panel",
  maintenance_mode: false,
  maintenance_message: "",
  maintenance_disable_bots: true,
  mod_display_name: "Premium Mod",
  session_timeout_minutes: 30,
};

const ServerSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ServerSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceAccess, setMaintenanceAccess] = useState<MaintenanceAccessUser[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string; role: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchMaintenanceAccess();
    fetchUsers();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("server_settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        const settingsMap: any = {};
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
        });

        setSettings({
          panel_name: settingsMap.panel_name || defaultSettings.panel_name,
          maintenance_mode: settingsMap.maintenance_mode || defaultSettings.maintenance_mode,
          maintenance_message: settingsMap.maintenance_message || defaultSettings.maintenance_message,
          maintenance_disable_bots: settingsMap.maintenance_disable_bots ?? defaultSettings.maintenance_disable_bots,
          mod_display_name: settingsMap.mod_display_name || defaultSettings.mod_display_name,
          session_timeout_minutes:
            settingsMap.session_timeout_minutes || defaultSettings.session_timeout_minutes,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_access")
        .select("*")
        .order("granted_at", { ascending: false });

      if (error) throw error;

      // Fetch usernames for each access entry
      if (data && data.length > 0) {
        const userIds = data.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles_safe")
          .select("id, username")
          .in("id", userIds);
        
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const accessWithUsernames = data.map(access => ({
          ...access,
          username: profiles?.find(p => p.id === access.user_id)?.username || "Unknown",
          role: roles?.find(r => r.user_id === access.user_id)?.role || "user",
        }));

        setMaintenanceAccess(accessWithUsernames);
      } else {
        setMaintenanceAccess([]);
      }
    } catch (error) {
      console.error("Error fetching maintenance access:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles_safe")
        .select("id, username");
      
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (profiles) {
        const usersWithRoles = profiles.map(p => ({
          id: p.id,
          username: p.username,
          role: roles?.find(r => r.user_id === p.id)?.role || "user",
        })).filter(u => u.role !== "owner" && u.role !== "co_owner");
        
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const grantAccess = async () => {
    if (!selectedUserId || !user) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'grant_maintenance_access', target_user_id: selectedUserId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Access granted successfully" });
      setGrantDialogOpen(false);
      setSelectedUserId("");
      fetchMaintenanceAccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to grant access", variant: "destructive" });
    }
  };

  const revokeAccess = async (accessId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'revoke_maintenance_access', access_id: accessId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Access revoked successfully" });
      fetchMaintenanceAccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to revoke access", variant: "destructive" });
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'save_server_settings', settings },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Settings saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Server Settings</h1>
          <p className="text-muted-foreground">
            Configure global panel settings (Owner only)
          </p>
        </div>

        {/* General Settings */}
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">General Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="panelName">Panel Name</Label>
              <Input
                id="panelName"
                value={settings.panel_name}
                onChange={(e) =>
                  setSettings({ ...settings, panel_name: e.target.value })
                }
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modName">Mod Display Name</Label>
              <Input
                id="modName"
                value={settings.mod_display_name}
                onChange={(e) =>
                  setSettings({ ...settings, mod_display_name: e.target.value })
                }
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                Display name shown in the game client
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="5"
                max="120"
                value={settings.session_timeout_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    session_timeout_minutes: parseInt(e.target.value),
                  })
                }
                className="bg-secondary/50 w-32"
              />
            </div>
          </div>
        </GlassCard>

        {/* Maintenance Mode */}
        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Maintenance Mode</h2>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable user access to the panel
                </p>
              </div>
            </div>
            <Switch
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenance_mode: checked })
              }
            />
          </div>

          {settings.maintenance_mode && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">Custom Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  placeholder="Enter a message to display to blocked users..."
                  value={settings.maintenance_message}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenance_message: e.target.value })
                  }
                  className="bg-secondary/50"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Disable All Telegram Bots</p>
                  <p className="text-sm text-muted-foreground">
                    Bots will respond with maintenance message
                  </p>
                </div>
                <Switch
                  checked={settings.maintenance_disable_bots}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, maintenance_disable_bots: checked })
                  }
                />
              </div>

              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm text-warning">
                  ⚠️ Maintenance mode is enabled. Only Owner and Co-Owner can access the panel.
                  {settings.maintenance_disable_bots && " All Telegram bots are disabled."}
                </p>
              </div>

              {/* Maintenance Access Management */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Granted Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Users who can access during maintenance
                    </p>
                  </div>
                  <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Grant Access
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-border">
                      <DialogHeader>
                        <DialogTitle>Grant Maintenance Access</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Select User</Label>
                          <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                          >
                            <SelectTrigger className="bg-secondary/50">
                              <SelectValue placeholder="Choose a user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(u => !maintenanceAccess.find(a => a.user_id === u.id))
                                .map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.username} ({u.role})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={grantAccess}
                          disabled={!selectedUserId}
                          className="w-full"
                        >
                          Grant Access
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {maintenanceAccess.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Granted At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceAccess.map((access) => (
                          <TableRow key={access.id}>
                            <TableCell className="font-medium">
                              {access.username}
                            </TableCell>
                            <TableCell className="capitalize">
                              {access.role}
                            </TableCell>
                            <TableCell>
                              {new Date(access.granted_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeAccess(access.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users have been granted maintenance access
                  </p>
                )}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default ServerSettings;
