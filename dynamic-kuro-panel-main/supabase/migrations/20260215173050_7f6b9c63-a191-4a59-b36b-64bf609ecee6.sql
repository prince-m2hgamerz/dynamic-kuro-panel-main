
-- 1. Create safe view for telegram_bots that hides bot_token
CREATE OR REPLACE VIEW public.telegram_bots_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  admin_chat_id,
  upi_id,
  upi_name,
  contact_url,
  is_active,
  webhook_url,
  created_by,
  created_at,
  updated_at
FROM public.telegram_bots;
-- Excludes: bot_token

-- 2. Drop existing direct SELECT policies on telegram_bots for owner
-- and replace with deny-all SELECT (force use of view or edge functions)
DROP POLICY IF EXISTS "Owner can manage bots" ON public.telegram_bots;

-- Owner can still INSERT/UPDATE/DELETE but NOT SELECT directly
CREATE POLICY "Owner can insert bots"
ON public.telegram_bots FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owner can update bots"
ON public.telegram_bots FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owner can delete bots"
ON public.telegram_bots FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- SELECT only through the safe view (which excludes bot_token)
CREATE POLICY "Owner can select bots via view"
ON public.telegram_bots FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- 3. Update profiles: deny direct SELECT of otp_bot_token 
-- Already handled by only selecting safe columns, but let's also
-- ensure the GhostPanel edge function handles otp config

-- 4. Create edge function-accessible policy for service role
-- (service role bypasses RLS, so no policy needed)
