import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, CheckCircle, KeyRound, ArrowRight, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthBackground from "@/components/AuthBackground";
import { motion } from "framer-motion";
import { usePanelTheme } from "@/hooks/usePanelTheme";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const { theme, isDark, toggleTheme } = usePanelTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setEmailSent(true);
        toast({ title: "Email Sent!", description: "Check your inbox for the password reset link." });
      }
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
        {/* Brand */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0.001, y: -150 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6 relative"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 0 9px rgba(255,255,255,0.1)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="absolute top-0 left-[20%] right-[20%] h-[1px]" style={{
              background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,128,255,0) 100%)',
            }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#006fff]" style={{ boxShadow: '0 0 8px rgba(0,111,255,0.8)' }} />
            <span className="text-xs font-medium tracking-wider text-white/80" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
              Account Recovery
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{
              fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
              backgroundImage: 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgb(255,255,255) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            initial={{ opacity: 0.001, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            SARKAR
          </motion.h1>

          <motion.div
            className="mx-auto mt-3 h-[1px] w-40"
            style={{
              background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)',
              boxShadow: '0 0 10px rgba(0,111,255,0.3)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          />
        </motion.div>

        {/* Card */}
        <motion.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0.001, y: 150 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            className="relative rounded-2xl p-8 md:p-10"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.4) 100%)',
              border: '1px solid rgba(0,111,255,0.15)',
              boxShadow: 'inset 0 0 48px rgba(0,111,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 8px 16px rgba(0,111,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <motion.div
              className="absolute top-0 left-[10%] right-[10%] h-[1px]"
              style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)' }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            />

            {/* Back button */}
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-white/40 hover:text-[#006fff] transition-colors mb-6 group"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to login
            </Link>

            {/* Icon */}
            <div className="text-center mb-6">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(0,17,51,0.8)',
                  border: '1px solid rgba(0,111,255,0.3)',
                  boxShadow: 'inset 0 0 29px rgba(0,62,161,0.5), 0 0 30px rgba(0,111,255,0.2)',
                }}
                animate={{
                  boxShadow: [
                    'inset 0 0 29px rgba(0,62,161,0.5), 0 0 30px rgba(0,111,255,0.2)',
                    'inset 0 0 40px rgba(0,62,161,0.7), 0 0 50px rgba(0,111,255,0.4)',
                    'inset 0 0 29px rgba(0,62,161,0.5), 0 0 30px rgba(0,111,255,0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <KeyRound className="h-8 w-8 text-[#006fff]" />
              </motion.div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
                Reset Password
              </h2>
              <p className="text-xs text-white/30 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {emailSent ? "Check your email for the reset link" : "Enter your email to receive a reset link"}
              </p>
            </div>

            {!emailSent ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.4 }}>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-[0.15em] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="your@email.com"
                      className="w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-[#006fff]/40 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontFamily: "'DM Sans', 'Inter', sans-serif",
                      }}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.4 }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full h-12 rounded-2xl font-semibold text-sm text-white overflow-hidden group transition-all disabled:opacity-50"
                    style={{
                      background: 'black',
                      border: '1px solid rgba(0,111,255,0.5)',
                      boxShadow: 'inset 0 0 36px rgba(0,111,255,0.2), 0 8px 16px rgba(0,111,255,0.15)',
                      fontFamily: "'DM Sans', 'Inter', sans-serif",
                    }}
                  >
                    <div className="absolute inset-0 rounded-2xl opacity-20" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,111,255,0.5) 100%)' }} />
                    <motion.div className="absolute top-0 left-[15%] right-[15%] h-[1px]" style={{
                      background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.8) 50%, rgba(0,128,255,0) 100%)',
                    }} />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                      ) : (
                        <>Send Reset Link <ArrowRight className="h-4 w-4" /></>
                      )}
                    </span>
                  </button>
                </motion.div>
              </form>
            ) : (
              <div className="text-center space-y-5">
                <motion.div
                  className="p-6 rounded-xl"
                  style={{
                    background: 'rgba(0,111,255,0.08)',
                    border: '1px solid rgba(0,111,255,0.2)',
                    boxShadow: 'inset 0 0 30px rgba(0,62,161,0.15)',
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <CheckCircle className="h-14 w-14 text-[#006fff] mx-auto mb-4" />
                  </motion.div>
                  <p className="text-[#006fff] font-medium text-lg">Email Sent Successfully!</p>
                  <p className="text-white/40 text-sm mt-2">Check your inbox and follow the link.</p>
                </motion.div>
                <button
                  onClick={() => setEmailSent(false)}
                  className="w-full h-12 rounded-2xl font-semibold text-sm text-white/60 hover:text-white transition-all"
                  style={{
                    background: 'rgba(51,136,255,0.09)',
                    border: '1px solid rgba(0,111,255,0.2)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Send Again
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div className="mt-10 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          <p className="text-white/15 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>© 2026 SARKAR PANEL</p>
          <p className="text-[10px] tracking-[0.3em] mt-1 uppercase text-[#006fff]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>Premium Edition</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
