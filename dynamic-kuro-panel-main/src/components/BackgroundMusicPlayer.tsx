import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, VolumeX, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface Song {
  id: string;
  name: string;
  file_url: string;
  is_active: boolean;
}

export const BackgroundMusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const location = useLocation();
  const isMobile = useIsMobile();

  const isBlockedPage = location.pathname === "/blocked-message";

  const { data: activeSong } = useQuery({
    queryKey: ["active-song"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("is_active", true)
        .eq("is_owner_song", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as Song | null;
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (hasInteracted || isMobile) return;

    const handleInteraction = () => {
      setHasInteracted(true);
      setShowPrompt(false);
    };

    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [hasInteracted, isMobile]);

  useEffect(() => {
    if (!activeSong || !hasInteracted || isBlockedPage || isMobile) {
      if ((isBlockedPage || isMobile) && audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    const audio = new Audio(activeSong.file_url);
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = "auto";
    audioRef.current = audio;

    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.log("Audio play failed, retrying on next interaction:", error);
        setHasInteracted(false);
        setShowPrompt(true);
      }
    };

    playAudio();

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [activeSong, hasInteracted, isBlockedPage, isMobile]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  if (!activeSong || isBlockedPage || isMobile) return null;

  return (
    <>
      <AnimatePresence>
        {showPrompt && !isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-40 bg-primary/90 backdrop-blur-lg text-primary-foreground px-4 py-2 rounded-full shadow-lg shadow-primary/30 flex items-center gap-2 pointer-events-none"
          >
            <Music className="w-4 h-4 animate-bounce" />
            <span className="text-sm font-medium">Click anywhere to play music</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsMuted(!isMuted)}
        className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-primary/20 backdrop-blur-lg border border-primary/30 hover:bg-primary/30 transition-all shadow-lg shadow-primary/20"
        title={isMuted ? "Unmute music" : "Mute music"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-primary" />
        ) : (
          <Volume2 className={`w-5 h-5 text-primary ${isPlaying ? "animate-pulse" : ""}`} />
        )}
      </motion.button>
    </>
  );
};
