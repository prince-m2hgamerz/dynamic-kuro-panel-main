
-- 1. Fix profiles_safe view: Ensure it uses security_invoker so it respects RLS of base table
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id, username, balance, status, last_login, created_at, updated_at,
  account_expires_at, is_hidden, invited_by, referral_applied,
  telegram_chat_id, requires_otp, two_factor_enabled
FROM public.profiles;
-- Note: otp_bot_token is excluded from the view (sensitive)

-- 2. Fix telegram_bots_safe view: Ensure it uses security_invoker and excludes bot_token
DROP VIEW IF EXISTS public.telegram_bots_safe;
CREATE VIEW public.telegram_bots_safe
WITH (security_invoker = on) AS
SELECT 
  id, name, admin_chat_id, upi_id, upi_name, contact_url,
  webhook_url, is_active, created_by, created_at, updated_at
FROM public.telegram_bots;
-- Note: bot_token is excluded (sensitive credential)

-- 3. Ensure the "Deny anonymous access" policy on profiles targets anon role explicitly
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4. Add explicit anon deny policies on other sensitive tables
-- user_roles
DROP POLICY IF EXISTS "Deny anonymous access to user_roles" ON public.user_roles;
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles FOR ALL TO anon
USING (false) WITH CHECK (false);

-- telegram_bots
DROP POLICY IF EXISTS "Deny anonymous access to telegram_bots" ON public.telegram_bots;
CREATE POLICY "Deny anonymous access to telegram_bots"
ON public.telegram_bots FOR ALL TO anon
USING (false) WITH CHECK (false);

-- referral_codes
DROP POLICY IF EXISTS "Deny anonymous access to referral_codes" ON public.referral_codes;
CREATE POLICY "Deny anonymous access to referral_codes"
ON public.referral_codes FOR ALL TO anon
USING (false) WITH CHECK (false);

-- license_keys
DROP POLICY IF EXISTS "Deny anonymous access to license_keys" ON public.license_keys;
CREATE POLICY "Deny anonymous access to license_keys"
ON public.license_keys FOR ALL TO anon
USING (false) WITH CHECK (false);

-- audit_logs
DROP POLICY IF EXISTS "Deny anonymous access to audit_logs" ON public.audit_logs;
CREATE POLICY "Deny anonymous access to audit_logs"
ON public.audit_logs FOR ALL TO anon
USING (false) WITH CHECK (false);

-- server_settings
DROP POLICY IF EXISTS "Deny anonymous access to server_settings" ON public.server_settings;
CREATE POLICY "Deny anonymous access to server_settings"
ON public.server_settings FOR ALL TO anon
USING (false) WITH CHECK (false);

-- games
DROP POLICY IF EXISTS "Deny anonymous access to games" ON public.games;
CREATE POLICY "Deny anonymous access to games"
ON public.games FOR ALL TO anon
USING (false) WITH CHECK (false);

-- songs
DROP POLICY IF EXISTS "Deny anonymous access to songs" ON public.songs;
CREATE POLICY "Deny anonymous access to songs"
ON public.songs FOR ALL TO anon
USING (false) WITH CHECK (false);

-- price_settings
DROP POLICY IF EXISTS "Deny anonymous access to price_settings" ON public.price_settings;
CREATE POLICY "Deny anonymous access to price_settings"
ON public.price_settings FOR ALL TO anon
USING (false) WITH CHECK (false);

-- key_activations
DROP POLICY IF EXISTS "Deny anonymous access to key_activations" ON public.key_activations;
CREATE POLICY "Deny anonymous access to key_activations"
ON public.key_activations FOR ALL TO anon
USING (false) WITH CHECK (false);

-- owner_otp_codes
DROP POLICY IF EXISTS "Deny anonymous access to owner_otp_codes" ON public.owner_otp_codes;
CREATE POLICY "Deny anonymous access to owner_otp_codes"
ON public.owner_otp_codes FOR ALL TO anon
USING (false) WITH CHECK (false);

-- two_factor_codes
DROP POLICY IF EXISTS "Deny anonymous access to two_factor_codes" ON public.two_factor_codes;
CREATE POLICY "Deny anonymous access to two_factor_codes"
ON public.two_factor_codes FOR ALL TO anon
USING (false) WITH CHECK (false);

-- security_logs
DROP POLICY IF EXISTS "Deny anonymous access to security_logs" ON public.security_logs;
CREATE POLICY "Deny anonymous access to security_logs"
ON public.security_logs FOR ALL TO anon
USING (false) WITH CHECK (false);

-- panel_licenses
DROP POLICY IF EXISTS "Deny anonymous access to panel_licenses" ON public.panel_licenses;
CREATE POLICY "Deny anonymous access to panel_licenses"
ON public.panel_licenses FOR ALL TO anon
USING (false) WITH CHECK (false);

-- pending_payments
DROP POLICY IF EXISTS "Deny anonymous access to pending_payments" ON public.pending_payments;
CREATE POLICY "Deny anonymous access to pending_payments"
ON public.pending_payments FOR ALL TO anon
USING (false) WITH CHECK (false);

-- maintenance_access
DROP POLICY IF EXISTS "Deny anonymous access to maintenance_access" ON public.maintenance_access;
CREATE POLICY "Deny anonymous access to maintenance_access"
ON public.maintenance_access FOR ALL TO anon
USING (false) WITH CHECK (false);

-- user_sessions
DROP POLICY IF EXISTS "Deny anonymous access to user_sessions" ON public.user_sessions;
CREATE POLICY "Deny anonymous access to user_sessions"
ON public.user_sessions FOR ALL TO anon
USING (false) WITH CHECK (false);

-- telegram_bot_users
DROP POLICY IF EXISTS "Deny anonymous access to telegram_bot_users" ON public.telegram_bot_users;
CREATE POLICY "Deny anonymous access to telegram_bot_users"
ON public.telegram_bot_users FOR ALL TO anon
USING (false) WITH CHECK (false);
