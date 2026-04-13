-- Create a secure function to increment referral code usage
-- This bypasses RLS and allows the registration flow to update times_used
CREATE OR REPLACE FUNCTION public.increment_referral_usage(code_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_codes 
  SET times_used = times_used + 1 
  WHERE id = code_id AND is_active = true;
END;
$$;

-- Grant execute to anon (new users aren't authenticated during registration)
GRANT EXECUTE ON FUNCTION public.increment_referral_usage TO anon;
GRANT EXECUTE ON FUNCTION public.increment_referral_usage TO authenticated;