import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client for verifying the caller (uses user's Authorization header)
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged writes
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Ensure profile exists
    const { data: existingProfile, error: profileReadError } = await adminClient
      .from("profiles")
      .select("id, referral_applied")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError) {
      throw profileReadError;
    }

    if (!existingProfile) {
      const metaUsername = (user.user_metadata as Record<string, unknown> | null)?.["username"];
      const username =
        (typeof metaUsername === "string" && metaUsername.trim())
          ? metaUsername.trim()
          : (user.email ? user.email.split("@")[0] : "user");

      const invitedByRaw = (user.user_metadata as Record<string, unknown> | null)?.["invited_by"];
      const invited_by = typeof invitedByRaw === "string" && invitedByRaw.length > 0 ? invitedByRaw : null;

      // Look up referral code for initial balance & role
      const referralCodeRaw = (user.user_metadata as Record<string, unknown> | null)?.["referral_code"];
      const refCode = typeof referralCodeRaw === "string" && referralCodeRaw.trim() ? referralCodeRaw.trim() : null;

      let initialBalance = 0;
      let assignedRole = "reseller";

      if (refCode) {
        const { data: codeRow } = await adminClient
          .from("referral_codes")
          .select("initial_balance, assigned_role")
          .eq("code", refCode)
          .maybeSingle();

        if (codeRow) {
          initialBalance = codeRow.initial_balance ?? 0;
          assignedRole = codeRow.assigned_role ?? "reseller";
        }
      }

      const { error: profileInsertError } = await adminClient.from("profiles").insert({
        id: user.id,
        username,
        invited_by,
        balance: initialBalance,
        status: "active",
        referral_applied: false,
      });

      if (profileInsertError) {
        throw profileInsertError;
      }

      // Also ensure the correct role is set based on referral code
      const { data: existingRoleCheck } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingRoleCheck) {
        await adminClient.from("user_roles").insert({
          user_id: user.id,
          role: assignedRole,
        });
      }
    }

    // 2) Ensure role exists (default reseller)
    const { data: existingRole, error: roleReadError } = await adminClient
      .from("user_roles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleReadError) {
      throw roleReadError;
    }

    if (!existingRole) {
      const { error: roleInsertError } = await adminClient.from("user_roles").insert({
        user_id: user.id,
        role: "reseller",
      });

      if (roleInsertError) {
        throw roleInsertError;
      }
    }

    // 3) Apply referral usage ONCE (if present)
    const { data: currentProfile } = await adminClient
      .from("profiles")
      .select("id, referral_applied")
      .eq("id", user.id)
      .maybeSingle();

    const referralCodeRaw = (user.user_metadata as Record<string, unknown> | null)?.["referral_code"];
    const referral_code = typeof referralCodeRaw === "string" && referralCodeRaw.trim() ? referralCodeRaw.trim() : null;

    if (referral_code && currentProfile && currentProfile.referral_applied === false) {
      const { data: codeRow } = await adminClient
        .from("referral_codes")
        .select("id, times_used, max_uses")
        .eq("code", referral_code)
        .maybeSingle();

      if (codeRow?.id) {
        // increment usage (security definer RPC)
        await adminClient.rpc("increment_referral_usage", { code_id: codeRow.id });

        // mark applied
        await adminClient
          .from("profiles")
          .update({ referral_applied: true })
          .eq("id", user.id);

        // If exhausted now, disable code
        const { data: codeAfter } = await adminClient
          .from("referral_codes")
          .select("times_used, max_uses")
          .eq("id", codeRow.id)
          .maybeSingle();

        if (codeAfter && codeAfter.times_used >= codeAfter.max_uses) {
          await adminClient.from("referral_codes").update({ is_active: false }).eq("id", codeRow.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ensure-profile error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
