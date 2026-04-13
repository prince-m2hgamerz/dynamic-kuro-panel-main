import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15; // attempts reset after 15 min of no fails
const BASE_LOCKOUT_MINUTES = 5; // first lockout = 5 min, then 10, 15, etc.

function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(",")[0].trim();
  return "0.0.0.0";
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const clientIp = getClientIp(req);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "check";

  try {
    if (action === "check") {
      // Check if this IP is currently locked out
      const { data, error } = await supabase
        .from("failed_auth_attempts")
        .select("*")
        .eq("ip_address", clientIp)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return json({ locked: false, attemptsLeft: MAX_ATTEMPTS });
      }

      const now = new Date();
      const lastAttempt = new Date(data.last_attempt_at);
      const diffMs = now.getTime() - lastAttempt.getTime();
      const diffMinutes = diffMs / 60000;

      // If attempts are old enough, reset them
      if (diffMinutes > LOCKOUT_WINDOW_MINUTES && data.attempt_count < MAX_ATTEMPTS) {
        await supabase.from("failed_auth_attempts").delete().eq("id", data.id);
        return json({ locked: false, attemptsLeft: MAX_ATTEMPTS });
      }

      // If at max attempts, check if lockout has expired
      if (data.attempt_count >= MAX_ATTEMPTS) {
        // Calculate lockout duration based on how many times they hit max
        // Each cycle of MAX_ATTEMPTS = 1 lockout
        const lockoutCycles = Math.floor(data.attempt_count / MAX_ATTEMPTS);
        const lockoutMinutes = BASE_LOCKOUT_MINUTES * Math.max(lockoutCycles, 1);
        const lockoutEndsAt = new Date(lastAttempt.getTime() + lockoutMinutes * 60000);

        if (now < lockoutEndsAt) {
          const remainingSeconds = Math.ceil((lockoutEndsAt.getTime() - now.getTime()) / 1000);
          return json({
            locked: true,
            remainingSeconds,
            lockoutMinutes,
            attemptsLeft: 0,
          });
        } else {
          // Lockout expired - reset attempts but keep record for escalation
          // Don't delete, just let them try again (attempt_count stays for progressive lockout)
          return json({ locked: false, attemptsLeft: MAX_ATTEMPTS });
        }
      }

      return json({
        locked: false,
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - data.attempt_count),
      });
    }

    if (action === "record-fail") {
      // Record a failed login attempt
      const { data: existing } = await supabase
        .from("failed_auth_attempts")
        .select("*")
        .eq("ip_address", clientIp)
        .maybeSingle();

      let newCount: number;
      let lockoutInfo: { locked: boolean; remainingSeconds?: number; lockoutMinutes?: number } = { locked: false };

      if (existing) {
        const now = new Date();
        const lastAttempt = new Date(existing.last_attempt_at);
        const diffMinutes = (now.getTime() - lastAttempt.getTime()) / 60000;

        // If previous lockout expired and they're trying again, continue counting from MAX_ATTEMPTS
        if (existing.attempt_count >= MAX_ATTEMPTS) {
          const lockoutCycles = Math.floor(existing.attempt_count / MAX_ATTEMPTS);
          const lockoutMinutes = BASE_LOCKOUT_MINUTES * Math.max(lockoutCycles, 1);
          const lockoutEndsAt = new Date(lastAttempt.getTime() + lockoutMinutes * 60000);
          
          if (now >= lockoutEndsAt) {
            // Lockout expired, they get fresh attempts but count continues for progressive lockout
            newCount = existing.attempt_count + 1;
          } else {
            // Still locked out
            const remainingSeconds = Math.ceil((lockoutEndsAt.getTime() - now.getTime()) / 1000);
            return json({ locked: true, remainingSeconds, lockoutMinutes, attemptsLeft: 0 });
          }
        } else if (diffMinutes > LOCKOUT_WINDOW_MINUTES) {
          // Old attempts, start fresh
          newCount = 1;
        } else {
          newCount = existing.attempt_count + 1;
        }

        await supabase
          .from("failed_auth_attempts")
          .update({ attempt_count: newCount, last_attempt_at: now.toISOString() })
          .eq("id", existing.id);

        // Check if this attempt triggers a lockout
        if (newCount >= MAX_ATTEMPTS && newCount % MAX_ATTEMPTS === 0) {
          const lockoutCycles = Math.floor(newCount / MAX_ATTEMPTS);
          const lockoutMinutes = BASE_LOCKOUT_MINUTES * lockoutCycles;
          lockoutInfo = {
            locked: true,
            remainingSeconds: lockoutMinutes * 60,
            lockoutMinutes,
          };

          // Send Telegram alert
          await sendLockoutAlert(clientIp, newCount, lockoutMinutes);
        }
      } else {
        newCount = 1;
        await supabase.from("failed_auth_attempts").insert({
          ip_address: clientIp,
          attempt_count: 1,
        });
      }

      const attemptsInCurrentCycle = newCount % MAX_ATTEMPTS || (lockoutInfo.locked ? 0 : MAX_ATTEMPTS);
      const attemptsLeft = lockoutInfo.locked ? 0 : Math.max(0, MAX_ATTEMPTS - attemptsInCurrentCycle);

      return json({ ...lockoutInfo, attemptsLeft, totalFails: newCount });
    }

    if (action === "reset") {
      // Reset on successful login — requires auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      // Delete failed attempts for this IP
      await supabase.from("failed_auth_attempts").delete().eq("ip_address", clientIp);
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Login lockout error:", err);
    return json({ error: "Internal error" }, 500);
  }
});

async function sendLockoutAlert(ip: string, totalFails: number, lockoutMinutes: number) {
  const botToken = Deno.env.get("GHOST_BOT_TOKEN");
  const chatId = Deno.env.get("GHOST_CHAT_ID");
  if (!botToken || !chatId) return;

  const time = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const message =
    `🔒 <b>Login Lockout Triggered</b>\n\n` +
    `📍 IP: <code>${ip}</code>\n` +
    `❌ Total Failed Attempts: ${totalFails}\n` +
    `⏱ Locked for: ${lockoutMinutes} minutes\n` +
    `🕐 Time: ${time} IST`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Failed to send lockout alert:", e);
  }
}
