import { useEffect, useState } from "react";
import { Clock, Wallet, Activity, Key, CheckCircle, Zap, Sparkles, Shield, Globe, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { OwnerDashboardContent } from "@/components/dashboard/OwnerDashboardContent";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import LiveStatsMarquee from "@/components/dashboard/LiveStatsMarquee";

const Dashboard = () => {
  const { role } = useAuth();

  if (role === "owner" || role === "co_owner") {
    return <OwnerDashboardContent />;
  }

  return <RegularDashboard />;
};

// Framer-style stat card with blue inner glow
const FramerStatCard = ({ icon: Icon, label, children, delay, color }: {
  icon: any; label: string; children: React.ReactNode; delay: number; color: string;
}) => (
  <motion.div
    className="relative rounded-2xl p-5 group"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%)',
      border: '1px solid rgba(0,111,255,0.12)',
      boxShadow: 'inset 0 0 30px rgba(0,62,161,0.06), 0 8px 32px rgba(0,0,0,0.3)',
    }}
    initial={{ opacity: 0, y: 48 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{
      boxShadow: 'inset 0 0 40px rgba(0,111,255,0.12), 0 12px 40px rgba(0,0,0,0.4)',
      borderColor: 'rgba(0,111,255,0.25)',
    }}
  >
    {/* Top highlight */}
    <div className="absolute top-0 left-[15%] right-[15%] h-[1px] opacity-50 group-hover:opacity-100 transition-opacity" style={{
      background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.5) 50%, rgba(0,128,255,0) 100%)',
    }} />
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-medium">{label}</p>
        <div className="mt-2">{children}</div>
      </div>
      <motion.div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: 'rgba(0,17,51,0.6)',
          border: '1px solid rgba(0,111,255,0.2)',
          boxShadow: 'inset 0 0 20px rgba(0,62,161,0.3)',
        }}
        whileHover={{ rotate: 10, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </motion.div>
    </div>
  </motion.div>
);

// Framer-style section card
const FramerSection = ({ children, title, icon: Icon, delay = 0 }: {
  children: React.ReactNode; title: string; icon: any; delay?: number;
}) => (
  <motion.div
    className="relative rounded-2xl p-6 group"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.2) 100%)',
      border: '1px solid rgba(0,111,255,0.12)',
      boxShadow: 'inset 0 0 30px rgba(0,62,161,0.05), 0 8px 24px rgba(0,0,0,0.3)',
    }}
    initial={{ opacity: 0, y: 48 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    <div className="absolute top-0 left-[10%] right-[10%] h-[1px] opacity-40" style={{
      background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.4) 50%, rgba(0,128,255,0) 100%)',
    }} />
    <h3 className="text-foreground font-display text-2xl mb-4 flex items-center gap-3 tracking-wide">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
        background: 'rgba(0,17,51,0.6)',
        border: '1px solid rgba(0,111,255,0.2)',
        boxShadow: 'inset 0 0 16px rgba(0,62,161,0.3)',
      }}>
        <Icon className="h-5 w-5 text-[#006fff]" />
      </div>
      {title}
    </h3>
    {children}
  </motion.div>
);

const RegularDashboard = () => {
  const { profile, role } = useAuth();
  const [loginTimeText, setLoginTimeText] = useState("Just now");
  const [userStats, setUserStats] = useState({ totalKeys: 0, activeKeys: 0 });

  useEffect(() => {
    const updateLoginTime = () => {
      if (profile?.last_login) {
        setLoginTimeText(formatDistanceToNow(new Date(profile.last_login), { addSuffix: true }));
      }
    };
    updateLoginTime();
    const interval = setInterval(updateLoginTime, 60000);
    return () => clearInterval(interval);
  }, [profile?.last_login]);

  useEffect(() => {
    const fetchUserStats = async () => {
      const { data: keysData } = await supabase
        .from("license_keys_safe")
        .select("status")
        .eq("created_by", profile?.id);
      if (keysData) {
        setUserStats({
          totalKeys: keysData.length,
          activeKeys: keysData.filter((k) => k.status === "active").length,
        });
      }
    };
    if (profile?.id) fetchUserStats();
  }, [profile?.id]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Welcome Banner */}
        <motion.div
          className="relative rounded-2xl p-8 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.3) 100%)',
            border: '1px solid rgba(0,111,255,0.15)',
            boxShadow: 'inset 0 0 48px rgba(0,62,161,0.08), 0 12px 40px rgba(0,0,0,0.4)',
          }}
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Top highlight */}
          <motion.div
            className="absolute top-0 left-[10%] right-[10%] h-[1px]"
            style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,111,255,0.1), transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,62,161,0.08), transparent 70%)' }} />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-[#006fff] animate-pulse" />
              <span className="text-[#006fff] text-sm uppercase tracking-widest font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Welcome Back</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-black tracking-wider"
              style={{
                fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
                backgroundImage: 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgb(255,255,255) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {profile?.username?.toUpperCase() || "USER"}
            </h1>
            <p className="text-white/40 mt-3 text-base" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
              Manage your license keys and track your activity.
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FramerStatCard icon={Wallet} label="Balance" delay={0.1} color="#006fff">
            <AnimatedCounter value={profile?.balance || 0} prefix="₹" className="text-3xl font-display text-[#006fff] block" />
          </FramerStatCard>
          <FramerStatCard icon={Key} label="My Keys" delay={0.2} color="#006fff">
            <AnimatedCounter value={userStats.totalKeys} className="text-3xl font-display text-[#006fff] block" duration={1.5} />
          </FramerStatCard>
          <FramerStatCard icon={CheckCircle} label="Active" delay={0.3} color="#006fff">
            <AnimatedCounter value={userStats.activeKeys} className="text-3xl font-display text-[#006fff] block" duration={1.5} />
          </FramerStatCard>
          <FramerStatCard icon={Clock} label="Last Login" delay={0.4} color="#006fff">
            <p className="text-lg font-semibold text-white/70">{loginTimeText}</p>
          </FramerStatCard>
        </div>

        {/* Live Stats Marquee */}
        <LiveStatsMarquee items={[
          { icon: Key, label: "My Keys", value: userStats.totalKeys },
          { icon: CheckCircle, label: "Active Keys", value: userStats.activeKeys },
          { icon: Wallet, label: "Balance", value: `₹${profile?.balance || 0}` },
          { icon: Shield, label: "Status", value: "Secured" },
          { icon: Activity, label: "Uptime", value: "99.9", suffix: "%" },
          { icon: Globe, label: "Region", value: "IN-WEST" },
        ]} />

        {/* Quick Actions */}
        <FramerSection title="QUICK ACTIONS" icon={Zap} delay={0.1}>
          <QuickActions />
        </FramerSection>

        {/* Account Info */}
        <FramerSection title="ACCOUNT INFO" icon={Activity} delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Username", value: profile?.username || "User" },
              { label: "Role", value: role || "user", isPill: true },
              { label: "Status", value: "Active", isPill: true },
              { label: "Last Login", value: loginTimeText },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex justify-between items-center py-3.5 px-4 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <span className="text-white/30 uppercase text-xs tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                {item.isPill ? (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium uppercase"
                    style={{
                      background: 'rgba(51,136,255,0.09)',
                      border: '1px solid rgba(0,111,255,0.2)',
                      color: 'rgba(0,111,255,0.8)',
                    }}
                  >
                    {item.value}
                  </span>
                ) : (
                  <span className="text-white/70 font-medium text-sm">{item.value}</span>
                )}
              </motion.div>
            ))}
          </div>
        </FramerSection>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
