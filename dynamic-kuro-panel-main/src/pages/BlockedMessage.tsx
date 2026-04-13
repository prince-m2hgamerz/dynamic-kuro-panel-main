import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Smoke particle effect
const SmokeParticle = ({ delay, left, size }: { delay: number; left: string; size: number }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left,
      bottom: '-10%',
      width: size,
      height: size,
      background: 'radial-gradient(circle, rgba(255,0,0,0.15) 0%, transparent 70%)',
      animation: `smokeFloat ${8 + Math.random() * 6}s ease-out infinite`,
      animationDelay: `${delay}s`,
    }}
  />
);

// Matrix rain for background
const MatrixColumn = ({ left, delay, speed }: { left: string; delay: number; speed: number }) => {
  const chars = useMemo(() => 
    Array.from({ length: 25 }, () => String.fromCharCode(0x30A0 + Math.random() * 96)).join(''),
  []);
  
  return (
    <div
      className="absolute text-blue-500/30 font-mono text-xs whitespace-pre leading-tight pointer-events-none"
      style={{
        left,
        top: '-100%',
        animation: `matrixDrop ${speed}s linear infinite`,
        animationDelay: `${delay}s`,
        textShadow: '0 0 8px rgba(59,130,246,0.3)',
      }}
    >
      {chars.split('').map((c, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.035 }}>{c}</div>
      ))}
    </div>
  );
};

const BlockedMessage = () => {
  const [phase, setPhase] = useState<'intro' | 'content'>('intro');
  const [showToast, setShowToast] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch owner song for blocked page (is_owner_song = true)
  useEffect(() => {
    const fetchSong = async () => {
      const { data } = await supabase
        .from('songs')
        .select('file_url')
        .eq('is_owner_song', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.file_url) {
        const audio = new Audio(data.file_url);
        audio.loop = true;
        audio.volume = 0.4;
        audioRef.current = audio;

        // Auto-play on first user interaction
        const play = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', play);
          document.removeEventListener('touchstart', play);
        };
        document.addEventListener('click', play, { once: true });
        document.addEventListener('touchstart', play, { once: true });
      }
    };
    fetchSong();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Title letters for intro animation
  const titleLetters = "SARKAR".split('');

  // Phase transition
  useEffect(() => {
    const timer = setTimeout(() => setPhase('content'), 7000);
    return () => clearTimeout(timer);
  }, []);

  // Toast auto-show after content loads
  useEffect(() => {
    if (phase === 'content') {
      const timer = setTimeout(() => setShowToast(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Toast auto-dismiss with progress
  useEffect(() => {
    if (!showToast) return;
    const start = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setToastProgress(remaining);
      if (remaining <= 0) {
        setShowToast(false);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [showToast]);

  const smokeParticles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 40 + Math.random() * 80,
      delay: Math.random() * 8,
    })), []);

  const matrixCols = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      speed: 3 + Math.random() * 4,
    })), []);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-black">
      {/* Matrix rain background */}
      <div className="absolute inset-0 overflow-hidden">
        {matrixCols.map(col => (
          <MatrixColumn key={col.id} left={col.left} delay={col.delay} speed={col.speed} />
        ))}
      </div>

      {/* Smoke particles */}
      <div className="absolute inset-0 overflow-hidden">
        {smokeParticles.map(p => (
          <SmokeParticle key={p.id} left={p.left} size={p.size} delay={p.delay} />
        ))}
      </div>

      {/* Color overlay for cinematic feel */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-color"
        style={{
          background: 'linear-gradient(to right, #f00, #f00, #0f0, #0ff, #ff0, #0ff)',
          opacity: phase === 'intro' ? 0.15 : 0,
          transition: 'opacity 1s ease',
        }}
      />

      {/* Scan lines */}
      <div 
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }}
      />

      {/* PHASE 1: Intro with letter-by-letter SARKAR reveal */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <div className="text-center">
              {/* SARKAR title - letter by letter */}
              <div className="flex justify-center gap-1 md:gap-3 mb-6">
                {titleLetters.map((letter, idx) => (
                  <motion.span
                    key={idx}
                    className="text-5xl md:text-8xl font-bold text-gray-200"
                    style={{
                      textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
                      fontFamily: 'sans-serif',
                      letterSpacing: '0.15em',
                    }}
                    initial={{ opacity: 0, rotateY: 90, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, rotateY: 0, filter: 'blur(0px)' }}
                    transition={{
                      delay: 1 + idx * 0.5,
                      duration: 1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>

              {/* Welcome text */}
              <motion.p
                className="text-white font-mono text-sm md:text-base"
                initial={{ opacity: 0, rotateY: 90, filter: 'blur(10px)' }}
                animate={{ opacity: 1, rotateY: 0, filter: 'blur(0px)' }}
                transition={{ delay: 4.5, duration: 1 }}
              >
                Welcome BRO
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 2: Main content */}
      <AnimatePresence>
        {phase === 'content' && (
          <motion.div
            className="absolute inset-0 z-20 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="min-h-screen bg-[#191919] flex items-center justify-center p-6 md:p-12">
              <div className="w-full max-w-3xl">
                {/* Main heading */}
                <motion.h2
                  className="text-white text-3xl md:text-5xl font-bold mb-2"
                  style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  𝗛𝗘𝗟𝗟𝗢
                </motion.h2>

                {/* Subtitle */}
                <motion.h5
                  className="text-white text-lg md:text-2xl mb-6"
                  style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: '2px' }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  Welcome <span className="text-[#f9004d]">𝗠𝗔𝗗𝗘𝗥𝗖𝗛𝗢𝗗</span>
                </motion.h5>

                {/* Message body */}
                <motion.p
                  className="text-white/80 text-xs md:text-sm leading-6 mb-8 font-mono"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  𝗧𝗘𝗥𝗜 𝗕𝗛𝗘𝗡 𝗞𝗜 𝗖𝗛𝗨𝗧 𝗞𝗛𝗔 𝗝𝗔𝗨 𝗠𝗔𝗗𝗘𝗥𝗖𝗛𝗢𝗗 😡<br />
                  𝗛𝗜𝗝𝗗𝗘 𝗞𝗜 𝗔𝗨𝗟𝗔𝗗 𝗠𝗔𝗗𝗘𝗥𝗖𝗛𝗢𝗗<br />
                  𝗧𝗘𝗥𝗜 𝗕𝗛𝗘𝗡 𝗞𝗘 𝗕𝗛𝗢𝗦𝗗𝗔𝗔 𝗠𝗔𝗥𝗨 𝗥𝗔𝗡𝗗𝗜 𝗞𝗜 𝗔𝗨𝗟𝗔𝗧 𝗧𝗘𝗥𝗔 𝗕𝗔𝗔𝗣 𝗛𝗨 𝗠𝗔𝗗𝗘𝗥𝗖𝗛𝗢𝗗 𝗚𝗔𝗟𝗜 𝗗𝗘𝗚𝗔 𝗧𝗘𝗥𝗜 𝗕𝗔𝗔𝗣 𝗥𝗔𝗡𝗗𝗪𝗔 𝗛𝗔𝗜 𝗡𝗔 𝗥𝗔𝗡𝗗𝗜<br />
                  𝗧𝗨 𝟮 𝗥𝗦 𝗠𝗔𝗜 𝗖𝗛𝗨𝗗𝗪𝗔𝗧𝗜 𝗛𝗔𝗜 𝗡𝗔 𝗠𝗔𝗗𝗘𝗥𝗖𝗛𝗢𝗗 𝗥𝗻𝗱𝗶 𝗸𝗶 𝗮𝘂𝗹𝗮𝗱 𝗺𝗮𝗱𝗲𝗿𝗰𝗵𝗼𝗱 𝗸𝗲 𝗯𝗮𝗰𝗵𝗲𝗲𝗲<br />
                  𝗚𝗕 𝗥𝗢𝗔𝗗 𝗞𝗜 𝗦𝗔𝗦𝗧𝗜 𝗥𝗔𝗡𝗗𝗜<br />
                  𝗕𝗛𝗘𝗡 𝗞𝗘 𝗟𝗔𝗪𝗗𝗘𝗘<br />
                  𝗖𝗼𝗽𝘆 𝗽𝗮𝘀𝘁𝗶𝗻𝗴 𝗸𝗿𝗲𝗴𝗮 𝗺𝗮𝗱𝗲𝗿𝗰𝗵𝗼𝗱<br />
                  𝗠𝗲𝗿𝗲 𝗱𝗼𝘀𝘁𝗼 𝗸𝗼 𝗴𝗮𝗹𝗶 𝗱𝗲𝗴𝗮 𝗯𝗲𝘁𝗮 𝗯𝗮𝗮𝗽 𝗸𝗼 𝗸𝗿 𝘁𝗲𝗿𝗶 𝗺𝗮𝗸𝗼 𝗻𝗮 𝗰𝗵𝗼𝗱𝗮 𝘁𝗼𝗵 𝗸𝗲𝗵𝗻𝗮 𝗮𝘂𝗿 𝗹𝘂𝗻𝗱 𝘀𝗲 𝗳𝗶𝗴𝗵𝘁 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲 𝗮𝘂𝗸𝗮𝘁 𝗵𝗮𝗶 𝘁𝗼𝗵 𝘃𝗰 𝗮𝗮𝗮𝗮 𝗿𝗮𝗻𝗱𝗶 𝗸𝗲 𝗽𝗶𝗹𝗹𝗲𝗲 😂
                  BHANKELODE TERE MAA KO NANGI CHODU MADHACHODO KE BAACHE LAUDE SE SAKAL KE BHANKELUND TERE MAA KE CHUT KA KAL DUSSEHRA BANAU TERE MAA KE CHUT TRAIN KE NICHE DAABA TU MAA KE CHOD TERE MAA KE CHUT ITNE JOOR SE MAARU KE TERE MAA KE CHUT NASA KE PAAS CHALE JAAYE PHIR NASA BAALE TERE MAA KE CHUT ROCKET SE BAAND KA TERE MAA KA DUSSEHRA BANA DU MADHACHOD BETICHOD.
                </motion.p>

                {/* CTA heading */}
                <motion.h5
                  className="text-white text-lg md:text-xl mb-4"
                  style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                >
                  Hay Bachee Touch Here
                </motion.h5>

                {/* Telegram button */}
                <motion.a
                  href="https://telegram.me/WTF_I_Dont_Care"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    background: '#f9004d',
                    border: '2px solid transparent',
                  }}
                  whileHover={{ background: 'transparent', borderColor: '#f9004d' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Let's Talk
                </motion.a>
              </div>
            </div>

            {/* Toast notification */}
            <AnimatePresence>
              {showToast && (
                <motion.div
                  className="fixed top-6 right-6 z-50 bg-white rounded-xl p-5 pr-10 shadow-xl"
                  style={{ borderLeft: '6px solid #4070f4', maxWidth: '360px' }}
                  initial={{ x: 400 }}
                  animate={{ x: 0 }}
                  exit={{ x: 400 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#4070f4] flex items-center justify-center text-white text-lg flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Success</p>
                      <p className="text-gray-500 text-sm">Your are Confirmed Bachee</p>
                    </div>
                  </div>
                  {/* Close button */}
                  <button
                    className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-lg"
                    onClick={() => setShowToast(false)}
                  >
                    ✕
                  </button>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
                    <div
                      className="h-full bg-[#4070f4] transition-all duration-100"
                      style={{ width: `${toastProgress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframe animations */}
      <style>{`
        @keyframes smokeFloat {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.05; }
          100% { transform: translateY(-120vh) scale(2.5); opacity: 0; }
        }
        @keyframes matrixDrop {
          0% { transform: translateY(0); }
          100% { transform: translateY(200vh); }
        }
      `}</style>

      {/* Mute/Unmute toggle for blocked page song */}
      <button
        onClick={() => {
          setIsMuted(m => {
            const next = !m;
            if (audioRef.current) audioRef.current.muted = next;
            return next;
          });
        }}
        className="fixed bottom-4 right-4 z-[10000] p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
};

export default BlockedMessage;
