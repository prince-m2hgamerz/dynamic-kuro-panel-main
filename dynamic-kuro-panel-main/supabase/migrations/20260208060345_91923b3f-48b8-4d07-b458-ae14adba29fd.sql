-- Add explicit RLS policies for frontend_rate_limits (internal table)
ALTER TABLE public.frontend_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "Admins can view frontend rate limits"
ON public.frontend_rate_limits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Explicitly deny any direct writes from clients
DROP POLICY IF EXISTS "No direct writes to frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "No direct writes to frontend rate limits"
ON public.frontend_rate_limits
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct updates to frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "No direct updates to frontend rate limits"
ON public.frontend_rate_limits
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "No direct deletes to frontend rate limits" ON public.frontend_rate_limits;
CREATE POLICY "No direct deletes to frontend rate limits"
ON public.frontend_rate_limits
FOR DELETE
USING (false);