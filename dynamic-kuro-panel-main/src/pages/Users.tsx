import { useState, useEffect } from "react";
import { Search, MoreHorizontal, DollarSign, Ban, UserCheck, KeyRound, Trash2, Users as UsersIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AppRole, useAuth } from "@/contexts/AuthContext";
// Ghost owner check is now from AuthContext (server-side)

type UserStatus = "active" | "banned" | "suspended";

interface UserProfile {
  id: string;
  username: string;
  balance: number;
  status: UserStatus;
  last_login: string | null;
  created_at: string;
  role: AppRole;
  email?: string;
}

const Users = () => {
  const { role: currentUserRole, user, isGhostOwner } = useAuth();
  const isCoOwner = currentUserRole === "co_owner";
  
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceDialog, setBalanceDialog] = useState<{ open: boolean; userId: string; currentBalance: number }>({
    open: false,
    userId: "",
    currentBalance: 0,
  });
  const [balanceAmount, setBalanceAmount] = useState("");
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; username: string }>({
    open: false,
    userId: "",
    username: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  
  // Delete user states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; username: string }>({
    open: false,
    userId: "",
    username: "",
  });
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    
    // Real-time subscription for profile + role changes
    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with is_hidden and invited_by fields
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles_safe")
        .select("id, username, balance, status, last_login, created_at, is_hidden, invited_by")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      if (profilesData && profilesData.length > 0) {
        const userIds = profilesData.map(p => p.id);
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role as AppRole]) || []);

        // Build a map of hidden users
        // Users with is_hidden=true are filtered out (server handles ghost email hiding)
        const hiddenUserIds = new Set<string>();

        profilesData.forEach(profile => {
          if (profile.is_hidden) {
            hiddenUserIds.add(profile.id);
          }
        });

        // Filter out hidden users
        const usersWithRoles: UserProfile[] = profilesData
          .filter(profile => !hiddenUserIds.has(profile.id))
          .map(profile => ({
            id: profile.id,
            username: profile.username,
            balance: profile.balance,
            status: profile.status as UserStatus,
            last_login: profile.last_login,
            created_at: profile.created_at,
            role: rolesMap.get(profile.id) || "user",
          }));

        setUsers(usersWithRoles);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update_user_status', target_user_id: userId, status },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast({ title: "Success", description: `User ${status}` });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const addBalance = async () => {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'add_balance', target_user_id: balanceDialog.userId, amount },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast({
        title: "Success",
        description: `Added ₹${amount.toFixed(2)} to balance`,
      });
      setBalanceDialog({ open: false, userId: "", currentBalance: 0 });
      setBalanceAmount("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update balance",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setResettingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: passwordDialog.userId,
            new_password: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reset password");
      }

      toast({
        title: "Success",
        description: `Password reset for ${passwordDialog.username}`,
      });
      setPasswordDialog({ open: false, userId: "", username: "" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  // Delete User
  const deleteUser = async () => {
    if (deleteConfirmUsername !== deleteDialog.username) {
      toast({
        title: "Error",
        description: "Username doesn't match",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: deleteDialog.userId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast({
        title: "Success",
        description: `User ${deleteDialog.username} deleted permanently`,
      });
      setDeleteDialog({ open: false, userId: "", username: "" });
      setDeleteConfirmUsername("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UsersIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage all registered users</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                className="pl-10 h-12 input-dark rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="rounded-xl border border-border/30 bg-card/50 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-foreground text-sm">{user.username}</span>
                      <RoleBadge role={user.role} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-secondary/50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card border-border/50">
                        <DropdownMenuItem onClick={() => setBalanceDialog({ open: true, userId: user.id, currentBalance: user.balance })}>
                          <DollarSign className="mr-2 h-4 w-4" /> Add Balance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordDialog({ open: true, userId: user.id, username: user.username })}>
                          <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/30" />
                        {(user.role !== "owner" && user.role !== "co_owner") || isGhostOwner ? (
                          <>
                            {user.status === "active" ? (
                              <DropdownMenuItem className="text-destructive" onClick={() => updateUserStatus(user.id, "banned")}>
                                <Ban className="mr-2 h-4 w-4" /> Ban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-success" onClick={() => updateUserStatus(user.id, "active")}>
                                <UserCheck className="mr-2 h-4 w-4" /> Unban User
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : null}
                        {((user.role !== "owner" && user.role !== "co_owner") || isGhostOwner) && (
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog({ open: true, userId: user.id, username: user.username })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <StatusBadge status={user.status} />
                    <span className="text-primary font-medium">
                      {(user.role === "owner" || user.role === "co_owner") 
                        ? <span className="text-success font-bold">∞</span>
                        : `₹${(user.balance ?? 0).toFixed(2)}`}
                    </span>
                    <span className="text-muted-foreground">
                      {user.last_login ? format(new Date(user.last_login), "MMM d, HH:mm") : "Never"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border border-border/30 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 border-border/30">
                  <TableHead className="text-muted-foreground font-medium">Username</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Role</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Balance</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Last Login</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Joined</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-border/30 table-row-hover">
                      <TableCell className="font-medium text-foreground">{user.username}</TableCell>
                      <TableCell><RoleBadge role={user.role} /></TableCell>
                      <TableCell className="text-primary font-medium">
                        {(user.role === "owner" || user.role === "co_owner") 
                          ? <span className="text-success font-bold">∞ UNLIMITED</span>
                          : `₹${(user.balance ?? 0).toFixed(2)}`}
                      </TableCell>
                      <TableCell><StatusBadge status={user.status} /></TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.last_login ? format(new Date(user.last_login), "MMM d, HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-secondary/50 duration-short">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card border-border/50">
                            <DropdownMenuItem onClick={() => setBalanceDialog({ open: true, userId: user.id, currentBalance: user.balance })} className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus:bg-secondary/50 duration-short">
                              <DollarSign className="mr-2 h-4 w-4" /> Add Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPasswordDialog({ open: true, userId: user.id, username: user.username })} className="text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus:bg-secondary/50 duration-short">
                              <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/30" />
                            {(user.role !== "owner" && user.role !== "co_owner") || isGhostOwner ? (
                              <>
                                {user.status === "active" ? (
                                  <DropdownMenuItem className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 duration-short" onClick={() => updateUserStatus(user.id, "banned")}>
                                    <Ban className="mr-2 h-4 w-4" /> Ban User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => updateUserStatus(user.id, "active")} className="text-success hover:bg-success/10 hover:text-success focus:bg-success/10 duration-short">
                                    <UserCheck className="mr-2 h-4 w-4" /> Unban User
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                            {((user.role !== "owner" && user.role !== "co_owner") || isGhostOwner) && (
                              <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, userId: user.id, username: user.username })} className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 duration-short">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Balance Dialog */}
      <Dialog
        open={balanceDialog.open}
        onOpenChange={(open) =>
          setBalanceDialog({ ...balanceDialog, open })
        }
      >
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Balance</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Current balance: ${balanceDialog.currentBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Amount to Add ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                className="input-dark"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBalanceDialog({ open: false, userId: "", currentBalance: 0 });
                setBalanceAmount("");
              }}
              className="duration-short"
            >
              Cancel
            </Button>
            <Button onClick={addBalance} className="bg-gradient-to-r from-primary to-accent duration-short">
              Add Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={passwordDialog.open}
        onOpenChange={(open) =>
          setPasswordDialog({ ...passwordDialog, open })
        }
      >
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reset Password</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set a new password for {passwordDialog.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-dark"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-dark"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialog({ open: false, userId: "", username: "" });
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="duration-short"
            >
              Cancel
            </Button>
            <Button
              onClick={resetPassword}
              disabled={resettingPassword}
              className="bg-gradient-to-r from-primary to-accent duration-short"
            >
              {resettingPassword ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the user <strong className="text-foreground">{deleteDialog.username}</strong> and all their data.
              This action cannot be undone.
              <br /><br />
              Type <strong className="text-destructive">{deleteDialog.username}</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmUsername}
            onChange={(e) => setDeleteConfirmUsername(e.target.value)}
            placeholder="Type username to confirm"
            className="input-dark"
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialog({ open: false, userId: "", username: "" });
                setDeleteConfirmUsername("");
              }}
              className="duration-short"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={deleting || deleteConfirmUsername !== deleteDialog.username}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 duration-short"
            >
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Users;
