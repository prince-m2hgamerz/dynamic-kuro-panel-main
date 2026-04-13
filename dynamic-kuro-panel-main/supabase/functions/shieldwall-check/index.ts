import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHIELDWALL_ENDPOINT = "https://dnrqfuvpwjzfagwvyujz.supabase.co/functions/v1/api-check";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Init Supabase service client for logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const SHIELDWALL_API_KEY = Deno.env.get("SHIELDWALL_API_KEY");
    if (!SHIELDWALL_API_KEY) {
      console.error("[ShieldWall] API key not configured");
      return new Response(JSON.stringify({ action: "pass", score: 0, error: "not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    
    // Get real IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip") 
      || "0.0.0.0";

    const userAgent = body.user_agent || req.headers.get("user-agent") || "";

    // Build ShieldWall payload - all server-side, no client secrets exposed
    const payload = {
      ip_address: clientIp,
      user_agent: userAgent,
      path: body.path || "/",
      method: body.method || "GET",
      fingerprint: body.fingerprint || {},
    };

    const swResponse = await fetch(SHIELDWALL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SHIELDWALL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const swData = await swResponse.json();

    // ── SERVER-SIDE LOGGING ──
    // Record every verification attempt with full details
    try {
      await supabase.rpc("log_security_event", {
        _event_type: swData.action === "pass" ? "SHIELDWALL_PASS" : swData.action === "block" ? "SHIELDWALL_BLOCK" : "SHIELDWALL_CHALLENGE",
        _ip_address: clientIp,
        _details: {
          score: swData.score,
          action: swData.action,
          reasons: swData.reasons || [],
          ray_id: swData.ray_id,
          threat_level: swData.threat_level,
          ip_reputation: swData.ip_reputation,
          waf_triggered: swData.waf_triggered,
          user_agent: userAgent,
          path: body.path || "/",
          fingerprint: {
            screen: `${body.fingerprint?.screen_width}x${body.fingerprint?.screen_height}`,
            timezone: body.fingerprint?.timezone,
            languages: body.fingerprint?.languages,
            touch_points: body.fingerprint?.touch_points,
            color_depth: body.fingerprint?.color_depth,
            plugins_count: body.fingerprint?.plugins_count,
            is_webdriver: body.fingerprint?.is_webdriver,
            pow_solved: body.fingerprint?.pow_solved,
            mouse_moved: body.fingerprint?.mouse_moved,
            interaction_count: body.fingerprint?.interaction_count,
            canvas_hash: body.fingerprint?.canvas_hash,
            webgl_hash: body.fingerprint?.webgl_hash,
          },
        },
      });
    } catch (logErr) {
      console.warn("[ShieldWall] Failed to log event:", logErr);
      // Don't block user because logging failed
    }

    return new Response(JSON.stringify(swData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ShieldWall] Error:", error);
    // Fail open - don't block users if ShieldWall is down
    return new Response(JSON.stringify({ action: "pass", score: 0, error: "service_error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
