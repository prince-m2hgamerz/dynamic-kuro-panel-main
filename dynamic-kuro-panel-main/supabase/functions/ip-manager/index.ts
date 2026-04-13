import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AUTHORIZED chat ID - only this person can manage IPs
const AUTHORIZED_CHAT_ID = 8027087942;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const update = await req.json();
    console.log("Received update:", JSON.stringify(update));
    const message = update.message;

    if (!message?.text || !message?.chat?.id) {
      console.log("No text or chat id in message");
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    console.log(`Command from chat ${chatId}: ${text}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // GHOST_BOT_TOKEN = @Panel_otp_Telegram_Bot (the CORRECT bot)
    const botToken = Deno.env.get("GHOST_BOT_TOKEN");
    if (!botToken) {
      console.error("GHOST_BOT_TOKEN not set");
      return new Response("OK", { status: 200 });
    }

    // SECURITY: Only authorized chat can use commands
    if (chatId !== AUTHORIZED_CHAT_ID) {
      await sendTelegram(botToken, chatId, "⛔ Unauthorized. You don't have access to this bot.");
      return new Response("OK", { status: 200 });
    }

    // ==================== COMMANDS ====================

    // /ip <address> — Whitelist an IP
    if (text.startsWith("/ip ") && !text.startsWith("/ipdel") && !text.startsWith("/iplist")) {
      const ip = text.substring(4).trim();
      if (!isValidIp(ip)) {
        await sendTelegram(botToken, chatId, "❌ Invalid IP format. Use: /ip 1.2.3.4");
        return new Response("OK", { status: 200 });
      }

      const { data: existing } = await supabase
        .from("ip_whitelist")
        .select("id")
        .eq("ip_address", ip)
        .maybeSingle();

      if (existing) {
        await sendTelegram(botToken, chatId, `⚠️ IP <code>${ip}</code> is already whitelisted.`);
        return new Response("OK", { status: 200 });
      }

      // Also remove from blacklist if present
      await supabase.from("ip_blacklist").delete().eq("ip_address", ip);

      const { error } = await supabase
        .from("ip_whitelist")
        .insert({ ip_address: ip, description: "Added via Telegram bot" });

      if (error) {
        await sendTelegram(botToken, chatId, `❌ Failed to whitelist IP: ${error.message}`);
      } else {
        await sendTelegram(botToken, chatId, `✅ IP <code>${ip}</code> has been <b>whitelisted</b>. Access granted.`);
      }

    // /ipdel <address> — Remove from whitelist
    } else if (text.startsWith("/ipdel ")) {
      const ip = text.substring(7).trim();
      if (!isValidIp(ip)) {
        await sendTelegram(botToken, chatId, "❌ Invalid IP format. Use: /ipdel 1.2.3.4");
        return new Response("OK", { status: 200 });
      }

      const { data: deleted, error } = await supabase
        .from("ip_whitelist")
        .delete()
        .eq("ip_address", ip)
        .select("id");

      if (error) {
        await sendTelegram(botToken, chatId, `❌ Failed to remove IP: ${error.message}`);
      } else if (!deleted || deleted.length === 0) {
        await sendTelegram(botToken, chatId, `⚠️ IP <code>${ip}</code> was not in the whitelist.`);
      } else {
        await sendTelegram(botToken, chatId, `🚫 IP <code>${ip}</code> has been <b>removed</b> from whitelist. Access revoked.`);
      }

    // /ban <address> [hours] [reason] — Blacklist an IP
    } else if (text.startsWith("/ban ")) {
      const parts = text.substring(5).trim().split(/\s+/);
      const ip = parts[0];
      if (!isValidIp(ip)) {
        await sendTelegram(botToken, chatId, "❌ Invalid IP format. Use: /ban 1.2.3.4 [hours] [reason]");
        return new Response("OK", { status: 200 });
      }

      // Parse optional hours (default: permanent = null)
      let expiresAt: string | null = null;
      let reason = "Banned via Telegram bot";
      
      if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
        const hours = parseInt(parts[1]);
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        if (parts.length >= 3) {
          reason = parts.slice(2).join(" ");
        }
      } else if (parts.length >= 2) {
        reason = parts.slice(1).join(" ");
      }

      // Remove from whitelist if present
      await supabase.from("ip_whitelist").delete().eq("ip_address", ip);

      // Add to blacklist (upsert)
      const { error } = await supabase
        .from("ip_blacklist")
        .upsert(
          { ip_address: ip, reason, expires_at: expiresAt, blocked_at: new Date().toISOString() },
          { onConflict: "ip_address" }
        );

      if (error) {
        await sendTelegram(botToken, chatId, `❌ Failed to ban IP: ${error.message}`);
      } else {
        const duration = expiresAt ? `for ${parts[1]} hours` : "<b>permanently</b>";
        await sendTelegram(botToken, chatId, 
          `🔨 IP <code>${ip}</code> has been <b>BANNED</b> ${duration}.\n` +
          `📝 Reason: ${reason}`
        );
      }

    // /unban <address> — Remove from blacklist
    } else if (text.startsWith("/unban ")) {
      const ip = text.substring(7).trim();
      if (!isValidIp(ip)) {
        await sendTelegram(botToken, chatId, "❌ Invalid IP format. Use: /unban 1.2.3.4");
        return new Response("OK", { status: 200 });
      }

      const { data: deleted, error } = await supabase
        .from("ip_blacklist")
        .delete()
        .eq("ip_address", ip)
        .select("id");

      if (error) {
        await sendTelegram(botToken, chatId, `❌ Failed to unban IP: ${error.message}`);
      } else if (!deleted || deleted.length === 0) {
        await sendTelegram(botToken, chatId, `⚠️ IP <code>${ip}</code> was not banned.`);
      } else {
        await sendTelegram(botToken, chatId, `✅ IP <code>${ip}</code> has been <b>unbanned</b>.`);
      }

    // /banlist — Show blacklisted IPs
    } else if (text === "/banlist") {
      const { data: ips } = await supabase
        .from("ip_blacklist")
        .select("ip_address, reason, expires_at, blocked_at")
        .order("blocked_at", { ascending: false })
        .limit(20);

      if (!ips || ips.length === 0) {
        await sendTelegram(botToken, chatId, "📋 No banned IPs.");
      } else {
        const list = ips.map((r: any, i: number) => {
          const expiry = r.expires_at 
            ? `⏰ Expires: ${new Date(r.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` 
            : "♾️ Permanent";
          return `${i + 1}. <code>${r.ip_address}</code>\n   ${r.reason || "No reason"}\n   ${expiry}`;
        }).join("\n\n");
        await sendTelegram(botToken, chatId, `🔨 <b>Banned IPs (${ips.length}):</b>\n\n${list}`);
      }

    // /iplist — Show whitelisted IPs
    } else if (text === "/iplist") {
      const { data: ips } = await supabase
        .from("ip_whitelist")
        .select("ip_address, description, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!ips || ips.length === 0) {
        await sendTelegram(botToken, chatId, "📋 No IPs in whitelist.");
      } else {
        const list = ips.map((r: any, i: number) => 
          `${i + 1}. <code>${r.ip_address}</code> - ${r.description || "No description"}`
        ).join("\n");
        await sendTelegram(botToken, chatId, `📋 <b>Whitelisted IPs (${ips.length}):</b>\n\n${list}`);
      }

    // /start or /help
    } else if (text === "/start" || text === "/help") {
      await sendHelpMessage(botToken, chatId);
    
    // Catch incomplete commands: /ip, /ban, /ipdel, /unban without args
    } else if (text === "/ip" || text === "/ban" || text === "/ipdel" || text === "/unban") {
      await sendHelpMessage(botToken, chatId);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("ip-manager error:", err);
    return new Response("OK", { status: 200 });
  }
});

function isValidIp(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4.test(ip)) return false;
  const parts = ip.split(".").map(Number);
  return parts.every(p => p >= 0 && p <= 255);
}

async function sendTelegram(botToken: string, chatId: number, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const result = await res.json();
    console.log(`Telegram send result: ${JSON.stringify(result)}`);
    if (!result.ok) {
      console.error(`Telegram API error: ${result.description}`);
    }
  } catch (e) {
    console.error("Failed to send telegram message:", e);
  }
}

async function sendHelpMessage(botToken: string, chatId: number) {
  await sendTelegram(botToken, chatId, 
    `🛡️ <b>IP Manager Bot</b>\n\n` +
    `<b>Whitelist Commands:</b>\n` +
    `• /ip &lt;address&gt; — Whitelist an IP\n` +
    `• /ipdel &lt;address&gt; — Remove from whitelist\n` +
    `• /iplist — Show whitelisted IPs\n\n` +
    `<b>Ban Commands:</b>\n` +
    `• /ban &lt;ip&gt; [hours] [reason] — Ban an IP\n` +
    `  Example: /ban 1.2.3.4 24 Suspicious activity\n` +
    `  Example: /ban 1.2.3.4 (permanent)\n` +
    `• /unban &lt;ip&gt; — Remove ban\n` +
    `• /banlist — Show banned IPs\n\n` +
    `🔔 You'll get alerts when blocked IPs try to access.`
  );
}
