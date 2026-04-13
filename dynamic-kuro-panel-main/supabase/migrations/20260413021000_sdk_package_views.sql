DROP VIEW IF EXISTS public.telegram_bots_safe;
CREATE VIEW public.telegram_bots_safe
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  admin_chat_id,
  upi_id,
  upi_name,
  contact_url,
  display_name,
  webhook_url,
  is_active,
  created_by,
  created_at,
  updated_at
FROM public.telegram_bots;

DROP VIEW IF EXISTS public.license_keys_safe;
CREATE VIEW public.license_keys_safe AS
SELECT
  id,
  key_code,
  game_id,
  status,
  duration_hours,
  created_at,
  updated_at,
  activated_at,
  expires_at,
  max_devices,
  price,
  created_by,
  bot_id,
  transaction_id,
  notified_1h,
  notified_6h,
  notified_24h,
  package_restricted,
  mask_telegram_numeric_id(telegram_id, auth.uid(), created_by) AS telegram_id,
  mask_telegram_username(telegram_username, auth.uid(), created_by) AS telegram_username
FROM public.license_keys;

ALTER VIEW public.license_keys_safe SET (security_invoker = on);

DROP POLICY IF EXISTS "Owner can insert bots" ON public.telegram_bots;
DROP POLICY IF EXISTS "Owner can update bots" ON public.telegram_bots;
DROP POLICY IF EXISTS "Owner can delete bots" ON public.telegram_bots;
DROP POLICY IF EXISTS "Owner can select bots via view" ON public.telegram_bots;

CREATE POLICY "Owner and co-owner can insert bots"
ON public.telegram_bots FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

CREATE POLICY "Owner and co-owner can update bots"
ON public.telegram_bots FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

CREATE POLICY "Owner and co-owner can delete bots"
ON public.telegram_bots FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);

CREATE POLICY "Owner and co-owner can select bots via view"
ON public.telegram_bots FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
);
