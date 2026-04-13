-- Add RLS policy for frontend_rate_limits (service role only via RPC)
CREATE POLICY "Service role only for frontend rate limits"
ON public.frontend_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);