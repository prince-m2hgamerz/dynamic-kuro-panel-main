
-- ============================================================
-- FIX 1: Mask sensitive profile fields for non-admin users
-- Create a view that masks telegram_chat_id and balance for regular users
-- ============================================================

-- Create function to mask telegram_chat_id
CREATE OR REPLACE FUNCTION public.mask_telegram_id(chat_id text, viewer_id uuid, profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Owner/co_owner/admin see full data, or user viewing own profile
  IF viewer_id = profile_id OR has_role(viewer_id, 'owner') OR has_role(viewer_id, 'co_owner') OR has_role(viewer_id, 'admin') THEN
    RETURN chat_id;
  END IF;
  -- Others see masked
  IF chat_id IS NULL THEN RETURN NULL; END IF;
  RETURN LEFT(chat_id, 2) || '****' || RIGHT(chat_id, 2);
END;
$$;

-- ============================================================
-- FIX 2: Mask telegram fields on license_keys for non-admin users  
-- ============================================================

CREATE OR REPLACE FUNCTION public.mask_telegram_username(username text, viewer_id uuid, key_creator uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins/owners or the key creator see full data
  IF viewer_id = key_creator OR has_role(viewer_id, 'owner') OR has_role(viewer_id, 'co_owner') OR has_role(viewer_id, 'admin') THEN
    RETURN username;
  END IF;
  IF username IS NULL THEN RETURN NULL; END IF;
  RETURN LEFT(username, 2) || '****';
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_telegram_numeric_id(tg_id bigint, viewer_id uuid, key_creator uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins/owners or the key creator see full data
  IF viewer_id = key_creator OR has_role(viewer_id, 'owner') OR has_role(viewer_id, 'co_owner') OR has_role(viewer_id, 'admin') THEN
    RETURN tg_id;
  END IF;
  -- Non-privileged users get NULL (can't see telegram IDs)
  RETURN NULL;
END;
$$;

-- ============================================================
-- FIX 3: Mask device fingerprint & IP in key_activations
-- ============================================================

CREATE OR REPLACE FUNCTION public.mask_device_fingerprint(fp text, viewer_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only owners/admins see full fingerprints
  IF has_role(viewer_id, 'owner') OR has_role(viewer_id, 'co_owner') OR has_role(viewer_id, 'admin') THEN
    RETURN fp;
  END IF;
  IF fp IS NULL THEN RETURN NULL; END IF;
  RETURN LEFT(fp, 6) || '••••••••';
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_ip_address(ip inet, viewer_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ip_text text;
BEGIN
  -- Only owners/admins see full IPs
  IF has_role(viewer_id, 'owner') OR has_role(viewer_id, 'co_owner') OR has_role(viewer_id, 'admin') THEN
    RETURN ip::text;
  END IF;
  IF ip IS NULL THEN RETURN NULL; END IF;
  -- Mask last octet: 192.168.1.xxx
  ip_text := ip::text;
  RETURN regexp_replace(ip_text, '\.\d+$', '.***');
END;
$$;

-- ============================================================
-- Create secure views that apply masking automatically
-- ============================================================

-- Secure license_keys view (masks telegram fields for non-admins)
CREATE OR REPLACE VIEW public.license_keys_safe AS
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
  mask_telegram_numeric_id(telegram_id, auth.uid(), created_by) AS telegram_id,
  mask_telegram_username(telegram_username, auth.uid(), created_by) AS telegram_username
FROM public.license_keys;

-- Secure key_activations view (masks fingerprint & IP for non-admins)
CREATE OR REPLACE VIEW public.key_activations_safe AS
SELECT
  ka.id,
  ka.key_id,
  mask_device_fingerprint(ka.device_fingerprint, auth.uid()) AS device_fingerprint,
  mask_ip_address(ka.ip_address, auth.uid()) AS ip_address,
  ka.activated_at,
  ka.last_seen,
  -- Strip detailed device info for non-admins
  CASE 
    WHEN has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'co_owner') OR has_role(auth.uid(), 'admin') THEN ka.device_info
    ELSE jsonb_build_object('type', ka.device_info->>'type')
  END AS device_info
FROM public.key_activations ka;

-- ============================================================
-- Drop the old profiles_safe view and recreate with masking
-- ============================================================
DROP VIEW IF EXISTS public.profiles_safe;

CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  username,
  CASE 
    WHEN auth.uid() = id OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'co_owner') OR has_role(auth.uid(), 'admin') THEN balance
    ELSE NULL
  END AS balance,
  CASE 
    WHEN auth.uid() = id OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'co_owner') OR has_role(auth.uid(), 'admin') THEN account_expires_at
    ELSE NULL
  END AS account_expires_at,
  mask_telegram_id(telegram_chat_id, auth.uid(), id) AS telegram_chat_id,
  status,
  is_hidden,
  panel_name,
  invited_by,
  referral_applied,
  requires_otp,
  two_factor_enabled,
  last_login,
  created_at,
  updated_at
FROM public.profiles;

-- Add RLS to secure views
ALTER VIEW public.license_keys_safe SET (security_invoker = on);
ALTER VIEW public.key_activations_safe SET (security_invoker = on);

-- ============================================================
-- Auto-cleanup: Delete old key_activations (data retention - 90 days)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_key_activations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.key_activations 
  WHERE last_seen < NOW() - INTERVAL '90 days'
  AND key_id IN (
    SELECT id FROM public.license_keys WHERE status IN ('expired', 'revoked')
  );
END;
$$;
