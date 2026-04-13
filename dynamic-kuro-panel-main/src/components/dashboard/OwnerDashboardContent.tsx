import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCardsRow } from "./StatsCardsRow";
import { RecentActivity } from "./RecentActivity";
import LiveStatsMarquee from "./LiveStatsMarquee";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Key, Users, Activity, Shield, Globe, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  totalUsers: number;
  ownerBalance: number;
  totalRequests: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "Good Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
};

// Generate mock traffic data
const generateTrafficData = () => {
  return Array.from({ length: 35 }, (_, i) => ({
    name: `${i}`,
    value: Math.floor(Math.random() * 80) + 10,
  }));
};

export const OwnerDashboardContent = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalKeys: 0,
    activeKeys: 0,
    totalUsers: 0,
    ownerBalance: 0,
    totalRequests: 0,
  });

  const trafficData = useMemo(() => generateTrafficData(), []);

  const fetchStats = async () => {
    const { data: keysData } = await supabase
      .from("license_keys_safe")
      .select("status, activated_at");

    if (keysData) {
      const total = keysData.length;
      const active = keysData.filter((k) => k.status === "active").length;

      setStats((prev) => ({
        ...prev,
        totalKeys: total,
        activeKeys: active,
      }));
    }

    const { count: usersCount } = await supabase
      .from("profiles_safe")
      .select("*", { count: "exact", head: true });

    // Get total API requests (network load)
    const { count: requestsCount } = await supabase
      .from("api_audit_logs")
      .select("*", { count: "exact", head: true });

    setStats((prev) => ({
      ...prev,
      totalUsers: usersCount || 0,
      totalRequests: requestsCount || 0,
    }));
  };

  useEffect(() => {
    fetchStats();

    // Set owner balance from profile
    if (profile?.balance !== undefined && profile?.balance !== null) {
      setStats((prev) => ({ ...prev, ownerBalance: profile.balance ?? 0 }));
    }

    const statsChannel = supabase
      .channel("owner_dashboard_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "license_keys" },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
    };
  }, [profile?.balance]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
          <p className="text-foreground text-sm font-medium">{payload[0].value} requests</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em]">
          <span className="text-primary">Control Center</span>
          <span className="text-muted-foreground">&gt;</span>
          <span className="text-primary/70">Live System</span>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-sans tracking-tight">
            {getGreeting()},{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {profile?.username || "Owner"}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Snapshots of your network activity.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <StatsCardsRow
          activeKeys={stats.activeKeys}
          totalKeys={stats.totalKeys}
          totalRequests={stats.totalRequests}
          isOwner={true}
        />

        {/* Live Stats Marquee */}
        <LiveStatsMarquee items={[
          { icon: Key, label: "Active Nodes", value: stats.activeKeys },
          { icon: Activity, label: "Inventory", value: stats.totalKeys },
          { icon: Users, label: "Users", value: stats.totalUsers },
          { icon: Zap, label: "Network Load", value: stats.totalRequests },
          { icon: Shield, label: "System", value: "Online" },
          { icon: Globe, label: "Region", value: "IN-WEST" },
        ]} />

        {/* Main Content - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Traffic Chart - Left Column */}
          <motion.div
            className="lg:col-span-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground font-semibold text-lg font-sans">
                  Traffic Monitoring
                </h3>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 bg-muted/30">
                  MODE: OPTIMIZED
                </span>
                <span className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 bg-muted/30">
                  Last 24 Hours
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-5">
              Real-time infrastructure load
            </p>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficData} barCategoryGap="15%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(217 20% 16%)"
                    vertical={false}
                  />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar
                    dataKey="value"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1200}
                    animationBegin={200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Events - Right Column */}
          <motion.div
            className="lg:col-span-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold text-lg font-sans">
                Recent Events
              </h3>
              <button
                onClick={() => navigate("/audit-logs")}
                className="text-xs text-primary hover:text-primary/80 uppercase tracking-wider font-medium"
              >
                View All
              </button>
            </div>
            <RecentActivity />
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};
