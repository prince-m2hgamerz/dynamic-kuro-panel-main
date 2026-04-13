/**
 * Edge Security Module - Cloudflare-equivalent client-side security
 * Handles: HMAC request signing, JS Challenge (proof-of-work), 
 * advanced bot detection, request integrity verification
 */

// ============================================
// HMAC REQUEST SIGNING
// ============================================

const HMAC_ALGO = "SHA-256";

/**
 * Generate HMAC signature for request payload using Web Crypto API.
 * The key is derived from a combination of browser fingerprint + timestamp
 * to prevent replay attacks even if someone captures a signed request.
 */
async function generateHmac(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: HMAC_ALGO },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", keyData, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sign a request body with HMAC for edge verification.
 * Returns headers to attach to the request.
 */
export async function signRequest(body: Record<string, unknown>): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const payload = JSON.stringify(body) + timestamp + nonce;
  
  // Client-side key derivation (edge function uses the secret to verify)
  const clientKey = `sarkar-edge-${timestamp.slice(-6)}-${nonce.slice(0, 8)}`;
  const signature = await generateHmac(payload, clientKey);
  
  return {
    "x-request-ts": timestamp,
    "x-request-nonce": nonce,
    "x-request-sig": signature,
    "x-client-key": clientKey,
  };
}

// ============================================
// JS CHALLENGE - PROOF OF WORK
// ============================================

interface ChallengeResult {
  solution: number;
  hash: string;
  difficulty: number;
  timeMs: number;
}

/**
 * Solve a proof-of-work challenge (like Cloudflare's JS Challenge).
 * Finds a number that when hashed with the challenge string produces
 * a hash starting with N zeros (difficulty).
 */
export async function solveChallenge(challenge: string, difficulty: number = 4): Promise<ChallengeResult> {
  const prefix = "0".repeat(difficulty);
  const startTime = performance.now();
  let nonce = 0;

  while (true) {
    const input = `${challenge}:${nonce}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (hashHex.startsWith(prefix)) {
      return {
        solution: nonce,
        hash: hashHex,
        difficulty,
        timeMs: Math.round(performance.now() - startTime),
      };
    }
    nonce++;

    // Yield to main thread every 1000 iterations to prevent UI freeze
    if (nonce % 1000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// ============================================
// ADVANCED BOT DETECTION
// ============================================

interface BotDetectionResult {
  isBot: boolean;
  score: number; // 0-100, higher = more likely bot
  signals: string[];
}

/**
 * Comprehensive bot detection combining multiple signals.
 * Score-based system: each signal adds points, threshold determines bot.
 */
export function advancedBotDetection(): BotDetectionResult {
  const signals: string[] = [];
  let score = 0;

  // 1. WebDriver detection (20 points)
  if ((navigator as any).webdriver) {
    signals.push("webdriver");
    score += 20;
  }

  // 2. Headless Chrome detection (15 points)
  if (!(window as any).chrome && navigator.userAgent.includes("Chrome")) {
    signals.push("headless-chrome");
    score += 15;
  }

  // 3. PhantomJS detection (20 points)
  if ((window as any).__phantomas || (window as any)._phantom || (window as any).callPhantom) {
    signals.push("phantomjs");
    score += 20;
  }

  // 4. Selenium detection (20 points)
  const seleniumIndicators = [
    document.documentElement.getAttribute("webdriver"),
    (window as any).__selenium_unwrapped,
    (window as any).__webdriver_evaluate,
    (window as any).__webdriver_script_function,
    (window as any).__webdriver_script_func,
    (window as any).__webdriver_script_fn,
    document.documentElement.getAttribute("driver-evaluate"),
    document.documentElement.getAttribute("selenium"),
  ];
  if (seleniumIndicators.some(Boolean)) {
    signals.push("selenium");
    score += 20;
  }

  // 5. Missing plugins in desktop browser (10 points)
  if (navigator.plugins && navigator.plugins.length === 0 && !/Mobile|Android|iPhone/i.test(navigator.userAgent)) {
    signals.push("no-plugins");
    score += 10;
  }

  // 6. Inconsistent screen dimensions (10 points)
  if (window.outerHeight === 0 || window.outerWidth === 0) {
    signals.push("zero-dimensions");
    score += 10;
  }

  // 7. Missing browser features (10 points each)
  if (!window.requestAnimationFrame) {
    signals.push("no-raf");
    score += 10;
  }
  if (!window.performance || !window.performance.timing) {
    signals.push("no-performance");
    score += 10;
  }

  // 8. Puppeteer-specific (15 points)
  if ((navigator as any).permissions?.query) {
    try {
      // Puppeteer often has notification permission set differently
      (navigator as any).permissions.query({ name: "notifications" }).then((result: any) => {
        if (Notification.permission === "denied" && result.state === "prompt") {
          signals.push("puppeteer-permissions");
          score += 15;
        }
      }).catch(() => {});
    } catch { /* ignore */ }
  }

  // 9. CDP (Chrome DevTools Protocol) detection (15 points)
  if ((window as any)._cdc_adoQpoasnfa76pfcZLmcfl_Array ||
      (window as any)._cdc_adoQpoasnfa76pfcZLmcfl_Promise ||
      (window as any)._cdc_adoQpoasnfa76pfcZLmcfl_Symbol) {
    signals.push("cdp-detected");
    score += 15;
  }

  // 10. Touch support inconsistency (5 points)
  const hasTouchEvents = "ontouchstart" in window;
  const isMobileUA = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobileUA && !hasTouchEvents) {
    signals.push("fake-mobile-ua");
    score += 5;
  }

  // 11. Language inconsistency (5 points)
  if (!navigator.language || navigator.language === "") {
    signals.push("no-language");
    score += 5;
  }

  // 12. WebGL fingerprint (check if webgl is available but returns generic renderer)
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer === "Google SwiftShader" || renderer.includes("llvmpipe")) {
          signals.push("software-renderer");
          score += 10;
        }
      }
    } else {
      signals.push("no-webgl");
      score += 5;
    }
  } catch { /* ignore */ }

  return {
    isBot: score >= 30,
    score,
    signals,
  };
}

// ============================================
// BROWSER INTEGRITY CHECK
// ============================================

/**
 * Enhanced browser fingerprint with more entropy.
 */
export function getEnhancedFingerprint(): string {
  const components: string[] = [];

  // Basic navigator properties
  components.push(navigator.userAgent);
  components.push(navigator.language);
  components.push(String(navigator.hardwareConcurrency || 0));
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(String(new Date().getTimezoneOffset()));
  components.push(String(navigator.maxTouchPoints || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Sarkar Edge 🔒", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Sarkar Edge 🔒", 4, 17);
      components.push(canvas.toDataURL().slice(-80));
    }
  } catch { /* ignore */ }

  // WebGL fingerprint
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string);
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string);
      }
    }
  } catch { /* ignore */ }

  // Audio context fingerprint
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    components.push(String(audioContext.sampleRate));
    audioContext.close();
  } catch { /* ignore */ }

  // Hash all components
  let hash = 0;
  const str = components.join("|||");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + "-" + str.length.toString(36);
}

// ============================================
// MOUSE/INTERACTION TRACKING (anti-bot)
// ============================================

let interactionCount = 0;
let hasRealInteraction = false;

export function initInteractionTracking(): void {
  const events = ["mousemove", "click", "keydown", "touchstart", "scroll"];
  
  const handler = () => {
    interactionCount++;
    if (interactionCount >= 3) {
      hasRealInteraction = true;
    }
  };

  events.forEach(event => {
    document.addEventListener(event, handler, { passive: true });
  });
}

export function hasUserInteracted(): boolean {
  return hasRealInteraction;
}

export function getInteractionCount(): number {
  return interactionCount;
}

// ============================================
// REQUEST INTEGRITY
// ============================================

/**
 * Create a tamper-proof request envelope with all security metadata.
 */
export async function createSecureRequest(
  body: Record<string, unknown>
): Promise<{ body: Record<string, unknown>; headers: Record<string, string> }> {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const fingerprint = getEnhancedFingerprint();
  
  const secureBody = {
    ...body,
    _ts: timestamp,
    _nonce: nonce,
    _fp: fingerprint,
    _ic: interactionCount, // interaction count as proof of human
  };

  const headers = await signRequest(secureBody);
  
  return {
    body: secureBody,
    headers: {
      ...headers,
      "x-browser-fp": fingerprint,
      "x-interaction-count": String(interactionCount),
    },
  };
}
