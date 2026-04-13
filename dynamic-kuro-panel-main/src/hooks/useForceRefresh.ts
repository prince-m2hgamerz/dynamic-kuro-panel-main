import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens for a server-side "force-refresh" broadcast signal via Realtime.
 * When received, the page reloads silently in the background.
 * Works whether the tab is active or not.
 */
export const useForceRefresh = () => {
  useEffect(() => {
    const channel = supabase
      .channel("global-force-refresh")
      .on("broadcast", { event: "force-refresh" }, (payload) => {
        console.log("[ForceRefresh] Signal received, reloading...", payload);
        // Small random delay (0-3s) to avoid thundering herd
        const delay = Math.random() * 3000;
        setTimeout(() => {
          window.location.reload();
        }, delay);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
