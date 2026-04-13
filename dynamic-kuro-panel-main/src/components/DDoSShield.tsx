import { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import BlockedScreen from "./BlockedScreen";
import { shouldAllowRequest } from "@/lib/request-throttle";
import { 
  advancedBotDetection, 
  solveChallenge, 
  getEnhancedFingerprint,
  initInteractionTracking,
  hasUserInteracted,
  getInteractionCount,
  createSecureRequest,
} from "@/lib/edge-security";

interface DDoSShieldProps {
  children: ReactNode;
}

interface AccessCheckResult {
  blocked: boolean;
  reason?: string;
  retryAfter?: number;
  count?: number;
  remaining?: number;
  challenge?: string;
  challengeDifficulty?: number;
}

interface ShieldWallResult {
  action: "pass" | "challenge" | "block";
  score: number;
  reasons: string[];
  ray_id: string;
}

const RECHECK_INTERVAL_MS = 2 * 60_000;
const MAX_RECHECK_FAILURES = 3;
const SHIELDWALL_RECHECK_MS = 2 * 60_000;
const CHALLENGE_STORAGE_KEY = "sarkar_challenge_token";
const CHALLENGE_EXPIRY_KEY = "sarkar_challenge_expiry";

type CheckPhase = "init" | "shieldwall" | "fingerprint" | "challenge" | "interactive" | "verifying" | "passed" | "blocked";

const DDoSShield = ({ children }: DDoSShieldProps) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>("RATE_LIMITED");
  const [retryAfter, setRetryAfter] = useState(3600);
  const [isChecking, setIsChecking] = useState(true);
  const [phase, setPhase] = useState<CheckPhase>("init");
  const [rayId, setRayId] = useState<string>("");
  const [swScore, setSwScore] = useState<number>(0);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [checkboxAnimating, setCheckboxAnimating] = useState(false);
  const [interactiveRetries, setInteractiveRetries] = useState(0);
  const consecutiveFailures = useRef(0);
  const recheckTimer = useRef<NodeJS.Timeout | null>(null);
  const shieldwallTimer = useRef<NodeJS.Timeout | null>(null);
  const fingerprint = useRef<string>("");
  const challengeToken = useRef<string>("");

  useEffect(() => {
    initInteractionTracking();
  }, []);

  // Solve a local PoW before ShieldWall check
  const solveLocalPoW = useCallback(async (): Promise<boolean> => {
    try {
      const challenge = `sw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await solveChallenge(challenge, 3); // difficulty 3 for speed
      if (result.hash) {
        challengeToken.current = `pow-${result.hash.slice(0, 16)}`;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // ShieldWall primary check
  const checkShieldWall = useCallback(async (powSolved = false): Promise<ShieldWallResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke<ShieldWallResult>("shieldwall-check", {
        method: "POST",
        body: {
          user_agent: navigator.userAgent,
          path: window.location.pathname,
          method: "GET",
          fingerprint: {
            js_enabled: true,
            cookies_enabled: navigator.cookieEnabled,
            is_webdriver: !!(navigator as any).webdriver,
            plugins_count: navigator.plugins?.length || 0,
            screen_width: screen.width,
            screen_height: screen.height,
            has_chrome: !!(window as any).chrome,
            pow_solved: powSolved || !!challengeToken.current,
            mouse_moved: hasUserInteracted(),
            interaction_count: getInteractionCount(),
            canvas_hash: getCanvasHash(),
            webgl_hash: getWebGLHash(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages?.join(",") || navigator.language,
            color_depth: screen.colorDepth,
            touch_points: navigator.maxTouchPoints,
          },
        },
      });

      if (error) {
        console.warn("[ShieldWall] Check failed, failing open");
        return null;
      }

      return data;
    } catch (err) {
      console.warn("[ShieldWall] Error, failing open:", err);
      return null;
    }
  }, []);

  // Background ShieldWall re-check (silent)
  const silentShieldWallCheck = useCallback(async () => {
    const result = await checkShieldWall();
    if (result?.action === "block") {
      // Only block on silent re-check if score is very high (definite bot)
      if (result.score >= 90) {
        setIsBlocked(true);
        setBlockReason("SHIELDWALL_BLOCKED");
        setRetryAfter(3600);
      }
    }
  }, [checkShieldWall]);

  const checkAccess = useCallback(async (isInitial = false) => {
    if (!shouldAllowRequest("ddos-shield")) {
      if (isInitial) setIsChecking(false);
      return;
    }

    if (isInitial) {
      const botCheck = advancedBotDetection();
      if (botCheck.isBot) {
        setIsBlocked(true);
        setBlockReason("BOT_DETECTED");
        setRetryAfter(7200);
        setIsChecking(false);
        return;
      }

      fingerprint.current = getEnhancedFingerprint();

      const cachedToken = sessionStorage.getItem(CHALLENGE_STORAGE_KEY);
      const cachedExpiry = sessionStorage.getItem(CHALLENGE_EXPIRY_KEY);
      if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
        challengeToken.current = cachedToken;
      }
    }

    try {
      const secureReq = await createSecureRequest({
        fp: fingerprint.current,
        challengeToken: challengeToken.current || undefined,
        ic: getInteractionCount(),
      });

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        ...secureReq.headers,
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke<AccessCheckResult>("check-access", {
        method: "POST",
        body: secureReq.body,
        headers,
      });

      if (error) {
        consecutiveFailures.current++;
        if (consecutiveFailures.current >= MAX_RECHECK_FAILURES) {
          setIsBlocked(true);
          setBlockReason("SERVICE_UNAVAILABLE");
          setRetryAfter(300);
        }
        if (isInitial) setIsChecking(false);
        return;
      }

      consecutiveFailures.current = 0;

      if (data?.challenge) {
        setPhase("challenge");
        const difficulty = data.challengeDifficulty || 4;
        const result = await solveChallenge(data.challenge, difficulty);
        
        setPhase("verifying");

        const challengeReq = await createSecureRequest({
          fp: fingerprint.current,
          challengeSolution: result.solution,
          challengeHash: result.hash,
          challengeOriginal: data.challenge,
        });

        const { data: verifyData, error: verifyError } = await supabase.functions.invoke<AccessCheckResult>("check-access", {
          method: "POST",
          body: challengeReq.body,
          headers: challengeReq.headers,
        });

        if (verifyError || verifyData?.blocked) {
          setIsBlocked(true);
          setBlockReason(verifyData?.reason || "CHALLENGE_FAILED");
          setRetryAfter(verifyData?.retryAfter || 600);
        } else {
          const token = `solved-${Date.now()}-${result.hash.slice(0, 16)}`;
          challengeToken.current = token;
          sessionStorage.setItem(CHALLENGE_STORAGE_KEY, token);
          sessionStorage.setItem(CHALLENGE_EXPIRY_KEY, String(Date.now() + 30 * 60_000));
          setIsBlocked(false);
        }
        if (isInitial) setIsChecking(false);
        return;
      }

      if (data?.blocked) {
        setIsBlocked(true);
        setBlockReason(data.reason || "RATE_LIMITED");
        setRetryAfter(data.retryAfter || 3600);
      } else {
        setIsBlocked(false);
      }
    } catch (err) {
      consecutiveFailures.current++;
      if (consecutiveFailures.current >= MAX_RECHECK_FAILURES) {
        setIsBlocked(true);
        setBlockReason("SERVICE_UNAVAILABLE");
        setRetryAfter(300);
      }
    } finally {
      if (isInitial) setIsChecking(false);
    }
  }, []);

  // Handle interactive checkbox click — user proves they're human
  const handleCheckboxClick = useCallback(async () => {
    if (checkboxChecked || checkboxAnimating) return;
    
    setCheckboxAnimating(true);
    
    // Step 1: Solve PoW challenge (proves JS execution = real browser)
    await solveLocalPoW();
    
    // Step 2: Re-check ShieldWall with pow_solved=true + interaction data
    const swResult = await checkShieldWall(true);
    
    if (swResult) {
      setRayId(swResult.ray_id || "");
      setSwScore(swResult.score || 0);
      
      // Endpoint decides: if it says block even after PoW + interaction, respect it
      if (swResult.action === "block") {
        // Give user retries
        if (interactiveRetries < 2) {
          setInteractiveRetries(prev => prev + 1);
          setCheckboxAnimating(false);
          return;
        }
        setPhase("blocked");
        setIsBlocked(true);
        setBlockReason("SHIELDWALL_BLOCKED");
        setRetryAfter(3600);
        setIsChecking(false);
        setCheckboxAnimating(false);
        return;
      }
    }
    
    // Endpoint says pass or challenge (not block) — user passed!
    setCheckboxChecked(true);
    setCheckboxAnimating(false);
    
    // Cache the pass
    const token = `interactive-${Date.now()}`;
    challengeToken.current = token;
    sessionStorage.setItem(CHALLENGE_STORAGE_KEY, token);
    sessionStorage.setItem(CHALLENGE_EXPIRY_KEY, String(Date.now() + 30 * 60_000));
    
    // Show success, then proceed
    setPhase("passed");
    await new Promise(r => setTimeout(r, 800));
    
    // Run local access check
    await checkAccess(true);
  }, [checkboxChecked, checkboxAnimating, checkShieldWall, checkAccess, interactiveRetries, solveLocalPoW]);

  // Main init: ShieldWall first, then decide flow
  useEffect(() => {
    const runChecks = async () => {
      // ShieldWall runs on all domains

      // Always clear stale challenge data on fresh page load to avoid stale blocks
      sessionStorage.removeItem(CHALLENGE_STORAGE_KEY);
      sessionStorage.removeItem(CHALLENGE_EXPIRY_KEY);
      challengeToken.current = "";

      setPhase("shieldwall");

      // Step 1: Solve PoW first, then call ShieldWall with pow_solved=true
      await solveLocalPoW();

      // Step 2: ShieldWall check with PoW solved
      const swResult = await checkShieldWall(true);

      if (swResult) {
        setRayId(swResult.ray_id || "");
        setSwScore(swResult.score || 0);

        // Endpoint decides: pass = auto-proceed, block/challenge = show checkbox
        if (swResult.action === "pass") {
          setPhase("fingerprint");
          fingerprint.current = getEnhancedFingerprint();
          await new Promise(r => setTimeout(r, 300));
          setPhase("verifying");
          await checkAccess(true);
          if (!isBlocked) {
            setPhase("passed");
            await new Promise(r => setTimeout(r, 600));
          }
          return;
        }
      }

      // ShieldWall returned block/challenge OR failed — show interactive checkbox
      setPhase("interactive");
      fingerprint.current = getEnhancedFingerprint();
    };

    runChecks();
  }, [checkShieldWall, checkAccess, solveLocalPoW]);

  // Periodic re-validation
  useEffect(() => {
    if (isChecking || isBlocked) return;
    recheckTimer.current = setInterval(() => checkAccess(false), RECHECK_INTERVAL_MS);
    shieldwallTimer.current = setInterval(() => silentShieldWallCheck(), SHIELDWALL_RECHECK_MS);
    return () => { 
      if (recheckTimer.current) clearInterval(recheckTimer.current);
      if (shieldwallTimer.current) clearInterval(shieldwallTimer.current);
    };
  }, [isChecking, isBlocked, checkAccess, silentShieldWallCheck]);

  // Tab switching abuse detection
  useEffect(() => {
    let visibilityChanges = 0;
    let lastChange = Date.now();
    const handleVisibility = () => {
      const now = Date.now();
      if (now - lastChange < 1000) {
        visibilityChanges++;
        if (visibilityChanges > 20) {
          setIsBlocked(true);
          setBlockReason("SUSPICIOUS_ACTIVITY");
          setRetryAfter(600);
        }
      } else {
        visibilityChanges = Math.max(0, visibilityChanges - 1);
      }
      lastChange = now;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // DevTools monitoring
  useEffect(() => {
    const threshold = 160;
    const checkDevTools = () => {
      const w = window.outerWidth - window.innerWidth > threshold;
      const h = window.outerHeight - window.innerHeight > threshold;
      if (w || h) console.info("[EdgeWAF] DevTools detected - monitoring");
    };
    const interval = setInterval(checkDevTools, 2000);
    return () => clearInterval(interval);
  }, []);

  // ─── Cloudflare Interstitial Challenge Page ───
  if (isChecking || phase === "interactive") {
    const isVerified = phase === "passed";
    const isInteractive = phase === "interactive";
    const generatedRayId = rayId || `${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ 
          background: '#1a1a1a',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 max-w-2xl mx-auto w-full">
          {/* ShieldWall branding - no domain shown */}

          {/* Subtitle */}
          <h2 
            className="text-[18px] sm:text-[20px] font-semibold mb-3"
            style={{ color: '#b0b0b0' }}
          >
            {isInteractive ? 'Verify you are human' : 'Performing security verification'}
          </h2>

          {/* Description */}
          <p 
            className="text-[14px] sm:text-[15px] leading-relaxed mb-8"
            style={{ color: '#888' }}
          >
            {isInteractive 
              ? 'Please click the checkbox below to confirm you are not a robot.'
              : 'This website uses a security service to protect against malicious bots. This page is displayed while the website verifies you are not a bot.'
            }
          </p>

          {/* Turnstile widget box */}
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-md w-fit ${isInteractive ? 'cursor-pointer' : ''}`}
            style={{
              background: '#2a2a2a',
              border: `1px solid ${isInteractive ? '#4a4a4a' : '#3a3a3a'}`,
              minWidth: '300px',
              transition: 'border-color 0.2s',
            }}
            onClick={isInteractive ? handleCheckboxClick : undefined}
            onMouseEnter={(e) => {
              if (isInteractive) (e.currentTarget as HTMLElement).style.borderColor = '#5a5a5a';
            }}
            onMouseLeave={(e) => {
              if (isInteractive) (e.currentTarget as HTMLElement).style.borderColor = '#4a4a4a';
            }}
          >
            {/* Checkbox / Spinner / Checkmark */}
            <div className="flex-shrink-0 w-[28px] h-[28px] flex items-center justify-center">
              {isVerified || checkboxChecked ? (
                // Green checkmark
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="1" y="1" width="26" height="26" rx="4" fill="#22c55e" />
                  <polyline points="7 14 12 19 21 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : checkboxAnimating ? (
                // Spinning animation (verifying after click)
                <div className="relative w-[28px] h-[28px]">
                  <div
                    className="w-[28px] h-[28px] rounded-full border-[3px] border-transparent"
                    style={{
                      borderTopColor: '#f97316',
                      borderRightColor: '#f97316',
                      animation: 'sw-spin 0.7s linear infinite',
                    }}
                  />
                  <style>{`
                    @keyframes sw-spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : isInteractive ? (
                // Empty checkbox — user needs to click
                <div
                  className="w-[26px] h-[26px] rounded border-2 cursor-pointer transition-colors hover:border-[#666]"
                  style={{
                    borderColor: '#555',
                    background: 'transparent',
                  }}
                />
              ) : (
                // Auto-spinning (non-interactive phases)
                <div className="relative w-[28px] h-[28px]">
                  <div
                    className="w-[28px] h-[28px] rounded-full border-[3px] border-transparent"
                    style={{
                      borderTopColor: '#22c55e',
                      borderRightColor: '#22c55e',
                      animation: 'sw-spin 0.8s linear infinite',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Label */}
            <span 
              className={`text-[14px] select-none ${isInteractive && !checkboxAnimating ? 'cursor-pointer' : ''}`}
              style={{ color: '#ccc' }}
            >
              {isVerified || checkboxChecked
                ? 'Success!'
                : checkboxAnimating
                  ? 'Verifying...'
                  : isInteractive
                    ? 'I am human'
                    : 'Verifying...'
              }
            </span>

            {/* Cloudflare branding */}
            <div className="ml-auto flex flex-col items-end pl-6">
              <div className="text-[13px] font-semibold tracking-[0.18em] uppercase opacity-80" style={{ color: '#f97316' }}>
                Cloudflare
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] cursor-pointer hover:underline" style={{ color: '#666' }}>Privacy</span>
                <span className="text-[10px]" style={{ color: '#444' }}>•</span>
                <span className="text-[10px] cursor-pointer hover:underline" style={{ color: '#666' }}>Help</span>
              </div>
            </div>
          </div>

          {/* Retry hint */}
          {isInteractive && interactiveRetries > 0 && (
            <p className="text-[12px] mt-3" style={{ color: '#f97316' }}>
              Verification failed. Please try clicking the checkbox again. ({2 - interactiveRetries} attempts remaining)
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="py-6 text-center border-t" style={{ borderColor: '#333' }}>
          <p className="text-[11px] mb-1" style={{ color: '#555' }}>
            Ray ID: {generatedRayId}
          </p>
          <p className="text-[11px]" style={{ color: '#555' }}>
            Performance and Security by{' '}
            <span className="font-semibold" style={{ color: '#f97316' }}>Cloudflare</span>
          </p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return <BlockedScreen retryAfter={retryAfter} reason={blockReason} />;
  }

  return <>{children}</>;
};

// Helper: Canvas hash for fingerprint
function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("test", 2, 15);
      return canvas.toDataURL().slice(-32);
    }
  } catch {}
  return "";
}

// Helper: WebGL hash for fingerprint
function getWebGLHash(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      }
    }
  } catch {}
  return "";
}

export default DDoSShield;
