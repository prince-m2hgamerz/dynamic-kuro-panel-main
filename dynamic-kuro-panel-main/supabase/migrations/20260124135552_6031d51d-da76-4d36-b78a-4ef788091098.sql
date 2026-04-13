-- Frontend rate limiting table for DDoS protection
CREATE TABLE public.frontend_rate_limits (
  ip_address inet PRIMARY KEY,
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_frontend_rate_ip ON public.frontend_rate_limits(ip_address);

-- RLS - only service role can access
ALTER TABLE public.frontend_rate_limits ENABLE ROW LEVEL SECURITY;

-- Cleanup function for old entries
CREATE OR REPLACE FUNCTION cleanup_frontend_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.frontend_rate_limits 
  WHERE window_start < NOW() - INTERVAL '5 minutes';
END;
$$;

-- RPC function for atomic IP check and rate limiting
CREATE OR REPLACE FUNCTION check_frontend_access(client_ip inet, max_requests int DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
  is_blocked boolean;
BEGIN
  -- Check blacklist first
  SELECT EXISTS(
    SELECT 1 FROM ip_blacklist 
    WHERE ip_address = client_ip 
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'BLACKLISTED');
  END IF;
  
  -- Atomic upsert with rate limit check
  INSERT INTO frontend_rate_limits (ip_address, request_count, window_start)
  VALUES (client_ip, 1, NOW())
  ON CONFLICT (ip_address) DO UPDATE SET
    request_count = CASE 
      WHEN frontend_rate_limits.window_start < NOW() - INTERVAL '1 minute'
      THEN 1
      ELSE frontend_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN frontend_rate_limits.window_start < NOW() - INTERVAL '1 minute'
      THEN NOW()
      ELSE frontend_rate_limits.window_start
    END
  RETURNING request_count INTO current_count;
  
  -- Auto-block if exceeded limit
  IF current_count > max_requests THEN
    INSERT INTO ip_blacklist (ip_address, reason, expires_at)
    VALUES (client_ip, 'DDoS attack on frontend - auto blocked', NOW() + INTERVAL '1 hour')
    ON CONFLICT (ip_address) DO UPDATE SET
      expires_at = NOW() + INTERVAL '1 hour',
      reason = 'DDoS attack on frontend - auto blocked';
    
    RETURN jsonb_build_object('blocked', true, 'reason', 'RATE_LIMITED', 'count', current_count);
  END IF;
  
  RETURN jsonb_build_object('blocked', false, 'count', current_count, 'remaining', max_requests - current_count);
END;
$$;