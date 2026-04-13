
-- Upgrade check_frontend_access with progressive blocking
-- Repeat offenders get exponentially longer bans
CREATE OR REPLACE FUNCTION public.check_frontend_access(client_ip inet, max_requests integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count int;
  is_blocked boolean;
  is_whitelisted boolean;
  block_count int;
  ban_duration interval;
BEGIN
  -- ✅ Check whitelist FIRST (owner always allowed)
  SELECT EXISTS(
    SELECT 1 FROM ip_whitelist 
    WHERE client_ip <<= ip_address
  ) INTO is_whitelisted;
  
  IF is_whitelisted THEN
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
  
  -- Auto-block if exceeded limit with PROGRESSIVE ban duration
  IF current_count > max_requests THEN
    -- Count how many times this IP has been blocked before (in last 24h)
    SELECT COUNT(*) INTO block_count
    FROM ip_blacklist
    WHERE ip_address = client_ip
    AND blocked_at > NOW() - INTERVAL '24 hours';
    
    -- Progressive ban: 1h -> 2h -> 4h -> 8h -> 24h (exponential)
    ban_duration := LEAST(
      INTERVAL '1 hour' * POWER(2, COALESCE(block_count, 0)),
      INTERVAL '24 hours'
    );
    
    INSERT INTO ip_blacklist (ip_address, reason, expires_at)
    VALUES (client_ip, 'DDoS attack on frontend - auto blocked (offense #' || (block_count + 1) || ')', NOW() + ban_duration)
    ON CONFLICT (ip_address) DO UPDATE SET
      expires_at = NOW() + ban_duration,
      reason = 'DDoS attack on frontend - auto blocked (offense #' || (block_count + 1) || ')',
      blocked_at = NOW();
    
    -- Log the security event
    PERFORM log_security_event(
      'FRONTEND_DDOS_BLOCK',
      NULL,
      client_ip,
      jsonb_build_object('request_count', current_count, 'offense_number', block_count + 1, 'ban_duration', ban_duration::text)
    );
    
    RETURN jsonb_build_object('blocked', true, 'reason', 'RATE_LIMITED', 'count', current_count);
  END IF;
  
  RETURN jsonb_build_object('blocked', false, 'count', current_count, 'remaining', max_requests - current_count);
END;
$function$;
