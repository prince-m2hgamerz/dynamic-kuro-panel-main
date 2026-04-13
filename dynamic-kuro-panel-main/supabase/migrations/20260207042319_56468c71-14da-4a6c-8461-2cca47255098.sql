-- Add 'reseller' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Drop existing trigger and function for user creation (if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that assigns 'reseller' role for referral code users
-- Owner/admin should be assigned manually, not via referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referral_code TEXT;
  _code_record RECORD;
  _initial_balance NUMERIC;
BEGIN
  -- Get referral code from user metadata
  _referral_code := NEW.raw_user_meta_data->>'referral_code';
  _initial_balance := 0;
  
  -- If referral code was used, look up initial balance
  IF _referral_code IS NOT NULL THEN
    SELECT * INTO _code_record FROM public.referral_codes 
    WHERE code = _referral_code AND is_active = true;
    
    IF _code_record IS NOT NULL THEN
      _initial_balance := COALESCE(_code_record.initial_balance, 0);
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

  -- IMPORTANT: Referral code users get 'reseller' role, NOT 'admin'
  -- Only owner/co_owner can manually promote users to 'admin' role
  IF _referral_code IS NOT NULL THEN
    -- User registered with referral code = reseller role (limited access)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'reseller')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Normal signup without referral = basic user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add get_user_role function if doesn't exist (for checking roles)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;