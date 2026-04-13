import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bot configuration interface
interface BotConfig {
  id: string;
  bot_token: string;
  admin_chat_id: number;
  upi_id: string;
  upi_name: string;
  contact_url?: string;
  display_name?: string;
}

interface PriceSetting {
  duration_hours: number;
  price: number;
}

// Types
interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// Generate license key (same format as frontend)
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 4;
  const segmentLength = 4;
  const keyParts: string[] = [];
  
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    keyParts.push(segment);
  }
  
  return keyParts.join('-');
}

// Fetch prices from database (dynamic pricing per bot)
async function getUserPrices(supabase: SupabaseClient, botId: string): Promise<Record<string, number>> {
  // First try to get bot-specific prices
  const { data: prices } = await supabase
    .from('price_settings')
    .select('duration_hours, price')
    .eq('bot_id', botId)
    .order('duration_hours', { ascending: true });
  
  if (prices && prices.length > 0) {
    const priceMap: Record<string, number> = {};
    prices.forEach((p: PriceSetting) => {
      priceMap[p.duration_hours.toString()] = p.price;
    });
    return priceMap;
  }
  
  // Fallback: Try global prices (where bot_id is null)
  const { data: globalPrices } = await supabase
    .from('price_settings')
    .select('duration_hours, price')
    .is('bot_id', null)
    .order('duration_hours', { ascending: true });
  
  if (globalPrices && globalPrices.length > 0) {
    const priceMap: Record<string, number> = {};
    globalPrices.forEach((p: PriceSetting) => {
      priceMap[p.duration_hours.toString()] = p.price;
    });
    return priceMap;
  }
  
  // Default fallback prices (in hours)
  return { "24": 30, "72": 80, "168": 170, "720": 500 };
}

// Format duration for display
function formatDuration(hours: number): string {
  if (hours < 24) return `${hours} Hour${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} Day${days > 1 ? 's' : ''}`;
}

// Get bot configuration from database
async function getBotConfig(supabase: SupabaseClient, botId: string): Promise<BotConfig | null> {
  const { data, error } = await supabase
    .from('telegram_bots')
    .select('id, bot_token, admin_chat_id, upi_id, upi_name, contact_url, display_name')
    .eq('id', botId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Failed to get bot config:', error);
    return null;
  }

  // Fix BigInt issue - ensure admin_chat_id is a proper number
  return {
    ...data,
    admin_chat_id: Number(data.admin_chat_id),
    contact_url: data.contact_url || undefined,
    display_name: data.display_name || undefined
  } as BotConfig;
}

// Telegram API helpers
async function sendMessage(botToken: string, chatId: number, text: string, options: Record<string, unknown> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...options }),
  });
  return response.json();
}

async function sendPhoto(botToken: string, chatId: number, photoUrl: string, caption: string, options: Record<string, unknown> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML', ...options }),
  });
  return response.json();
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessageText(botToken: string, chatId: number, messageId: number, text: string, options: Record<string, unknown> = {}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...options }),
  });
  return response.json();
}

// Generate short token for callback data (Telegram max 64 bytes)
function generateShortToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Build proper UPI URI for all apps (Fampay, GPay, PhonePe, Paytm)
function buildUpiUri(upiId: string, upiName: string, amount: number, reference?: string): string {
  const params = new URLSearchParams();
  params.set('pa', upiId); // Payee address
  params.set('pn', upiName); // Payee name
  params.set('am', amount.toString()); // Amount
  params.set('cu', 'INR'); // Currency
  params.set('tn', `Key Purchase`); // Transaction note
  if (reference) {
    params.set('tr', reference); // Transaction reference
  }
  return `upi://pay?${params.toString()}`;
}

function getQRCodeUrl(upiId: string, upiName: string, amount: number, reference?: string): string {
  const upiLink = buildUpiUri(upiId, upiName, amount, reference);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;
}

// Register user in database
async function registerUser(supabase: SupabaseClient, from: TelegramUser) {
  await supabase.from('telegram_bot_users').upsert({
    telegram_id: from.id,
    username: from.username,
    first_name: from.first_name,
  }, { onConflict: 'telegram_id' });
}

// Get persistent reply keyboard with Contact Us button (always visible at bottom)
function getReplyKeyboard(contactUrl?: string) {
  if (!contactUrl) return undefined;
  
  return {
    keyboard: [[{ text: "📞 Contact Us" }]],
    resize_keyboard: true,
    is_persistent: true
  };
}

// Get inline keyboard with button to open DM directly
function getInlineContactButton(contactUrl?: string) {
  if (!contactUrl) return undefined;
  
  return {
    inline_keyboard: [[{ text: "📞 Open Chat", url: contactUrl }]]
  };
}

function getBotDisplayName(config: BotConfig) {
  return config.display_name || config.upi_name || 'Sarkar PVT Bot';
}

function buildUserHelpMessage(config: BotConfig) {
  const botDisplayName = getBotDisplayName(config);
  return `
<b>${botDisplayName}</b>

Available commands:
/start - Open the main menu
/buy - Purchase a key
/help - View command help

Use /buy to see active plans and renewal options.
`.trim();
}

function buildAdminHelpMessage(config: BotConfig) {
  const botDisplayName = getBotDisplayName(config);
  return `
<b>${botDisplayName} Admin Commands</b>

/start - Open the user menu
/buy - Open purchase plans
/help - View this admin command list
/broadcast <message> - Send a message to every registered bot user
/all <message> - Legacy alias for broadcast
/message <chat_id> <message> - Send a direct message to one user
/dm <chat_id> <message> - Alias for direct message
KEY_<chat_id>_<key> - Deliver a manual key after approval
`.trim();
}

// Handle /start command with dynamic prices
async function handleStart(botToken: string, chatId: number, config: BotConfig, supabase: SupabaseClient) {
  const prices = await getUserPrices(supabase, config.id);
  
  // Build price list dynamically
  const priceList = Object.entries(prices)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([hours, price]) => `• ${formatDuration(parseInt(hours))} - ₹${price}`)
    .join('\n');

  const botDisplayName = getBotDisplayName(config);
  const welcomeMessage = `
🎮 <b>Welcome to ${botDisplayName}!</b>

📋 <b>Available Commands:</b>
• /buy - Purchase a key

💰 <b>Prices:</b>
${priceList}

📞 For support, contact admin.
`;
  
  const replyMarkup = getReplyKeyboard(config.contact_url);
  await sendMessage(botToken, chatId, welcomeMessage, replyMarkup ? { reply_markup: replyMarkup } : {});
}

// Handle /buy command with dynamic prices
async function handleBuy(botToken: string, chatId: number, text: string, supabase: SupabaseClient, from: TelegramUser, config: BotConfig) {
  const prices = await getUserPrices(supabase, config.id);
  const parts = text.split(' ');
  
  if (parts.length === 1) {
    // Build keyboard dynamically from prices
    const buttons = Object.entries(prices)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([hours, price]) => ({
        text: `${formatDuration(parseInt(hours))} - ₹${price}`,
        callback_data: `buy_user_${hours}_${config.id}`
      }));
    
    // Split into rows of 2
    const keyboard: { text: string; callback_data: string }[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    
    await sendMessage(botToken, chatId, '🎮 <b>Select a plan:</b>', { reply_markup: { inline_keyboard: keyboard } });
    return;
  }

  // Handle direct /buy <hours> command
  const durationHours = parts[1];
  const amount = prices[durationHours];
  
  if (!amount) {
    await sendMessage(botToken, chatId, '❌ Invalid duration. Please use /buy to see available plans.');
    return;
  }

  await createPayment(botToken, chatId, supabase, from, durationHours, amount, 'user', config);
}

// Create payment and send QR
async function createPayment(
  botToken: string,
  chatId: number, 
  supabase: SupabaseClient, 
  from: TelegramUser, 
  durationHours: string, 
  amount: number, 
  userType: string,
  config: BotConfig
) {
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

  // Create pending payment
  const { data: payment, error } = await supabase.from('pending_payments').insert({
    telegram_id: from.id,
    telegram_username: from.username,
    amount,
    duration: durationHours, // Store hours directly
    user_type: userType,
    expires_at: expiresAt.toISOString(),
    status: 'pending',
  }).select().single();

  if (error) {
    console.error('Failed to create payment:', error);
    await sendMessage(botToken, chatId, '❌ Error creating payment. Please try again.');
    return;
  }

  // Generate reference for UPI tracking
  const paymentRef = `PAY${Date.now().toString(36).toUpperCase()}`;
  const qrUrl = getQRCodeUrl(config.upi_id, config.upi_name, amount, paymentRef);
  
  const caption = `
💳 <b>Payment Details</b>

📦 Duration: ${formatDuration(parseInt(durationHours))}
💰 Amount: <b>₹${amount}</b>

📱 <b>UPI ID:</b> <code>${config.upi_id}</code>
👤 <b>Name:</b> ${config.upi_name}

⏰ <b>Expires in 3 minutes!</b>

📲 Scan QR above ya UPI ID copy karke manually pay karo!
After payment, send your <b>12-digit UTR/Transaction ID</b>.
`;

  // Send QR without URL button (URL buttons crash on some devices)
  await sendPhoto(botToken, chatId, qrUrl, caption);
}

// Handle transaction submission
async function handleTransaction(
  botToken: string,
  chatId: number, 
  text: string, 
  supabase: SupabaseClient, 
  from: TelegramUser,
  config: BotConfig
) {
  const transactionId = text.trim();
  
  if (!/^\d{12}$/.test(transactionId)) {
    return false; // Not a valid transaction ID
  }

  // Check for pending payment
  const { data: payment } = await supabase
    .from('pending_payments')
    .select('*')
    .eq('telegram_id', from.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!payment) {
    await sendMessage(botToken, chatId, '❌ No pending payment found or payment expired. Please start a new purchase.');
    return true;
  }

  // Generate short token for admin buttons (Telegram max 64 bytes for callback_data)
  const actionToken = generateShortToken();
  
  // Update payment with transaction ID and action token
  await supabase.from('pending_payments').update({
    transaction_id: transactionId,
    status: 'submitted',
    admin_action_token: actionToken,
    bot_id: config.id,
  }).eq('id', payment.id);

  await sendMessage(botToken, chatId, `
✅ <b>Transaction Submitted!</b>

🔢 Transaction ID: <code>${transactionId}</code>
💰 Amount: ₹${payment.amount}

⏳ Please wait for admin approval.
`);

  // Notify admin with SHORT callback_data (using token instead of UUIDs)
  const adminMessage = `
🔔 <b>New Payment Submission</b>

👤 User: ${from.first_name} (@${from.username || 'N/A'})
🆔 User ID: <code>${from.id}</code>
📦 Type: User Key
⏱ Duration: ${formatDuration(parseInt(payment.duration))}
💰 Amount: ₹${payment.amount}
🔢 Transaction ID: <code>${transactionId}</code>
`;

  // Use short tokens: ap_<token> and dc_<token> (always under 20 bytes)
  const adminKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `ap_${actionToken}` },
        { text: '❌ Decline', callback_data: `dc_${actionToken}` },
      ],
    ],
  };

  console.log('Sending admin notification to:', config.admin_chat_id);
  console.log('Callback data length:', `ap_${actionToken}`.length, 'bytes');
  const adminResult = await sendMessage(botToken, config.admin_chat_id, adminMessage, { reply_markup: adminKeyboard });
  console.log('Admin notification result:', JSON.stringify(adminResult));
  
  // Store admin message ID for later editing
  if (adminResult.ok) {
    await supabase.from('pending_payments').update({
      admin_message_id: adminResult.result.message_id,
    }).eq('id', payment.id);
    console.log('Admin notification sent successfully!');
  } else {
    console.error('Failed to send admin notification:', adminResult.description);
  }

  return true;
}

// Handle callback queries
async function handleCallback(botToken: string, callbackQuery: TelegramCallbackQuery, supabase: SupabaseClient, config: BotConfig) {
  const data = callbackQuery.data;
  const from = callbackQuery.from;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!data || !chatId || !messageId) return;

  // Parse callback data
  const parts = data.split('_');
  
  // Handle buy callbacks with dynamic prices
  if (data.startsWith('buy_user_')) {
    const durationHours = parts[2];
    const prices = await getUserPrices(supabase, config.id);
    const amount = prices[durationHours];
    if (amount) {
      await createPayment(botToken, chatId, supabase, from, durationHours, amount, 'user', config);
    }
    await answerCallbackQuery(botToken, callbackQuery.id);
    return;
  }

  // Handle admin approve/decline with SHORT tokens (ap_<token> / dc_<token>)
  if (data.startsWith('ap_') || data.startsWith('dc_')) {
    const isApprove = data.startsWith('ap_');
    const actionToken = data.substring(3); // Remove "ap_" or "dc_" prefix

    console.log('Processing admin action, token:', actionToken, 'isApprove:', isApprove);

    // Find payment by short token
    const { data: payment, error: paymentError } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('admin_action_token', actionToken)
      .single();

    if (paymentError || !payment) {
      console.error('Payment lookup failed:', paymentError);
      await answerCallbackQuery(botToken, callbackQuery.id, 'Payment not found');
      return;
    }

    if (isApprove) {
      // Auto-generate license key
      const licenseKey = generateLicenseKey();
      
      // Get first active game for key generation
      const { data: game } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      // Duration is already in hours from the payment
      const durationHours = parseInt(payment.duration) || 24;
      
      // Calculate expiry date
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

      // Insert license key into database (notification flags default to false in DB)
      const { error: keyError } = await supabase.from('license_keys').insert({
        key_code: licenseKey,
        game_id: game?.id,
        duration_hours: durationHours,
        max_devices: 1,
        status: 'active',
        created_by: null, // Bot-generated key
        price: payment.amount,
        expires_at: expiresAt,
        telegram_id: payment.telegram_id,
        telegram_username: payment.telegram_username, // Store buyer's username
        transaction_id: payment.transaction_id, // Store payment transaction ID
        bot_id: config.id,
      });

      if (keyError) {
        console.error('Failed to create license key:', keyError);
        await answerCallbackQuery(botToken, callbackQuery.id, 'Error creating key!');
        return;
      }

      // Update payment to completed
      await supabase.from('pending_payments').update({
        status: 'completed',
      }).eq('id', payment.id);

      // Send success message to user
      await sendMessage(botToken, payment.telegram_id, `
Hey 👋 <code>${payment.telegram_id}</code>

🔑 <b>License:</b> <code>${licenseKey}</code>
🧾 <b>Payment Id:</b> <code>${payment.transaction_id}</code>
⏱ <b>License Time:</b> ${formatDuration(durationHours)}

✅ <b>Payment Successful!</b>
Thank you for your purchase! 🙏
`);

      // Edit admin message to show key was delivered
      await editMessageText(botToken, chatId, messageId, `
✅ <b>APPROVED & KEY DELIVERED</b>

👤 User: @${payment.telegram_username || 'N/A'}
🆔 User ID: <code>${payment.telegram_id}</code>
💰 Amount: ₹${payment.amount}
🔢 Transaction ID: <code>${payment.transaction_id}</code>
🔑 Key: <code>${licenseKey}</code>

✅ Key automatically generated and sent to user!
`);

      await answerCallbackQuery(botToken, callbackQuery.id, 'Key generated & sent!');
    } else {
      await supabase.from('pending_payments').update({
        status: 'declined',
      }).eq('id', payment.id);

      // Notify user
      await sendMessage(botToken, payment.telegram_id, `
❌ <b>Payment Declined</b>

Your payment of ₹${payment.amount} has been declined.
Transaction ID: <code>${payment.transaction_id}</code>

Please contact support if you believe this is an error.
`);

      // Edit admin message
      await editMessageText(botToken, chatId, messageId, `
❌ <b>DECLINED</b>

👤 User: @${payment.telegram_username || 'N/A'}
💰 Amount: ₹${payment.amount}
🔢 Transaction ID: <code>${payment.transaction_id}</code>
`);

      await answerCallbackQuery(botToken, callbackQuery.id, 'Payment declined');
    }
    return;
  }

  // Legacy support for old format
  if (data.startsWith('approve_') || data.startsWith('decline_')) {
    console.warn('Legacy callback format detected, this should not happen:', data);
    await answerCallbackQuery(botToken, callbackQuery.id, 'Old payment format - please try again');
  }
}

// Handle admin key input
async function handleAdminKeyInput(botToken: string, text: string, supabase: SupabaseClient, config: BotConfig) {
  // Format: KEY_USERID_ACTUALKEY
  if (!text.startsWith('KEY_')) return false;

  const parts = text.split('_');
  if (parts.length < 3) return false;

  const userId = parseInt(parts[1]);
  const key = parts.slice(2).join('_');

  // Find approved payment for this user
  const { data: payment } = await supabase
    .from('pending_payments')
    .select('*')
    .eq('telegram_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!payment) {
    await sendMessage(botToken, config.admin_chat_id, `❌ No approved payment found for user ${userId}`);
    return true;
  }

  // Update payment status
  await supabase.from('pending_payments').update({
    status: 'completed',
  }).eq('id', payment.id);

  // Send key to user
  await sendMessage(botToken, userId, `
🎉 <b>Payment Successful!</b>

🔑 <b>Your Key:</b>
<code>${key}</code>

📦 Duration: ${formatDuration(parseInt(payment.duration))}
💰 Amount Paid: ₹${payment.amount}

Thank you for your purchase! 🙏
`);

  await sendMessage(botToken, config.admin_chat_id, `✅ Key delivered to user ${userId}`);
  return true;
}

async function handleHelp(botToken: string, chatId: number, config: BotConfig) {
  const message =
    chatId === config.admin_chat_id
      ? buildAdminHelpMessage(config)
      : buildUserHelpMessage(config);

  await sendMessage(botToken, chatId, message);
}

async function handleDirectMessage(botToken: string, text: string, chatId: number, config: BotConfig) {
  if (chatId !== config.admin_chat_id) {
    await sendMessage(botToken, chatId, 'âŒ You are not authorized to use this command.');
    return;
  }

  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) {
    await sendMessage(botToken, chatId, 'âŒ Usage: /message <chat_id> <message>');
    return;
  }

  const targetChatId = Number(parts[1]);
  if (!Number.isFinite(targetChatId)) {
    await sendMessage(botToken, chatId, 'âŒ Chat ID must be numeric.');
    return;
  }

  const commandPrefix = parts[0];
  const message = text.replace(`${commandPrefix} ${parts[1]}`, '').trim();
  if (!message) {
    await sendMessage(botToken, chatId, 'âŒ Message text is required.');
    return;
  }

  const botDisplayName = getBotDisplayName(config);
  await sendMessage(botToken, targetChatId, `<b>${botDisplayName}</b>\n\n${message}`);
  await sendMessage(botToken, chatId, `Message sent to <code>${targetChatId}</code>.`);
}

// Handle /all broadcast command
async function handleBroadcast(botToken: string, text: string, supabase: SupabaseClient, chatId: number, config: BotConfig) {
  // Only admin can use this
  if (chatId !== config.admin_chat_id) {
    await sendMessage(botToken, chatId, '❌ You are not authorized to use this command.');
    return;
  }

  const message = text.replace(/^\/(?:broadcast|all)\s+/i, '').trim();
  if (!message) {
    await sendMessage(botToken, chatId, 'Usage: /broadcast Your message here');
    return;
  }

  // Get all users
  const { data: users } = await supabase.from('telegram_bot_users').select('telegram_id');
  
  if (!users || users.length === 0) {
    await sendMessage(botToken, chatId, '❌ No users to broadcast to.');
    return;
  }

  let sent = 0;
  let failed = 0;
  const botDisplayName = getBotDisplayName(config);

  for (const user of users) {
    try {
      await sendMessage(botToken, user.telegram_id, `<b>${botDisplayName} Announcement</b>\n\n${message}`);
      sent++;
    } catch {
      failed++;
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 50));
  }

  await sendMessage(botToken, chatId, `✅ Broadcast complete!\n📤 Sent: ${sent}\n❌ Failed: ${failed}`);
}

// Check maintenance mode for bots
async function checkMaintenanceMode(supabase: SupabaseClient): Promise<{ isEnabled: boolean; disableBots: boolean; message: string }> {
  try {
    const { data } = await supabase
      .from('server_settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_disable_bots', 'maintenance_message']);

    const maintenanceMode = data?.find(s => s.key === 'maintenance_mode')?.value === true;
    const disableBots = data?.find(s => s.key === 'maintenance_disable_bots')?.value === true;
    const message = data?.find(s => s.key === 'maintenance_message')?.value as string || '';

    return { isEnabled: maintenanceMode, disableBots, message };
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return { isEnabled: false, disableBots: false, message: '' };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get bot_id from URL parameter
    const url = new URL(req.url);
    const botId = url.searchParams.get('bot_id');

    if (!botId) {
      console.error('No bot_id provided');
      return new Response(JSON.stringify({ ok: false, error: 'No bot_id provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check maintenance mode FIRST
    const maintenance = await checkMaintenanceMode(supabase);
    
    if (maintenance.isEnabled && maintenance.disableBots) {
      // Bot is disabled due to maintenance - respond with maintenance message
      const update: TelegramUpdate = await req.json();
      const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
      
      if (chatId) {
        // Get bot token from database to send response
        const { data: botData } = await supabase
          .from('telegram_bots')
          .select('bot_token')
          .eq('id', botId)
          .single();
        
        if (botData?.bot_token) {
          const maintenanceMessage = `
🔧 <b>Bot Under Maintenance</b>

The bot is currently unavailable for maintenance.
${maintenance.message ? `\n${maintenance.message}\n` : ''}
Please try again later. We apologize for the inconvenience.
`;
          await sendMessage(botData.bot_token, chatId, maintenanceMessage);
        }
      }
      
      return new Response(JSON.stringify({ ok: true, maintenance: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get bot configuration
    const config = await getBotConfig(supabase, botId);
    
    if (!config) {
      console.error('Bot not found or inactive:', botId);
      return new Response(JSON.stringify({ ok: false, error: 'Bot not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const update: TelegramUpdate = await req.json();
    console.log('Received update for bot:', config.id, update);

    // Handle callback queries
    if (update.callback_query) {
      await handleCallback(config.bot_token, update.callback_query, supabase, config);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle messages
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      const from = message.from;

      // Register user
      await registerUser(supabase, from);

      // Admin commands
      if (chatId === config.admin_chat_id) {
        if (text.startsWith('/broadcast') || text.startsWith('/all')) {
          await handleBroadcast(config.bot_token, text, supabase, chatId, config);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (text.startsWith('/message') || text.startsWith('/dm')) {
          await handleDirectMessage(config.bot_token, text, chatId, config);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (text.startsWith('KEY_')) {
          await handleAdminKeyInput(config.bot_token, text, supabase, config);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle Contact Us button press
      if (text === "📞 Contact Us") {
        if (config.contact_url) {
          await sendMessage(config.bot_token, chatId, `
📞 <b>Contact Us</b>

Click here to reach us: ${config.contact_url}

🙏 We'll respond as soon as possible!
`, { reply_markup: getInlineContactButton(config.contact_url) });
        } else {
          await sendMessage(config.bot_token, chatId, '📞 Contact admin for support.');
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // User commands
      if (text.startsWith('/start')) {
        await handleStart(config.bot_token, chatId, config, supabase);
      } else if (text.startsWith('/help')) {
        await handleHelp(config.bot_token, chatId, config);
      } else if (text.startsWith('/buy')) {
        await handleBuy(config.bot_token, chatId, text, supabase, from, config);
      } else {
        // Check for transaction ID
        await handleTransaction(config.bot_token, chatId, text, supabase, from, config);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bot error:', error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
