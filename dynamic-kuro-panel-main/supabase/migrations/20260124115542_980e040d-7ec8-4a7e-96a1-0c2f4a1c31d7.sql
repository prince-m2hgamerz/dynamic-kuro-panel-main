-- API Rate Limiting Table
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limits_ip_endpoint ON public.api_rate_limits(ip_address, endpoint, window_start);

-- IP Blacklist Table
CREATE TABLE public.ip_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet UNIQUE NOT NULL,
  reason text,
  blocked_at timestamptz DEFAULT now(),
  expires_at timestamptz -- NULL = permanent
);

CREATE INDEX idx_blacklist_ip ON public.ip_blacklist(ip_address);

-- API Audit Logs Table
CREATE TABLE public.api_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet,
  endpoint text NOT NULL,
  user_key text,
  success boolean DEFAULT false,
  failure_reason text,
  request_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_audit_logs_created ON public.api_audit_logs(created_at DESC);
CREATE INDEX idx_api_audit_logs_ip ON public.api_audit_logs(ip_address);

-- Failed Attempts Tracking Table
CREATE TABLE public.failed_auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  attempt_count int DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_failed_attempts_ip ON public.failed_auth_attempts(ip_address);

-- Enable RLS on all tables (service role only access)
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_auth_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins/owners can SELECT (for viewing in dashboard)
CREATE POLICY "Admins can view rate limits" ON public.api_rate_limits
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can view blacklist" ON public.ip_blacklist
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can manage blacklist" ON public.ip_blacklist
  FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can view api audit logs" ON public.api_audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can view failed attempts" ON public.failed_auth_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Cleanup function for old rate limit records (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete rate limit records older than 1 hour
  DELETE FROM public.api_rate_limits WHERE window_start < now() - interval '1 hour';
  
  -- Delete expired blacklist entries
  DELETE FROM public.ip_blacklist WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Reset failed attempts older than 24 hours
  DELETE FROM public.failed_auth_attempts WHERE last_attempt_at < now() - interval '24 hours';
  
  -- Delete audit logs older than 30 days
  DELETE FROM public.api_audit_logs WHERE created_at < now() - interval '30 days';
END;
$$;