import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CLOUDFLARE-EQUIVALENT EDGE WAF
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-ts, x-request-nonce, x-request-sig, x-client-key, x-browser-fp, x-interaction-count",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// SECURITY CONSTANTS
// ============================================
const MAX_BODY_SIZE = 2048;
const CLOCK_DRIFT_MAX_MS = 5 * 60_000; // 5 min
const CHALLENGE_DIFFICULTY = 4;

// Blocked User-Agents (Cloudflare WAF Rule equivalent)
const BLOCKED_USER_AGENTS = [
  "python-requests", "curl", "wget", "httpie", "postman",
  "insomnia", "scrapy", "httpclient", "java/", "go-http-client",
  "node-fetch", "axios/", "undici", "got/", "superagent",
  "http.rb", "faraday", "rest-client", "mechanize",
  "libwww-perl", "lwp-", "winhttp", "powershell",
];

// Suspicious patterns (JS Challenge instead of block)
const SUSPICIOUS_UA_PATTERNS = [
  "headless", "phantom", "selenium", "puppeteer", "playwright",
  "webdriver", "chrome-lighthouse", "googlebot",
];

// Security headers (like Cloudflare Transform Rules)
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  const realIp = req.headers.get("x-real-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  if (cfIp) return cfIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(",")[0].trim();
  return "0.0.0.0";
}

const ALERT_CHAT_ID = 8027087942;
const alertCooldown = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

async function sendBlockedAlert(ip: string, reason: string) {
  const lastAlert = alertCooldown.get(ip);
  if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) return;
  alertCooldown.set(ip, Date.now());

  const botToken = Deno.env.get("GHOST_BOT_TOKEN");
  if (!botToken) return;

  const time = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const message =
    `🚨 <b>DDoS Shield - IP Blocked</b>\n\n` +
    `📍 IP: <code>${ip}</code>\n` +
    `❌ Reason: ${reason}\n` +
    `🕐 Time: ${time} IST\n\n` +
    `Use /ip ${ip} to whitelist or /ban ${ip} to ban.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: ALERT_CHAT_ID, text: message, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Failed to send blocked alert:", e);
  }
}

function buildResponse(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": String(data.remaining || 0),
      ...(status === 429 ? { "Retry-After": String(data.retryAfter || 3600) } : {}),
    },
  });
}

// ============================================
// WAF RULES ENGINE
// ============================================

interface WafResult {
  action: "allow" | "block" | "challenge";
  reason?: string;
  retryAfter?: number;
}

function runWafRules(req: Request): WafResult {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isSupabaseInternal = req.headers.get("x-client-info")?.includes("supabase");

  // Rule 1: Block empty/very short user agents
  if (!ua || ua.length < 10) {
    return { action: "block", reason: "INVALID_UA", retryAfter: 3600 };
  }

  // Rule 2: Block known automation tools (skip for Supabase internal)
  if (!isSupabaseInternal) {
    for (const blocked of BLOCKED_USER_AGENTS) {
      if (ua.includes(blocked)) {
        return { action: "block", reason: "BLOCKED_UA", retryAfter: 3600 };
      }
    }
  }

  // Rule 3: JS Challenge for suspicious patterns (like Cloudflare JS Challenge)
  for (const pattern of SUSPICIOUS_UA_PATTERNS) {
    if (ua.includes(pattern)) {
      return { action: "challenge", reason: "SUSPICIOUS_UA" };
    }
  }

  // Rule 4: Check for missing required browser headers
  const acceptLang = req.headers.get("accept-language");
  const accept = req.headers.get("accept");
  if (!isSupabaseInternal && !acceptLang && !accept) {
    return { action: "challenge", reason: "MISSING_BROWSER_HEADERS" };
  }

  return { action: "allow" };
}

// ============================================
// HMAC VERIFICATION
// ============================================

async function verifyRequestIntegrity(req: Request, body: Record<string, unknown>): Promise<boolean> {
  const timestamp = req.headers.get("x-request-ts");
  const nonce = req.headers.get("x-request-nonce");
  const signature = req.headers.get("x-request-sig");
  const clientKey = req.headers.get("x-client-key");

  // If no signing headers, allow but flag (backwards compatibility)
  if (!timestamp || !nonce || !signature || !clientKey) {
    return true; // Allow unsigned requests for now (C++ clients etc.)
  }

  // Verify timestamp freshness
  const ts = parseInt(timestamp);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > CLOCK_DRIFT_MAX_MS) {
    return false;
  }

  // Verify HMAC
  const payload = JSON.stringify(body) + timestamp + nonce;
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    encoder.encode(clientKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", keyData, encoder.encode(payload));
  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSig === signature;
}

// ============================================
// CHALLENGE GENERATION & VERIFICATION
// ============================================

function generateChallenge(): { challenge: string; difficulty: number } {
  const challenge = crypto.randomUUID() + "-" + Date.now();
  return { challenge, difficulty: CHALLENGE_DIFFICULTY };
}

async function verifyChallengeAnswer(
  challenge: string,
  solution: number,
  expectedHash: string,
  difficulty: number
): Promise<boolean> {
  const prefix = "0".repeat(difficulty);
  const input = `${challenge}:${solution}`;
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex.startsWith(prefix) && hashHex === expectedHash;
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only POST
  if (req.method !== "POST") {
    return buildResponse({ blocked: false, error: "Method not allowed" }, 405);
  }

  // ============================================
  // FAST PATH: Authenticated users bypass rate limiting
  // ============================================
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        // Authenticated user - always allow, skip all WAF checks
        return buildResponse({ blocked: false, count: 0, remaining: 100, authenticated: true }, 200);
      }
    } catch {
      // Token invalid/expired - continue with normal WAF checks
    }
  }

  // ============================================
  // WAF LAYER 1: Request validation
  // ============================================
  const wafResult = runWafRules(req);

  if (wafResult.action === "block") {
    const wafIp = extractClientIp(req);
    sendBlockedAlert(wafIp, wafResult.reason || "WAF_BLOCKED").catch(() => {});
    return buildResponse({ blocked: true, reason: wafResult.reason, retryAfter: wafResult.retryAfter || 3600 }, 403);
  }

  // Payload size check
  const contentLength = parseInt(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_SIZE) {
    return buildResponse({ blocked: true, reason: "PAYLOAD_TOO_LARGE", retryAfter: 3600 }, 413);
  }

  try {
    const clientIp = extractClientIp(req);

    // Parse body
    let body: Record<string, unknown> = {};
    try {
      const rawBody = await req.text();
      if (rawBody.length > MAX_BODY_SIZE) {
        return buildResponse({ blocked: true, reason: "PAYLOAD_TOO_LARGE", retryAfter: 3600 }, 413);
      }
      if (rawBody) body = JSON.parse(rawBody);
    } catch {
      return buildResponse({ blocked: true, reason: "INVALID_PAYLOAD", retryAfter: 1800 }, 400);
    }

    // ============================================
    // WAF LAYER 2: Request integrity (HMAC)
    // ============================================
    const integrityOk = await verifyRequestIntegrity(req, body);
    if (!integrityOk) {
      return buildResponse({ blocked: true, reason: "INTEGRITY_FAILED", retryAfter: 1800 }, 403);
    }

    // ============================================
    // WAF LAYER 3: Timestamp validation
    // ============================================
    if (body._ts && typeof body._ts === "number") {
      const drift = Math.abs(Date.now() - (body._ts as number));
      if (drift > CLOCK_DRIFT_MAX_MS) {
        return buildResponse({ blocked: true, reason: "CLOCK_DRIFT", retryAfter: 60 }, 400);
      }
    }

    // ============================================
    // WAF LAYER 4: JS Challenge (if WAF flagged)
    // ============================================
    if (wafResult.action === "challenge") {
      if (body.challengeSolution !== undefined && body.challengeHash && body.challengeOriginal) {
        const valid = await verifyChallengeAnswer(
          body.challengeOriginal as string,
          body.challengeSolution as number,
          body.challengeHash as string,
          CHALLENGE_DIFFICULTY
        );
        if (!valid) {
          return buildResponse({ blocked: true, reason: "CHALLENGE_FAILED", retryAfter: 600 }, 403);
        }
      } else if (!body.challengeToken) {
        const { challenge, difficulty } = generateChallenge();
        return buildResponse({
          blocked: false,
          challenge,
          challengeDifficulty: difficulty,
        }, 200);
      }
    }

    // ============================================
    // WAF LAYER 5: Database rate limiting
    // ============================================
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc("check_frontend_access", {
      client_ip: clientIp,
      max_requests: 100,
    });

    if (error) {
      console.error("[EdgeWAF] RPC error:", error);
      return buildResponse({ blocked: false, count: 0, remaining: 100 }, 200);
    }

    const response = data as { blocked: boolean; reason?: string; count?: number; remaining?: number };

    if (response.blocked) {
      sendBlockedAlert(clientIp, response.reason || "RATE_LIMITED").catch(() => {});
      return buildResponse({
        blocked: true,
        reason: response.reason,
        retryAfter: 3600,
      }, 429);
    }

    return buildResponse({
      blocked: false,
      count: response.count,
      remaining: response.remaining,
    }, 200);

  } catch (error) {
    console.error("[EdgeWAF] Error:", error);
    return buildResponse({ blocked: false }, 200);
  }
});
