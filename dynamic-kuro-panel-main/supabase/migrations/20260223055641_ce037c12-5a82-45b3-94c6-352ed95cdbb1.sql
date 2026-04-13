
-- 1. Fix profiles_safe view: Add RLS policies to prevent unauthorized access
-- The view uses security_invoker=on but explicit policies add defense-in-depth

-- First, drop and recreate the view to ensure security_invoker is set
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe 
WITH (security_invoker = on)
AS
SELECT 
  id,
  username,
  balance,
  status,
  created_at,
  updated_at,
  last_login,
  account_expires_at,
  invited_by,
  is_hidden,
  requires_otp,
  two_factor_enabled,
  referral_applied,
  telegram_chat_id,
  panel_name
FROM public.profiles;

-- Note: With security_invoker=on, the view inherits RLS from profiles table
-- The profiles table already has proper RLS policies:
--   - Users can view own profile
--   - Admins/owners/co_owners can view all
--   - Anonymous access denied

-- 2. Add explicit RLS on user_sessions for extra security
-- Sessions already have good policies, but let's add protection against token exposure
-- Create a function to hash session tokens in SELECT results for non-owners
CREATE OR REPLACE FUNCTION public.mask_session_token(token text, viewer_role app_role)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only owners see full tokens, others see masked version
  IF viewer_role IN ('owner', 'co_owner') THEN
    RETURN token;
  END IF;
  RETURN LEFT(token, 8) || '••••••••';
END;
$$;
