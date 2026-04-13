
-- ============================================
-- COMPLETE SECURITY LOCKDOWN
-- Restrict ALL policies to authenticated role only
-- Add explicit anon deny on all sensitive tables
-- ============================================

-- === PROFILES ===
-- Already has anon deny, good

-- === SERVER_SETTINGS: restrict to admins/owners only ===
DROP POLICY IF EXISTS "Authenticated users can view server settings" ON public.server_settings;
CREATE POLICY "Admins and owners can view server settings"
ON public.server_settings FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- === API_AUDIT_LOGS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view api audit logs" ON public.api_audit_logs;
CREATE POLICY "Admins can view api audit logs"
ON public.api_audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- === API_RATE_LIMITS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.api_rate_limits;
CREATE POLICY "Admins can view rate limits"
ON public.api_rate_limits FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- === AUDIT_LOGS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK ((user_id = auth.uid()) OR (user_id IS NULL));

-- === FAILED_AUTH_ATTEMPTS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view failed attempts" ON public.failed_auth_attempts;
CREATE POLICY "Admins can view failed attempts"
ON public.failed_auth_attempts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- === FRONTEND_RATE_LIMITS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "Admins can view frontend rate limits"
ON public.frontend_rate_limits FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "No direct writes to frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "No direct writes to frontend rate limits"
ON public.frontend_rate_limits FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct updates to frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "No direct updates to frontend rate limits"
ON public.frontend_rate_limits FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "No direct deletes to frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "No direct deletes to frontend rate limits"
ON public.frontend_rate_limits FOR DELETE
TO authenticated
USING (false);

-- === GAMES: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can manage games" ON public.games;
CREATE POLICY "Admins can manage games"
ON public.games FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Anyone authenticated can view active games" ON public.games;
CREATE POLICY "Authenticated users can view active games"
ON public.games FOR SELECT
TO authenticated
USING ((status = 'active'::game_status) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- === IP_BLACKLIST: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view blacklist" ON public.ip_blacklist;
CREATE POLICY "Admins can view blacklist"
ON public.ip_blacklist FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can manage blacklist" ON public.ip_blacklist;
CREATE POLICY "Owners can manage blacklist"
ON public.ip_blacklist FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- === IP_WHITELIST: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view whitelist" ON public.ip_whitelist;
CREATE POLICY "Admins can view whitelist"
ON public.ip_whitelist FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can manage whitelist" ON public.ip_whitelist;
CREATE POLICY "Owners can manage whitelist"
ON public.ip_whitelist FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- === KEY_ACTIVATIONS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view all activations" ON public.key_activations;
CREATE POLICY "Admins can view all activations"
ON public.key_activations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Key owners can view activations" ON public.key_activations;
CREATE POLICY "Key owners can view activations"
ON public.key_activations FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM license_keys WHERE license_keys.id = key_activations.key_id AND license_keys.created_by = auth.uid()));

-- === LICENSE_KEYS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can manage all keys" ON public.license_keys;
CREATE POLICY "Admins can manage all keys"
ON public.license_keys FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Admins can view all keys" ON public.license_keys;
CREATE POLICY "Admins can view all keys"
ON public.license_keys FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Users can create keys" ON public.license_keys;
CREATE POLICY "Users can create keys"
ON public.license_keys FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own keys" ON public.license_keys;
CREATE POLICY "Users can update own keys"
ON public.license_keys FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view own keys" ON public.license_keys;
CREATE POLICY "Users can view own keys"
ON public.license_keys FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- === MAINTENANCE_ACCESS: restrict to authenticated ===
DROP POLICY IF EXISTS "Owners can manage maintenance access" ON public.maintenance_access;
CREATE POLICY "Owners can manage maintenance access"
ON public.maintenance_access FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Users can check own maintenance access" ON public.maintenance_access;
CREATE POLICY "Users can check own maintenance access"
ON public.maintenance_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- === OWNER_OTP_CODES: restrict to authenticated ===
DROP POLICY IF EXISTS "Users can view own OTP codes" ON public.owner_otp_codes;
CREATE POLICY "Users can view own OTP codes"
ON public.owner_otp_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- === PANEL_LICENSES: restrict to authenticated ===
DROP POLICY IF EXISTS "Owner can manage panel licenses" ON public.panel_licenses;
CREATE POLICY "Owner can manage panel licenses"
ON public.panel_licenses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- === PENDING_PAYMENTS: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins can view pending payments" ON public.pending_payments;
CREATE POLICY "Admins can view pending payments"
ON public.pending_payments FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- === PRICE_SETTINGS: restrict to authenticated ===
DROP POLICY IF EXISTS "Anyone can view prices" ON public.price_settings;
CREATE POLICY "Authenticated users can view prices"
ON public.price_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage prices" ON public.price_settings;
CREATE POLICY "Admins can manage prices"
ON public.price_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- === PROFILES: policies already fixed, add authenticated restriction ===
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- === REFERRAL_CODES: restrict to authenticated ===
DROP POLICY IF EXISTS "Admins and owners can view referral codes" ON public.referral_codes;
CREATE POLICY "Admins and owners can view referral codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own referral codes" ON public.referral_codes;
CREATE POLICY "Users can view own referral codes"
ON public.referral_codes FOR SELECT
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create referral codes" ON public.referral_codes;
CREATE POLICY "Users can create referral codes"
ON public.referral_codes FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own referral codes" ON public.referral_codes;
CREATE POLICY "Users can delete own referral codes"
ON public.referral_codes FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- === SECURITY_LOGS: restrict to authenticated ===
DROP POLICY IF EXISTS "Owners can view security logs" ON public.security_logs;
CREATE POLICY "Owners can view security logs"
ON public.security_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- === SONGS: already fixed ===
DROP POLICY IF EXISTS "Authenticated users can view active songs" ON public.songs;
CREATE POLICY "Authenticated users can view active songs"
ON public.songs FOR SELECT
TO authenticated
USING (is_active = true);

-- === TELEGRAM_BOT_USERS: restrict to authenticated ===
DROP POLICY IF EXISTS "Owners can manage telegram bot users" ON public.telegram_bot_users;
CREATE POLICY "Owners can manage telegram bot users"
ON public.telegram_bot_users FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- === TELEGRAM_BOTS: restrict to authenticated ===
DROP POLICY IF EXISTS "Owner can manage bots" ON public.telegram_bots;
CREATE POLICY "Owner can manage bots"
ON public.telegram_bots FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- === TWO_FACTOR_CODES: restrict to authenticated ===
DROP POLICY IF EXISTS "Users can view own 2FA codes" ON public.two_factor_codes;
CREATE POLICY "Users can view own 2FA codes"
ON public.two_factor_codes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- === USER_ROLES: restrict to authenticated ===
DROP POLICY IF EXISTS "Owners can manage all roles" ON public.user_roles;
CREATE POLICY "Owners can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'co_owner'::app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- === USER_SESSIONS: restrict to authenticated ===
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_sessions;
CREATE POLICY "Users can delete own sessions"
ON public.user_sessions FOR DELETE
TO authenticated
USING (user_id = auth.uid());
