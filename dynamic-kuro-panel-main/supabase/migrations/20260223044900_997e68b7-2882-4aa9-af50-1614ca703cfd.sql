
-- Table to track failed registration attempts by IP
CREATE TABLE public.failed_registration_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address inet NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  CONSTRAINT unique_reg_ip UNIQUE (ip_address)
);

-- Enable RLS
ALTER TABLE public.failed_registration_attempts ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this table (edge functions)
-- No public/authenticated access needed
CREATE POLICY "Deny all direct access to failed_registration_attempts"
  ON public.failed_registration_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Owners can view for monitoring
CREATE POLICY "Owners can view failed registration attempts"
  ON public.failed_registration_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));
