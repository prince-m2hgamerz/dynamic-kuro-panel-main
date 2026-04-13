import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, AlertTriangle, ArrowRight, Check, Shield, Zap, Key, Fingerprint, Globe, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { OtpVerificationModal } from "@/components/OtpVerificationModal";
// Ghost owner check is now server-side via AuthContext.isGhostOwner
import AuthBackground from "@/components/AuthBackground";
import TechMarquee from "@/components/TechMarquee";
import { motion } from "framer-motion";
import { useLoginLockout } from "@/hooks/useLoginLockout";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";
import { usePanelTheme } from "@/hooks/usePanelTheme";

const getClientIp = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'Unknown';
  }
};

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string>("");
  const [debugAccessToken, setDebugAccessToken] = useState<string>("");
  const perf = useDevicePerformance();
  const anim = perf.enableEntryAnimations;
  const { theme, isDark, toggleTheme } = usePanelTheme();
  
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { 
    isLocked, 
    remainingSeconds, 
    attemptsLeft, 
    lockoutCount,
    recordFailedAttempt, 
    resetLockout,
    checked,
  } = useLoginLockout();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Wait for server-side lockout check before rendering
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-white/40 text-sm">Checking access...</div>
      </div>
    );
  }

  if (isLocked) {
    return <Navigate to="/blocked-message" replace />;
  }

  const onSubmit = async (data: LoginForm) => {
    if (isLocked) {
      toast({ title: "Account Locked", description: "Too many failed attempts. Please wait.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      let signInResult;
      try {
        signInResult = await signIn(data.email, data.password);
      } catch (e: any) {
        console.error("SignIn threw:", e);
        await recordFailedAttempt();
        toast({ title: "Sign in failed", description: e?.message || "Could not connect to server", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (signInResult.error) {
        await recordFailedAttempt();
        toast({
          title: "Sign in failed",
          description: attemptsLeft > 1 
            ? `${signInResult.error.message}. ${attemptsLeft - 1} attempts remaining.`
            : `${signInResult.error.message}. This is your last attempt before lockout!`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      resetLockout();

      const session = signInResult.data?.session;
      if (!session) {
        toast({ title: "Error", description: "Session not found. Please try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      setDebugAccessToken(session.access_token);

      const userId = session.user.id;
      const userEmail = session.user.email;

      let roleData: any = null;
      let profile: any = null;
      try {
        const [roleResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
          supabase.from("profiles_safe").select("telegram_chat_id, requires_otp").eq("id", userId).maybeSingle(),
        ]);
        roleData = roleResult.data;
        profile = profileResult.data;
      } catch (e: any) {
        console.error("Profile/role fetch threw:", e);
      }

      const isOwner = roleData?.role === "owner";
      const requiresOtp = isOwner || profile?.requires_otp === true;

      if (requiresOtp) {
        // Server-side telegram-otp function handles ghost owner fallback automatically
        const isConfigured = !!profile?.telegram_chat_id || isOwner;
        
        if (!isConfigured) {
          toast({ title: "OTP Not Configured", description: "Your OTP settings are not configured. Please contact the admin.", variant: "destructive" });
          await signOut();
        } else {
          let ip = "Unknown";
          try {
            ip = await getClientIp();
          } catch { /* ignore */ }
          setClientIp(ip);
          setPendingUserId(userId);
          setShowOtpModal(true);
        }
      } else {
        toast({ title: "Welcome back!", description: "You have successfully signed in." });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Login unexpected error:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Something went wrong. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerified = () => {
    setShowOtpModal(false);
    setPendingUserId(null);
    toast({ title: "Welcome back, Owner!", description: "You have successfully verified your identity." });
    navigate("/dashboard");
  };

  const handleOtpCancel = async () => {
    setShowOtpModal(false);
    setPendingUserId(null);
    await signOut();
    toast({ title: "Login Cancelled", description: "OTP verification was cancelled", variant: "destructive" });
  };

  // Theme-aware color helpers — both modes use dark base now
  const accent = isDark ? '#006fff' : '#da4e24';
  const accentRgb = isDark ? '0,111,255' : '218,78,36';
  const textPrimary = 'rgba(255,255,255,0.85)';
  const textSecondary = 'rgba(255,255,255,0.4)';
  const textMuted = 'rgba(255,255,255,0.2)';
  const textTertiary = 'rgba(255,255,255,0.3)';
  const cardBg = 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.4) 100%)';
  const cardBorder = `rgba(${accentRgb},0.15)`;
  const cardShadow = `inset 0 0 48px rgba(${accentRgb},0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 8px 16px rgba(${accentRgb},0.1)`;
  const inputBg = 'rgba(255,255,255,0.04)';
  const inputBorder = 'rgba(255,255,255,0.08)';
  const inputText = 'text-white';
  const inputPlaceholder = 'placeholder:text-white/20';
  const iconMuted = 'text-white/20';
  const highlightLine = `linear-gradient(270deg, transparent 0%, rgba(${accentRgb},0.6) 50%, transparent 100%)`;
  const linkColor = isDark ? '#006fff' : '#da4e24';
  const linkHover = isDark ? '#3388ff' : '#ff6b3d';
  const dividerColor = 'rgba(255,255,255,0.06)';
  const dividerText = 'text-white/20';

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AuthBackground theme={theme} />

      {/* Theme toggle button */}
      <motion.button
        className="fixed top-5 right-5 z-50 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}
        onClick={toggleTheme}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {isDark ? (
          <Sun className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
        ) : (
          <Moon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
        )}
      </motion.button>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo / Brand */}
        <motion.div
          className="mb-10 text-center"
          initial={anim ? { opacity: 0.001, y: -150 } : false}
          animate={anim ? { opacity: 1, y: 0 } : undefined}
          transition={anim ? { type: "spring", stiffness: 60, damping: 30, mass: 1 } : undefined}
        >
          {/* Chip badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 relative"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : `rgba(${accentRgb},0.15)`}`,
              boxShadow: isDark ? 'inset 0 0 9px rgba(255,255,255,0.1)' : `0 2px 12px rgba(${accentRgb},0.08)`,
            }}
            initial={anim ? { opacity: 0, scale: 0.5 } : false}
            animate={anim ? { opacity: 1, scale: 1 } : undefined}
            transition={anim ? { delay: 0.3, type: "spring", stiffness: 40, damping: 30 } : undefined}
          >
            <motion.div
              className="absolute top-0 left-[20%] right-[20%] h-[1px]"
              style={{ background: highlightLine }}
              initial={anim ? { opacity: 0 } : false}
              animate={anim ? { opacity: 1 } : undefined}
              transition={anim ? { delay: 0.8, duration: 0.6 } : undefined}
            />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px rgba(${accentRgb},0.8)` }} />
            <span className="text-xs font-medium tracking-wider" style={{ color: textSecondary, fontFamily: "'General Sans', 'Inter', sans-serif" }}>
              Secure Access
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{ 
              fontFamily: "'Bebas Neue', 'Orbitron', sans-serif", 
              letterSpacing: '0.05em',
              backgroundImage: isDark
                ? 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgb(255,255,255) 100%)'
                : `linear-gradient(0deg, ${accent} 0%, rgba(0,0,0,0.85) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            initial={anim ? { opacity: 0.001, y: 64 } : false}
            animate={anim ? { opacity: 1, y: 0 } : undefined}
            transition={anim ? { delay: 0.3, type: "spring", stiffness: 40, damping: 30 } : undefined}
          >
            SARKAR
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-sm tracking-[0.2em] uppercase mt-2"
            style={{ color: textSecondary, fontFamily: "'General Sans', 'Inter', sans-serif" }}
            initial={anim ? { opacity: 0.001, y: 64 } : false}
            animate={anim ? { opacity: 1, y: 0 } : undefined}
            transition={anim ? { delay: 0.7, type: "spring", stiffness: 40, damping: 30 } : undefined}
          >
            License Management System
          </motion.p>

          {/* Accent line */}
          <motion.div
            className="mx-auto mt-4 h-[1px] w-40"
            style={{
              background: highlightLine,
              boxShadow: `0 0 10px rgba(${accentRgb},0.3)`,
            }}
            initial={anim ? { scaleX: 0, opacity: 0 } : false}
            animate={anim ? { scaleX: 1, opacity: 1 } : undefined}
            transition={anim ? { delay: 0.8, type: "spring", stiffness: 40, damping: 30 } : undefined}
          />
        </motion.div>

        {/* Login Card */}
        <motion.div
          className="w-full max-w-[420px]"
          initial={anim ? { opacity: 0.001, y: 150 } : false}
          animate={anim ? { opacity: 1, y: 0 } : undefined}
          transition={anim ? { delay: 1, type: "spring", stiffness: 30, damping: 30 } : undefined}
        >
          <div
            className="relative rounded-2xl p-8 md:p-10"
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: cardShadow,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Top highlight line */}
            <motion.div
              className="absolute top-0 left-[10%] right-[10%] h-[1px]"
              style={{ background: highlightLine }}
              initial={anim ? { opacity: 0, scaleX: 0 } : false}
              animate={anim ? { opacity: 1, scaleX: 1 } : undefined}
              transition={anim ? { delay: 1.2, duration: 0.8 } : undefined}
            />
            {isDark && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(${accentRgb},0.04) 100%)`, borderRadius: 'inherit' }} />
            )}

            {/* Card header */}
            <motion.div
              className="text-center mb-8"
              initial={anim ? { opacity: 0 } : false}
              animate={anim ? { opacity: 1 } : undefined}
              transition={anim ? { delay: 0.7 } : undefined}
            >
              <h2 className="text-lg font-semibold tracking-wide" style={{ color: textPrimary, fontFamily: "'General Sans', 'Inter', sans-serif" }}>
                Welcome Back
              </h2>
              <p className="text-xs mt-1 tracking-wide" style={{ color: textMuted, fontFamily: "'General Sans', 'Inter', sans-serif" }}>
                Sign in to your account
              </p>
            </motion.div>

            {/* Attempts warning */}
            {attemptsLeft < 5 && attemptsLeft > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400" style={{ fontFamily: "'General Sans', sans-serif" }}>
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                </span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email field */}
              <motion.div
                initial={anim ? { opacity: 0, x: -15 } : false}
                animate={anim ? { opacity: 1, x: 0 } : undefined}
                transition={anim ? { delay: 0.8, duration: 0.4 } : undefined}
              >
                <label className="block text-xs font-medium uppercase tracking-[0.15em] mb-2" style={{ color: textSecondary, fontFamily: "'General Sans', sans-serif" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMuted}`} />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="your@email.com"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-sm ${inputText} ${inputPlaceholder} outline-none focus:ring-1 transition-all`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, fontFamily: "'General Sans', 'Inter', sans-serif", '--tw-ring-color': `rgba(${accentRgb},0.4)` } as any}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400 mt-1.5" style={{ fontFamily: "'General Sans', sans-serif" }}>{errors.email.message}</p>}
              </motion.div>

              {/* Password field */}
              <motion.div
                initial={anim ? { opacity: 0, x: -15 } : false}
                animate={anim ? { opacity: 1, x: 0 } : undefined}
                transition={anim ? { delay: 0.9, duration: 0.4 } : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-[0.15em]" style={{ color: textSecondary, fontFamily: "'General Sans', sans-serif" }}>Password</label>
                  <Link to="/forgot-password" className="text-xs transition-colors" style={{ color: `${linkColor}aa`, fontFamily: "'General Sans', sans-serif" }}>Forgot?</Link>
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMuted}`} />
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="••••••••"
                    className={`w-full h-12 pl-11 pr-4 rounded-xl text-sm ${inputText} ${inputPlaceholder} outline-none focus:ring-1 transition-all`}
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, fontFamily: "'General Sans', 'Inter', sans-serif", '--tw-ring-color': `rgba(${accentRgb},0.4)` } as any}
                  />
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1.5" style={{ fontFamily: "'General Sans', sans-serif" }}>{errors.password.message}</p>}
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={anim ? { opacity: 0, y: 15 } : false}
                animate={anim ? { opacity: 1, y: 0 } : undefined}
                transition={anim ? { delay: 1.0, duration: 0.4 } : undefined}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full h-12 rounded-2xl font-semibold text-sm text-white overflow-hidden group transition-all disabled:opacity-50"
                  style={{
                    background: isDark ? 'black' : accent,
                    border: `1px solid rgba(${accentRgb},${isDark ? '0.5' : '0.8'})`,
                    boxShadow: isDark
                      ? `inset 0 0 36px rgba(${accentRgb},0.2), 0 8px 16px rgba(${accentRgb},0.15)`
                      : `0 8px 24px rgba(${accentRgb},0.3)`,
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                  }}
                >
                  {isDark && (
                    <div className="absolute inset-0 rounded-2xl opacity-20" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(${accentRgb},0.5) 100%)`, borderRadius: 'inherit' }} />
                  )}
                  <motion.div
                    className="absolute top-0 left-[15%] right-[15%] h-[1px]"
                    style={{ background: isDark ? highlightLine : 'linear-gradient(270deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }}
                    initial={anim ? { opacity: 0 } : false}
                    animate={anim ? { opacity: 1 } : undefined}
                    transition={anim ? { delay: 1.5, duration: 0.6 } : undefined}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            {/* Divider */}
            <motion.div className="mt-8 mb-6" initial={anim ? { opacity: 0 } : false} animate={anim ? { opacity: 1 } : undefined} transition={anim ? { delay: 1.1 } : undefined}>
              <div className="relative flex items-center">
                <div className="flex-1 h-[1px]" style={{ background: dividerColor }} />
                <span className={`px-3 text-xs ${dividerText}`} style={{ fontFamily: "'General Sans', sans-serif" }}>or</span>
                <div className="flex-1 h-[1px]" style={{ background: dividerColor }} />
              </div>
            </motion.div>

            {/* Register link */}
            <motion.p
              className="text-center text-sm"
              style={{ color: textTertiary, fontFamily: "'General Sans', 'Inter', sans-serif" }}
              initial={anim ? { opacity: 0 } : false}
              animate={anim ? { opacity: 1 } : undefined}
              transition={anim ? { delay: 1.2 } : undefined}
            >
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold transition-colors" style={{ color: linkColor }}>
                Create Account
              </Link>
            </motion.p>

            {debugAccessToken ? (
              <div
                className="mt-6 rounded-xl p-3 text-xs break-all"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  border: `1px solid rgba(${accentRgb},0.2)`,
                  color: textSecondary,
                  fontFamily: "'General Sans', 'Inter', sans-serif",
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: textMuted }}>
                  Debug Access Token
                </div>
                {debugAccessToken}
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* Security Features Section */}
        <motion.div
          className="w-full max-w-[420px] mt-8"
          initial={anim ? { opacity: 0, y: 48 } : false}
          animate={anim ? { opacity: 1, y: 0 } : undefined}
          transition={anim ? { delay: 1.3, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] } : undefined}
        >
          <div
            className="relative rounded-3xl p-6 overflow-hidden"
            style={{
              background: isDark
                ? `linear-gradient(225deg, rgba(${accentRgb},0.12) 0%, rgba(51,136,255,0.05) 100%)`
                : `linear-gradient(225deg, rgba(${accentRgb},0.15) 0%, rgba(40,20,5,0.6) 100%)`,
              border: `1px solid rgba(${accentRgb},0.2)`,
              borderRadius: '24px',
              boxShadow: isDark ? 'none' : `inset 0 0 40px rgba(${accentRgb},0.08), 0 8px 30px rgba(0,0,0,0.4)`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <motion.div
              className="absolute top-0 left-[10%] right-[10%] h-[1px]"
              style={{ background: highlightLine }}
              initial={anim ? { opacity: 0, scaleX: 0 } : false}
              animate={anim ? { opacity: 1, scaleX: 1 } : undefined}
              transition={anim ? { delay: 1.8, duration: 0.8 } : undefined}
            />
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid rgba(${accentRgb},0.3)`,
                  boxShadow: `inset 0 4px 16px rgba(${accentRgb},0.2), inset 0 0 29px rgba(${accentRgb},0.15)`,
                }}
              >
                <Shield className="w-4 h-4" style={{ color: accent }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: textPrimary, fontFamily: "'General Sans', 'Inter', sans-serif" }}>Security Features</h3>
                <p className="text-[10px]" style={{ color: textMuted, fontFamily: "'General Sans', sans-serif" }}>Enterprise-grade protection</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Key, label: 'Encrypted Protocol', active: true },
                { icon: Fingerprint, label: 'OTP Verification', active: true },
                { icon: Shield, label: 'DDoS Protection', active: true },
                { icon: Zap, label: 'Rate Limiting', active: true },
                { icon: Globe, label: 'IP Whitelisting', active: true },
                { icon: Lock, label: 'Blast Firewall', active: false },
              ].map((feature, i) => (
                <motion.div
                  key={feature.label}
                  className="flex items-center gap-3 relative"
                  initial={anim ? { opacity: 0, x: -20 } : false}
                  animate={anim ? { opacity: 1, x: 0 } : undefined}
                  transition={anim ? { delay: 1.5 + i * 0.12, type: "spring", stiffness: 50, damping: 20 } : undefined}
                  whileHover={anim ? { x: 6, transition: { duration: 0.2 } } : undefined}
                >
                  <motion.div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ opacity: feature.active ? 1 : 0.3 }}
                    animate={anim && feature.active ? { scale: [1, 1.2, 1] } : {}}
                    transition={anim ? { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 } : undefined}
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: feature.active ? accent : textMuted }} />
                  </motion.div>
                  <span className="text-sm" style={{ color: feature.active ? textPrimary : textMuted, fontFamily: "'General Sans', 'Inter', sans-serif" }}>
                    {feature.label}
                  </span>
                  {feature.active && (
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
                      style={{ background: accent }}
                      initial={anim ? { scaleY: 0 } : false}
                      animate={anim ? { scaleY: 1 } : undefined}
                      transition={anim ? { delay: 1.6 + i * 0.12, duration: 0.4 } : undefined}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tech Marquee — Gemini-style scrolling icons */}
        <motion.div
          className="w-full max-w-[580px] mt-10"
          initial={anim ? { opacity: 0, y: 30 } : false}
          animate={anim ? { opacity: 1, y: 0 } : undefined}
          transition={anim ? { delay: 1.8, duration: 0.8 } : undefined}
        >
          <TechMarquee theme={theme} />
        </motion.div>

        {/* Framer 3D Perspective Cards with glow animations */}
        <motion.div
          className="w-full max-w-[520px] mt-10"
          initial={anim ? { opacity: 0 } : false}
          animate={anim ? { opacity: 1 } : undefined}
          transition={anim ? { delay: 2.2, duration: 0.6 } : undefined}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ perspective: '500px' }}>
            {[
              { label: 'License Keys', skew: 23, delay: 0, icon: '🔑' },
              { label: 'Bot System', skew: 15, delay: 0.1, icon: '🤖' },
              { label: 'OTP Auth', skew: 8, delay: 0.2, icon: '🔐' },
              { label: 'Monitoring', skew: -9, delay: 0.3, icon: '📊' },
              { label: 'Firewall', skew: -15, delay: 0.4, icon: '🛡️' },
              { label: 'Analytics', skew: -23, delay: 0.5, icon: '📈' },
            ].map((card, idx) => (
              <motion.div
                key={card.label}
                className="relative rounded-2xl p-4 text-center overflow-hidden group cursor-pointer"
                style={{
                  background: `linear-gradient(225deg, rgba(${accentRgb},0.18) 0%, rgba(${isDark ? '51,136,255' : '40,20,5'},${isDark ? '0.08' : '0.55'}) 100%)`,
                  border: `1px solid rgba(${accentRgb},0.25)`,
                  transformStyle: 'preserve-3d',
                }}
                initial={anim ? { opacity: 0.001, scale: 0.5, rotateX: 0, skewX: 0 } : false}
                animate={anim ? { opacity: 1, scale: 1, rotateX: 49, skewX: card.skew } : { rotateX: 49, skewX: card.skew }}
                transition={anim ? { delay: 2.4 + card.delay, duration: 2.5, ease: [0.44, 0, 0.56, 1] } : undefined}
                whileHover={{
                  rotateX: 0, skewX: 0, scale: 1.08,
                  boxShadow: `inset 0 0 50px rgba(${accentRgb},0.2), 0 12px 40px rgba(${accentRgb},0.25), 0 0 60px rgba(${accentRgb},0.1)`,
                  transition: { duration: 0.4 },
                }}
              >
                {anim && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, rgba(${accentRgb},0.15) 0%, transparent 70%)`,
                    }}
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3 + idx * 0.5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }}
                  />
                )}
                {anim && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent 0%, rgba(${accentRgb},0.8) 50%, transparent 100%)` }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                  />
                )}
                <div className="absolute bottom-0 left-[15%] right-[15%] h-[1px] opacity-50" style={{ background: highlightLine }} />
                <span className="relative z-10 text-xs font-medium tracking-wider" style={{ color: textPrimary, fontFamily: "'General Sans', 'Inter', sans-serif" }}>
                  {card.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div className="mt-8 text-center" initial={anim ? { opacity: 0 } : false} animate={anim ? { opacity: 1 } : undefined} transition={anim ? { delay: 1.4 } : undefined}>
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: textMuted, fontFamily: "'General Sans', sans-serif" }}>© 2026 SARKAR PANEL</p>
          <p className="text-[10px] tracking-[0.3em] mt-1 uppercase" style={{ color: `${accent}50`, fontFamily: "'General Sans', sans-serif" }}>Premium Edition</p>
        </motion.div>
      </div>

      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={handleOtpCancel}
        onVerified={handleOtpVerified}
        userId={pendingUserId || ""}
        clientIp={clientIp}
      />
    </div>
  );
};

export default Login;
