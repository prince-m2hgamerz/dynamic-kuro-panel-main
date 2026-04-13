
-- Add lockdown mode settings
INSERT INTO server_settings (key, value) VALUES ('ip_lockdown_enabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now();

-- Create a function to check IP lockdown
CREATE OR REPLACE FUNCTION public.check_ip_lockdown(client_ip inet)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lockdown_enabled boolean;
  is_whitelisted boolean;
  is_blacklisted boolean;
BEGIN
  -- Check if lockdown is enabled
  SELECT (value)::boolean INTO lockdown_enabled 
  FROM server_settings WHERE key = 'ip_lockdown_enabled';
  
  IF NOT COALESCE(lockdown_enabled, false) THEN
    RETURN jsonb_build_object('allowed', true, 'lockdown', false);
  END IF;

  -- Check blacklist first
  SELECT EXISTS(
    SELECT 1 FROM ip_blacklist 
    WHERE ip_address = client_ip 
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO is_blacklisted;
  
  IF is_blacklisted THEN
    RETURN jsonb_build_object('allowed', false, 'lockdown', true, 'reason', 'BLACKLISTED');
  END IF;

  -- Check whitelist
  SELECT EXISTS(
    SELECT 1 FROM ip_whitelist 
    WHERE ip_address = client_ip
  ) INTO is_whitelisted;
  
  IF is_whitelisted THEN
    RETURN jsonb_build_object('allowed', true, 'lockdown', true);
  END IF;
  
  -- Not in whitelist = blocked during lockdown
  RETURN jsonb_build_object('allowed', false, 'lockdown', true, 'reason', 'NOT_WHITELISTED');
END;
$$;

-- Create a function to auto-register authenticated user's IP
CREATE OR REPLACE FUNCTION public.register_user_ip(client_ip inet, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO ip_whitelist (ip_address, created_by, description)
  VALUES (client_ip, _user_id, 'Auto-registered from active session')
  ON CONFLICT (ip_address) DO NOTHING;
END;
$$;
