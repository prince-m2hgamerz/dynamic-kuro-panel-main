import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let triggeredBy = "system";

    // Check for internal secret header (server-to-server / admin trigger)
    const internalSecret = req.headers.get("x-internal-secret");
    const edgeSecret = Deno.env.get("EDGE_WAF_HMAC_SECRET");

    if (internalSecret && edgeSecret && internalSecret === edgeSecret) {
      triggeredBy = "internal_admin";
    } else {
      // Standard auth check — only owner/co_owner can trigger
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(supabaseUrl, serviceRoleKey);
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabaseAuth
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || !["owner", "co_owner"].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: "Forbidden — owner only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      triggeredBy = user.id;
    }

    // Broadcast force-refresh to all connected clients via Realtime
    // Using the Supabase Realtime broadcast API
    const realtimeRes = await fetch(
      `${supabaseUrl}/realtime/v1/api/broadcast`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              topic: `realtime:global-force-refresh`,
              event: "broadcast",
              payload: {
                type: "broadcast",
                event: "force-refresh",
                payload: {
                  triggered_by: triggeredBy,
                  timestamp: new Date().toISOString(),
                },
              },
            },
          ],
        }),
      }
    );

    if (!realtimeRes.ok) {
      const errText = await realtimeRes.text();
      console.error("Realtime broadcast failed:", errText);
      return new Response(
        JSON.stringify({ error: "Broadcast failed", details: errText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the action
    const supabaseLog = createClient(supabaseUrl, serviceRoleKey);
    await supabaseLog.rpc("log_security_event", {
      _event_type: "FORCE_REFRESH",
      _details: { action: "force_refresh_all_users", triggered_by: triggeredBy },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Force refresh broadcast sent to all users" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Force refresh error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
