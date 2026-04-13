import { useState, useEffect } from "react";
import { DollarSign, User } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PurpleCard } from "@/components/dashboard/PurpleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string;
  balance: number;
  role?: string;
}

const AddBalance = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles with is_hidden and invited_by for filtering
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles_safe")
      .select("id, username, balance, is_hidden, invited_by")
      .order("username");

    if (profilesError) {
      toast({ title: "Error fetching users", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch roles for all users
    const userIds = profilesData?.map(p => p.id) || [];
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    // Build hidden users set (including ghost referrals)
    const hiddenUserIds = new Set<string>();
    
    // First pass: find explicitly hidden users
    profilesData?.forEach(profile => {
      if (profile.is_hidden) {
        hiddenUserIds.add(profile.id);
      }
    });

    // Second pass: find users invited by hidden users
    profilesData?.forEach(profile => {
      if (profile.invited_by && hiddenUserIds.has(profile.invited_by)) {
        hiddenUserIds.add(profile.id);
      }
    });

    // Filter out hidden users and merge with roles
    const usersWithRoles = profilesData
      ?.filter(profile => !hiddenUserIds.has(profile.id))
      .map(profile => ({
        id: profile.id,
        username: profile.username,
        balance: profile.balance,
        role: rolesData?.find(r => r.user_id === profile.id)?.role || 'user'
      })) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddBalance = async () => {
    if (!selectedUser || !amount) {
      toast({ title: "Please select a user and enter amount", variant: "destructive" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    setSaving(true);
    const user = users.find((u) => u.id === selectedUser);

    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'add_balance', target_user_id: selectedUser, amount: amountNum },
    });

    if (error || data?.error) {
      toast({ title: data?.error || "Failed to add balance", variant: "destructive" });
    } else {
      toast({
        title: "Balance added successfully",
        description: `Added ₹${amountNum} to ${user?.username}`,
      });
      setAmount("");
      setSelectedUser("");
      fetchUsers();
    }
    setSaving(false);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserData = users.find((u) => u.id === selectedUser);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Add Balance</h1>
            <p className="text-gray-400 text-sm">Add balance to user accounts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PurpleCard title="💰 Add Balance">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-12 bg-[#0f1724] border-white/10 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1724] border-white/10 backdrop-blur-xl">
                    <div className="p-2">
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 bg-[#0a0e1a] border-white/10 text-white placeholder:text-gray-500 mb-2"
                      />
                    </div>
                    {loading ? (
                      <div className="p-4 text-center text-gray-400">Loading...</div>
                    ) : (
                      filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-gray-200 hover:bg-white/5 focus:bg-white/5">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{user.username}</span>
                            <span className={`text-sm ${(user.role === "owner" || user.role === "co_owner") ? "text-emerald-400" : "text-cyan-400"}`}>
                              {(user.role === "owner" || user.role === "co_owner") 
                                ? "(∞ UNLIMITED)" 
                                : `(₹${user.balance.toLocaleString()})`}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount to add"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 bg-[#0f1724] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl"
                />
              </div>

              <Button
                onClick={handleAddBalance}
                disabled={saving || !selectedUser || !amount}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25 rounded-xl"
              >
                {saving ? "Adding..." : "Add Balance"}
              </Button>
            </div>
          </PurpleCard>

          {selectedUserData && (
            <PurpleCard title="👤 Selected User">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">Username</span>
                  <span className="text-white font-semibold">
                    {selectedUserData.username}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">Current Balance</span>
                  <span className={`font-bold text-xl ${(selectedUserData.role === "owner" || selectedUserData.role === "co_owner") ? "text-emerald-400" : "text-cyan-400"}`}>
                    {(selectedUserData.role === "owner" || selectedUserData.role === "co_owner")
                      ? "∞ UNLIMITED"
                      : `₹${selectedUserData.balance.toLocaleString()}`}
                  </span>
                </div>
                {amount && !isNaN(parseFloat(amount)) && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-400">New Balance</span>
                    <span className="text-emerald-400 font-bold text-xl">
                      ₹{(selectedUserData.balance + parseFloat(amount)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </PurpleCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddBalance;