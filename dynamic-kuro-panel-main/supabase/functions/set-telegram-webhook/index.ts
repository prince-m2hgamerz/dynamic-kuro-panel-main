import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request body
    const body = await req.json();
    const { bot_id, bot_token, is_ghost_bot } = body;

    let tokenToUse: string;
    let botName = "Ghost Bot";

    // Handle ghost bot setup - use provided token or GHOST_BOT_TOKEN env
    if (is_ghost_bot) {
      tokenToUse = bot_token || Deno.env.get("GHOST_BOT_TOKEN") || "";
      if (!tokenToUse) {
        return new Response(
          JSON.stringify({ error: 'No ghost bot token available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log("Setting webhook for ghost bot");
    } 
    // Handle regular bot setup (fetch from database)
    else if (bot_id) {
      // Fetch bot configuration from database
      const { data: bot, error: fetchError } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('id', bot_id)
        .single();

      if (fetchError || !bot) {
        return new Response(
          JSON.stringify({ error: 'Bot not found', details: fetchError?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      tokenToUse = bot.bot_token;
      botName = bot.name;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either bot_id or bot_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Webhook URL - for ghost/OTP bot, use ip-manager (handles IP commands)
    const webhookUrl = is_ghost_bot 
      ? `${SUPABASE_URL}/functions/v1/ip-manager`
      : `${SUPABASE_URL}/functions/v1/telegram-bot?bot_id=${bot_id}`;

    // Set webhook on Telegram
    const setWebhookResponse = await fetch(
      `https://api.telegram.org/bot${tokenToUse}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        }),
      }
    );

    const setResult = await setWebhookResponse.json();

    if (!setResult.ok) {
      console.error("Telegram API error:", setResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to set webhook on Telegram', 
          details: setResult.description || setResult 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get webhook info to verify
    const getInfoResponse = await fetch(
      `https://api.telegram.org/bot${tokenToUse}/getWebhookInfo`
    );
    const webhookInfo = await getInfoResponse.json();

    // For regular bots, update status in database
    if (bot_id && !is_ghost_bot) {
      const { error: updateError } = await supabase
        .from('telegram_bots')
        .update({ 
          is_active: true, 
          webhook_url: webhookUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', bot_id);

      if (updateError) {
        console.error('Failed to update bot status:', updateError);
      }
    }

    console.log(`Webhook set successfully for ${botName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Webhook set successfully for ${botName}`,
        webhookUrl: webhookUrl,
        webhookInfo: webhookInfo.result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Set webhook error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
