import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePackageName(packageName: string) {
  return packageName.trim().toLowerCase();
}

function isValidJavaPackageName(packageName: string) {
  return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName);
}

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
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return errorResponse("Unauthorized", 401);
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return errorResponse("Invalid auth token", 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const callerRole = roleData?.role || "user";
    const isPrivileged = ["owner", "co_owner", "admin"].includes(callerRole);
    const isOwnerLevel = ["owner", "co_owner"].includes(callerRole);

    // Get caller email for ghost owner checks
    const getCallerEmail = async () => {
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
      return authUser?.email;
    };

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      // ==================== ADD BALANCE ====================
      case "add_balance": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { target_user_id, amount } = params;
        if (!target_user_id || typeof amount !== "number" || amount <= 0 || amount > 99999999) {
          return errorResponse("Invalid parameters", 400);
        }
        const { data: profile } = await supabase.from("profiles").select("balance, username").eq("id", target_user_id).maybeSingle();
        if (!profile) return errorResponse("User not found", 404);
        const newBalance = (profile.balance || 0) + amount;
        const { error } = await supabase.from("profiles").update({ balance: newBalance }).eq("id", target_user_id);
        if (error) return errorResponse(error.message, 500);
        await supabase.from("audit_logs").insert({ action: "add_balance", user_id: user.id, entity_type: "profile", entity_id: target_user_id, details: { amount, new_balance: newBalance, target_username: profile.username } });
        return successResponse({ new_balance: newBalance, username: profile.username });
      }

      // ==================== UPDATE USER STATUS ====================
      case "update_user_status": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { target_user_id: statusUserId, status } = params;
        if (!statusUserId || !["active", "banned", "suspended"].includes(status)) return errorResponse("Invalid parameters", 400);
        const { data: targetRole } = await supabase.from("user_roles").select("role").eq("user_id", statusUserId).maybeSingle();
        if (targetRole?.role === "owner" || targetRole?.role === "co_owner") {
          const email = await getCallerEmail();
          if (email !== "mukarramkhanking332@gmail.com") return errorResponse("Only the primary owner can modify owner/co-owner status", 403);
        }
        const { error } = await supabase.from("profiles").update({ status }).eq("id", statusUserId);
        if (error) return errorResponse(error.message, 500);
        await supabase.from("audit_logs").insert({ action: "update_user_status", user_id: user.id, entity_type: "profile", entity_id: statusUserId, details: { new_status: status } });
        return successResponse({ success: true });
      }

      // ==================== GENERATE KEYS ====================
      case "generate_keys": {
        const { game_id, duration_hours, keys, max_devices, package_restricted = false } = params;
        if (!game_id || !duration_hours || !keys?.length || !max_devices) return errorResponse("Invalid parameters", 400);
        const { data: priceRow } = await supabase.from("price_settings").select("price").eq("game_id", game_id).eq("duration_hours", duration_hours).is("bot_id", null).maybeSingle();
        const pricePerKey = priceRow?.price || 0;
        const totalPrice = pricePerKey * keys.length;
        if (callerRole !== "owner" && callerRole !== "co_owner") {
          const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
          if (!profile || (profile.balance || 0) < totalPrice) return errorResponse(`Insufficient balance. Need ₹${totalPrice.toFixed(2)}`, 400);
          const { error: balError } = await supabase.from("profiles").update({ balance: (profile.balance || 0) - totalPrice }).eq("id", user.id);
          if (balError) return errorResponse("Failed to deduct balance", 500);
        }
        const keyRecords = keys.map((keyCode: string) => ({
          key_code: keyCode,
          game_id,
          created_by: user.id,
          duration_hours,
          max_devices,
          price: pricePerKey,
          package_restricted: !!package_restricted,
        }));
        const { error: insertError } = await supabase.from("license_keys").insert(keyRecords);
        if (insertError) {
          if (callerRole !== "owner" && callerRole !== "co_owner") {
            const { data: cp } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
            if (cp) await supabase.from("profiles").update({ balance: (cp.balance || 0) + totalPrice }).eq("id", user.id);
          }
          return errorResponse(insertError.message, 500);
        }
        return successResponse({ success: true, keys_generated: keys.length });
      }

      // ==================== APPROVED PACKAGE MANAGEMENT ====================
      case "create_package": {
        const rawPackageName = typeof params.package_name === "string" ? params.package_name : "";
        const packageName = normalizePackageName(rawPackageName);
        if (!packageName || !isValidJavaPackageName(packageName)) {
          return errorResponse("Invalid Java package name", 400);
        }

        const { error } = await supabase.from("approved_packages").insert({
          package_name: packageName,
          created_by: user.id,
        });
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true, package_name: packageName });
      }
      case "toggle_package_status": {
        const { package_id, is_active } = params;
        if (!package_id || typeof is_active !== "boolean") return errorResponse("Invalid parameters", 400);
        const { error } = await supabase.from("approved_packages").update({ is_active }).eq("id", package_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "delete_package": {
        const { package_id } = params;
        if (!package_id) return errorResponse("Package ID required", 400);
        const { error } = await supabase.from("approved_packages").delete().eq("id", package_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== KEY STATUS UPDATE (single) ====================
      case "update_key_status": {
        const { key_id, status } = params;
        if (!key_id || !["active", "paused", "expired", "revoked"].includes(status)) return errorResponse("Invalid parameters", 400);
        // Users can update own keys, admins can update all
        const query = supabase.from("license_keys").update({ status }).eq("id", key_id);
        if (!isPrivileged) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== PAUSE ALL KEYS ====================
      case "pause_all_keys": {
        const query = supabase.from("license_keys").update({ status: "paused" }).eq("status", "active");
        if (!isPrivileged) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== UNPAUSE ALL KEYS ====================
      case "unpause_all_keys": {
        const query = supabase.from("license_keys").update({ status: "active" }).eq("status", "paused");
        if (!isPrivileged) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== DELETE KEY (single) ====================
      case "delete_key": {
        const { key_id } = params;
        if (!key_id) return errorResponse("Key ID required", 400);
        const query = supabase.from("license_keys").delete().eq("id", key_id);
        if (!isPrivileged) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== EXTEND KEY ====================
      case "extend_key": {
        const { key_id, hours } = params;
        if (!key_id || !hours) return errorResponse("Invalid parameters", 400);
        // Get current key
        const { data: keyData } = await supabase.from("license_keys").select("id, expires_at, created_by").eq("id", key_id).maybeSingle();
        if (!keyData) return errorResponse("Key not found", 404);
        if (!isPrivileged && keyData.created_by !== user.id) return errorResponse("Permission denied", 403);
        const currentExpiry = keyData.expires_at ? new Date(keyData.expires_at) : new Date();
        const newExpiry = new Date(currentExpiry.getTime() + parseInt(hours) * 60 * 60 * 1000);
        const { error } = await supabase.from("license_keys").update({ expires_at: newExpiry.toISOString(), status: "active" }).eq("id", key_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== EXTEND ALL ACTIVE KEYS ====================
      case "extend_all_keys": {
        const { hours } = params;
        if (!hours) return errorResponse("Hours required", 400);
        let query = supabase.from("license_keys").select("id, expires_at").eq("status", "active").not("expires_at", "is", null);
        if (!isPrivileged) query = query.eq("created_by", user.id);
        const { data: activeKeys } = await query;
        if (activeKeys) {
          for (const key of activeKeys) {
            const cur = new Date(key.expires_at!);
            const newExp = new Date(cur.getTime() + parseInt(hours) * 60 * 60 * 1000);
            await supabase.from("license_keys").update({ expires_at: newExp.toISOString() }).eq("id", key.id);
          }
        }
        return successResponse({ success: true, extended: activeKeys?.length || 0 });
      }

      // ==================== RESET KEY DEVICES ====================
      case "reset_key_devices": {
        const { key_id } = params;
        if (!key_id) return errorResponse("Key ID required", 400);
        // Verify ownership
        if (!isPrivileged) {
          const { data: k } = await supabase.from("license_keys").select("created_by").eq("id", key_id).maybeSingle();
          if (!k || k.created_by !== user.id) return errorResponse("Permission denied", 403);
        }
        const { error } = await supabase.from("key_activations").delete().eq("key_id", key_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== RESET ALL DEVICES ====================
      case "reset_all_devices": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { error } = await supabase.from("key_activations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== DELETE EXPIRED KEYS ====================
      case "clear_expired_keys": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { error } = await supabase.from("license_keys").delete().eq("status", "expired");
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== CLEAR REVOKED KEYS ====================
      case "clear_revoked_keys": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { error } = await supabase.from("license_keys").delete().eq("status", "revoked");
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== CLEAR AUDIT LOGS ====================
      case "clear_audit_logs": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { error } = await supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== DELETE GAME ====================
      case "delete_game": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { game_id: delGameId } = params;
        if (!delGameId) return errorResponse("Game ID required", 400);
        const { data: game } = await supabase.from("games").select("icon_url").eq("id", delGameId).maybeSingle();
        await supabase.from("license_keys").delete().eq("game_id", delGameId);
        await supabase.from("price_settings").delete().eq("game_id", delGameId);
        const { error } = await supabase.from("games").delete().eq("id", delGameId);
        if (error) return errorResponse(error.message, 500);
        if (game?.icon_url) {
          const fileName = game.icon_url.split("/").pop();
          if (fileName) await supabase.storage.from("game-icons").remove([fileName]);
        }
        return successResponse({ success: true });
      }

      // ==================== PRICE MANAGEMENT ====================
      case "get_prices": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { data, error } = await supabase.from("price_settings").select("id, bot_id, game_id, duration_hours, price").order("duration_hours");
        if (error) return errorResponse(error.message, 500);
        return successResponse({ prices: data || [] });
      }
      case "add_price": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { bot_id: pBotId, game_id: pGameId, duration_hours: pDuration, price: pPrice } = params;
        if (!pBotId || !pGameId || !pDuration || typeof pPrice !== "number") return errorResponse("Invalid parameters", 400);
        const { error } = await supabase.from("price_settings").insert({ bot_id: pBotId, game_id: pGameId, duration_hours: pDuration, price: pPrice });
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "update_price": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { price_id, price: newPrice } = params;
        if (!price_id || typeof newPrice !== "number") return errorResponse("Invalid parameters", 400);
        const { error } = await supabase.from("price_settings").update({ price: newPrice }).eq("id", price_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "delete_price": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { price_id: delPriceId } = params;
        if (!delPriceId) return errorResponse("Price ID required", 400);
        const { error } = await supabase.from("price_settings").delete().eq("id", delPriceId);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== REFERRAL CODES ====================
      case "create_referral": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { code, max_uses, initial_balance, expires_at, assigned_role } = params;
        if (!code) return errorResponse("Code required", 400);
        // Admin can only create reseller referrals
        const roleToAssign = callerRole === "admin" ? "reseller" : (assigned_role || "reseller");
        // Only owner/co_owner can create non-reseller referrals
        if (roleToAssign !== "reseller" && !isOwnerLevel) return errorResponse("Only owners can assign non-reseller roles", 403);
        const { error } = await supabase.from("referral_codes").insert({
          code, created_by: user.id, max_uses: max_uses || 10,
          initial_balance: initial_balance || 0, expires_at: expires_at || null,
          assigned_role: roleToAssign,
        });
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "delete_referral": {
        const { referral_id } = params;
        if (!referral_id) return errorResponse("Referral ID required", 400);
        const query = supabase.from("referral_codes").delete().eq("id", referral_id);
        if (!isPrivileged) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== SERVER SETTINGS ====================
      case "save_server_settings": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { settings } = params;
        if (!settings || typeof settings !== "object") return errorResponse("Invalid settings", 400);
        for (const [key, value] of Object.entries(settings)) {
          await supabase.from("server_settings").upsert({ key, value, updated_by: user.id }, { onConflict: "key" });
        }
        return successResponse({ success: true });
      }

      // ==================== MAINTENANCE ACCESS ====================
      case "grant_maintenance_access": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { target_user_id } = params;
        if (!target_user_id) return errorResponse("User ID required", 400);
        const { error } = await supabase.from("maintenance_access").insert({ user_id: target_user_id, granted_by: user.id });
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "revoke_maintenance_access": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { access_id } = params;
        if (!access_id) return errorResponse("Access ID required", 400);
        const { error } = await supabase.from("maintenance_access").delete().eq("id", access_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== BOT MANAGEMENT ====================
      case "create_bot": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { name, bot_token, admin_chat_id, upi_id, upi_name, contact_url, display_name } = params;
        if (!name || !bot_token || !admin_chat_id || !upi_id || !upi_name) return errorResponse("Missing required fields", 400);
        const { error } = await supabase.from("telegram_bots").insert({
          name,
          bot_token,
          admin_chat_id: parseInt(admin_chat_id),
          upi_id,
          upi_name,
          contact_url: contact_url || null,
          display_name: display_name || null,
        });
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "update_bot": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { bot_id, ...botData } = params;
        if (!bot_id) return errorResponse("Bot ID required", 400);
        if (botData.admin_chat_id) botData.admin_chat_id = parseInt(botData.admin_chat_id);
        if ("display_name" in botData && !botData.display_name) botData.display_name = null;
        if ("contact_url" in botData && !botData.contact_url) botData.contact_url = null;
        const { error } = await supabase.from("telegram_bots").update(botData).eq("id", bot_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "delete_bot": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { bot_id } = params;
        if (!bot_id) return errorResponse("Bot ID required", 400);
        const { error } = await supabase.from("telegram_bots").delete().eq("id", bot_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== LICENSE MANAGEMENT ====================
      case "add_license": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { license_key, description, is_active } = params;
        if (!license_key || license_key.length < 16) return errorResponse("Invalid license key", 400);
        const { error } = await supabase.from("panel_licenses").insert({ license_key, description: description || null, is_active: is_active ?? true, created_by: user.id });
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "toggle_license": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { license_id, is_active } = params;
        if (!license_id) return errorResponse("License ID required", 400);
        const { error } = await supabase.from("panel_licenses").update({ is_active }).eq("id", license_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "delete_license": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { license_id } = params;
        if (!license_id) return errorResponse("License ID required", 400);
        const { error } = await supabase.from("panel_licenses").delete().eq("id", license_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== SONGS MANAGEMENT ====================
      case "toggle_song": {
        const { song_id, is_active } = params;
        if (!song_id) return errorResponse("Song ID required", 400);
        const query = supabase.from("songs").update({ is_active }).eq("id", song_id);
        if (!isOwnerLevel) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "delete_song": {
        const { song_id } = params;
        if (!song_id) return errorResponse("Song ID required", 400);
        const query = supabase.from("songs").delete().eq("id", song_id);
        if (!isOwnerLevel) query.eq("created_by", user.id);
        const { error } = await query;
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== GHOST PANEL OPS ====================
      case "toggle_otp_required": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { target_user_id, requires_otp } = params;
        if (!target_user_id) return errorResponse("User ID required", 400);
        const { error } = await supabase.from("profiles").update({ requires_otp }).eq("id", target_user_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "toggle_hidden": {
        if (!isOwnerLevel) return errorResponse("Permission denied", 403);
        const { target_user_id, is_hidden } = params;
        if (!target_user_id) return errorResponse("User ID required", 400);
        const { error } = await supabase.from("profiles").update({ is_hidden }).eq("id", target_user_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "change_role": {
        const email = await getCallerEmail();
        if (email !== "mukarramkhanking332@gmail.com") return errorResponse("Only ghost owner can change roles", 403);
        const { target_user_id, new_role } = params;
        if (!target_user_id || !new_role) return errorResponse("Invalid parameters", 400);
        const { error } = await supabase.from("user_roles").update({ role: new_role }).eq("user_id", target_user_id);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }

      // ==================== GAME MANAGEMENT (server-side) ====================
      case "add_game": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { name: gName, mod_name: gModName, status: gStatus, icon_url: gIconUrl } = params;
        if (!gName || typeof gName !== "string" || gName.trim().length === 0) return errorResponse("Game name required", 400);
        const { data: newGame, error } = await supabase.from("games").insert({
          name: gName.trim(),
          mod_name: gModName?.trim() || null,
          status: gStatus || "active",
          icon_url: gIconUrl || null,
          created_by: user.id,
        }).select().single();
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true, game: newGame });
      }
      case "update_game": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { game_id: ugId, name: ugName, mod_name: ugModName, status: ugStatus, icon_url: ugIconUrl } = params;
        if (!ugId) return errorResponse("Game ID required", 400);
        if (!ugName || typeof ugName !== "string" || ugName.trim().length === 0) return errorResponse("Game name required", 400);
        const updateData: Record<string, unknown> = {
          name: ugName.trim(),
          mod_name: ugModName?.trim() || null,
          status: ugStatus || "active",
        };
        if (ugIconUrl !== undefined) updateData.icon_url = ugIconUrl;
        const { error } = await supabase.from("games").update(updateData).eq("id", ugId);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "toggle_game_status": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { game_id: tgId, new_status: tgStatus } = params;
        if (!tgId || !["active", "inactive", "maintenance"].includes(tgStatus)) return errorResponse("Invalid parameters", 400);
        const { error } = await supabase.from("games").update({ status: tgStatus }).eq("id", tgId);
        if (error) return errorResponse(error.message, 500);
        return successResponse({ success: true });
      }
      case "remove_game_icon": {
        if (!isPrivileged) return errorResponse("Permission denied", 403);
        const { game_id: riId, icon_file_name } = params;
        if (!riId) return errorResponse("Game ID required", 400);
        const { error } = await supabase.from("games").update({ icon_url: null }).eq("id", riId);
        if (error) return errorResponse(error.message, 500);
        if (icon_file_name) {
          await supabase.storage.from("game-icons").remove([icon_file_name]);
        }
        return successResponse({ success: true });
      }

      default:
        return errorResponse("Unknown action", 400);
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function successResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
