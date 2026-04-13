import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IPLockdownScreen from "@/components/IPLockdownScreen";
import { Loader2 } from "lucide-react";

interface IPLockdownGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/blocked-message"];

const IPLockdownGuard = ({ children }: IPLockdownGuardProps) => {
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">("checking");
  const [reason, setReason] = useState("NOT_WHITELISTED");
  const [clientIp, setClientIp] = useState<string | undefined>();
  const location = useLocation();

  const isPublicPath = PUBLIC_PATHS.some(p => location.pathname.startsWith(p)) || location.pathname === "/";

  useEffect(() => {
    if (isPublicPath) {
      setStatus("allowed");
      return;
    }

    const checkIP = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-ip`,
          { method: "POST", headers }
        );

        const data = await res.json();
        if (data.ip) setClientIp(data.ip);

        if (data.allowed) {
          setStatus("allowed");
        } else {
          setReason(data.reason || "NOT_WHITELISTED");
          setStatus("blocked");
        }
      } catch (err) {
        console.error("IP check failed:", err);
        setStatus("allowed");
      }
    };

    checkIP();
  }, [location.pathname, isPublicPath]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (status === "checking") {
    const isDark = (() => {
      try { return localStorage.getItem("gta-theme") !== "light"; } catch { return true; }
    })();
    const accent = isDark ? '#006fff' : '#da4e24';
    const bg = isDark
      ? 'radial-gradient(ellipse at 20% 10%, rgba(0,111,255,0.1) 0%, transparent 50%), linear-gradient(180deg, rgb(0,12,36) 0%, rgb(0,0,0) 100%)'
      : 'radial-gradient(ellipse at 30% 20%, rgba(218,78,36,0.15) 0%, transparent 50%), linear-gradient(180deg, rgb(10,6,2) 0%, rgb(0,0,0) 100%)';

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: `${accent}33` }} />
            <Loader2 className="relative h-8 w-8 animate-spin" style={{ color: accent }} />
          </div>
          <p className="text-sm tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (status === "blocked") {
    return <IPLockdownScreen reason={reason} ip={clientIp} />;
  }

  return <>{children}</>;
};

export default IPLockdownGuard;
