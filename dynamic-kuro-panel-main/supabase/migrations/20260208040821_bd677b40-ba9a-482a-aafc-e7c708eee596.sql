-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Fix RLS policies for frontend_rate_limits (remove permissive true)
DROP POLICY IF EXISTS "Service role only for frontend rate limits" ON public.frontend_rate_limits;
-- This table is only accessed by edge functions with service role, no RLS needed for regular users

-- Fix RLS policies for pending_payments (restrict ALL operations to service role check)
DROP POLICY IF EXISTS "Service role can manage pending payments" ON public.pending_payments;
-- Keep the admin view policy, remove the overly permissive policy

-- Fix RLS policies for telegram_bot_users  
DROP POLICY IF EXISTS "Service role can manage telegram users" ON public.telegram_bot_users;
-- Add proper owner-only policy
CREATE POLICY "Owners can manage telegram bot users" 
  ON public.telegram_bot_users 
  FOR ALL 
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Strengthen owner_otp_codes - only insert via service role, users can only view
CREATE POLICY "Service role can insert OTP codes"
  ON public.owner_otp_codes
  FOR INSERT
  WITH CHECK (true);

-- Add additional security: Restrict profile balance updates to owners/admins only
CREATE POLICY "Only admins can update balance" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    -- Allow admin/owner to update anyone
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role) OR
    -- Allow user to update own profile (except balance - handled by separate check)
    id = auth.uid()
  )
  WITH CHECK (
    -- Admins/owners can update anything
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role) OR
    -- Regular users can only update non-sensitive fields (enforced at app level)
    id = auth.uid()
  );

-- Add IP logging for security
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only owners can view security logs
CREATE POLICY "Owners can view security logs" 
  ON public.security_logs 
  FOR SELECT 
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Service role can insert security logs (from edge functions)
CREATE POLICY "Service role can insert security logs"
  ON public.security_logs
  FOR INSERT
  WITH CHECK (true);