-- Create IP Whitelist table for trusted IPs that bypass DDoS protection
CREATE TABLE public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Only owner can manage whitelist
CREATE POLICY "Owners can manage whitelist" ON public.ip_whitelist
FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Admins can view whitelist
CREATE POLICY "Admins can view whitelist" ON public.ip_whitelist
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Add owner's IP range (152.59.120.0 - 152.59.120.255)
INSERT INTO public.ip_whitelist (ip_address, description)
VALUES ('152.59.120.0/24', 'Owner Home Network');

-- Update check_frontend_access to check whitelist FIRST
CREATE OR REPLACE FUNCTION public.check_frontend_access(client_ip inet, max_requests integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count int;
  is_blocked boolean;
  is_whitelisted boolean;
BEGIN
  -- ✅ Check whitelist FIRST (owner always allowed)
  SELECT EXISTS(
    SELECT 1 FROM ip_whitelist 
    WHERE client_ip <<= ip_address  -- CIDR range check
  ) INTO is_whitelisted;
  
  IF is_whitelisted THEN
    -- Whitelisted IP - skip all checks, always allow
    RETURN jsonb_build_object('blocked', false, 'whitelisted', true, 'count', 0, 'remaining', max_requests);
  END IF;

  -- Check blacklist
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
$function$;