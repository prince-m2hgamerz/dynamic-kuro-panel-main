import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
// Ghost owner check is now from AuthContext
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StarryBackground } from "@/components/StarryBackground";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Globe,
  BarChart3,
  RefreshCw,
  ShieldAlert,
  Skull,
  Ban,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, subHours, startOfDay, startOfHour } from "date-fns";

interface AuditLog {
  id: string;
  endpoint: string;
  success: boolean | null;
  failure_reason: string | null;
  ip_address: unknown;
  created_at: string | null;
  user_key: string | null;
  request_data: any;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142, 76%, 36%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(262, 83%, 58%)",
];

const RequestAnalyser = () => {
  const { user, role, isGhostOwner } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [refreshing, setRefreshing] = useState(false);
  const [ddosAttackers, setDdosAttackers] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [frontendRateLimiters, setFrontendRateLimiters] = useState<any[]>([]);
  const [endpointRateLimiters, setEndpointRateLimiters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "ddos">("overview");
  const [ddosSubTab, setDdosSubTab] = useState<"frontend" | "endpoint">("frontend");

  const isGhost = isGhostOwner;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const since =
        timeRange === "24h"
          ? subDays(new Date(), 1)
          : timeRange === "7d"
          ? subDays(new Date(), 7)
          : subDays(new Date(), 30);

      const { data, error } = await supabase
        .from("api_audit_logs")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (!error && data) {
        setLogs(data as AuditLog[]);
      }
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDdosData = async () => {
    try {
      // Fetch blacklisted IPs (DDoS attackers)
      const { data: blacklist } = await supabase
        .from("ip_blacklist")
        .select("*")
        .order("blocked_at", { ascending: false })
        .limit(50);

      if (blacklist) setDdosAttackers(blacklist);

      // Fetch security events related to DDoS
      const { data: events } = await supabase
        .from("security_logs")
        .select("*")
        .in("event_type", ["FRONTEND_DDOS_BLOCK", "RATE_LIMIT_EXCEEDED", "HMAC_FAILURE", "BOT_DETECTED", "JS_CHALLENGE_FAIL"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (events) setSecurityEvents(events);

      // Fetch frontend rate limiters (IPs with 100+ req/min)
      const { data: frontendRL } = await supabase
        .from("frontend_rate_limits")
        .select("*")
        .gte("request_count", 100)
        .order("request_count", { ascending: false });

      if (frontendRL) setFrontendRateLimiters(frontendRL);

      // Fetch endpoint rate limiters (IPs with 100+ req/min)
      const { data: endpointRL } = await supabase
        .from("api_rate_limits")
        .select("*")
        .gte("request_count", 100)
        .order("request_count", { ascending: false });

      if (endpointRL) setEndpointRateLimiters(endpointRL);
    } catch (e) {
      console.error("Failed to fetch DDoS data:", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchDdosData();
  }, [timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLogs(), fetchDdosData()]);
    setRefreshing(false);
  };

  // DDoS stats
  const activeBans = ddosAttackers.filter(
    (a) => !a.expires_at || new Date(a.expires_at) > new Date()
  ).length;
  const totalDdosEvents = securityEvents.length;
  const ddosIPs = new Set(ddosAttackers.map((a) => String(a.ip_address))).size;

  // Stats
  const totalRequests = logs.length;
  const successRequests = logs.filter((l) => l.success === true).length;
  const failedRequests = logs.filter((l) => l.success === false).length;
  const successRate = totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(1) : "0";

  // Timeline data
  const timelineData = useMemo(() => {
    const buckets: Record<string, { time: string; total: number; success: number; failed: number }> = {};
    const isHourly = timeRange === "24h";

    logs.forEach((log) => {
      if (!log.created_at) return;
      const date = new Date(log.created_at);
      const key = isHourly
        ? format(startOfHour(date), "HH:mm")
        : format(startOfDay(date), "MMM dd");

      if (!buckets[key]) {
        buckets[key] = { time: key, total: 0, success: 0, failed: 0 };
      }
      buckets[key].total++;
      if (log.success) buckets[key].success++;
      else buckets[key].failed++;
    });

    return Object.values(buckets);
  }, [logs, timeRange]);

  // Endpoint breakdown
  const endpointData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      const ep = log.endpoint || "unknown";
      counts[ep] = (counts[ep] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [logs]);

  // Top IPs
  const topIPs = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      const ip = String(log.ip_address || "unknown");
      counts[ip] = (counts[ip] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs]);

  // Recent failures
  const recentFailures = useMemo(() => {
    return logs
      .filter((l) => l.success === false)
      .slice(-10)
      .reverse();
  }, [logs]);

  if (!isGhost) {
    return <Navigate to="/dashboard" replace />;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <DashboardLayout>
      <StarryBackground />
      <div className="relative z-10 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              Request Analyser
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor API requests, success rates & endpoint analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/40"
                }`}
              >
                {range}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/40"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("ddos")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "ddos"
                ? "bg-destructive text-destructive-foreground shadow-lg"
                : "bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/40"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            DDoS Attackers
            {activeBans > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-bold">
                {activeBans}
              </span>
            )}
          </button>
        </div>

        {activeTab === "overview" ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="Total Requests" value={formatNumber(totalRequests)} color="primary" />
              <StatCard icon={CheckCircle2} label="Successful" value={formatNumber(successRequests)} color="green" />
              <StatCard icon={XCircle} label="Failed" value={formatNumber(failedRequests)} color="red" />
              <StatCard icon={TrendingUp} label="Success Rate" value={`${successRate}%`} color="blue" />
            </div>

            {/* Main Chart */}
            <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Request Timeline
              </h2>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : timelineData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorTotal)" name="Total" />
                    <Line type="monotone" dataKey="success" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} name="Success" />
                    <Line type="monotone" dataKey="failed" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} name="Failed" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Endpoint Breakdown */}
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Endpoint Breakdown
                </h2>
                {endpointData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No endpoint data</p>
                ) : (
                  <div className="space-y-3">
                    {endpointData.map((ep, i) => (
                      <div key={ep.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-foreground truncate flex-1 font-mono">{ep.name}</span>
                        <span className="text-sm font-semibold text-muted-foreground">{formatNumber(ep.value)}</span>
                        <div className="w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(ep.value / (endpointData[0]?.value || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top IPs */}
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Top IP Addresses
                </h2>
                {topIPs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No IP data</p>
                ) : (
                  <div className="space-y-2">
                    {topIPs.map((item, i) => (
                      <div key={item.ip} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/10 border border-border/20">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                          <span className="text-sm font-mono text-foreground">{item.ip}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Failures */}
            <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Recent Failures
              </h2>
              {recentFailures.length === 0 ? (
                <p className="text-muted-foreground text-sm">No failures recorded 🎉</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentFailures.map((f) => (
                    <div key={f.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-4 rounded-lg bg-destructive/5 border border-destructive/20">
                      <span className="text-xs text-muted-foreground min-w-[140px]">
                        {f.created_at ? format(new Date(f.created_at), "MMM dd, HH:mm:ss") : "N/A"}
                      </span>
                      <span className="text-sm font-mono text-foreground flex-1 truncate">{f.endpoint}</span>
                      <span className="text-xs text-destructive truncate max-w-[300px]">{f.failure_reason || "Unknown error"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* DDoS Sub-Tab Switcher */}
            <div className="flex gap-2">
              <button
                onClick={() => setDdosSubTab("frontend")}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  ddosSubTab === "frontend"
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/40"
                }`}
              >
                <Globe className="h-4 w-4" />
                Frontend Attack
                {frontendRateLimiters.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-orange-600/30 text-orange-200 text-xs font-bold">{frontendRateLimiters.length}</span>
                )}
              </button>
              <button
                onClick={() => setDdosSubTab("endpoint")}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  ddosSubTab === "endpoint"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "bg-card/60 text-muted-foreground hover:bg-card/80 border border-border/40"
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Endpoint Attack
                {endpointRateLimiters.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-red-700/30 text-red-200 text-xs font-bold">{endpointRateLimiters.length}</span>
                )}
              </button>
            </div>

            {ddosSubTab === "frontend" ? (
              <>
                {/* Frontend Attack - IPs with 100+ req/min */}
                {(() => {
                  const frontendEvents = securityEvents.filter(e => ["FRONTEND_DDOS_BLOCK", "BOT_DETECTED", "JS_CHALLENGE_FAIL"].includes(e.event_type));
                  const frontendAttackers = ddosAttackers.filter(a => a.reason?.toLowerCase().includes("frontend") || a.reason?.toLowerCase().includes("ddos"));
                  const frontendActiveBans = frontendAttackers.filter(a => !a.expires_at || new Date(a.expires_at) > new Date()).length;
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={Globe} label="100+ req/min IPs" value={String(frontendRateLimiters.length)} color="red" />
                        <StatCard icon={Ban} label="Active Bans" value={String(frontendActiveBans)} color="red" />
                        <StatCard icon={Skull} label="DDoS Events" value={formatNumber(frontendEvents.length)} color="primary" />
                        <StatCard icon={ShieldAlert} label="Bot Detected" value={formatNumber(frontendEvents.filter(e => e.event_type === "BOT_DETECTED").length)} color="blue" />
                      </div>

                      {/* Frontend 100+ req/min IPs */}
                      <div className="bg-card/60 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Globe className="h-5 w-5 text-orange-400" />
                          Frontend — IPs with 100+ Requests/Min
                          <span className="text-xs text-muted-foreground ml-2">(Real-time rate limit data)</span>
                        </h2>
                        {frontendRateLimiters.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No IPs exceeding 100 req/min on frontend 🛡️</p>
                        ) : (
                          <div className="space-y-2 max-h-[350px] overflow-y-auto">
                            {frontendRateLimiters.map((rl, i) => (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 rounded-xl border bg-orange-500/10 border-orange-500/30">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                                  <span className="text-sm font-mono font-bold text-foreground">{String(rl.ip_address)}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-500/20 text-orange-400">
                                    ⚡ {rl.request_count} req/min
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Window: {rl.window_start ? format(new Date(rl.window_start), "MMM dd, HH:mm:ss") : "N/A"}
                                </div>
                                {/* Danger bar */}
                                <div className="w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.min((rl.request_count / 500) * 100, 100)}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Frontend Blocked IPs */}
                      <div className="bg-card/60 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Ban className="h-5 w-5 text-orange-400" />
                          Frontend — Banned IPs
                        </h2>
                        {frontendAttackers.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No frontend bans 🛡️</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {frontendAttackers.map((attacker) => {
                              const isActive = !attacker.expires_at || new Date(attacker.expires_at) > new Date();
                              return (
                                <div key={attacker.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 rounded-xl border transition-all ${isActive ? "bg-orange-500/10 border-orange-500/30" : "bg-muted/5 border-border/20 opacity-60"}`}>
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-3 h-3 rounded-full ${isActive ? "bg-orange-500 animate-pulse" : "bg-muted-foreground"}`} />
                                    <span className="text-sm font-mono font-bold text-foreground">{String(attacker.ip_address)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive ? "bg-orange-500/20 text-orange-400" : "bg-muted/20 text-muted-foreground"}`}>
                                      {isActive ? "🔴 ACTIVE" : "✅ EXPIRED"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>Blocked: {attacker.blocked_at ? format(new Date(attacker.blocked_at), "MMM dd, HH:mm") : "N/A"}</span>
                                    {attacker.expires_at && <span>Expires: {format(new Date(attacker.expires_at), "MMM dd, HH:mm")}</span>}
                                  </div>
                                  <div className="text-xs text-orange-400/80 truncate max-w-[300px]">{attacker.reason || "Auto-blocked"}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Frontend Security Events */}
                      <div className="bg-card/60 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-orange-400" />
                          Frontend Security Events
                        </h2>
                        {frontendEvents.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No frontend events recorded</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {frontendEvents.map((event) => {
                              const eventColors: Record<string, string> = {
                                FRONTEND_DDOS_BLOCK: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                                BOT_DETECTED: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                                JS_CHALLENGE_FAIL: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                              };
                              const colorClass = eventColors[event.event_type] || "text-muted-foreground bg-muted/10 border-border/20";
                              return (
                                <div key={event.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-4 rounded-lg border ${colorClass}`}>
                                  <span className="text-xs text-muted-foreground min-w-[130px]">{event.created_at ? format(new Date(event.created_at), "MMM dd, HH:mm:ss") : "N/A"}</span>
                                  <span className="text-xs font-bold uppercase tracking-wider min-w-[160px]">{event.event_type.replace(/_/g, " ")}</span>
                                  <span className="text-sm font-mono text-foreground">{String(event.ip_address || "N/A")}</span>
                                  {event.details && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                      {typeof event.details === "object" ? `Requests: ${(event.details as any)?.request_count || "?"} | Offense #${(event.details as any)?.offense_number || "?"}` : String(event.details)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {/* Endpoint Attack */}
                {(() => {
                  const endpointEvents = securityEvents.filter(e => ["RATE_LIMIT_EXCEEDED", "HMAC_FAILURE"].includes(e.event_type));
                  const endpointAttackers = ddosAttackers.filter(a => !a.reason?.toLowerCase().includes("frontend") && !a.reason?.toLowerCase().includes("ddos"));
                  const endpointActiveBans = endpointAttackers.filter(a => !a.expires_at || new Date(a.expires_at) > new Date()).length;

                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={ShieldAlert} label="100+ req/min IPs" value={String(endpointRateLimiters.length)} color="red" />
                        <StatCard icon={Ban} label="Active Bans" value={String(endpointActiveBans)} color="red" />
                        <StatCard icon={Skull} label="Rate Limit Events" value={formatNumber(endpointEvents.length)} color="primary" />
                        <StatCard icon={Activity} label="HMAC Failures" value={formatNumber(endpointEvents.filter(e => e.event_type === "HMAC_FAILURE").length)} color="blue" />
                      </div>

                      {/* Endpoint 100+ req/min IPs */}
                      <div className="bg-card/60 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Skull className="h-5 w-5 text-red-400" />
                          Endpoint — IPs with 100+ Requests/Min
                          <span className="text-xs text-muted-foreground ml-2">(API endpoint rate limit data)</span>
                        </h2>
                        {endpointRateLimiters.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No IPs exceeding 100 req/min on endpoints 🛡️</p>
                        ) : (
                          <div className="space-y-2 max-h-[350px] overflow-y-auto">
                            {endpointRateLimiters.map((rl, i) => (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 rounded-xl border bg-red-500/10 border-red-500/30">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-sm font-mono font-bold text-foreground">{String(rl.ip_address)}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400">
                                    ⚡ {rl.request_count} req/min
                                  </span>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{rl.endpoint || "N/A"}</span>
                                <div className="text-xs text-muted-foreground">
                                  Window: {rl.window_start ? format(new Date(rl.window_start), "MMM dd, HH:mm:ss") : "N/A"}
                                </div>
                                <div className="w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${Math.min((rl.request_count / 500) * 100, 100)}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Endpoint Banned IPs */}
                      <div className="bg-card/60 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Ban className="h-5 w-5 text-red-400" />
                          Endpoint — Banned IPs
                        </h2>
                        {endpointAttackers.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No endpoint bans 🛡️</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {endpointAttackers.map((attacker) => {
                              const isActive = !attacker.expires_at || new Date(attacker.expires_at) > new Date();
                              return (
                                <div key={attacker.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 rounded-xl border transition-all ${isActive ? "bg-red-500/10 border-red-500/30" : "bg-muted/5 border-border/20 opacity-60"}`}>
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-3 h-3 rounded-full ${isActive ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                                    <span className="text-sm font-mono font-bold text-foreground">{String(attacker.ip_address)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive ? "bg-red-500/20 text-red-400" : "bg-muted/20 text-muted-foreground"}`}>
                                      {isActive ? "🔴 ACTIVE" : "✅ EXPIRED"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>Blocked: {attacker.blocked_at ? format(new Date(attacker.blocked_at), "MMM dd, HH:mm") : "N/A"}</span>
                                    {attacker.expires_at && <span>Expires: {format(new Date(attacker.expires_at), "MMM dd, HH:mm")}</span>}
                                  </div>
                                  <div className="text-xs text-red-400/80 truncate max-w-[300px]">{attacker.reason || "Auto-blocked"}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Endpoint Security Events */}
                      <div className="bg-card/60 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-red-400" />
                          Endpoint Security Events
                        </h2>
                        {endpointEvents.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No endpoint events recorded</p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {endpointEvents.map((event) => {
                              const eventColors: Record<string, string> = {
                                RATE_LIMIT_EXCEEDED: "text-red-400 bg-red-500/10 border-red-500/20",
                                HMAC_FAILURE: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                              };
                              const colorClass = eventColors[event.event_type] || "text-muted-foreground bg-muted/10 border-border/20";
                              return (
                                <div key={event.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-4 rounded-lg border ${colorClass}`}>
                                  <span className="text-xs text-muted-foreground min-w-[130px]">{event.created_at ? format(new Date(event.created_at), "MMM dd, HH:mm:ss") : "N/A"}</span>
                                  <span className="text-xs font-bold uppercase tracking-wider min-w-[160px]">{event.event_type.replace(/_/g, " ")}</span>
                                  <span className="text-sm font-mono text-foreground">{String(event.ip_address || "N/A")}</span>
                                  {event.details && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                      {typeof event.details === "object" ? `Requests: ${(event.details as any)?.request_count || "?"} | Offense #${(event.details as any)?.offense_number || "?"}` : String(event.details)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Stat Card Component
const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/20 text-primary",
    green: "bg-green-500/20 text-green-400",
    red: "bg-red-500/20 text-red-400",
    blue: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-5 hover:border-primary/30 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
};

export default RequestAnalyser;
