
-- 1. Remove the overly permissive "Authenticated users can view prices" policy
DROP POLICY IF EXISTS "Authenticated users can view prices" ON public.price_settings;

-- 2. Create secure RPC function for fetching game prices (resellers need this for GenerateKeys)
CREATE OR REPLACE FUNCTION public.get_game_prices(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only authenticated users can call this
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'duration_hours', ps.duration_hours,
      'price', ps.price
    ) ORDER BY ps.duration_hours
  )
  INTO result
  FROM public.price_settings ps
  WHERE ps.game_id = p_game_id
    AND ps.bot_id IS NULL;  -- Only global prices, not bot-specific

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 3. Verify price on server side - function to get price for specific game+duration
CREATE OR REPLACE FUNCTION public.get_key_price(p_game_id uuid, p_duration_hours integer)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _price numeric;
BEGIN
  SELECT price INTO _price
  FROM public.price_settings
  WHERE game_id = p_game_id
    AND duration_hours = p_duration_hours
    AND bot_id IS NULL
  LIMIT 1;

  RETURN COALESCE(_price, 0);
END;
$$;
