
-- Drop and recreate deny policies with explicit TO anon targeting

-- server_settings
DROP POLICY IF EXISTS "Deny anonymous access to server_settings" ON public.server_settings;
CREATE POLICY "Deny anonymous access to server_settings"
  ON public.server_settings AS RESTRICTIVE FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- owner_otp_codes
DROP POLICY IF EXISTS "Deny anonymous access to owner_otp_codes" ON public.owner_otp_codes;
CREATE POLICY "Deny anonymous access to owner_otp_codes"
  ON public.owner_otp_codes AS RESTRICTIVE FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- profiles
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous access to profiles"
  ON public.profiles AS RESTRICTIVE FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
