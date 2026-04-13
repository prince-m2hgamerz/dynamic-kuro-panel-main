import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is owner
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleData?.role !== "owner") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: List users with OTP config status (no tokens exposed)
    if (req.method === "GET" && action === "list-users") {
      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id, username, requires_otp, is_hidden, telegram_chat_id, otp_webhook_set")
        .order("username");

      if (error) throw error;

      // Return has_bot_token boolean instead of actual token
      const safeProfiles = (profiles || []).map((p: any) => ({
        ...p,
        // Query otp_bot_token existence without exposing value
      }));

      // Check which users have bot tokens configured
      const { data: tokenCheck } = await adminClient
        .from("profiles")
        .select("id, otp_bot_token")
        .in("id", (profiles || []).map((p: any) => p.id));

      const tokenMap = new Map(
        (tokenCheck || []).map((t: any) => [t.id, !!t.otp_bot_token && t.otp_bot_token.length > 0])
      );

      const result = safeProfiles.map((p: any) => ({
        ...p,
        has_bot_token: tokenMap.get(p.id) || false,
      }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Update user OTP config (bot token saved server-side)
    if (req.method === "POST" && action === "update-otp") {
      const body = await req.json();
      const { user_id, bot_token, chat_id, requires_otp } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if token changed to reset webhook
      const { data: currentProfile } = await adminClient
        .from("profiles")
        .select("otp_bot_token, otp_webhook_set")
        .eq("id", user_id)
        .maybeSingle();

      const tokenChanged = bot_token !== undefined && bot_token !== (currentProfile?.otp_bot_token || "");

      const updateData: Record<string, unknown> = {};
      if (bot_token !== undefined) updateData.otp_bot_token = bot_token;
      if (chat_id !== undefined) updateData.telegram_chat_id = chat_id;
      if (requires_otp !== undefined) updateData.requires_otp = requires_otp;
      if (tokenChanged) updateData.otp_webhook_set = false;

      const { error } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("id", user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        webhook_reset: tokenChanged,
        has_bot_token: !!(bot_token || currentProfile?.otp_bot_token),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Set webhook for user's bot (server-side, token never sent to client)
    if (req.method === "POST" && action === "set-webhook") {
      const body = await req.json();
      const { user_id } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get bot token from DB (never exposed to client)
      const { data: profile } = await adminClient
        .from("profiles")
        .select("otp_bot_token")
        .eq("id", user_id)
        .maybeSingle();

      if (!profile?.otp_bot_token) {
        return new Response(JSON.stringify({ error: "No bot token configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Set Telegram webhook
      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-otp`;
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${profile.otp_bot_token}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            url: webhookUrl,
            allowed_updates: ["message"],
          }),
        }
      );

      const telegramResult = await telegramRes.json();

      if (!telegramResult.ok) {
        return new Response(JSON.stringify({ error: "Webhook setup failed", details: telegramResult.description }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update webhook status
      await adminClient
        .from("profiles")
        .update({ otp_webhook_set: true })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghost-admin error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
