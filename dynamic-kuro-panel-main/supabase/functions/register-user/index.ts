import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FAILED_ATTEMPTS = 3;
const BLOCK_DURATION_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get client IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "0.0.0.0";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Step 0: Check if this IP is currently blocked
    const { data: attemptRecord } = await supabase
      .from("failed_registration_attempts")
      .select("attempt_count, blocked_until, last_attempt_at")
      .eq("ip_address", clientIp)
      .maybeSingle();

    if (attemptRecord?.blocked_until) {
      const blockedUntil = new Date(attemptRecord.blocked_until);
      if (blockedUntil > new Date()) {
        const remainingMs = blockedUntil.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        console.log(`[REGISTER] IP ${clientIp} blocked until ${blockedUntil.toISOString()}`);
        return new Response(
          JSON.stringify({
            error: "Too many failed attempts. Try again later.",
            blocked: true,
            blocked_until: blockedUntil.toISOString(),
            remaining_minutes: remainingMin,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Block expired, reset the record
        await supabase
          .from("failed_registration_attempts")
          .delete()
          .eq("ip_address", clientIp);
      }
    }

    const { email, password, username, referralCode } = await req.json();

    // Input validation
    if (!email || !password || !username || !referralCode) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof username !== "string" || typeof referralCode !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid input types" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return new Response(
        JSON.stringify({ error: "Username must be 3-20 chars, letters/numbers/underscores only" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Validate referral code SERVER-SIDE
    const { data: codeData, error: codeError } = await supabase
      .from("referral_codes")
      .select("id, code, created_by, max_uses, times_used, expires_at, initial_balance, assigned_role, is_active")
      .eq("code", referralCode.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (codeError || !codeData) {
      // FAILED ATTEMPT - track it
      await trackFailedAttempt(supabase, clientIp);

      // Re-check if now blocked after this attempt
      const { data: updatedRecord } = await supabase
        .from("failed_registration_attempts")
        .select("attempt_count, blocked_until")
        .eq("ip_address", clientIp)
        .maybeSingle();

      if (updatedRecord?.blocked_until && new Date(updatedRecord.blocked_until) > new Date()) {
        const remainingMin = Math.ceil((new Date(updatedRecord.blocked_until).getTime() - Date.now()) / 60000);
        return new Response(
          JSON.stringify({
            error: "Too many failed attempts. You are blocked for 30 minutes.",
            blocked: true,
            blocked_until: updatedRecord.blocked_until,
            remaining_minutes: remainingMin,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const attemptsLeft = MAX_FAILED_ATTEMPTS - (updatedRecord?.attempt_count || 0);
      return new Response(
        JSON.stringify({
          error: `Invalid or inactive referral code. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : ""}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (codeData.times_used >= (codeData.max_uses || 10)) {
      await trackFailedAttempt(supabase, clientIp);
      return new Response(
        JSON.stringify({ error: "Referral code has reached maximum usage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      await trackFailedAttempt(supabase, clientIp);
      return new Response(
        JSON.stringify({ error: "Referral code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valid referral code - clear any failed attempts for this IP
    await supabase
      .from("failed_registration_attempts")
      .delete()
      .eq("ip_address", clientIp);

    // Step 2: Check username uniqueness
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.trim())
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Username already taken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Create auth user using admin API (bypasses disabled signups)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        username: username.trim(),
        referral_code: referralCode.trim(),
        invited_by: codeData.created_by,
      },
    });

    if (authError) {
      console.error("Auth create error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Increment referral usage
    await supabase.rpc("increment_referral_usage", { code_id: codeData.id });

    // Step 5: Inherit panel_name from referrer
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("panel_name")
      .eq("id", codeData.created_by)
      .maybeSingle();

    if (referrerProfile?.panel_name) {
      await supabase
        .from("profiles")
        .update({ panel_name: referrerProfile.panel_name })
        .eq("id", authData.user.id);
    }

    // Step 6: CRITICAL - Force correct role and balance from referral code
    // The handle_new_user trigger may race and set wrong values, so we override here
    const correctRole = codeData.assigned_role || "reseller";
    const correctBalance = codeData.initial_balance || 0;

    // Force update balance on the profile
    await supabase
      .from("profiles")
      .update({ balance: correctBalance, referral_applied: true })
      .eq("id", authData.user.id);

    // Force update role - delete any existing and insert correct one
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", authData.user.id);

    await supabase
      .from("user_roles")
      .insert({ user_id: authData.user.id, role: correctRole });

    console.log(`[REGISTER] User ${username} registered with role=${correctRole} balance=${correctBalance} from IP ${clientIp}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account created successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function trackFailedAttempt(supabase: any, ip: string) {
  try {
    // Upsert: increment attempt count or create new record
    const { data: existing } = await supabase
      .from("failed_registration_attempts")
      .select("attempt_count")
      .eq("ip_address", ip)
      .maybeSingle();

    const newCount = (existing?.attempt_count || 0) + 1;
    const blockedUntil = newCount >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + BLOCK_DURATION_MINUTES * 60_000).toISOString()
      : null;

    if (existing) {
      await supabase
        .from("failed_registration_attempts")
        .update({
          attempt_count: newCount,
          last_attempt_at: new Date().toISOString(),
          blocked_until: blockedUntil,
        })
        .eq("ip_address", ip);
    } else {
      await supabase
        .from("failed_registration_attempts")
        .insert({
          ip_address: ip,
          attempt_count: 1,
          blocked_until: blockedUntil,
        });
    }

    if (blockedUntil) {
      console.log(`[REGISTER] IP ${ip} BLOCKED for ${BLOCK_DURATION_MINUTES} min after ${newCount} failed attempts`);
      // Log security event
      await supabase.rpc("log_security_event", {
        _event_type: "REGISTRATION_IP_BLOCKED",
        _ip_address: ip,
        _details: { attempt_count: newCount, block_duration_minutes: BLOCK_DURATION_MINUTES },
      });
    }
  } catch (err) {
    console.error("[REGISTER] Failed to track attempt:", err);
  }
}
