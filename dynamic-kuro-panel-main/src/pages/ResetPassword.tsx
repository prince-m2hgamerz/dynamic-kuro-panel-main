import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Lock, Moon, ShieldCheck, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthBackground from "@/components/AuthBackground";
import { usePanelTheme } from "@/hooks/usePanelTheme";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, isDark, toggleTheme } = usePanelTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const linkLooksLikeRecovery = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const hash = window.location.hash;
    const search = window.location.search;
    return (
      hash.includes("type=recovery") ||
      hash.includes("access_token=") ||
      search.includes("type=recovery") ||
      search.includes("code=")
    );
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    let active = true;

    const syncRecoveryState = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      setHasRecoverySession(!!data.session && linkLooksLikeRecovery);
      setIsReady(true);
    };

    void syncRecoveryState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setHasRecoverySession(!!session && linkLooksLikeRecovery);
        setIsReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [linkLooksLikeRecovery]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        throw error;
      }

      setIsComplete(true);
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });

      await supabase.auth.signOut();
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error?.message || "Unable to reset password. Request a new recovery link.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <AuthBackground theme={theme} />

      <motion.button
        className="fixed top-5 right-5 z-50 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
        onClick={toggleTheme}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-white/70" />
        ) : (
          <Moon className="w-4 h-4 text-white/70" />
        )}
      </motion.button>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0.001, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "inset 0 0 12px rgba(255,255,255,0.08)",
            }}
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-white/75">
              Controlled Recovery
            </span>
          </motion.div>

          <h1
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{
              fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
              backgroundImage: "linear-gradient(0deg, rgba(255,255,255,0.55) 0%, rgb(255,255,255) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SARKAR
          </h1>
          <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-white/45 mt-2">
            Password Recovery
          </p>
        </motion.div>

        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0.001, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            className="relative rounded-2xl p-8 md:p-10"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.45) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "inset 0 0 48px rgba(255,140,40,0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)",
              backdropFilter: "blur(20px)",
            }}
          >
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-white/45 hover:text-primary transition-colors mb-6 group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to login
            </Link>

            <div className="text-center mb-6">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,140,40,0.25)",
                  boxShadow: "inset 0 0 24px rgba(255,140,40,0.2), 0 0 28px rgba(255,140,40,0.12)",
                }}
              >
                {isComplete ? <CheckCircle2 className="h-8 w-8 text-primary" /> : <KeyRound className="h-8 w-8 text-primary" />}
              </div>
              <h2 className="text-xl font-semibold text-white">
                {isComplete ? "Password Updated" : "Choose a New Password"}
              </h2>
              <p className="text-xs text-white/35 mt-1">
                {isComplete
                  ? "Your recovery session is complete. Redirecting to sign in."
                  : "This recovery link stays inside the panel's Supabase auth flow."}
              </p>
            </div>

            {!isReady ? (
              <div className="py-8 text-center text-sm text-white/50">Verifying recovery session...</div>
            ) : !hasRecoverySession && !isComplete ? (
              <div
                className="rounded-xl p-5 text-center"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.18)",
                }}
              >
                <p className="text-sm text-white/80">This reset link is invalid or expired.</p>
                <p className="text-xs text-white/40 mt-2">
                  Request a fresh password reset email to continue.
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm text-white"
                  style={{
                    background: "rgba(255,140,40,0.18)",
                    border: "1px solid rgba(255,140,40,0.25)",
                  }}
                >
                  Request new link
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : !isComplete ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <input
                      {...register("password")}
                      type="password"
                      placeholder="Enter a strong password"
                      className="w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    />
                  </div>
                  {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <input
                      {...register("confirmPassword")}
                      type="password"
                      placeholder="Repeat the new password"
                      className="w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative w-full h-12 rounded-2xl font-semibold text-sm text-white overflow-hidden group transition-all disabled:opacity-50"
                  style={{
                    background: isDark ? "black" : "#da4e24",
                    border: `1px solid ${isDark ? "rgba(255,140,40,0.5)" : "rgba(255,140,40,0.7)"}`,
                    boxShadow: "inset 0 0 36px rgba(255,140,40,0.2), 0 8px 16px rgba(255,140,40,0.16)",
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? "Updating..." : "Save New Password"}
                  </span>
                </button>
              </form>
            ) : (
              <div
                className="rounded-xl p-5 text-center"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p className="text-sm text-white">Your password was updated successfully.</p>
                <p className="text-xs text-white/45 mt-2">Redirecting to the sign-in screen.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
