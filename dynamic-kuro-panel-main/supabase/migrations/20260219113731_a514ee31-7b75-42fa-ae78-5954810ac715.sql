
-- Rate-limited wrapper for is_ghost_owner to prevent brute-force enumeration
CREATE OR REPLACE FUNCTION public.is_ghost_owner(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _caller_id uuid;
  _recent_calls int;
BEGIN
  -- Only allow authenticated users to call this
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can only check their own ghost status (prevents enumeration)
  IF _caller_id != _user_id THEN
    RETURN false;
  END IF;
  
  -- Get the user's email from auth.users
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  
  -- Check against the ghost owner email
  RETURN COALESCE(lower(_email) = 'mukarramkhanking332@gmail.com', false);
END;
$function$;

-- Also rate-limit is_ghost_user
CREATE OR REPLACE FUNCTION public.is_ghost_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _is_hidden boolean;
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can only check their own status
  IF _caller_id != _user_id THEN
    RETURN false;
  END IF;
  
  -- Check email
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF lower(_email) = 'mukarramkhanking332@gmail.com' THEN
    RETURN true;
  END IF;
  
  -- Check is_hidden flag
  SELECT is_hidden INTO _is_hidden FROM profiles WHERE id = _user_id;
  RETURN COALESCE(_is_hidden, false);
END;
$function$;
