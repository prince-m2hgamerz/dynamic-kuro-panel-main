-- Add assigned_role column to referral_codes table
-- This allows specifying what role users get when they register with this code
ALTER TABLE public.referral_codes 
ADD COLUMN IF NOT EXISTS assigned_role TEXT DEFAULT 'reseller' CHECK (assigned_role IN ('owner', 'admin', 'reseller'));

-- Update the handle_new_user function to use the assigned_role from referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _referral_code TEXT;
  _code_record RECORD;
  _initial_balance NUMERIC;
  _assigned_role TEXT;
BEGIN
  -- Get referral code from user metadata
  _referral_code := NEW.raw_user_meta_data->>'referral_code';
  _initial_balance := 0;
  _assigned_role := 'reseller'; -- Default role for referral users
  
  -- If referral code was used, look up initial balance and assigned role
  IF _referral_code IS NOT NULL THEN
    SELECT * INTO _code_record FROM public.referral_codes 
    WHERE code = _referral_code AND is_active = true;
    
    IF _code_record IS NOT NULL THEN
      _initial_balance := COALESCE(_code_record.initial_balance, 0);
      _assigned_role := COALESCE(_code_record.assigned_role, 'reseller');
    END IF;
  END IF;
  
  -- Create profile with optional initial balance
  INSERT INTO public.profiles (
    id, 
    username, 
    balance,
    invited_by
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    _initial_balance,
    (NEW.raw_user_meta_data->>'invited_by')::UUID
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign role based on referral code's assigned_role or default to user
  IF _referral_code IS NOT NULL THEN
    -- User registered with referral code = assigned role from code
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _assigned_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Normal signup without referral = basic user role (but new signups are disabled for non-referral)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'reseller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;