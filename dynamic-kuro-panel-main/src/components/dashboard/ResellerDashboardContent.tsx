import { useEffect, useState } from "react";
import { Key, DollarSign, Clock } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface KeyStats {
  total: number;
  active: number;
  expired: number;
}

interface RecentKey {
  id: string;
  key_code: string;
  status: string;
  created_at: string;
  duration_hours: number;
}

export const ResellerDashboardContent = () => {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<KeyStats>({ total: 0, active: 0, expired: 0 });
  const [recentKeys, setRecentKeys] = useState<RecentKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch user's keys only
      const { data: keys } = await supabase
        .from("license_keys_safe")
        .select("id, key_code, status, created_at, duration_hours")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (keys) {
        const activeKeys = keys.filter((k) => k.status === "active").length;
        const expiredKeys = keys.filter((k) => k.status === "expired").length;

        setStats({
          total: keys.length,
          active: activeKeys,
          expired: expiredKeys,
        });

        setRecentKeys(keys.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    if (days < 30) return `${days}d`;
    const months = Math.round(days / 30);
    return `${months}mo`;
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <GlassCard className="p-6">
        <h2 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-primary">{profile?.username}</span>! 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          Reseller Dashboard - Generate and manage your keys
        </p>
      </GlassCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="My Keys"
          value={stats.total}
          icon={Key}
          variant="primary"
        />
        <StatsCard
          title="Active Keys"
          value={stats.active}
          icon={Clock}
          variant="primary"
        />
        <StatsCard
          title="Expired Keys"
          value={stats.expired}
          icon={Clock}
        />
        <StatsCard
          title="Balance"
          value={`₹${profile?.balance?.toFixed(2) || "0.00"}`}
          icon={DollarSign}
          variant="accent"
        />
      </div>

      {/* Recent Keys */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Keys</h3>
        {recentKeys.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No keys generated yet. Start by generating your first key!
          </p>
        ) : (
          <div className="space-y-2">
            {recentKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/30"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-cyan-400">
                    {key.key_code.substring(0, 4)}****
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(key.duration_hours)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      key.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {key.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(key.created_at), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
