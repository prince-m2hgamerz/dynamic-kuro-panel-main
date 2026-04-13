import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_CHAT_ID = 8027087942;

// Simple in-memory rate limit for alerts (prevent spam)
const alertCooldown = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per IP

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("cf-connecting-ip") 
      || req.headers.get("x-real-ip") 
      || "0.0.0.0";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if user is authenticated
    const authHeader = req.headers.get("authorization");
    let authenticatedUserId: string | null = null;
    if (authHeader) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const anonClient = createClient(supabaseUrl, anonKey);
        const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (user) {
          authenticatedUserId = user.id;
        }
      } catch {
        // Not authenticated
      }
    }

    // If authenticated, auto-register IP and always allow
    if (authenticatedUserId) {
      await supabase.rpc("register_user_ip", {
        client_ip: clientIp,
        _user_id: authenticatedUserId,
      });
      return new Response(
        JSON.stringify({ allowed: true, lockdown: true, ip: clientIp, registered: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check lockdown status for unauthenticated visitors
    const { data: lockdownResult, error } = await supabase.rpc("check_ip_lockdown", {
      client_ip: clientIp,
    });

    if (error) {
      console.error("Lockdown check error:", error);
      return new Response(
        JSON.stringify({ allowed: true, ip: clientIp }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send alert if IP was blocked
    const result = lockdownResult as { allowed?: boolean; reason?: string };
    if (result && !result.allowed) {
      await sendBlockedAlert(supabase, clientIp, result.reason || "UNKNOWN");
    }

    return new Response(
      JSON.stringify({ ...lockdownResult, ip: clientIp }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-ip error:", err);
    return new Response(
      JSON.stringify({ allowed: true, error: "check_failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

async function sendBlockedAlert(supabase: any, ip: string, reason: string) {
  // Rate limit alerts per IP (prevent spam)
  const lastAlert = alertCooldown.get(ip);
  if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
    return; // Skip - already alerted recently
  }
  alertCooldown.set(ip, Date.now());

  // GHOST_BOT_TOKEN = @Panel_otp_Telegram_Bot (the CORRECT bot)
  const botToken = Deno.env.get("GHOST_BOT_TOKEN");
  if (!botToken) return;

  const time = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const reasonText = reason === "BLACKLISTED" ? "🔨 BLACKLISTED" : "🚫 NOT WHITELISTED";

  const message = 
    `🚨 <b>Blocked Access Attempt</b>\n\n` +
    `📍 IP: <code>${ip}</code>\n` +
    `❌ Reason: ${reasonText}\n` +
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
