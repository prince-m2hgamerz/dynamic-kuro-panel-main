
-- Add panel_name column to profiles
ALTER TABLE public.profiles ADD COLUMN panel_name text NOT NULL DEFAULT 'SARKAR';

-- Add panel_name to profiles_safe view (recreate it)
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe AS
SELECT 
  id,
  username,
  balance,
  status,
  created_at,
  updated_at,
  last_login,
  invited_by,
  is_hidden,
  referral_applied,
  requires_otp,
  two_factor_enabled,
  telegram_chat_id,
  account_expires_at,
  panel_name
FROM public.profiles;

-- Update handle_new_user trigger to inherit panel_name from referrer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _referral_code TEXT;
  _code_record RECORD;
  _initial_balance NUMERIC;
  _assigned_role TEXT;
  _referrer_panel_name TEXT;
BEGIN
  _referral_code := NEW.raw_user_meta_data->>'referral_code';
  _initial_balance := 0;
  _assigned_role := 'reseller';
  _referrer_panel_name := 'SARKAR';
  
  IF _referral_code IS NOT NULL THEN
    SELECT * INTO _code_record FROM public.referral_codes 
    WHERE code = _referral_code AND is_active = true;
    
    IF _code_record IS NOT NULL THEN
      _initial_balance := COALESCE(_code_record.initial_balance, 0);
      _assigned_role := COALESCE(_code_record.assigned_role, 'reseller');
      
      -- Inherit panel_name from referrer
      SELECT COALESCE(panel_name, 'SARKAR') INTO _referrer_panel_name
      FROM public.profiles WHERE id = _code_record.created_by;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (id, username, balance, invited_by, panel_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    _initial_balance,
    (NEW.raw_user_meta_data->>'invited_by')::UUID,
    _referrer_panel_name
  )
  ON CONFLICT (id) DO NOTHING;

  IF _referral_code IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _assigned_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'reseller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
