// Client-side request throttling & anti-DDoS utilities
// Cloudflare-equivalent client-side rate limiting

interface ThrottleEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil: number;
}

interface EndpointConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

const throttleMap = new Map<string, ThrottleEntry>();

// Endpoint-specific rate limits (like Cloudflare rate limiting rules)
const ENDPOINT_CONFIGS: Record<string, EndpointConfig> = {
  "global": { maxRequests: 80, windowMs: 60_000, blockDurationMs: 5 * 60_000 },
  "ddos-shield": { maxRequests: 20, windowMs: 60_000, blockDurationMs: 10 * 60_000 },
  "login": { maxRequests: 5, windowMs: 5 * 60_000, blockDurationMs: 60 * 60_000 },
  "otp": { maxRequests: 3, windowMs: 5 * 60_000, blockDurationMs: 60 * 60_000 },
  "password-reset": { maxRequests: 3, windowMs: 10 * 60_000, blockDurationMs: 60 * 60_000 },
  "api": { maxRequests: 60, windowMs: 60_000, blockDurationMs: 5 * 60_000 },
};

/**
 * Client-side rate limiter with endpoint-specific configs.
 * Returns true if request should be allowed.
 */
export function shouldAllowRequest(key = "global"): boolean {
  const now = Date.now();
  const config = ENDPOINT_CONFIGS[key] || ENDPOINT_CONFIGS["global"];
  let entry = throttleMap.get(key);

  if (!entry) {
    entry = { count: 0, windowStart: now, blocked: false, blockedUntil: 0 };
    throttleMap.set(key, entry);
  }

  // Check if currently self-blocked
  if (entry.blocked) {
    if (now < entry.blockedUntil) return false;
    // Unblock
    entry.blocked = false;
    entry.count = 0;
    entry.windowStart = now;
  }

  // Reset window if expired
  if (now - entry.windowStart > config.windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    entry.blocked = true;
    entry.blockedUntil = now + config.blockDurationMs;
    console.warn(`[EdgeWAF] Client-side rate limit hit for ${key}, blocking for ${config.blockDurationMs / 1000}s`);
    return false;
  }

  return true;
}

/**
 * Generate a simple browser fingerprint for anti-bot validation.
 */
export function getBrowserFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let canvasHash = "no-canvas";
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fp", 2, 2);
    canvasHash = canvas.toDataURL().slice(-50);
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    canvasHash,
  ];

  let hash = 0;
  const str = components.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detect basic bot/automation patterns (legacy - use advancedBotDetection from edge-security.ts)
 */
export function detectBotSignals(): { isBot: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if ((navigator as any).webdriver) reasons.push("webdriver");
  if (!(window as any).chrome && navigator.userAgent.includes("Chrome")) reasons.push("headless-chrome");
  if ((window as any).__phantomas || (window as any)._phantom) reasons.push("phantomjs");
  if (document.documentElement.getAttribute("webdriver") !== null) reasons.push("selenium");
  if ((window as any).__selenium_unwrapped || (window as any).__webdriver_evaluate) reasons.push("selenium-protocol");
  if (navigator.plugins && navigator.plugins.length === 0 && !/Mobile|Android/i.test(navigator.userAgent)) reasons.push("no-plugins");

  return { isBot: reasons.length >= 2, reasons };
}

/**
 * Get request count remaining before client-side block
 */
export function getRemainingRequests(key = "global"): number {
  const config = ENDPOINT_CONFIGS[key] || ENDPOINT_CONFIGS["global"];
  const entry = throttleMap.get(key);
  if (!entry) return config.maxRequests;
  if (entry.blocked) return 0;
  
  const now = Date.now();
  if (now - entry.windowStart > config.windowMs) return config.maxRequests;
  
  return Math.max(0, config.maxRequests - entry.count);
}

/**
 * Rapid-fire detection: tracks calls in very short intervals
 */
const rapidFireMap = new Map<string, number[]>();

export function detectRapidFire(key: string, maxInMs = 500, maxCount = 10): boolean {
  const now = Date.now();
  let timestamps = rapidFireMap.get(key) || [];
  timestamps.push(now);
  
  // Keep only recent timestamps
  timestamps = timestamps.filter(t => now - t < maxInMs);
  rapidFireMap.set(key, timestamps);
  
  return timestamps.length >= maxCount;
}
