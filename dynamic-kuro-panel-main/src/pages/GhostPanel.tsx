import { useState, useEffect } from "react";
import { Ghost, Webhook, Shield, Key, Eye, EyeOff, Save, Loader2, CheckCircle2, Users, UserCog, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
// Ghost owner check is now from AuthContext (server-side)
import { Navigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleBadge } from "@/components/RoleBadge";
import { AppRole } from "@/contexts/AuthContext";

interface UserForGhost {
  id: string;
  username: string;
  email?: string;
  role: AppRole;
  requires_otp: boolean;
  is_hidden: boolean;
  telegram_chat_id?: string;
  has_bot_token: boolean;
  otp_webhook_set?: boolean;
}

const GhostPanel = () => {
  const { user, isGhostOwner } = useAuth();
  const { toast } = useToast();
  
  // User management state
  const [allUsers, setAllUsers] = useState<UserForGhost[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // OTP Config Modal state
  const [selectedUser, setSelectedUser] = useState<UserForGhost | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  // STRICT: Server-side ghost owner check via AuthContext
  const canAccess = isGhostOwner;

  useEffect(() => {
    if (!canAccess) return;

    loadAllUsers();

    // Real-time refresh when profiles/roles change
    const channel = supabase
      .channel("ghost-panel-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => loadAllUsers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => loadAllUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canAccess]);

  const loadAllUsers = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghost-admin?action=list-users`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to load users");
      const result = await res.json();

      if (result.users && result.users.length > 0) {
        const userIds = result.users.map((p: any) => p.id);
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role as AppRole]) || []);

        const usersWithRoles: UserForGhost[] = result.users
          .filter((p: any) => p.id !== user?.id)
          .map((profile: any) => ({
            id: profile.id,
            username: profile.username,
            role: rolesMap.get(profile.id) || "user",
            requires_otp: profile.requires_otp || false,
            is_hidden: profile.is_hidden || false,
            telegram_chat_id: profile.telegram_chat_id || undefined,
            has_bot_token: profile.has_bot_token || false,
            otp_webhook_set: profile.otp_webhook_set || false,
          }));

        setAllUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const openOtpConfig = (userToConfig: UserForGhost) => {
    setSelectedUser(userToConfig);
    setBotToken(""); // Token is never fetched client-side
    setChatId(userToConfig.telegram_chat_id || "");
    setShowOtpModal(true);
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setSelectedUser(null);
    setBotToken("");
    setChatId("");
    setShowToken(false);
  };

  const saveOtpConfig = async () => {
    if (!selectedUser) return;
    
    if (!botToken.trim() || !chatId.trim()) {
      toast({
        title: "Error",
        description: "Please enter both Bot Token and Chat ID",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghost-admin?action=update-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
            bot_token: botToken.trim(),
            chat_id: chatId.trim(),
            requires_otp: true,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save config");

      setAllUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, has_bot_token: result.has_bot_token, telegram_chat_id: chatId.trim(), requires_otp: true, otp_webhook_set: result.webhook_reset ? false : (u.otp_webhook_set || false) }
          : u
      ));
      
      setSelectedUser(prev => prev ? { ...prev, has_bot_token: result.has_bot_token, telegram_chat_id: chatId.trim(), otp_webhook_set: result.webhook_reset ? false : (prev.otp_webhook_set || false) } : null);

      toast({
        title: "Success",
        description: result.webhook_reset
          ? "OTP config saved! Now click 'Set Webhook' to activate."
          : "OTP configuration updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save config",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setWebhookForUser = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please save the bot token first",
        variant: "destructive",
      });
      return;
    }

    setIsSettingWebhook(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Use server-side edge function - bot token stays on server
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghost-admin?action=set-webhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: selectedUser.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to set webhook");
      }

      setAllUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, otp_webhook_set: true } : u
      ));
      
      setSelectedUser(prev => prev ? { ...prev, otp_webhook_set: true } : null);
      
      toast({
        title: "Success",
        description: `Webhook set for ${selectedUser.username}! OTP will now work.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set webhook",
        variant: "destructive",
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const toggleOtpRequired = async (userId: string, currentValue: boolean) => {
    setUpdatingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_otp_required', target_user_id: userId, requires_otp: !currentValue },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, requires_otp: !currentValue } : u));
      toast({ title: "Success", description: `OTP ${!currentValue ? "enabled" : "disabled"} for user` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update OTP setting", variant: "destructive" });
    } finally {
      setUpdatingUser(null);
    }
  };

  const toggleHidden = async (userId: string, currentValue: boolean) => {
    setUpdatingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_hidden', target_user_id: userId, is_hidden: !currentValue },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_hidden: !currentValue } : u));
      toast({ title: "Success", description: `User ${!currentValue ? "hidden" : "visible"} now` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update visibility", variant: "destructive" });
    } finally {
      setUpdatingUser(null);
    }
  };

  const changeUserRole = async (userId: string, newRole: AppRole) => {
    setUpdatingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'change_role', target_user_id: userId, new_role: newRole },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: "Success", description: `Role changed to ${newRole}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to change role", variant: "destructive" });
    } finally {
      setUpdatingUser(null);
    }
  };

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <Ghost className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text-sunset">Ghost Panel</h1>
            <p className="text-muted-foreground">Hidden admin controls - Ghost Owner</p>
          </div>
        </div>

        {/* Security Warning */}
        <GlassCard className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-warning" />
            <p className="text-warning text-sm font-medium">
              ⚠️ This panel is ONLY visible to you ({user?.email}). No other user can access this page.
            </p>
          </div>
        </GlassCard>

        {/* User Management with OTP Config */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">User Management & OTP Configuration</h2>
          </div>

          <p className="text-muted-foreground text-sm mb-4">
            Click on a user's "Configure OTP" to set up their personal bot token and chat ID for OTP delivery.
          </p>

          <div className="rounded-lg border border-border/30 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 border-border/30">
                  <TableHead className="text-muted-foreground">Username</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground text-center">OTP Status</TableHead>
                  <TableHead className="text-muted-foreground text-center">Hidden</TableHead>
                  <TableHead className="text-muted-foreground text-center">OTP Config</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : allUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  allUsers.map((u) => (
                    <TableRow key={u.id} className="border-border/30">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {u.username}
                          {u.is_hidden && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                              Ghost
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(value) => changeUserRole(u.id, value as AppRole)}
                          disabled={updatingUser === u.id}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue>
                              <RoleBadge role={u.role} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="co_owner">Co-Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="reseller">Reseller</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={u.requires_otp}
                            onCheckedChange={() => toggleOtpRequired(u.id, u.requires_otp)}
                            disabled={updatingUser === u.id}
                          />
                          {u.requires_otp && u.otp_webhook_set && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={u.is_hidden ? "default" : "outline"}
                          className={u.is_hidden ? "bg-primary/80" : ""}
                          onClick={() => toggleHidden(u.id, u.is_hidden)}
                          disabled={updatingUser === u.id}
                        >
                          {u.is_hidden ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hidden
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Visible
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openOtpConfig(u)}
                          className={u.has_bot_token && u.otp_webhook_set ? "border-green-500/50 text-green-500" : ""}
                        >
                          <UserCog className="h-3 w-3 mr-1" />
                          {u.has_bot_token && u.otp_webhook_set ? "Configured" : "Configure"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>

        {/* Ghost Privileges */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ghost className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Ghost Privileges</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <h3 className="font-semibold text-primary mb-2">Invisible Access</h3>
              <p className="text-sm text-muted-foreground">
                You and hidden users are invisible from all user lists.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
              <h3 className="font-semibold text-secondary mb-2">Per-User OTP</h3>
              <p className="text-sm text-muted-foreground">
                Configure unique bot token & chat ID for each user's OTP.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
              <h3 className="font-semibold text-accent mb-2">Full Control</h3>
              <p className="text-sm text-muted-foreground">
                Change any user's role, OTP status, and visibility.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* OTP Configuration Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              OTP Configuration - {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-muted-foreground text-sm">
              Configure Telegram bot for sending OTP to this user when they login.
            </p>

            {/* Bot Token */}
            <div className="space-y-2">
              <Label>Bot Token (from @BotFather)</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Enter Telegram bot token"
                  className="pr-12 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Chat ID */}
            <div className="space-y-2">
              <Label>Telegram Chat ID</Label>
              <Input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Enter user's Telegram Chat ID"
                className="font-mono"
              />
            </div>

            {/* Status */}
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                botToken && chatId ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${botToken && chatId ? "bg-green-500" : "bg-gray-500"}`} />
                Config {botToken && chatId ? "Ready" : "Incomplete"}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                selectedUser?.otp_webhook_set ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
              }`}>
                <div className={`w-2 h-2 rounded-full ${selectedUser?.otp_webhook_set ? "bg-green-500" : "bg-gray-500"}`} />
                Webhook {selectedUser?.otp_webhook_set ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={saveOtpConfig}
                disabled={isSaving || !botToken.trim() || !chatId.trim()}
                className="w-full bg-gradient-to-r from-primary to-accent"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>

              <Button
                onClick={setWebhookForUser}
                disabled={isSettingWebhook || !botToken.trim()}
                variant={selectedUser?.otp_webhook_set ? "outline" : "default"}
                className={`w-full ${
                  selectedUser?.otp_webhook_set 
                    ? "border-green-500/50 text-green-500" 
                    : "bg-gradient-to-r from-secondary to-accent"
                }`}
              >
                {isSettingWebhook ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Webhook...
                  </>
                ) : selectedUser?.otp_webhook_set ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Webhook Active
                  </>
                ) : (
                  <>
                    <Webhook className="mr-2 h-4 w-4" />
                    Set Webhook
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GhostPanel;
