import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// SECURITY CONFIGURATION
// ============================================
const ALLOWED_ORIGINS = [
  "https://kuro-panel.lovable.app",
  "https://dynamic-kuro-panel.lovable.app",
  "https://id-preview--a11ea329-69d2-485f-b0db-62a1a5e93a38.lovable.app"
];

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const MAX_FAILED_ATTEMPTS = 100; // Auto-block after 100 failed attempts (relaxed)
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hour ban
const MAX_BODY_SIZE = 8192; // 8KB max request body
const MAX_FIELD_LENGTH = 512; // Max length for any single field

// Security headers (Cloudflare Transform Rules equivalent)
const SECURITY_RESPONSE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
};

// Blocked User-Agents (WAF rule)
const BLOCKED_USER_AGENTS = [
  "python-requests", "curl", "wget", "httpie", "postman",
  "insomnia", "scrapy", "httpclient", "go-http-client",
  "node-fetch", "undici", "got/", "superagent",
  "libwww-perl", "lwp-", "winhttp", "powershell",
];

// Get CORS headers with origin validation
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const corsOrigin = !origin || ALLOWED_ORIGINS.includes(origin) 
    ? (origin || ALLOWED_ORIGINS[0]) 
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "content-type, x-client-info, x-client-signature, x-time, x-signature, x-client-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...SECURITY_RESPONSE_HEADERS,
  };
}

function jsonResponse(data: Record<string, unknown>, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEndpointPath(req: Request): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const functionIndex = parts.lastIndexOf("sarkar-api");
  if (functionIndex === -1) {
    return parts[parts.length - 1] || "";
  }
  return parts.slice(functionIndex + 1).join("/");
}

function getClientIp(req: Request): string {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-client-ip"),
    req.headers.get("fly-client-ip"),
    req.headers.get("x-vercel-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const ip = candidate.split(",")[0]?.trim();
    if (ip) return ip;
  }

  return "unknown";
}

function normalizePackageName(packageName: string | null | undefined) {
  return (packageName || "").trim().toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createSdkDeviceFingerprint(
  packageName: string,
  clientIp: string,
  userAgent: string
): Promise<string> {
  return await sha256Hex(`${packageName}|${clientIp}|${userAgent}`);
}

async function isApprovedPackage(
  supabase: SupabaseClient,
  packageName: string
): Promise<boolean> {
  const normalized = normalizePackageName(packageName);
  if (!normalized) return false;

  const { data } = await supabase
    .from("approved_packages")
    .select("id")
    .eq("package_name", normalized)
    .eq("is_active", true)
    .maybeSingle();

  return !!data;
}

async function sendTelegramText(botToken: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram admin alert", error);
  }
}

// ============================================
// SECURITY HELPERS
// ============================================

// Check if IP is blacklisted
async function isIpBlacklisted(supabase: SupabaseClient, ip: string): Promise<boolean> {
  const { data } = await supabase
    .from("ip_blacklist")
    .select("id")
    .eq("ip_address", ip)
    .or("expires_at.is.null,expires_at.gt.now()")
    .maybeSingle();
  
  return !!data;
}

// Check rate limit
async function checkRateLimit(supabase: SupabaseClient, ip: string, endpoint: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  
  const { count } = await supabase
    .from("api_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart);
  
  if ((count || 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limited
  }
  
  // Record this request
  await supabase.from("api_rate_limits").insert({
    ip_address: ip,
    endpoint: endpoint,
    window_start: new Date().toISOString()
  });
  
  return true; // OK
}

// Track failed attempt and auto-block if needed
async function trackFailedAttempt(supabase: SupabaseClient, ip: string, reason: string): Promise<void> {
  // Upsert failed attempts counter
  const { data: existing } = await supabase
    .from("failed_auth_attempts")
    .select("id, attempt_count")
    .eq("ip_address", ip)
    .maybeSingle();
  
  if (existing) {
    const newCount = (existing.attempt_count || 0) + 1;
    await supabase
      .from("failed_auth_attempts")
      .update({ 
        attempt_count: newCount,
        last_attempt_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    
    // Auto-block if too many failures
    if (newCount >= MAX_FAILED_ATTEMPTS) {
      await supabase.from("ip_blacklist").upsert({
        ip_address: ip,
        reason: `Auto-blocked: ${MAX_FAILED_ATTEMPTS} failed auth attempts. Last reason: ${reason}`,
        expires_at: new Date(Date.now() + BLOCK_DURATION_MS).toISOString()
      }, { onConflict: "ip_address" });
    }
  } else {
    await supabase.from("failed_auth_attempts").insert({
      ip_address: ip,
      attempt_count: 1
    });
  }
}

// Log API request for audit
async function logApiRequest(
  supabase: SupabaseClient, 
  ip: string, 
  endpoint: string, 
  userKey: string | null,
  success: boolean,
  failureReason: string | null,
  requestData: Record<string, unknown> | null
): Promise<void> {
  // Sanitize request data - remove sensitive fields
  const sanitizedData = requestData ? {
    ...requestData,
    serial: requestData.serial ? "***REDACTED***" : undefined
  } : null;

  await supabase.from("api_audit_logs").insert({
    ip_address: ip,
    endpoint: endpoint,
    user_key: userKey,
    success: success,
    failure_reason: failureReason,
    request_data: sanitizedData
  });
}

// MD5 hash function to match C++ client's token validation
// Pure JS implementation since Deno crypto.subtle doesn't support MD5
function md5Hash(message: string): string {
  const md5 = (str: string): string => {
    function rotateLeft(x: number, n: number): number {
      return (x << n) | (x >>> (32 - n));
    }

    function addUnsigned(x: number, y: number): number {
      const x8 = x & 0x80000000;
      const y8 = y & 0x80000000;
      const x4 = x & 0x40000000;
      const y4 = y & 0x40000000;
      const result = (x & 0x3fffffff) + (y & 0x3fffffff);
      if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
      if (x4 | y4) {
        if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
        return result ^ 0x40000000 ^ x8 ^ y8;
      }
      return result ^ x8 ^ y8;
    }

    function f(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
    function g(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
    function h(x: number, y: number, z: number): number { return x ^ y ^ z; }
    function i(x: number, y: number, z: number): number { return y ^ (x | ~z); }

    function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
      a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(str: string): number[] {
      const bytes = new TextEncoder().encode(str);
      const numWords = (((bytes.length + 8) >>> 6) + 1) << 4;
      const words: number[] = new Array(numWords).fill(0);
      for (let i = 0; i < bytes.length; i++) {
        words[i >>> 2] |= bytes[i] << ((i % 4) * 8);
      }
      words[bytes.length >>> 2] |= 0x80 << ((bytes.length % 4) * 8);
      words[numWords - 2] = bytes.length * 8;
      return words;
    }

    function wordToHex(value: number): string {
      let hex = "";
      for (let i = 0; i < 4; i++) {
        const byte = (value >>> (i * 8)) & 0xff;
        hex += byte.toString(16).padStart(2, "0");
      }
      return hex;
    }

    const x = convertToWordArray(str);
    let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;

      a = ff(a, b, c, d, x[k + 0], S11, 0xd76aa478);
      d = ff(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
      c = ff(c, d, a, b, x[k + 2], S13, 0x242070db);
      b = ff(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
      a = ff(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
      d = ff(d, a, b, c, x[k + 5], S12, 0x4787c62a);
      c = ff(c, d, a, b, x[k + 6], S13, 0xa8304613);
      b = ff(b, c, d, a, x[k + 7], S14, 0xfd469501);
      a = ff(a, b, c, d, x[k + 8], S11, 0x698098d8);
      d = ff(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
      c = ff(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
      b = ff(b, c, d, a, x[k + 11], S14, 0x895cd7be);
      a = ff(a, b, c, d, x[k + 12], S11, 0x6b901122);
      d = ff(d, a, b, c, x[k + 13], S12, 0xfd987193);
      c = ff(c, d, a, b, x[k + 14], S13, 0xa679438e);
      b = ff(b, c, d, a, x[k + 15], S14, 0x49b40821);

      a = gg(a, b, c, d, x[k + 1], S21, 0xf61e2562);
      d = gg(d, a, b, c, x[k + 6], S22, 0xc040b340);
      c = gg(c, d, a, b, x[k + 11], S23, 0x265e5a51);
      b = gg(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
      a = gg(a, b, c, d, x[k + 5], S21, 0xd62f105d);
      d = gg(d, a, b, c, x[k + 10], S22, 0x02441453);
      c = gg(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
      b = gg(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
      a = gg(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
      d = gg(d, a, b, c, x[k + 14], S22, 0xc33707d6);
      c = gg(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
      b = gg(b, c, d, a, x[k + 8], S24, 0x455a14ed);
      a = gg(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
      d = gg(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
      c = gg(c, d, a, b, x[k + 7], S23, 0x676f02d9);
      b = gg(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

      a = hh(a, b, c, d, x[k + 5], S31, 0xfffa3942);
      d = hh(d, a, b, c, x[k + 8], S32, 0x8771f681);
      c = hh(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
      b = hh(b, c, d, a, x[k + 14], S34, 0xfde5380c);
      a = hh(a, b, c, d, x[k + 1], S31, 0xa4beea44);
      d = hh(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
      c = hh(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
      b = hh(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
      a = hh(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
      d = hh(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
      c = hh(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
      b = hh(b, c, d, a, x[k + 6], S34, 0x04881d05);
      a = hh(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
      d = hh(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
      c = hh(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
      b = hh(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

      a = ii(a, b, c, d, x[k + 0], S41, 0xf4292244);
      d = ii(d, a, b, c, x[k + 7], S42, 0x432aff97);
      c = ii(c, d, a, b, x[k + 14], S43, 0xab9423a7);
      b = ii(b, c, d, a, x[k + 5], S44, 0xfc93a039);
      a = ii(a, b, c, d, x[k + 12], S41, 0x655b59c3);
      d = ii(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
      c = ii(c, d, a, b, x[k + 10], S43, 0xffeff47d);
      b = ii(b, c, d, a, x[k + 1], S44, 0x85845dd1);
      a = ii(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
      d = ii(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
      c = ii(c, d, a, b, x[k + 6], S43, 0xa3014314);
      b = ii(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
      a = ii(a, b, c, d, x[k + 4], S41, 0xf7537e82);
      d = ii(d, a, b, c, x[k + 11], S42, 0xbd3af235);
      c = ii(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
      b = ii(b, c, d, a, x[k + 9], S44, 0xeb86d391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  };

  return md5(message);
}

// Parse body from JSON or form-urlencoded format (from Request)
async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    return await req.json();
  } 
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, unknown> = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }
  
  // Default: try JSON first, then form-encoded
  const text = await req.text();
  try {
    return JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    const result: Record<string, unknown> = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }
}


// Format duration to human readable string
function formatDuration(hours: number): string {
  if (hours < 24) {
    return hours === 1 ? "1 Hour" : `${hours} Hours`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days === 1 ? "1 Day" : `${days} Days`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "1 Month" : `${months} Months`;
  }
  const years = Math.floor(months / 12);
  return years === 1 ? "1 Year" : `${years} Years`;
}

interface LicenseKey {
  id: string;
  key_code: string;
  game_id: string;
  duration_hours: number;
  max_devices: number;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  bot_id?: string | null;
  package_restricted?: boolean;
  games?: { id: string; name: string; mod_name: string | null } | null;
}

interface KeyActivation {
  id: string;
  key_id: string;
  device_fingerprint: string;
  device_info: Record<string, unknown> | null;
  ip_address: string | null;
  last_seen: string;
}

async function handleActivate(
  supabase: SupabaseClient,
  body: { key_code: string; device_fingerprint: string; device_info?: Record<string, unknown> },
  clientIp: string,
  corsHeaders: Record<string, string>
) {
  const { key_code, device_fingerprint, device_info } = body;

  if (!key_code || !device_fingerprint) {
    await logApiRequest(supabase, clientIp, "activate", key_code, false, "MISSING_FIELDS", null);
    return jsonResponse({ error: "Invalid request" }, 400, corsHeaders);
  }

  // 1. Find the key
  const { data: key, error } = await supabase
    .from("license_keys")
    .select("*, games(id, name, mod_name)")
    .eq("key_code", key_code)
    .single<LicenseKey>();

  if (error || !key) {
    await trackFailedAttempt(supabase, clientIp, "INVALID_KEY");
    await logApiRequest(supabase, clientIp, "activate", key_code, false, "INVALID_KEY", null);
    return jsonResponse({ error: "Invalid request" }, 404, corsHeaders);
  }

  // OBFUSCATED: All status errors return generic message
  if (key.status === "revoked" || key.status === "paused") {
    await logApiRequest(supabase, clientIp, "activate", key_code, false, `KEY_${key.status.toUpperCase()}`, null);
    return jsonResponse({ error: "Unable to process request" }, 403, corsHeaders);
  }

  // 2. Check if already expired
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    await supabase.from("key_activations").delete().eq("key_id", key.id);
    await supabase.from("license_keys").update({ status: "expired" }).eq("id", key.id);
    await logApiRequest(supabase, clientIp, "activate", key_code, false, "KEY_EXPIRED", null);
    return jsonResponse({ error: "Unable to process request" }, 403, corsHeaders);
  }

  // 3. Count current activations
  const { count } = await supabase
    .from("key_activations")
    .select("*", { count: "exact", head: true })
    .eq("key_id", key.id);

  // 4. Check if this device is already activated
  const { data: existingActivation } = await supabase
    .from("key_activations")
    .select("*")
    .eq("key_id", key.id)
    .eq("device_fingerprint", device_fingerprint)
    .maybeSingle<KeyActivation>();

  if (existingActivation) {
    await supabase
      .from("key_activations")
      .update({ 
        last_seen: new Date().toISOString(),
        ip_address: clientIp,
        device_info: device_info || existingActivation.device_info
      })
      .eq("id", existingActivation.id);
  } else {
    if ((count || 0) >= key.max_devices) {
      await logApiRequest(supabase, clientIp, "activate", key_code, false, "MAX_DEVICES", null);
      return jsonResponse({ error: "Unable to process request" }, 403, corsHeaders);
    }

    const { error: insertError } = await supabase.from("key_activations").insert({
      key_id: key.id,
      device_fingerprint,
      device_info: device_info || {},
      ip_address: clientIp,
    });

    if (insertError) {
      console.error("Activation error");
      await logApiRequest(supabase, clientIp, "activate", key_code, false, "INSERT_ERROR", null);
      return jsonResponse({ error: "Unable to process request" }, 500, corsHeaders);
    }
  }

  // 5. Set activation time if first activation
  let expiresAt = key.expires_at;
  if (!key.activated_at) {
    expiresAt = new Date(Date.now() + key.duration_hours * 60 * 60 * 1000).toISOString();
    await supabase
      .from("license_keys")
      .update({ 
        activated_at: new Date().toISOString(), 
        expires_at: expiresAt 
      })
      .eq("id", key.id);
  }

  const remainingMs = new Date(expiresAt!).getTime() - Date.now();
  
  await logApiRequest(supabase, clientIp, "activate", key_code, true, null, null);

  return jsonResponse({
    success: true,
    activated: true,
    expires_at: expiresAt,
    remaining_seconds: Math.floor(remainingMs / 1000),
    game_id: key.game_id,
    game_name: key.games?.name,
    mod_name: key.games?.mod_name,
  }, 200, corsHeaders);
}

async function handleVerify(
  supabase: SupabaseClient,
  body: { key_code: string; device_fingerprint: string },
  clientIp: string,
  corsHeaders: Record<string, string>
) {
  const { key_code, device_fingerprint } = body;

  if (!key_code || !device_fingerprint) {
    await logApiRequest(supabase, clientIp, "verify", key_code, false, "MISSING_FIELDS", null);
    return jsonResponse({ valid: false, error: "Invalid request" }, 400, corsHeaders);
  }

  const { data: key, error } = await supabase
    .from("license_keys")
    .select("*, games(name, mod_name)")
    .eq("key_code", key_code)
    .single<LicenseKey>();

  if (error || !key) {
    await trackFailedAttempt(supabase, clientIp, "INVALID_KEY");
    await logApiRequest(supabase, clientIp, "verify", key_code, false, "INVALID_KEY", null);
    return jsonResponse({ valid: false, error: "Invalid request" }, 200, corsHeaders);
  }

  // Check expiration
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    if (key.status === "active") {
      await supabase.from("key_activations").delete().eq("key_id", key.id);
      await supabase.from("license_keys").update({ status: "expired" }).eq("id", key.id);
    }
    await logApiRequest(supabase, clientIp, "verify", key_code, false, "KEY_EXPIRED", null);
    return jsonResponse({ valid: false, error: "Unable to verify" }, 200, corsHeaders);
  }

  if (key.status !== "active") {
    await logApiRequest(supabase, clientIp, "verify", key_code, false, `KEY_${key.status.toUpperCase()}`, null);
    return jsonResponse({ valid: false, error: "Unable to verify" }, 200, corsHeaders);
  }

  // Verify device is registered
  const { data: activation } = await supabase
    .from("key_activations")
    .select("*")
    .eq("key_id", key.id)
    .eq("device_fingerprint", device_fingerprint)
    .maybeSingle<KeyActivation>();

  if (!activation) {
    await logApiRequest(supabase, clientIp, "verify", key_code, false, "DEVICE_NOT_REGISTERED", null);
    return jsonResponse({ valid: false, error: "Unable to verify" }, 200, corsHeaders);
  }

  const remainingMs = new Date(key.expires_at!).getTime() - Date.now();
  
  await logApiRequest(supabase, clientIp, "verify", key_code, true, null, null);

  return jsonResponse({
    valid: true,
    remaining_seconds: Math.floor(remainingMs / 1000),
    expires_at: key.expires_at,
    game_name: key.games?.name,
    mod_name: key.games?.mod_name,
  }, 200, corsHeaders);
}

function buildLegacyFailure(
  corsHeaders: Record<string, string>,
  status = 200,
  reason = "INVALID_REQUEST"
) {
  return jsonResponse({
    status: false,
    reason,
    message: "Unable to process request",
    data: null,
  }, status, corsHeaders);
}

function buildSdkFailure(
  corsHeaders: Record<string, string>,
  reason: string,
  status = 200
) {
  return jsonResponse({
    status: "fail",
    reason,
  }, status, corsHeaders);
}

async function notifyBotAdminAboutActivation(
  supabase: SupabaseClient,
  key: LicenseKey,
  mode: "c++" | "sdk",
  clientIp: string,
  deviceFingerprint: string,
  deviceInfo?: Record<string, unknown> | null,
  packageName?: string
) {
  if (!key.bot_id) return;

  const { data: bot } = await supabase
    .from("telegram_bots")
    .select("bot_token, admin_chat_id, display_name, name")
    .eq("id", key.bot_id)
    .eq("is_active", true)
    .maybeSingle<{
      bot_token: string;
      admin_chat_id: number;
      display_name: string | null;
      name: string;
    }>();

  if (!bot?.bot_token || !bot.admin_chat_id) return;

  const gameName = key.games?.name || "Unknown Game";
  const deviceModel = String(deviceInfo?.model || deviceInfo?.device_model || deviceInfo?.brand || "Unknown");
  const deviceBrand = String(deviceInfo?.brand || deviceInfo?.manufacturer || "Unknown");
  const packageLine = packageName ? `\nPackage: <code>${packageName}</code>` : "";
  const displayName = bot.display_name || bot.name;

  const message = [
    `New ${mode.toUpperCase()} key activity on <b>${displayName}</b>`,
    ``,
    `Game: <b>${gameName}</b>`,
    `Key: <code>${key.key_code}</code>`,
    `IP: <code>${clientIp}</code>`,
    `Fingerprint: <code>${deviceFingerprint.slice(0, 24)}</code>`,
    `Device Model: <b>${deviceModel}</b>`,
    `Device Brand: <b>${deviceBrand}</b>${packageLine}`,
  ].join("\n");

  await sendTelegramText(bot.bot_token, Number(bot.admin_chat_id), message);
}

async function handleConnect(
  supabase: SupabaseClient,
  body: { 
    game?: string; 
    user_key?: string; 
    serial?: string;
    package_name?: string;
    device_info?: Record<string, unknown>;
    legacy?: string | number | boolean;
  },
  clientIp: string,
  corsHeaders: Record<string, string>,
  options: { sdk: boolean; userAgent: string }
) {
  const endpointName = options.sdk ? "sdk_connect" : "connect";
  const game = typeof body.game === "string" ? body.game : "";
  const userKey = typeof body.user_key === "string" ? body.user_key.trim() : "";
  const normalizedPackageName = normalizePackageName(
    typeof body.package_name === "string" ? body.package_name : "",
  );
  let serial = typeof body.serial === "string" ? body.serial.trim() : "";
  const deviceInfo =
    body.device_info && typeof body.device_info === "object"
      ? body.device_info
      : undefined;

  if (!userKey) {
    await logApiRequest(supabase, clientIp, endpointName, userKey, false, "MISSING_FIELDS", {
      game,
      package_name: normalizedPackageName || null,
    });
    return options.sdk
      ? buildSdkFailure(corsHeaders, "LICENSE_KEY_REQUIRED", 400)
      : buildLegacyFailure(corsHeaders, 400);
  }

  if (options.sdk && !serial) {
    serial = await createSdkDeviceFingerprint(
      normalizedPackageName || "sdk-panel",
      clientIp,
      options.userAgent || "unknown",
    );
  }

  if (!serial) {
    await logApiRequest(supabase, clientIp, endpointName, userKey, false, "MISSING_FIELDS", {
      game,
      package_name: normalizedPackageName || null,
    });
    return options.sdk
      ? buildSdkFailure(corsHeaders, "DEVICE_ID_REQUIRED", 400)
      : buildLegacyFailure(corsHeaders, 400);
  }

  // Check if game-agnostic mode
  const isGameAgnostic = !game || game === "" || game.toUpperCase() === "AUTO";

  // Try to find game data if specific game provided
  let gameData: { id: string; name: string; mod_name: string | null } | null = null;
  if (!isGameAgnostic) {
    const { data } = await supabase
      .from("games")
      .select("id, name, mod_name")
      .ilike("name", game)
      .eq("status", "active")
      .maybeSingle<{ id: string; name: string; mod_name: string | null }>();
    gameData = data;
  }

  // Try exact game match first, then fall back to game-agnostic lookup
  let key: LicenseKey | null = null;
  let keyGameData: { id: string; name: string; mod_name: string | null } | null = gameData;

  if (gameData) {
    const { data: exactKey } = await supabase
      .from("license_keys")
      .select("*, games(id, name, mod_name)")
      .eq("key_code", userKey)
      .eq("game_id", gameData.id)
      .maybeSingle<LicenseKey>();
    key = exactKey;
  }

  // If no exact match OR game-agnostic mode, find key by key_code only
  if (!key) {
    const { data: anyKey } = await supabase
      .from("license_keys")
      .select("*, games(id, name, mod_name)")
      .eq("key_code", userKey)
      .maybeSingle<LicenseKey>();
    
    if (anyKey) {
      key = anyKey;
      keyGameData = anyKey.games || null;
    }
  }

  if (!key) {
    await trackFailedAttempt(supabase, clientIp, "INVALID_KEY");
    await logApiRequest(supabase, clientIp, endpointName, userKey, false, "INVALID_KEY", {
      game,
      package_name: normalizedPackageName || null,
    });
    return options.sdk
      ? buildSdkFailure(corsHeaders, "INVALID_KEY")
      : buildLegacyFailure(corsHeaders);
  }

  // OBFUSCATED: All status errors return generic message
  if (key.status === "revoked" || key.status === "paused") {
    await logApiRequest(
      supabase,
      clientIp,
      endpointName,
      userKey,
      false,
      `KEY_${key.status.toUpperCase()}`,
      { game, package_name: normalizedPackageName || null },
    );
    return options.sdk
      ? buildSdkFailure(corsHeaders, "LICENSE_INACTIVE")
      : buildLegacyFailure(corsHeaders);
  }

  // Check expiration
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    await supabase.from("license_keys").update({ status: "expired" }).eq("id", key.id);
    await logApiRequest(supabase, clientIp, endpointName, userKey, false, "KEY_EXPIRED", {
      game,
      package_name: normalizedPackageName || null,
    });
    return options.sdk
      ? buildSdkFailure(corsHeaders, "LICENSE_EXPIRED")
      : buildLegacyFailure(corsHeaders);
  }

  if (!options.sdk && key.package_restricted) {
    await logApiRequest(
      supabase,
      clientIp,
      endpointName,
      userKey,
      false,
      "PACKAGE_RESTRICTED_KEY",
      { game },
    );
    return buildLegacyFailure(corsHeaders);
  }

  if (options.sdk && key.package_restricted) {
    if (!normalizedPackageName) {
      await logApiRequest(
        supabase,
        clientIp,
        endpointName,
        userKey,
        false,
        "PACKAGE_NAME_REQUIRED",
        { game },
      );
      return buildSdkFailure(corsHeaders, "PACKAGE_NAME_REQUIRED");
    }

    const packageAllowed = await isApprovedPackage(supabase, normalizedPackageName);
    if (!packageAllowed) {
      await logApiRequest(
        supabase,
        clientIp,
        endpointName,
        userKey,
        false,
        "PACKAGE_NOT_APPROVED",
        { game, package_name: normalizedPackageName },
      );
      return buildSdkFailure(corsHeaders, "PACKAGE_NOT_APPROVED");
    }
  }

  // Count current activations
  const { count: currentDevices } = await supabase
    .from("key_activations")
    .select("*", { count: "exact", head: true })
    .eq("key_id", key.id);

  // Check if device already registered ON THIS KEY
  const { data: existingActivation } = await supabase
    .from("key_activations")
    .select("*")
    .eq("key_id", key.id)
    .eq("device_fingerprint", serial)
    .maybeSingle<KeyActivation>();

  let isNewActivation = false;

  if (existingActivation) {
    // Device already on this key - just update last_seen
    await supabase
      .from("key_activations")
      .update({ 
        last_seen: new Date().toISOString(),
        ip_address: clientIp,
        device_info: deviceInfo || existingActivation.device_info
      })
      .eq("id", existingActivation.id);
  } else {
    // NEW KEY ACTIVATION - Remove device from ALL other keys first
    // This allows users to migrate to new keys seamlessly
    const { data: oldActivations } = await supabase
      .from("key_activations")
      .select("id, key_id")
      .eq("device_fingerprint", serial)
      .neq("key_id", key.id);
    
    if (oldActivations && oldActivations.length > 0) {
      // Remove device from old keys
      await supabase
        .from("key_activations")
        .delete()
        .eq("device_fingerprint", serial)
        .neq("key_id", key.id);
      
      console.log(`Device ${serial.substring(0, 8)}... migrated from ${oldActivations.length} old key(s) to new key`);
    }

    // Now check device limit for this key
    if ((currentDevices || 0) >= key.max_devices) {
      await logApiRequest(supabase, clientIp, endpointName, userKey, false, "MAX_DEVICES", {
        game,
        package_name: normalizedPackageName || null,
      });
      return options.sdk
        ? buildSdkFailure(corsHeaders, "MAX_DEVICES_REACHED")
        : buildLegacyFailure(corsHeaders);
    }

    const { error: insertError } = await supabase.from("key_activations").insert({
      key_id: key.id,
      device_fingerprint: serial,
      device_info: deviceInfo || {},
      ip_address: clientIp,
    });

    if (insertError) {
      console.error("Activation error");
      await logApiRequest(supabase, clientIp, endpointName, userKey, false, "INSERT_ERROR", {
        game,
        package_name: normalizedPackageName || null,
      });
      return options.sdk
        ? buildSdkFailure(corsHeaders, "ACTIVATION_FAILED", 500)
        : buildLegacyFailure(corsHeaders, 500);
    }

    isNewActivation = true;
  }

  // Set activation time if first activation
  let expiresAt = key.expires_at;
  if (!key.activated_at) {
    expiresAt = new Date(Date.now() + key.duration_hours * 60 * 60 * 1000).toISOString();
    await supabase
      .from("license_keys")
      .update({ 
        activated_at: new Date().toISOString(), 
        expires_at: expiresAt 
      })
      .eq("id", key.id);
  }

  // Calculate remaining time
  const remainingMs = new Date(expiresAt!).getTime() - Date.now();
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const currentDeviceCount = (currentDevices || 0) + (existingActivation ? 0 : 1);

  // ============================================
  // SECRET FROM ENVIRONMENT VARIABLE
  // ============================================
  const secret = Deno.env.get("CLIENT_AUTH_SECRET");
  
  if (!secret && !options.sdk) {
    console.error("CLIENT_AUTH_SECRET not configured");
    return buildLegacyFailure(corsHeaders, 500);
  }
  
  // ALWAYS use "PUBG" for legacy client compatibility
  const authString = secret ? `PUBG-${userKey}-${serial}-${secret}` : "";
  const md5Token = secret ? md5Hash(authString) : "";
  
  // Current timestamp for rng validation (client checks ±15 seconds - tightened from 30)
  const rng = Math.floor(Date.now() / 1000);
  
  // Format expiry date
  const ts = new Date(expiresAt!).toISOString().split("T")[0];
  
  // Format EXP as human readable duration
  const exp = formatDuration(key.duration_hours);

  // Get mod_name from key's game data or fallback
  const actualGameName = keyGameData?.name?.toUpperCase() || "PUBG";
  const modName = keyGameData?.mod_name || `${actualGameName} Mod`;

  if (isNewActivation) {
    await notifyBotAdminAboutActivation(
      supabase,
      key,
      options.sdk ? "sdk" : "c++",
      clientIp,
      serial,
      deviceInfo,
      normalizedPackageName || undefined,
    );
  }

  await logApiRequest(supabase, clientIp, endpointName, userKey, true, null, {
    game,
    package_name: normalizedPackageName || null,
  });

  if (options.sdk) {
    return jsonResponse({
      status: "success",
      reason: null,
      expiry: expiresAt,
      game_name: actualGameName,
      mod_name: modName,
      days_remaining: daysRemaining,
      remaining_seconds: remainingSeconds,
      max_devices: key.max_devices,
      current_devices: currentDeviceCount,
    }, 200, corsHeaders);
  }
  
  const ms = key.status;
  const fAVA = ms;

  // Legacy mode check
  const isLegacyMode = body.legacy === "1" || body.legacy === 1 || body.legacy === true;
  const tokenValue = isLegacyMode ? "1" : md5Token;

  return jsonResponse({
    status: true,
    reason: null,
    data: {
      token: tokenValue,
      game_name: actualGameName,
      mod_name: modName,
      expiry: expiresAt,
      days_remaining: daysRemaining,
      remaining_seconds: remainingSeconds,
      max_devices: key.max_devices,
      current_devices: currentDeviceCount,
      rng: rng,
      EXP: exp,
      ts: ts,
      ms: ms,
      fAVA: fAVA
    }
  }, 200, corsHeaders);
}

async function handleHeartbeat(
  supabase: SupabaseClient,
  body: { key_code: string; device_fingerprint: string },
  clientIp: string,
  corsHeaders: Record<string, string>
) {
  const { key_code, device_fingerprint } = body;

  if (!key_code || !device_fingerprint) {
    return jsonResponse({ success: false, error: "Invalid request" }, 400, corsHeaders);
  }

  const { data: key } = await supabase
    .from("license_keys")
    .select("id, status, expires_at")
    .eq("key_code", key_code)
    .single<{ id: string; status: string; expires_at: string | null }>();

  if (!key) {
    return jsonResponse({ success: false, error: "Invalid request" }, 200, corsHeaders);
  }

  if (key.status !== "active") {
    return jsonResponse({ success: false, error: "Unable to process" }, 200, corsHeaders);
  }

  // Check expiration
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    await supabase.from("license_keys").update({ status: "expired" }).eq("id", key.id);
    return jsonResponse({ success: false, expired: true, error: "Unable to process" }, 200, corsHeaders);
  }

  // Check if device is registered
  const { data: activation } = await supabase
    .from("key_activations")
    .select("id")
    .eq("key_id", key.id)
    .eq("device_fingerprint", device_fingerprint)
    .maybeSingle();

  if (!activation) {
    return jsonResponse({ success: false, error: "Unable to process" }, 200, corsHeaders);
  }

  // Update last_seen
  await supabase
    .from("key_activations")
    .update({ 
      last_seen: new Date().toISOString(),
      ip_address: clientIp
    })
    .eq("id", activation.id);

  const remainingMs = new Date(key.expires_at!).getTime() - Date.now();

  return jsonResponse({
    success: true,
    remaining_seconds: Math.floor(remainingMs / 1000),
    expires_at: key.expires_at,
  }, 200, corsHeaders);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  // WAF Rule: Block known automation User-Agents (skip for C++ game clients)
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
  const isGameClient = req.headers.get("x-client-info") == null && !req.headers.get("origin");
  if (!isGameClient && userAgent.length > 0) {
    for (const blocked of BLOCKED_USER_AGENTS) {
      if (userAgent.includes(blocked)) {
        return jsonResponse({ status: false, reason: "BLOCKED_UA", message: "Unable to process request" }, 403, corsHeaders);
      }
    }
  }

  // Check content length
  const contentLength = parseInt(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_SIZE) {
    return jsonResponse({ status: false, reason: "PAYLOAD_TOO_LARGE", message: "Request too large" }, 413, corsHeaders);
  }

  const endpointPath = getEndpointPath(req);

  // Validate endpoint name (prevent path traversal)
  if (!/^[a-z\-/]+$/.test(endpointPath)) {
    return jsonResponse({ error: "Invalid endpoint" }, 400, corsHeaders);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clientIp = getClientIp(req);

  try {
    // ============================================
    // SECURITY CHECKS
    // ============================================
    
    // 1. Check IP blacklist
    if (await isIpBlacklisted(supabase, clientIp)) {
      return jsonResponse({ 
        status: false, 
        reason: "BLOCKED",
        message: "Unable to process request"
      }, 403, corsHeaders);
    }

    // 2. Check rate limit
    if (!await checkRateLimit(supabase, clientIp, endpointPath)) {
      return jsonResponse({ 
        status: false, 
        reason: "RATE_LIMITED",
        message: "Too many requests"
      }, 429, corsHeaders);
    }

    // 3. Parse request body with size guard
    let body: Record<string, unknown>;
    try {
      body = await parseBody(req);
    } catch {
      return jsonResponse({ status: false, reason: "INVALID_PAYLOAD", message: "Invalid request body" }, 400, corsHeaders);
    }

    // 4. Sanitize all string fields - truncate and check for injection
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        if (value.length > MAX_FIELD_LENGTH) {
          return jsonResponse({ status: false, reason: "FIELD_TOO_LONG", message: "Unable to process request" }, 400, corsHeaders);
        }
      }
    }

    switch (endpointPath) {
      case "connect":
        return await handleConnect(supabase, body as any, clientIp, corsHeaders, {
          sdk: false,
          userAgent,
        });
      case "sdk/panel/connect":
        return await handleConnect(supabase, body as any, clientIp, corsHeaders, {
          sdk: true,
          userAgent,
        });
      case "activate":
        return await handleActivate(supabase, body as any, clientIp, corsHeaders);
      case "verify":
        return await handleVerify(supabase, body as any, clientIp, corsHeaders);
      case "heartbeat":
        return await handleHeartbeat(supabase, body as any, clientIp, corsHeaders);
      default:
        return jsonResponse({ 
          error: "Unknown endpoint"
        }, 404, corsHeaders);
    }
  } catch (error) {
    console.error("API error");
    return jsonResponse({ 
      status: false,
      reason: "INTERNAL_ERROR",
      message: "Unable to process request"
    }, 500, corsHeaders);
  }
});
