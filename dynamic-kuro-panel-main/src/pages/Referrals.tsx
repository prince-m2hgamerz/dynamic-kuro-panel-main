import { useState, useEffect } from "react";
import { Plus, Copy, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/RoleBadge";

interface ReferralCode {
  id: string;
  code: string;
  max_uses: number;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  initial_balance: number;
  assigned_role: string;
}

const Referrals = () => {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [maxUses, setMaxUses] = useState("10");
  const [initialBalance, setInitialBalance] = useState("0");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [assignedRole, setAssignedRole] = useState<string>("reseller");
  const { user, role: currentUserRole } = useAuth();
  const { toast } = useToast();

  // Admin can only create reseller referrals
  const isAdmin = currentUserRole === "admin";
  const canSelectRole = currentUserRole === "owner" || currentUserRole === "co_owner";

  useEffect(() => {
    fetchCodes();
  }, []);

  // Reset to reseller if admin
  useEffect(() => {
    if (isAdmin) {
      setAssignedRole("reseller");
    }
  }, [isAdmin]);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching referral codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const createCode = async () => {
    if (!newCode || !user) return;
    const roleToAssign = isAdmin ? "reseller" : assignedRole;
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'create_referral',
          code: newCode,
          max_uses: parseInt(maxUses),
          initial_balance: parseFloat(initialBalance) || 0,
          expires_at: expiryDate ? expiryDate.toISOString() : null,
          assigned_role: roleToAssign,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: `Referral code created for ${roleToAssign} role` });
      setNewCode("");
      setInitialBalance("0");
      setExpiryDate(undefined);
      setAssignedRole("reseller");
      fetchCodes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create code", variant: "destructive" });
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_referral', referral_id: id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Code deleted" });
      fetchCodes();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete code", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  const getCodeStatus = (code: ReferralCode) => {
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: "Expired", className: "bg-red-500/20 text-red-400 border-red-500/20" };
    }
    if (code.times_used >= code.max_uses) {
      return { label: "Exhausted", className: "bg-gray-500/20 text-gray-400 border-gray-500/20" };
    }
    if (!code.is_active) {
      return { label: "Inactive", className: "bg-gray-500/20 text-gray-400 border-gray-500/20" };
    }
    return { label: "Active", className: "bg-green-500/20 text-green-400 border-green-500/20" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral Codes</h1>
          <p className="text-muted-foreground">
            Create and manage referral codes for new users
          </p>
        </div>

        {/* Create New Code */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Create New Code</h2>
          
          {/* Role Selection - Only for Owner/Co-Owner */}
          {canSelectRole && (
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Label className="text-foreground font-medium mb-3 block">Assign Role to New Users</Label>
              <RadioGroup
                value={assignedRole}
                onValueChange={setAssignedRole}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="owner" id="role-owner" className="border-primary text-primary" />
                  <Label htmlFor="role-owner" className="cursor-pointer flex items-center gap-2">
                    <RoleBadge role="owner" />
                    <span className="text-sm text-muted-foreground">Full access</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="role-admin" className="border-secondary text-secondary" />
                  <Label htmlFor="role-admin" className="cursor-pointer flex items-center gap-2">
                    <RoleBadge role="admin" />
                    <span className="text-sm text-muted-foreground">Keys + Referrals</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reseller" id="role-reseller" className="border-accent text-accent" />
                  <Label htmlFor="role-reseller" className="cursor-pointer flex items-center gap-2">
                    <RoleBadge role="reseller" />
                    <span className="text-sm text-muted-foreground">My Keys + Generate only</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Admin notice */}
          {isAdmin && (
            <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <p className="text-warning text-sm">
                ⚠️ As an Admin, you can only create referral codes for <strong>Reseller</strong> role.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label className="text-muted-foreground">Code</Label>
              <div className="flex gap-2">
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Enter or generate code"
                  className="h-12 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl font-mono"
                />
                <Button variant="glass" onClick={generateCode}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Max Uses</Label>
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-24 h-12 bg-input border-border/50 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Initial Balance (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                className="w-32 h-12 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="glass"
                    className={cn(
                      "w-[180px] h-12 justify-start text-left font-normal rounded-xl",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "MMM d, yyyy") : "No expiry"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass-card border-border/50" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={createCode} 
                disabled={!newCode}
                className="h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg shadow-primary/25 rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Code
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Codes Table */}
        <GlassCard className="p-6">
          <div className="rounded-lg border border-border/30 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 border-border/30">
                  <TableHead className="text-muted-foreground font-medium">Code</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Role</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Uses</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Balance</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Expires</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Created</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No referral codes yet
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <TableRow 
                        key={code.id}
                        className="border-border/30 hover:bg-white/[0.02] transition-all relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0 hover:before:w-[3px] before:bg-primary before:transition-all"
                      >
                        <TableCell className="font-mono font-medium text-foreground">
                          {code.code}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={code.assigned_role as any || "reseller"} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {code.times_used} / {code.max_uses}
                        </TableCell>
                        <TableCell>
                          <span className="text-primary font-medium">
                            ₹{code.initial_balance?.toFixed(2) || "0.00"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {code.expires_at
                            ? format(new Date(code.expires_at), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs border ${status.className}`}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(code.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyCode(code.code)}
                              className="hover:bg-white/5"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => deleteCode(code.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default Referrals;
