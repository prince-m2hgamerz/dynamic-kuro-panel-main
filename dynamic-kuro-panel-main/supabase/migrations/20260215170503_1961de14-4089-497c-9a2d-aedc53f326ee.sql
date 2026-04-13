
-- CRITICAL: Remove public/anon access to referral_codes
DROP POLICY IF EXISTS "Anon can validate active referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can view active referral codes" ON public.referral_codes;

-- Only owners/co_owners/admins can view referral codes
CREATE POLICY "Admins and owners can view referral codes"
ON public.referral_codes FOR SELECT
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'co_owner'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Harden songs table - remove created_by from public view
DROP POLICY IF EXISTS "Everyone can view active songs" ON public.songs;
CREATE POLICY "Authenticated users can view active songs"
ON public.songs FOR SELECT
TO authenticated
USING (is_active = true);

-- Harden server_settings - restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can view server settings" ON public.server_settings;
CREATE POLICY "Authenticated users can view server settings"
ON public.server_settings FOR SELECT
TO authenticated
USING (true);

-- Create a secure function for referral code validation (anon-safe)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code_record RECORD;
BEGIN
  -- Input validation
  IF p_code IS NULL OR length(trim(p_code)) < 3 OR length(trim(p_code)) > 20 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid code format');
  END IF;

  SELECT id, code, created_by, max_uses, times_used, expires_at, initial_balance, assigned_role, is_active
  INTO _code_record
  FROM public.referral_codes
  WHERE code = trim(p_code) AND is_active = true;

  IF _code_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid or inactive code');
  END IF;

  IF _code_record.times_used >= COALESCE(_code_record.max_uses, 10) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code has reached maximum usage');
  END IF;

  IF _code_record.expires_at IS NOT NULL AND _code_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code has expired');
  END IF;

  -- Return only safe fields (no role/balance info exposed)
  RETURN jsonb_build_object(
    'valid', true,
    'code_id', _code_record.id,
    'created_by', _code_record.created_by
  );
END;
$$;
