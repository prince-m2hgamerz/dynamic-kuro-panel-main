
-- Create a secure function for maintenance settings (accessible by all authenticated users)
CREATE OR REPLACE FUNCTION public.get_maintenance_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT key, value FROM public.server_settings
    WHERE key IN ('maintenance_mode', 'maintenance_message', 'maintenance_disable_bots')
  LOOP
    result := result || jsonb_build_object(rec.key, rec.value);
  END LOOP;
  RETURN result;
END;
$$;
