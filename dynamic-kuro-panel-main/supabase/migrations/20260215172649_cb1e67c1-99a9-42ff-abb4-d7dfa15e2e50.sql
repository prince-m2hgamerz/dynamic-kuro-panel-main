
-- Create a secure profiles view that hides sensitive internal fields
-- otp_bot_token should NEVER be sent to regular clients
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  username,
  balance,
  telegram_chat_id,
  two_factor_enabled,
  status,
  last_login,
  created_at,
  updated_at,
  account_expires_at,
  is_hidden,
  invited_by,
  requires_otp,
  referral_applied
FROM public.profiles;
-- Excludes: otp_bot_token, otp_webhook_set (internal/sensitive fields)
