import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ticket, User, Mail, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AuthBackground from "@/components/AuthBackground";
import { motion } from "framer-motion";

const registerSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('register-user', {
        body: {
          email: data.email,
          password: data.password,
          username: data.username,
          referralCode: data.referralCode.trim(),
        },
      });

      const resData = response.data;

      // Check if IP is blocked (server returned 429)
      if (resData?.blocked) {
        const mins = resData.remaining_minutes || 30;
        toast({
          title: "⛔ Access Blocked",
          description: `Too many failed attempts. Try again in ${mins} minute(s).`,
          variant: "destructive",
        });
        navigate("/blocked");
        return;
      }

      if (response.error || !resData?.success) {
        const errorMsg = resData?.error || response.error?.message || "Registration failed";
        toast({ title: "Registration failed", description: errorMsg, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        toast({ title: "Account created!", description: "Please login with your credentials." });
        navigate("/login");
      } else {
        toast({ title: "Welcome!", description: "Your account has been created successfully." });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { name: "referralCode" as const, label: "Referral Code", placeholder: "Enter referral code", icon: Ticket, type: "text", maxLength: 11 },
    { name: "username" as const, label: "Username", placeholder: "Choose username", icon: User, type: "text" },
    { name: "email" as const, label: "Email Address", placeholder: "your@email.com", icon: Mail, type: "email" },
    { name: "password" as const, label: "Password", placeholder: "••••••••", icon: Lock, type: "password" },
    { name: "confirmPassword" as const, label: "Confirm Password", placeholder: "••••••••", icon: Lock, type: "password" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <AuthBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-8">
        {/* Brand */}
        <motion.div
          className="mb-8 text-center"
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
              Join the Network
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

        {/* Register Card */}
        <motion.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0.001, y: 150 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            className="relative rounded-2xl p-6 md:p-8"
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

            <motion.div className="text-center mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <h2 className="text-lg font-semibold text-white tracking-wide" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
                Create Account
              </h2>
              <p className="text-xs text-white/30 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Fill in your details to get started
              </p>
            </motion.div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {fields.map((field, i) => (
                <motion.div
                  key={field.name}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
                >
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-[0.15em] mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {field.label}
                  </label>
                  <div className="relative">
                    <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <input
                      {...register(field.name)}
                      type={field.type}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      className="w-full h-11 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-[#006fff]/40 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontFamily: "'DM Sans', 'Inter', sans-serif",
                      }}
                    />
                  </div>
                  {errors[field.name] && (
                    <p className="text-xs text-red-400 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{errors[field.name]?.message}</p>
                  )}
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full h-12 rounded-2xl font-semibold text-sm text-white overflow-hidden group transition-all disabled:opacity-50 mt-2"
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
                  <div className="absolute top-0 left-[15%] right-[15%] h-[1px] opacity-0 group-hover:opacity-100 transition-opacity" style={{
                    background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,128,255,0) 100%)',
                    filter: 'blur(2px)',
                  }} />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                    ) : (
                      <>Create Account <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <div className="relative flex items-center mb-4">
                <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="px-3 text-xs text-white/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>or</span>
                <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <p className="text-center text-sm text-white/30" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
                Already have an account?{" "}
                <Link to="/login" className="text-[#006fff] hover:text-[#3388ff] font-semibold transition-colors">
                  Sign In
                </Link>
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div className="mt-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          <p className="text-white/15 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>© 2026 SARKAR PANEL</p>
          <p className="text-[10px] tracking-[0.3em] mt-1 uppercase text-[#006fff]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>Premium Edition</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
