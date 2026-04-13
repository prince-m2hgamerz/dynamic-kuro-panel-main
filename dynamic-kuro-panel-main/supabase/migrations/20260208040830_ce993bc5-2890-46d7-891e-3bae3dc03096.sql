-- Fix RLS Policy Always True issues

-- Remove overly permissive policies
DROP POLICY IF EXISTS "Service role can insert OTP codes" ON public.owner_otp_codes;
DROP POLICY IF EXISTS "Service role can insert security logs" ON public.security_logs;

-- Fix security_logs - use security definer function for inserting from edge functions
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _user_id uuid DEFAULT NULL,
  _ip_address inet DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_logs (event_type, user_id, ip_address, details)
  VALUES (_event_type, _user_id, _ip_address, _details);
END;
$$;

-- Drop duplicate update policy on profiles
DROP POLICY IF EXISTS "Only admins can update balance" ON public.profiles;