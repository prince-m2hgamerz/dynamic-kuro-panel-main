import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendOtpRequest {
  userId: string;
  ipAddress?: string;
}

interface VerifyOtpRequest {
  userId: string;
  otpCode: string;
}

// Ghost owner email constant
const GHOST_OWNER_EMAIL = "mukarramkhanking332@gmail.com";

// Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Telegram Bot API
async function sendTelegramMessage(chatId: string, message: string, customBotToken?: string): Promise<boolean> {
  const botToken = customBotToken || Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("No bot token available - neither custom nor TELEGRAM_BOT_TOKEN");
    return false;
  }

  console.log(`Sending OTP to chat_id: ${chatId} using token: ${botToken.substring(0, 10)}...`);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const result = await response.json();
    if (!result.ok) {
      console.error("Telegram API error:", JSON.stringify(result));
      return false;
    }
    console.log("OTP sent successfully to Telegram");
    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

async function handleSendOtp(supabase: SupabaseClient, body: SendOtpRequest) {
  const { userId, ipAddress = "Unknown" } = body;

  console.log(`[OTP] Starting OTP send for userId: ${userId}`);

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: "User ID required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get user email to check if ghost owner
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  
  if (userError) {
    console.error("[OTP] Error getting user:", userError);
  }

  const userEmail = userData?.user?.email?.toLowerCase();
  const isGhostOwner = userEmail === GHOST_OWNER_EMAIL.toLowerCase();
  
  console.log(`[OTP] User email: ${userEmail}, isGhostOwner: ${isGhostOwner}`);

  // Get user profile with OTP bot config
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("telegram_chat_id, username, requires_otp, otp_bot_token")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[OTP] Profile error:", profileError);
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!profile) {
    console.error("[OTP] No profile found for user");
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const profileData = profile as { 
    telegram_chat_id: string | null; 
    username: string; 
    requires_otp: boolean;
    otp_bot_token: string | null;
  };

  console.log(`[OTP] Profile data - chat_id: ${profileData.telegram_chat_id}, otp_bot_token: ${profileData.otp_bot_token ? 'set' : 'null'}`);

  // Determine target chat ID and bot token
  let targetChatId: string | null = null;
  let customBotToken: string | undefined;

  // Priority system for ghost owner:
  // 1. Profile's telegram_chat_id (if set via Ghost Panel)
  // 2. GHOST_CHAT_ID environment variable
  if (isGhostOwner) {
    // For ghost owner: Use profile chat_id OR env variable
    targetChatId = profileData.telegram_chat_id || Deno.env.get("GHOST_CHAT_ID") || null;
    customBotToken = profileData.otp_bot_token || Deno.env.get("GHOST_BOT_TOKEN") || undefined;
    console.log(`[OTP] Ghost owner - targetChatId: ${targetChatId}, botToken from: ${profileData.otp_bot_token ? 'profile' : 'env'}`);
  } else {
    // For regular users: Use profile's settings
    targetChatId = profileData.telegram_chat_id;
    customBotToken = profileData.otp_bot_token || undefined;
    console.log(`[OTP] Regular user - targetChatId: ${targetChatId}, botToken: ${customBotToken ? 'profile' : 'default'}`);
  }

  // Final fallback: Try server_settings for bot token
  if (!customBotToken) {
    try {
      const { data: ghostConfig } = await supabase
        .from("server_settings")
        .select("value")
        .eq("key", "ghost_bot_config")
        .maybeSingle();
      
      if (ghostConfig?.value) {
        const config = ghostConfig.value as { bot_token?: string };
        if (config.bot_token) {
          customBotToken = config.bot_token;
          console.log("[OTP] Using bot token from server_settings");
        }
      }
    } catch (e) {
      console.log("[OTP] No server_settings bot config found");
    }
  }

  if (!targetChatId) {
    console.error("[OTP] No chat ID configured");
    return new Response(
      JSON.stringify({ success: false, error: "Telegram Chat ID not configured. Contact admin or set it in Ghost Panel." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check rate limiting - only 1 OTP per 60 seconds
  const { data: recentOtp } = await supabase
    .from("owner_otp_codes")
    .select("created_at")
    .eq("user_id", userId)
    .eq("used", false)
    .gte("created_at", new Date(Date.now() - 60000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentOtp) {
    const otpData = recentOtp as { created_at: string };
    const waitTime = Math.ceil((60000 - (Date.now() - new Date(otpData.created_at).getTime())) / 1000);
    return new Response(
      JSON.stringify({ success: false, error: `Please wait ${waitTime} seconds before requesting another OTP` }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Generate OTP
  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  console.log(`[OTP] Generated OTP: ${otpCode}, expires: ${expiresAt.toISOString()}`);

  // Mark old OTPs as used
  await supabase
    .from("owner_otp_codes")
    .update({ used: true } as never)
    .eq("user_id", userId)
    .eq("used", false);

  // Save new OTP
  const { error: insertError } = await supabase
    .from("owner_otp_codes")
    .insert({
      user_id: userId,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString(),
    } as never);

  if (insertError) {
    console.error("[OTP] Failed to save OTP:", insertError);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to generate OTP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Send OTP via Telegram with IP address
  const loginTime = new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  
  const message = `🔐 <b>Sarkar PVT Panel - Login OTP</b>\n\n` +
    `Your verification code is:\n\n` +
    `<code>${otpCode}</code>\n\n` +
    `📍 <b>Login Attempt Details:</b>\n` +
    `• IP Address: <code>${ipAddress}</code>\n` +
    `• Time: ${loginTime} IST\n\n` +
    `⏱ Valid for 5 minutes\n` +
    `⚠️ Do not share this code with anyone!\n` +
    `⚠️ If this wasn't you, change your password immediately!`;

  const sent = await sendTelegramMessage(targetChatId, message, customBotToken);

  if (!sent) {
    console.error("[OTP] Failed to send Telegram message");
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send OTP via Telegram. Check bot token and chat ID configuration." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[OTP] OTP sent successfully");
  return new Response(
    JSON.stringify({ success: true, message: "OTP sent to your Telegram" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyOtp(supabase: SupabaseClient, body: VerifyOtpRequest) {
  const { userId, otpCode } = body;

  console.log(`[OTP Verify] Verifying OTP for userId: ${userId}`);

  if (!userId || !otpCode) {
    return new Response(
      JSON.stringify({ success: false, error: "User ID and OTP code required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find valid OTP
  const { data: otp, error: otpError } = await supabase
    .from("owner_otp_codes")
    .select("*")
    .eq("user_id", userId)
    .eq("otp_code", otpCode)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpError || !otp) {
    console.log(`[OTP Verify] Invalid or expired OTP for user ${userId}`);
    return new Response(
      JSON.stringify({ success: false, error: "Invalid or expired OTP" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const otpData = otp as { id: string };

  // Mark OTP as used
  await supabase
    .from("owner_otp_codes")
    .update({ used: true } as never)
    .eq("id", otpData.id);

  console.log(`[OTP Verify] OTP verified successfully for user ${userId}`);
  return new Response(
    JSON.stringify({ success: true, message: "OTP verified successfully" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user token explicitly (verify_jwt is disabled for ES256 tokens)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error("[OTP] Invalid JWT:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authedUserId = authData.user.id;

    const body = await req.json();
    if (!body?.userId || body.userId !== authedUserId) {
      return new Response(
        JSON.stringify({ error: "User mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role key
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (path) {
      case "send":
        return await handleSendOtp(supabase, body);
      case "verify":
        return await handleVerifyOtp(supabase, body);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
