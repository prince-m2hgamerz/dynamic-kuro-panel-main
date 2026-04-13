import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringKey {
  id: string;
  key_code: string;
  telegram_id: number;
  bot_id: string;
  expires_at: string;
  game_id: string;
  notified_24h: boolean;
  notified_6h: boolean;
  notified_1h: boolean;
}

interface BotInfo {
  bot_token: string;
  name: string;
  admin_chat_id: number;
  display_name?: string | null;
}

interface GameInfo {
  name: string;
}

type NotificationTier = '24h' | '6h' | '1h';

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      }
    );
    
    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

function formatExpiryTime(expiresAt: string): string {
  const date = new Date(expiresAt);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'expired';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getNotificationMessage(tier: NotificationTier, gameName: string, keyCode: string, timeRemaining: string, expiryFormatted: string): string {
  switch (tier) {
    case '24h':
      return `
⏰ <b>License Expiring Tomorrow!</b>

🎮 Game: <b>${gameName}</b>
🔑 Key: <code>${keyCode}</code>
📅 Expires: ${expiryFormatted}
⏳ Time Left: <b>${timeRemaining}</b>

Renew now to avoid interruption!
Use /buy to get a new license.

🙏 Thank you for using our service!
      `.trim();
    
    case '6h':
      return `
⚠️ <b>License Expiring Soon!</b>

🎮 Game: <b>${gameName}</b>
🔑 Key: <code>${keyCode}</code>
📅 Expires: ${expiryFormatted}
⏳ Time Left: <b>${timeRemaining}</b>

Don't forget to renew!
Use /buy to continue using our service.

🙏 We appreciate your support!
      `.trim();
    
    case '1h':
      return `
🚨 <b>URGENT: License Expiring!</b>

🎮 Game: <b>${gameName}</b>
🔑 Key: <code>${keyCode}</code>
📅 Expires: ${expiryFormatted}
⏳ Time Left: <b>${timeRemaining}</b>

Your license is about to expire!
Use /buy NOW to renew immediately!

⚡ Act fast to avoid service interruption!
      `.trim();
  }
}

function getAdminNotificationMessage(
  tier: NotificationTier,
  botName: string,
  gameName: string,
  keyCode: string,
  telegramId: number,
  timeRemaining: string,
  expiryFormatted: string
): string {
  return `
<b>${botName} expiry alert</b>

Tier: <b>${tier}</b>
Game: <b>${gameName}</b>
Key: <code>${keyCode}</code>
Telegram ID: <code>${telegramId}</code>
Expires: ${expiryFormatted}
Time left: <b>${timeRemaining}</b>
  `.trim();
}

function determineNotificationTier(expiresAt: string, key: ExpiringKey): NotificationTier | null {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Check for 1h notification (0-1 hours remaining)
  if (hoursRemaining <= 1 && hoursRemaining > 0 && !key.notified_1h) {
    return '1h';
  }
  
  // Check for 6h notification (1-6 hours remaining)
  if (hoursRemaining <= 6 && hoursRemaining > 1 && !key.notified_6h) {
    return '6h';
  }
  
  // Check for 24h notification (6-24 hours remaining)
  if (hoursRemaining <= 24 && hoursRemaining > 6 && !key.notified_24h) {
    return '24h';
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`Checking for keys expiring between ${now.toISOString()} and ${in24Hours.toISOString()}`);

    // Find active keys expiring in next 24 hours that might need notification
    const { data: expiringKeys, error: keysError } = await supabase
      .from('license_keys')
      .select('id, key_code, telegram_id, bot_id, expires_at, game_id, notified_24h, notified_6h, notified_1h')
      .not('telegram_id', 'is', null)
      .not('bot_id', 'is', null)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .lte('expires_at', in24Hours.toISOString());

    if (keysError) {
      console.error('Error fetching expiring keys:', keysError);
      throw keysError;
    }

    // Filter keys that need at least one notification
    const keysNeedingNotification = (expiringKeys as ExpiringKey[] || []).filter(key => {
      const tier = determineNotificationTier(key.expires_at, key);
      return tier !== null;
    });

    console.log(`Found ${keysNeedingNotification.length} keys needing notification`);

    if (keysNeedingNotification.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No keys need notification', notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique bot IDs and game IDs
    const botIds = [...new Set(keysNeedingNotification.map(k => k.bot_id))];
    const gameIds = [...new Set(keysNeedingNotification.map(k => k.game_id))];

    // Fetch bot tokens
    const { data: bots, error: botsError } = await supabase
      .from('telegram_bots')
      .select('id, bot_token, name, admin_chat_id, display_name')
      .in('id', botIds)
      .eq('is_active', true);

    if (botsError) {
      console.error('Error fetching bots:', botsError);
      throw botsError;
    }

    // Fetch game names
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, name')
      .in('id', gameIds);

    if (gamesError) {
      console.error('Error fetching games:', gamesError);
      throw gamesError;
    }

    // Create lookup maps
    const botMap = new Map<string, BotInfo>();
    bots?.forEach(bot =>
      botMap.set(bot.id, {
        bot_token: bot.bot_token,
        name: bot.name,
        admin_chat_id: Number(bot.admin_chat_id),
        display_name: bot.display_name,
      })
    );

    const gameMap = new Map<string, GameInfo>();
    games?.forEach(game => gameMap.set(game.id, { name: game.name }));

    let notifiedCount = 0;
    const failedNotifications: string[] = [];
    const notificationDetails: { tier: NotificationTier; keyId: string }[] = [];

    // Send notifications for each expiring key
    for (const key of keysNeedingNotification) {
      const bot = botMap.get(key.bot_id);
      if (!bot) {
        console.log(`Bot not found or inactive for key ${key.id}`);
        continue;
      }

      const tier = determineNotificationTier(key.expires_at, key);
      if (!tier) continue;

      const game = gameMap.get(key.game_id);
      const gameName = game?.name || 'Unknown Game';
      const timeRemaining = getTimeRemaining(key.expires_at);
      const expiryFormatted = formatExpiryTime(key.expires_at);
      const botDisplayName = bot.display_name || bot.name;

      const message = getNotificationMessage(tier, gameName, key.key_code, timeRemaining, expiryFormatted);
      const adminMessage = getAdminNotificationMessage(
        tier,
        botDisplayName,
        gameName,
        key.key_code,
        key.telegram_id,
        timeRemaining,
        expiryFormatted
      );

      const sent = await sendTelegramMessage(bot.bot_token, key.telegram_id, message);
      if (bot.admin_chat_id) {
        await sendTelegramMessage(bot.bot_token, bot.admin_chat_id, adminMessage);
      }

      if (sent) {
        // Build update object based on tier
        const updateData: Record<string, boolean> = {};
        
        // Mark current tier and all previous tiers as notified
        if (tier === '24h') {
          updateData.notified_24h = true;
        } else if (tier === '6h') {
          updateData.notified_24h = true;
          updateData.notified_6h = true;
        } else if (tier === '1h') {
          updateData.notified_24h = true;
          updateData.notified_6h = true;
          updateData.notified_1h = true;
        }

        const { error: updateError } = await supabase
          .from('license_keys')
          .update(updateData)
          .eq('id', key.id);

        if (updateError) {
          console.error(`Failed to update notification status for key ${key.id}:`, updateError);
        } else {
          notifiedCount++;
          notificationDetails.push({ tier, keyId: key.id });
          console.log(`[${tier}] Notification sent for key ${key.id} to telegram user ${key.telegram_id}`);
        }
      } else {
        failedNotifications.push(key.id);
        console.error(`Failed to send notification for key ${key.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${keysNeedingNotification.length} expiring keys`,
        notified: notifiedCount,
        failed: failedNotifications.length,
        details: notificationDetails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Key expiry check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
