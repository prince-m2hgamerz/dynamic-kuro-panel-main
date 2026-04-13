import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AuthBackground from "@/components/AuthBackground";
import { ArrowRight, Shield, Key, Users, Zap, Star, Crown, Activity, Lock, Globe } from "lucide-react";

// Framer-style pill separator
const PillSeparator = () => (
  <div
    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
    style={{
      background: 'rgba(51,136,255,0.09)',
      border: '1px solid rgba(0,111,255,0.2)',
      boxShadow: '0 0 6px rgba(0,111,255,0.3)',
    }}
  />
);

// Framer-style scrolling marquee text
const MarqueeText = ({ texts, direction = "left" }: { texts: string[]; direction?: "left" | "right" }) => {
  const items = [...texts, ...texts, ...texts];
  return (
    <div className="overflow-hidden w-full" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 12.5%, black 87.5%, transparent 100%)' }}>
      <motion.div
        className="flex items-center gap-6 whitespace-nowrap"
        animate={{ x: direction === "left" ? [0, -33.33 * texts.length * 20] : [-33.33 * texts.length * 20, 0] }}
        transition={{ duration: texts.length * 12, repeat: Infinity, ease: "linear" }}
      >
        {items.map((text, i) => (
          <div key={i} className="flex items-center gap-6">
            <span
              className="text-3xl md:text-5xl font-black tracking-tight"
              style={{
                fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
                color: 'rgba(255,255,255,0.06)',
                letterSpacing: '0.02em',
              }}
            >
              {text}
            </span>
            <PillSeparator />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// Framer-style feature badge/pill
const FeaturePill = ({ text }: { text: string }) => (
  <motion.div
    className="inline-flex items-center gap-2 px-5 py-2 rounded-full relative"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 0 9px rgba(255,255,255,0.1)',
    }}
    whileHover={{ boxShadow: 'inset 0 0 20px rgba(0,111,255,0.2), 0 0 20px rgba(0,111,255,0.1)' }}
  >
    {/* Highlight line */}
    <div
      className="absolute top-0 left-[20%] right-[20%] h-[1px]"
      style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,128,255,0) 100%)' }}
    />
    <span className="text-xs font-medium tracking-wider text-white/70" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {text}
    </span>
  </motion.div>
);

// Framer-style bento card
const BentoCard = ({ icon: Icon, title, desc, delay }: { icon: any; title: string; desc: string; delay: number }) => (
  <motion.div
    className="relative rounded-2xl p-6 group"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%)',
      border: '1px solid rgba(0,111,255,0.15)',
      boxShadow: 'inset 0 0 30px rgba(0,62,161,0.08), 0 8px 32px rgba(0,0,0,0.4)',
    }}
    initial={{ opacity: 0, y: 48 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{
      boxShadow: 'inset 0 0 48px rgba(0,111,255,0.15), 0 12px 40px rgba(0,0,0,0.5), 0 0 40px rgba(0,111,255,0.1)',
      borderColor: 'rgba(0,111,255,0.3)',
    }}
  >
    {/* Top highlight */}
    <div
      className="absolute top-0 left-[15%] right-[15%] h-[1px] opacity-60 group-hover:opacity-100 transition-opacity"
      style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)' }}
    />
    {/* Icon with blue inner glow */}
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
      style={{
        background: 'rgba(0,17,51,0.8)',
        border: '1px solid rgba(0,111,255,0.2)',
        boxShadow: 'inset 0 0 29px rgba(0,62,161,0.4), inset 0 4px 16px rgba(0,62,161,0.3)',
      }}
    >
      {/* Bottom highlight on icon */}
      <div className="absolute bottom-0 left-[20%] right-[20%] h-[1px] opacity-50" style={{
        background: 'linear-gradient(270deg, transparent 0%, rgba(0,111,255,0.6) 50%, transparent 100%)',
      }} />
      <Icon className="h-7 w-7 text-[#006fff]" />
    </div>
    <h3 className="text-white font-semibold text-lg mb-1" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>{title}</h3>
    <p className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>{desc}</p>
  </motion.div>
);

const Index = () => {
  const marqueeTexts1 = [
    "Premium License Management",
    "Secure Key Distribution",
    "Real-time Monitoring",
    "Role-Based Access Control",
  ];
  const marqueeTexts2 = [
    "Advanced Protection System",
    "Multi-Device Support",
    "Telegram Integration",
    "Enterprise Grade Security",
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      <AuthBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
          {/* Premium badge pill */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <FeaturePill text="✦ Premium Edition" />
          </motion.div>

          {/* Hero Title - Framer gradient text */}
          <motion.h1
            className="text-6xl md:text-9xl font-black tracking-tight text-center"
            style={{
              fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
              backgroundImage: 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgb(255,255,255) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            initial={{ opacity: 0.001, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            SARKAR
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-base md:text-lg tracking-[0.2em] uppercase mt-3 text-center"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', 'Inter', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Premium License Management System
          </motion.p>

          {/* Accent highlight line */}
          <motion.div
            className="mx-auto mt-4 h-[1px] w-60"
            style={{
              background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)',
              boxShadow: '0 0 10px rgba(0,111,255,0.3)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          />

          {/* CTA Buttons - Framer style */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 mt-12"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link to="/login">
              <button
                className="relative px-8 py-3.5 rounded-2xl font-semibold text-sm text-white overflow-hidden group min-w-[200px]"
                style={{
                  background: 'black',
                  border: '1px solid rgba(0,111,255,0.5)',
                  boxShadow: 'inset 0 0 36px rgba(0,111,255,0.2), 0 8px 16px rgba(0,111,255,0.15)',
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-20" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,111,255,0.5) 100%)' }} />
                <motion.div
                  className="absolute top-0 left-[15%] right-[15%] h-[1px]"
                  style={{ background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.8) 50%, rgba(0,128,255,0) 100%)' }}
                />
                <div className="absolute top-0 left-[15%] right-[15%] h-[1px] opacity-0 group-hover:opacity-100 transition-opacity" style={{
                  background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,128,255,0) 100%)',
                  filter: 'blur(2px)',
                }} />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
            <Link to="/register">
              <button
                className="px-8 py-3.5 rounded-2xl font-semibold text-sm text-white/60 hover:text-white min-w-[200px] transition-all"
                style={{
                  background: 'rgba(51,136,255,0.09)',
                  border: '1px solid rgba(0,111,255,0.2)',
                  fontFamily: "'DM Sans', 'Inter', sans-serif",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" />
                  Create Account
                </span>
              </button>
            </Link>
          </motion.div>

          {/* Stats - Framer glow style */}
          <motion.div
            className="mt-16 flex items-center gap-8 md:gap-16"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.7 }}
          >
            {[
              { value: "10K+", label: "Active Keys" },
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-2xl md:text-3xl font-black"
                  style={{
                    fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
                    backgroundImage: 'linear-gradient(0deg, rgba(0,111,255,0.6) 0%, rgba(0,111,255,1) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 10px rgba(0,111,255,0.4))',
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-white/30 uppercase tracking-wider mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Marquee Text Sections */}
        <div className="py-12 space-y-4 overflow-hidden">
          <MarqueeText texts={marqueeTexts1} direction="left" />
          <MarqueeText texts={marqueeTexts2} direction="right" />
        </div>

        {/* Bento Features Grid */}
        <div className="px-4 md:px-20 py-20">
          {/* Section badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full relative"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'inset 0 0 9px rgba(255,255,255,0.1)',
              }}
            >
              <div className="absolute top-0 left-[20%] right-[20%] h-[1px]" style={{
                background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,128,255,0) 100%)',
              }} />
              <span className="text-xs font-medium text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Features</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-4xl md:text-6xl font-black text-center mb-4"
            style={{
              fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
              backgroundImage: 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgb(255,255,255) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Fully Packed with Amazing Features
          </motion.h2>

          <motion.p
            className="text-center text-white/40 text-sm md:text-base max-w-xl mx-auto mb-12"
            style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Harnessing the power of advanced security to revolutionize license management and enhance your experience.
          </motion.p>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <BentoCard icon={Key} title="License Keys" desc="Generate & manage license keys with advanced validation and multi-device support" delay={0} />
            <BentoCard icon={Shield} title="Advanced Security" desc="IP lockdown, DDoS protection, and real-time threat monitoring" delay={0.1} />
            <BentoCard icon={Users} title="Multi-User System" desc="Role-based access control with owner, admin, and reseller roles" delay={0.2} />
            <BentoCard icon={Activity} title="Real-time Analytics" desc="Track key activations, user activity, and system health in real-time" delay={0.3} />
            <BentoCard icon={Lock} title="OTP Verification" desc="Two-factor authentication via Telegram for maximum security" delay={0.4} />
            <BentoCard icon={Globe} title="Telegram Integration" desc="Bot-powered key distribution and automated notifications" delay={0.5} />
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="px-4 md:px-20 py-20">
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full relative"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'inset 0 0 9px rgba(255,255,255,0.1)',
              }}
            >
              <div className="absolute top-0 left-[20%] right-[20%] h-[1px]" style={{
                background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,128,255,0) 100%)',
              }} />
              <span className="text-xs font-medium text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Testimonials</span>
            </div>
          </motion.div>

          <motion.h2
            className="text-4xl md:text-6xl font-black text-center mb-12"
            style={{
              fontFamily: "'Bebas Neue', 'Orbitron', sans-serif",
              backgroundImage: 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgb(255,255,255) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Trusted by Thousands
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { quote: "Best license panel I've ever used 🤯\nThe security is next level 👌", name: "Rahul", role: "Reseller", avatar: "R" },
              { quote: "In a digital landscape where speed and flexibility are key, this panel stands out as a game-changer.", name: "Vikram", role: "Admin", avatar: "V" },
              { quote: "The Telegram integration and OTP verification make this the most secure panel on the market.", name: "Priya", role: "Enterprise User", avatar: "P" },
            ].map((t, i) => (
              <motion.div
                key={i}
                className="relative rounded-2xl p-6 overflow-hidden group"
                style={{
                  background: 'linear-gradient(0deg, rgba(51,136,255,0.09) 0%, rgba(0,111,255,0.2) 100%)',
                  border: '1px solid rgba(0,111,255,0.2)',
                }}
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                whileHover={{
                  boxShadow: 'inset 0 0 40px rgba(0,111,255,0.12), 0 8px 30px rgba(0,0,0,0.4)',
                  borderColor: 'rgba(0,111,255,0.35)',
                }}
              >
                <div className="absolute top-0 left-[15%] right-[15%] h-[1px]" style={{
                  background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)',
                }} />
                <div className="absolute bottom-0 left-[15%] right-[15%] h-[1px] opacity-50" style={{
                  background: 'linear-gradient(270deg, rgba(186,219,255,0) 0%, rgba(0,111,255,0.6) 50%, rgba(0,128,255,0) 100%)',
                }} />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'linear-gradient(135deg, rgba(0,111,255,0.3), rgba(0,62,161,0.5))',
                  }}>
                    {t.avatar}
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-4 whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
                  {t.quote}
                </p>
                <div className="h-[1px] mb-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <p className="text-sm font-medium text-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>{t.name}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          className="py-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-white/15 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            © 2026 SARKAR PANEL
          </p>
          <p className="text-[10px] tracking-[0.3em] mt-1 uppercase text-[#006fff]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Premium Edition
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
