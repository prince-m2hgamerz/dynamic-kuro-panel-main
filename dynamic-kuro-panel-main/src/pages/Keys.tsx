import { useState, useEffect } from "react";
import { AppWindow, Eye, EyeOff, Plus, Trash2, MoreHorizontal, Pause, Play, RotateCcw, Clock, Key } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PurpleCard } from "@/components/dashboard/PurpleCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type KeyStatus = "active" | "paused" | "expired" | "revoked";

interface LicenseKey {
  id: string;
  key_code: string;
  game_id: string;
  duration_hours: number;
  max_devices: number;
  status: KeyStatus;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  game_name?: string;
}

const EXTENSION_OPTIONS = [
  { value: "1", label: "1 Hour" },
  { value: "6", label: "6 Hours" },
  { value: "24", label: "1 Day" },
  { value: "168", label: "7 Days" },
  { value: "720", label: "30 Days" },
];

const Keys = () => {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState(true);
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const navigate = useNavigate();

  // Dialog states
  const [extendKeyDialog, setExtendKeyDialog] = useState<{ open: boolean; keyId: string; keyCode: string }>({
    open: false,
    keyId: "",
    keyCode: "",
  });
  const [extendAllDialog, setExtendAllDialog] = useState(false);
  const [resetAllDialog, setResetAllDialog] = useState(false);
  const [extensionHours, setExtensionHours] = useState("24");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data: keysData, error } = await supabase
        .from("license_keys_safe")
        .select("id, key_code, game_id, duration_hours, max_devices, status, activated_at, expires_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (keysData && keysData.length > 0) {
        const gameIds = [...new Set(keysData.map(k => k.game_id))];
        const { data: games } = await supabase
          .from("games")
          .select("id, name")
          .in("id", gameIds);
        
        const gameMap = new Map(games?.map(g => [g.id, g.name]) || []);

        const keysWithGames: LicenseKey[] = keysData.map(key => ({
          id: key.id,
          key_code: key.key_code,
          game_id: key.game_id,
          duration_hours: key.duration_hours,
          max_devices: key.max_devices,
          status: key.status as KeyStatus,
          activated_at: key.activated_at,
          expires_at: key.expires_at,
          created_at: key.created_at,
          game_name: gameMap.get(key.game_id) || "Unknown"
        }));

        setKeys(keysWithGames);
      } else {
        setKeys([]);
      }
    } catch (error) {
      console.error("Error fetching keys:", error);
      toast({
        title: "Error",
        description: "Failed to fetch license keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateKeyStatus = async (keyId: string, status: KeyStatus) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update_key_status', key_id: keyId, status },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: `Key ${status}` });
      fetchKeys();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update key status", variant: "destructive" });
    }
  };

  const handlePauseAll = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'pause_all_keys' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "All active keys paused" });
      fetchKeys();
    } catch (error) {
      toast({ title: "Error", description: "Failed to pause keys", variant: "destructive" });
    }
  };

  const handleUnpauseAll = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'unpause_all_keys' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "All paused keys resumed" });
      fetchKeys();
    } catch (error) {
      toast({ title: "Error", description: "Failed to resume keys", variant: "destructive" });
    }
  };

  const handleDeleteExpiredKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'clear_expired_keys' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Expired keys deleted" });
      fetchKeys();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete expired keys", variant: "destructive" });
    }
  };

  // Extend Single Key
  const handleExtendKey = async () => {
    if (!extendKeyDialog.keyId) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'extend_key', key_id: extendKeyDialog.keyId, hours: extensionHours },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: `Key extended by ${extensionHours} hours` });
      setExtendKeyDialog({ open: false, keyId: "", keyCode: "" });
      fetchKeys();
    } catch (error) {
      toast({ title: "Error", description: "Failed to extend key", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Extend All Active Keys
  const handleExtendAllKeys = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'extend_all_keys', hours: extensionHours },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: `Extended ${data.extended || 0} active keys by ${extensionHours} hours` });
      setExtendAllDialog(false);
      fetchKeys();
    } catch (error) {
      toast({ title: "Error", description: "Failed to extend keys", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Reset All Devices (HWID Reset)
  const handleResetAllDevices = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'reset_all_devices' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "All device activations reset" });
      setResetAllDialog(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset devices", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Reset Single Key Devices
  const handleResetKeyDevices = async (keyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'reset_key_devices', key_id: keyId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Device activations reset for this key" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset devices", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Key copied to clipboard" });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + "****" + key.substring(key.length - 4);
  };

  const isOwnerOrCoOwner = role === "owner" || role === "co_owner";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="glass-card-glow rounded-xl p-4">
          <p className="text-lg text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Welcome <span className="font-semibold gradient-text ml-1">{profile?.username || "User"}</span>
          </p>
        </div>

        {/* Bulk Actions Bar */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="glass" size="sm" onClick={() => navigate("/keys/generate")} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Generate</span>
          </Button>
          <Button variant="glass" size="sm" onClick={() => navigate("/keys/sdk")} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            <AppWindow className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>SDK</span>
          </Button>
          <Button variant="info-soft" size="sm" onClick={() => setShowKeys(!showKeys)} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            {showKeys ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
            <span>{showKeys ? "Hide" : "Show"}</span>
          </Button>
          <Button variant="danger-soft" size="sm" onClick={handlePauseAll} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Pause</span>
          </Button>
          <Button variant="success-soft" size="sm" onClick={handleUnpauseAll} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            <Play className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Resume</span>
          </Button>
          <Button variant="warning-soft" size="sm" onClick={() => setExtendAllDialog(true)} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Extend</span>
          </Button>
          {isOwnerOrCoOwner && (
            <Button variant="info-soft" size="sm" onClick={() => setResetAllDialog(true)} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Reset</span>
            </Button>
          )}
          <Button variant="danger-soft" size="sm" onClick={handleDeleteExpiredKeys} className="w-full justify-center gap-1 text-xs sm:w-auto sm:text-sm sm:gap-2">
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Delete</span>
          </Button>
        </div>

        {/* License Keys Card */}
        <PurpleCard title="License Keys" icon="🔑">
          <div className="p-2 sm:p-4">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading...
              </div>
            ) : keys.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No keys to display
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-3">
                  {keys.map((key) => (
                    <div key={key.id} className="rounded-xl border border-border/30 bg-card/50 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => copyToClipboard(key.key_code)}
                          className="min-w-0 flex-1 truncate text-left font-mono text-xs text-primary hover:text-primary/80"
                        >
                          {showKeys ? key.key_code : maskKey(key.key_code)}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-secondary/50">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card border-border/50">
                            {key.status === "active" ? (
                              <DropdownMenuItem onClick={() => updateKeyStatus(key.id, "paused")}>
                                <Pause className="mr-2 h-4 w-4" /> Pause
                              </DropdownMenuItem>
                            ) : key.status === "paused" ? (
                              <DropdownMenuItem onClick={() => updateKeyStatus(key.id, "active")}>
                                <Play className="mr-2 h-4 w-4" /> Resume
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => setExtendKeyDialog({ open: true, keyId: key.id, keyCode: key.key_code })}>
                              <Clock className="mr-2 h-4 w-4" /> Extend Key
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetKeyDevices(key.id)}>
                              <RotateCcw className="mr-2 h-4 w-4" /> Reset Devices
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => updateKeyStatus(key.id, "revoked")}>
                              <Trash2 className="mr-2 h-4 w-4" /> Revoke
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{key.game_name}</span>
                        <span className="pill pill-primary text-[10px]">{key.duration_hours}h</span>
                        <span className="pill pill-muted text-[10px]">{key.max_devices} dev</span>
                        <StatusBadge status={key.status} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block rounded-lg border border-border/30 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/30">
                        <TableHead className="text-muted-foreground font-medium">Key Code</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Game</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Duration</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Devices</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key) => (
                        <TableRow key={key.id} className="border-border/30 table-row-hover">
                          <TableCell>
                            <button
                              onClick={() => copyToClipboard(key.key_code)}
                              className="font-mono text-sm hover:text-primary duration-short"
                            >
                              {showKeys ? key.key_code : maskKey(key.key_code)}
                            </button>
                          </TableCell>
                          <TableCell className="text-foreground">{key.game_name || "Unknown"}</TableCell>
                          <TableCell>
                            <span className="pill pill-primary">{key.duration_hours}h</span>
                          </TableCell>
                          <TableCell>
                            <span className="pill pill-muted">{key.max_devices}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={key.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-secondary/50">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass-card border-border/50">
                                {key.status === "active" ? (
                                  <DropdownMenuItem onClick={() => updateKeyStatus(key.id, "paused")} className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus:bg-secondary/50 duration-short">
                                    <Pause className="mr-2 h-4 w-4" /> Pause
                                  </DropdownMenuItem>
                                ) : key.status === "paused" ? (
                                  <DropdownMenuItem onClick={() => updateKeyStatus(key.id, "active")} className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus:bg-secondary/50 duration-short">
                                    <Play className="mr-2 h-4 w-4" /> Resume
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => setExtendKeyDialog({ open: true, keyId: key.id, keyCode: key.key_code })} className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus:bg-secondary/50 duration-short">
                                  <Clock className="mr-2 h-4 w-4" /> Extend Key
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetKeyDevices(key.id)} className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus:bg-secondary/50 duration-short">
                                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Devices
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 duration-short" onClick={() => updateKeyStatus(key.id, "revoked")}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Revoke
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </PurpleCard>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm py-4">
          © 2026 - Sarkar PVT Panel
        </div>
      </div>

      {/* Extend Single Key Dialog */}
      <Dialog open={extendKeyDialog.open} onOpenChange={(open) => setExtendKeyDialog({ ...extendKeyDialog, open })}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Extend Key</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add time to key: <span className="font-mono text-primary">{extendKeyDialog.keyCode}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Extension Duration</Label>
              <Select value={extensionHours} onValueChange={setExtensionHours}>
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  {EXTENSION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="glass" onClick={() => setExtendKeyDialog({ open: false, keyId: "", keyCode: "" })}>
              Cancel
            </Button>
            <Button 
              onClick={handleExtendKey} 
              disabled={processing}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 duration-short"
            >
              {processing ? "Extending..." : "Extend Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend All Keys Dialog */}
      <Dialog open={extendAllDialog} onOpenChange={setExtendAllDialog}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Extend All Active Keys</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add time to all currently active keys
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Extension Duration</Label>
              <Select value={extensionHours} onValueChange={setExtensionHours}>
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  {EXTENSION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              This will extend {keys.filter(k => k.status === "active").length} active keys
            </p>
          </div>
          <DialogFooter>
            <Button variant="glass" onClick={() => setExtendAllDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExtendAllKeys} 
              disabled={processing}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 duration-short"
            >
              {processing ? "Extending..." : "Extend All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset All Devices Dialog */}
      <Dialog open={resetAllDialog} onOpenChange={setResetAllDialog}>
        <DialogContent className="glass-card border-destructive/30">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset All Devices</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will clear all device activations for all keys. Users will need to re-activate their keys on their devices.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive">
              ⚠️ Warning: This action cannot be undone. All HWID data will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="glass" onClick={() => setResetAllDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetAllDevices} 
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground duration-short"
            >
              {processing ? "Resetting..." : "Reset All Devices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Keys;
